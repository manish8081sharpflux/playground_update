const mongoose = require('mongoose');
const { errorLogger } = require('../config/pino-config');

/**
 * Order Model - Sprint5-Story-03
 * Stores completed shop orders with transaction details
 *
 * Features:
 * - Unique order numbers (ORD-YYYYMMDD-XXXXX)
 * - Order items with pricing snapshot
 * - Order status tracking
 * - Coin transaction reference
 * - Timestamps for order lifecycle
 */

const orderItemSchema = new mongoose.Schema({
  shopItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShopItem',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  sku: {
    type: String,
    required: false
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    max: 99
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
    match: /^ORD-\d{8}-\d{5}$/  // Format: ORD-YYYYMMDD-XXXXX
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  items: {
    type: [orderItemSchema],
    required: true,
    validate: {
      validator: function(items) {
        return items && items.length > 0;
      },
      message: 'Order must have at least one item'
    }
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled', 'refunded'],
    default: 'pending',
    index: true
  },
  placedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  completedAt: {
    type: Date,
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  cancellationReason: {
    type: String,
    default: ''
  },
  refundedAt: {
    type: Date,
    default: null
  },
  coinTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coin',
    required: false
  },
  notes: {
    type: String,
    default: ''
  },

  // Sprint5-Story-13: Delivery Management with Smart Confirmation
  deliveryStatus: {
    type: String,
    enum: ['pending_confirmation', 'pending_delivery', 'delivered', 'cancelled'],
    default: 'pending_confirmation',
    index: true
  },
  confirmedForDeliveryAt: {
    type: Date,
    default: null
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  deliveredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',  // Coach who delivered
    required: false
  },
  deliveryNotes: {
    type: String,
    default: '',
    maxLength: 500
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
orderSchema.index({ userId: 1, createdAt: -1 }); // User's orders sorted by date
orderSchema.index({ status: 1, placedAt: -1 });  // Orders by status and date
orderSchema.index({ orderNumber: 1 });           // Unique order lookup
orderSchema.index({ deliveryStatus: 1, placedAt: -1 }); // Sprint5-Story-13: Coach delivery queries

// Virtual: Item count
orderSchema.virtual('itemCount').get(function() {
  return this.items.reduce((count, item) => count + item.quantity, 0);
});

// Virtual: Is cancelable (within 5 minutes, status is completed, and still in confirmation)
// Sprint5-Story-13: Updated with delivery status check
orderSchema.virtual('isCancelable').get(function() {
  if (this.status !== 'completed') return false;

  // Cannot cancel if confirmed for delivery or delivered
  if (this.deliveryStatus === 'pending_delivery' || this.deliveryStatus === 'delivered') {
    return false;
  }

  const minutesSincePlaced = (Date.now() - this.placedAt.getTime()) / (1000 * 60);
  return minutesSincePlaced < 5 && this.deliveryStatus === 'pending_confirmation';
});

// Instance method: Cancel order
orderSchema.methods.cancel = async function(cancelledBy, cancellationReason = '') {
  if (!this.isCancelable) {
    throw new Error('Order cannot be cancelled (>5 minutes or already cancelled/refunded)');
  }

  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancelledBy = cancelledBy;
  this.cancellationReason = cancellationReason;
  this.deliveryStatus = 'cancelled';  // Sprint5-Story-13: Update delivery status

  return this.save();
};

// Instance method: Mark as refunded
orderSchema.methods.refund = async function() {
  if (this.status === 'refunded') {
    throw new Error('Order is already refunded');
  }

  this.status = 'refunded';
  this.refundedAt = new Date();

  return this.save();
};

// Static method: Get user's orders with pagination
orderSchema.statics.getUserOrders = async function(userId, page = 1, limit = 10, status = null) {
  const skip = (page - 1) * limit;
  const query = { userId };

  if (status) {
    query.status = status;
  }

  const [orders, total] = await Promise.all([
    this.find(query)
      .populate('items.shopItemId', 'name imageUrl images category price')
      .populate('deliveredBy', 'name email')
      .sort({ placedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query)
  ]);

  return {
    orders,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

// Static method: Get order by order number
orderSchema.statics.getByOrderNumber = async function(orderNumber) {
  return this.findOne({ orderNumber })
    .populate('userId', 'name email userId balagruhaIds')
    .populate('items.shopItemId', 'name imageUrl images category price')
    .populate('deliveredBy', 'name email');
};

// Sprint5-Story-13: On-Demand Confirmation Logic
// Static method: Check and confirm orders ready for delivery (after 5-minute window)
orderSchema.statics.checkAndConfirmOrders = async function(orderIds = []) {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const query = {
    deliveryStatus: 'pending_confirmation',
    placedAt: { $lte: fiveMinutesAgo },
    status: 'completed'  // Only confirmed orders
  };

  if (orderIds.length > 0) {
    query._id = { $in: orderIds };
  }

  const ordersToConfirm = await this.find(query).populate('userId', 'name balagruhaIds');

  let confirmedCount = 0;

  for (const order of ordersToConfirm) {
    try {
      // Update order status
      order.deliveryStatus = 'pending_delivery';
      order.confirmedForDeliveryAt = new Date();
      await order.save();

      // Notify coaches (async, don't block)
      notifyCoachesForOrder(order).catch(err => {
        errorLogger.error({ err, orderNumber: order.orderNumber }, 'Failed to notify coaches for order');
      });

      confirmedCount++;
    } catch (error) {
      errorLogger.error({ err: error, orderNumber: order.orderNumber }, 'Error confirming order');
    }
  }

  return confirmedCount;
};

// Helper function to notify coaches about new delivery
async function notifyCoachesForOrder(order) {
  const User = mongoose.model('User');
  const Notification = mongoose.model('Notification');

  try {
    // Find coaches assigned to the student's Balagruha(s)
    const coaches = await User.find({
      role: 'coach',
      balagruhaIds: { $in: order.userId.balagruhaIds }
    });

    if (coaches.length === 0) {
      console.warn(`No coaches found for order ${order.orderNumber}`);
      return;
    }

    // Notify each coach
    const notificationPromises = coaches.map(coach =>
      Notification.createPersonal(
        coach._id,
        'New Delivery',
        `${order.userId.name} ordered ${order.items.length} item(s) - Order ${order.orderNumber}`,
        'ISF_SHOP_UPDATE',
        {
          orderId: order._id,
          orderNumber: order.orderNumber,
          actionUrl: `/coach/deliveries`
        }
      ).catch(err => {
        errorLogger.error({ err, coachName: coach.name }, 'Failed to notify coach');
      })
    );

    await Promise.allSettled(notificationPromises);
  } catch (error) {
    errorLogger.error({ err: error }, 'Error in notifyCoachesForOrder');
  }
}

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

module.exports = Order;
