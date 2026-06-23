const mongoose = require('mongoose');
const Order = require('../models/order');
const Cart = require('../models/cart');
const ShopItem = require('../models/shopItem');
const Coin = require('../models/coin');
const { generateOrderNumber } = require('../utils/orderNumberGenerator');
const { errorLogger } = require('../config/pino-config');

/**
 * Order Service - Sprint5-Story-03
 * Business logic for checkout and order management with atomic transactions
 *
 * Features:
 * - Atomic order placement with rollback capability
 * - Stock validation and deduction
 * - Coin balance verification and deduction
 * - Cart clearing after successful order
 * - Order retrieval with pagination
 */

/**
 * Create order from cart (Atomic Transaction)
 * @param {string} userId - User ID placing the order
 * @returns {Promise<Object>} Created order and transaction details
 */
async function createOrder(userId) {
  // Start MongoDB session for atomic transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Get user's cart (with populated items)
    const cart = await Cart.findOne({ userId })
      .populate('items.shopItemId')
      .session(session);

    if (!cart || cart.items.length === 0) {
      throw new Error('Cart is empty. Cannot create order.');
    }

    // 2. Validate all items have stock and calculate totals
    let subtotal = 0;
    const orderItems = [];
    const stockUpdates = [];

    for (const cartItem of cart.items) {
      const product = cartItem.shopItemId;

      if (!product) {
        throw new Error(`Product not found for cart item`);
      }

      if (!product.isActive) {
        throw new Error(`Product ${product.name} is no longer available`);
      }

      // Check stock availability
      if (product.stock < cartItem.quantity) {
        throw new Error(
          `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${cartItem.quantity}`
        );
      }

      // Calculate price (use discount price if available)
      const price = product.discountPrice !== null ? product.discountPrice : product.price;
      const itemSubtotal = price * cartItem.quantity;
      subtotal += itemSubtotal;

      // Prepare order item snapshot
      orderItems.push({
        shopItemId: product._id,
        name: product.name,
        sku: product.sku,
        price: price,
        quantity: cartItem.quantity,
        subtotal: itemSubtotal
      });

      // Prepare stock update (optimistic locking with __v)
      stockUpdates.push({
        productId: product._id,
        currentVersion: product.__v,
        quantityToDeduct: cartItem.quantity,
        currentStock: product.stock
      });
    }

    const totalAmount = subtotal; // Can add shipping/taxes later

    // 3. Check user has sufficient coin balance
    const coinRecord = await Coin.findOne({ userId }).session(session);

    if (!coinRecord) {
      throw new Error('Coin account not found. Please contact support.');
    }

    if (coinRecord.balance < totalAmount) {
      throw new Error(
        `Insufficient coin balance. Required: ${totalAmount}, Available: ${coinRecord.balance}`
      );
    }

    // 4. Deduct stock from products (with optimistic locking)
    for (const stockUpdate of stockUpdates) {
      const updateResult = await ShopItem.updateOne(
        {
          _id: stockUpdate.productId,
          __v: stockUpdate.currentVersion, // Optimistic locking
          stock: { $gte: stockUpdate.quantityToDeduct } // Double-check stock
        },
        {
          $inc: {
            stock: -stockUpdate.quantityToDeduct,
            __v: 1 // Increment version
          }
        },
        { session }
      );

      if (updateResult.modifiedCount === 0) {
        throw new Error(
          'Stock update failed due to concurrent modification. Please try again.'
        );
      }
    }

    // 5. Generate unique order number
    let orderNumber;
    let orderExists = true;

    // Ensure order number is unique
    while (orderExists) {
      orderNumber = generateOrderNumber();
      const existing = await Order.findOne({ orderNumber }).session(session);
      orderExists = !!existing;
    }

    // 6. Create order document
    const order = new Order({
      orderNumber,
      userId,
      items: orderItems,
      subtotal,
      discount: 0,
      totalAmount,
      status: 'completed', // AC3: Order marked as completed immediately
      deliveryStatus: 'pending_confirmation', // Sprint5-Story-13: Start in confirmation state
      placedAt: new Date(),
      completedAt: new Date(),
      notes: ''
    });

    await order.save({ session });

    // 7. Deduct coins from user balance (Sprint5-Story-08)
    const coinTransaction = {
      type: 'spent',
      amount: totalAmount,
      description: `Shop purchase - Order ${orderNumber}`,
      source: 'shop', // Sprint5-Story-08: Use 'shop' source for shop purchases
      metadata: {
        orderId: order._id.toString(),
        orderNumber: orderNumber,
        itemCount: orderItems.length
      },
      createdAt: new Date()
    };

    coinRecord.balance -= totalAmount;
    coinRecord.transactions.push(coinTransaction);
    coinRecord.updateStats(totalAmount, 'spent');

    await coinRecord.save({ session });

    // Store coin transaction ID in order
    order.coinTransactionId = coinRecord._id;
    await order.save({ session });

    // 8. Clear user's cart
    cart.items = [];
    await cart.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    // Return order with populated user details
    const populatedOrder = await Order.findById(order._id)
      .populate('userId', 'name email userId');

    return {
      success: true,
      order: populatedOrder,
      message: `Order ${orderNumber} placed successfully`,
      coinsSpent: totalAmount,
      remainingBalance: coinRecord.balance
    };
  } catch (error) {
    // Rollback transaction on error
    await session.abortTransaction();
    session.endSession();

    errorLogger.error({ err: error }, 'Order creation failed');
    throw error;
  }
}

