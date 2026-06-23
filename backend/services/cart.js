const Cart = require('../models/cart');
const ShopItem = require('../models/shopItem');
const { errorLogger } = require('../config/pino-config');

/**
 * Cart Service - Sprint5-Story-02
 * Business logic layer for shopping cart operations
 *
 * Services:
 * - getCart: Get user's cart with populated items
 * - addToCart: Add item to cart with stock validation
 * - updateQuantity: Update item quantity with validation
 * - removeFromCart: Remove specific item
 * - clearCart: Remove all items
 * - validateCartStock: Check stock availability for all items
 */

/**
 * Get user's cart with populated shop items
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object>} - Cart with items, itemCount, totalCost
 */
const getCart = async (userId) => {
  try {
    // Get or create cart
    let cart = await Cart.getPopulated(userId);

    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
      await cart.populate('items.shopItemId');
    }

    // Return formatted cart
    return {
      cart: {
        _id: cart._id,
        userId: cart.userId,
        items: cart.items,
        itemCount: cart.itemCount,
        totalCost: cart.totalCost,
        lastUpdated: cart.lastUpdated
      }
    };
  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching cart');
    throw new Error('Failed to fetch cart');
  }
};

/**
 * Add item to cart with stock validation
 * @param {ObjectId} userId - User ID
 * @param {ObjectId} productId - Shop item ID
 * @param {Number} quantity - Quantity to add (default: 1)
 * @returns {Promise<Object>} - Updated cart
 */
const addToCart = async (userId, productId, quantity = 1) => {
  try {
    // Validate product exists and is active
    const product = await ShopItem.findById(productId);

    if (!product) {
      throw new Error('Product not found');
    }

    if (!product.isActive) {
      throw new Error('Product is not available');
    }

    // Validate stock availability
    if (product.stock === 0) {
      throw new Error('Product is out of stock');
    }

    // Get or create cart
    let cart = await Cart.getOrCreate(userId);

    // Check if adding this quantity would exceed stock
    const existingItem = cart.items.find(item =>
      item.shopItemId.toString() === productId.toString()
    );

    const currentQuantity = existingItem ? existingItem.quantity : 0;
    const newTotalQuantity = currentQuantity + quantity;

    if (newTotalQuantity > product.stock) {
      throw new Error(`Only ${product.stock} items available in stock`);
    }

    // Add item to cart
    await cart.addItem(productId, quantity);

    // Return populated cart
    await cart.populate('items.shopItemId');

    return {
      success: true,
      message: 'Product added to cart',
      cart: {
        _id: cart._id,
        userId: cart.userId,
        items: cart.items,
        itemCount: cart.itemCount,
        totalCost: cart.totalCost,
        lastUpdated: cart.lastUpdated
      }
    };
  } catch (error) {
    errorLogger.error({ err: error }, 'Error adding to cart');
    throw error;
  }
};

/**
 * Update cart item quantity
 * @param {ObjectId} userId - User ID
 * @param {ObjectId} shopItemId - Shop item ID
 * @param {Number} quantity - New quantity
 * @returns {Promise<Object>} - Updated cart
 */
const updateQuantity = async (userId, shopItemId, quantity) => {
  try {
    // Validate quantity
    if (quantity < 1 || quantity > 99) {
      throw new Error('Quantity must be between 1 and 99');
    }

    // Get cart
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      throw new Error('Cart not found');
    }

    // Check if item exists in cart
    const cartItem = cart.items.find(item =>
      item.shopItemId.toString() === shopItemId.toString()
    );

    if (!cartItem) {
      throw new Error('Item not found in cart');
    }

    // Validate stock availability
    const product = await ShopItem.findById(shopItemId);

    if (!product) {
      throw new Error('Product not found');
    }

    if (quantity > product.stock) {
      throw new Error(`Only ${product.stock} items available in stock`);
    }

    // Update quantity
    await cart.updateQuantity(shopItemId, quantity);

    // Return populated cart
    await cart.populate('items.shopItemId');

    return {
      success: true,
      message: 'Quantity updated',
      cart: {
        _id: cart._id,
        userId: cart.userId,
        items: cart.items,
        itemCount: cart.itemCount,
        totalCost: cart.totalCost,
        lastUpdated: cart.lastUpdated
      }
    };
  } catch (error) {
    errorLogger.error({ err: error }, 'Error updating quantity');
    throw error;
  }
};

/**
 * Remove item from cart
 * @param {ObjectId} userId - User ID
 * @param {ObjectId} shopItemId - Shop item ID to remove
 * @returns {Promise<Object>} - Updated cart
 */
const removeFromCart = async (userId, shopItemId) => {
  try {
    // Get cart
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      throw new Error('Cart not found');
    }

    // Remove item
    await cart.removeItem(shopItemId);

    // Return populated cart
    await cart.populate('items.shopItemId');

    return {
      success: true,
      message: 'Item removed from cart',
      cart: {
        _id: cart._id,
        userId: cart.userId,
        items: cart.items,
        itemCount: cart.itemCount,
        totalCost: cart.totalCost,
        lastUpdated: cart.lastUpdated
      }
    };
  } catch (error) {
    errorLogger.error({ err: error }, 'Error removing from cart');
    throw error;
  }
};

/**
 * Clear all items from cart
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object>} - Success message
 */
const clearCart = async (userId) => {
  try {
    // Get cart
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      throw new Error('Cart not found');
    }

    // Clear cart
    await cart.clearCart();

    return {
      success: true,
      message: 'Cart cleared'
    };
  } catch (error) {
    errorLogger.error({ err: error }, 'Error clearing cart');
    throw error;
  }
};

/**
 * Validate stock availability for all cart items
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object>} - Validation results with issues if any
 */
const validateCartStock = async (userId) => {
  try {
    // Get cart
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      throw new Error('Cart not found');
    }

    // Validate stock
    const validation = await cart.validateStock();

    return {
      success: true,
      valid: validation.valid,
      issues: validation.issues
    };
  } catch (error) {
    errorLogger.error({ err: error }, 'Error validating cart stock');
    throw error;
  }
};

module.exports = {
  getCart,
  addToCart,
  updateQuantity,
  removeFromCart,
  clearCart,
  validateCartStock
};