/**
 * Get order by order number
 * @param {string} orderNumber - Order number
 * @param {string} userId - User ID (for authorization)
 * @param {string} userRole - User role (for admin access)
 * @returns {Promise<Object>} Order details
 */
async function getOrderByNumber(orderNumber, userId, userRole = null) {
  // Use the static method which properly populates shopItemId with images
  const order = await Order.getByOrderNumber(orderNumber);

  if (!order) {
    throw new Error('Order not found');
  }

  // Admin can view any order, regular users can only view their own orders
  const isAdmin = userRole?.toLowerCase() === 'admin';
  const isOwner = order.userId._id.toString() === userId.toString();

  if (!isAdmin && !isOwner) {
    throw new Error('Unauthorized to view this order');
  }

  return order;
}

/**
 * Get user's order history with pagination
 * @param {string} userId - User ID
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 10)
 * @param {string} status - Filter by status (optional)
 * @returns {Promise<Object>} Orders and pagination info
 */
async function getUserOrders(userId, page = 1, limit = 10, status = null) {
  return await Order.getUserOrders(userId, page, limit, status);
}

/**
 * Get order by ID
 * @param {string} orderId - Order ID
 * @param {string} userId - User ID (for authorization)
 * @param {string} userRole - User role (for admin access)
 * @returns {Promise<Object>} Order details
 */
async function getOrderById(orderId, userId, userRole = null) {
  const order = await Order.findById(orderId)
    .populate('userId', 'name email userId balagruhaIds')
    .populate('items.shopItemId', 'name imageUrl images category price')
    .populate('deliveredBy', 'name email');

  if (!order) {
    throw new Error('Order not found');
  }

  // Admin can view any order, regular users can only view their own orders
  const isAdmin = userRole?.toLowerCase() === 'admin';
  const isOwner = order.userId._id.toString() === userId.toString();

  if (!isAdmin && !isOwner) {
    throw new Error('Unauthorized to view this order');
  }

  return order;
}

/**
 * Cancel order (within 5 minutes, refund coins)
 * @param {string} orderNumber - Order number
 * @param {string} userId - User ID (for authorization)
 * @param {string} cancellationReason - Optional reason for cancellation
 * @returns {Promise<Object>} Updated order and refund details
 */
async function cancelOrder(orderNumber, userId, cancellationReason = '') {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Get order
    const order = await Order.findOne({ orderNumber }).session(session);

    if (!order) {
      throw new Error('Order not found');
    }

    // Verify order belongs to user
    if (order.userId.toString() !== userId.toString()) {
      throw new Error('Unauthorized to cancel this order');
    }

    // Check if order is cancelable
    if (!order.isCancelable) {
      throw new Error('Order cannot be cancelled (>5 minutes or already cancelled/refunded)');
    }

    // Cancel order (Sprint5-Story-10: Added cancellationReason and cancelledBy)
    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelledBy = userId;
    order.cancellationReason = cancellationReason;
    order.deliveryStatus = 'cancelled'; // Sprint5-Story-13: Update delivery status
    await order.save({ session });

    // Refund coins
    const coinRecord = await Coin.findOne({ userId }).session(session);

    if (!coinRecord) {
      throw new Error('Coin account not found');
    }

    const refundTransaction = {
      type: 'earned',
      amount: order.totalAmount,
      description: `Refund for cancelled order ${orderNumber}`,
      source: 'shop', // Sprint5-Story-08: Use 'shop' source for shop refunds
      metadata: {
        orderId: order._id.toString(),
        orderNumber: orderNumber,
        cancellationReason: cancellationReason || 'No reason provided'
      },
      createdAt: new Date()
    };

    coinRecord.balance += order.totalAmount;
    coinRecord.transactions.push(refundTransaction);
    coinRecord.updateStats(order.totalAmount, 'earned');

    await coinRecord.save({ session });

    // Restore stock
    for (const item of order.items) {
      await ShopItem.updateOne(
        { _id: item.shopItemId },
        { $inc: { stock: item.quantity } },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    return {
      success: true,
      order,
      message: `Order ${orderNumber} cancelled and ${order.totalAmount} coins refunded`,
      refundedAmount: order.totalAmount,
      newBalance: coinRecord.balance
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    errorLogger.error({ err: error }, 'Order cancellation failed');
    throw error;
  }
}

/**
 * Get all orders (Admin view) with filters
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 10)
 * @param {string} status - Filter by status (optional)
 * @param {string} coachId - Filter by coach ID (optional)
 * @param {string} balagruhaId - Filter by balagruha ID (optional)
 * @param {string} studentId - Filter by student ID (optional)
 * @param {string} startDate - Filter by start date (optional)
 * @param {string} endDate - Filter by end date (optional)
 * @returns {Promise<Object>} All orders with pagination
 */
async function getAllOrders(page = 1, limit = 10, status = null, coachId = null, balagruhaId = null, studentId = null, startDate = null, endDate = null) {
  const skip = (page - 1) * limit;
  const query = {};

  // Filter by status if provided
  if (status) {
    query.status = status;
  }

  // Filter by studentId if provided (direct filter on userId field)
  if (studentId) {
    query.userId = studentId;
  }

  // Filter by date range if provided
  if (startDate || endDate) {
    query.placedAt = {};

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      query.placedAt.$gte = start;
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.placedAt.$lte = end;
    }
  }

  // Build the query
  let ordersQuery = Order.find(query)
    .populate({
      path: 'userId',
      select: 'name email userId balagruhaIds',
      populate: [
        {
          path: 'balagruhaIds',
          select: 'name _id'
        }
      ]
    })
    .populate('items.shopItemId', 'name imageUrl images category price')
    .populate('deliveredBy', 'name')
    .sort({ placedAt: -1 })
    .skip(skip)
    .limit(limit);

  const orders = await ordersQuery;

  // Filter by balagruha if provided
  let filteredOrders = orders;
  if (balagruhaId) {
    filteredOrders = orders.filter(order => {
      if (!order.userId || !order.userId.balagruhaIds) return false;
      return order.userId.balagruhaIds.some(b => b._id.toString() === balagruhaId);
    });
  }

  // Note: Coach filter not implemented as User schema doesn't have coachIds field
  // if (coachId) {
  //   filteredOrders = filteredOrders.filter(order => {
  //     if (!order.userId || !order.userId.coachIds) return false;
  //     return order.userId.coachIds.some(c => c._id.toString() === coachId);
  //   });
  // }

  // Get total count for pagination
  const totalQuery = Order.find(query);
  const total = await Order.countDocuments(totalQuery);

  return {
    orders: filteredOrders,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
      limit
    }
  };
}

module.exports = {
  createOrder,
  getOrderByNumber,
  getUserOrders,
  getOrderById,
  cancelOrder,
  getAllOrders
};
