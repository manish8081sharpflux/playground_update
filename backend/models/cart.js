const mongoose = require('mongoose');

/**
 * Cart Model - Sprint5-Story-02
 * Manages student shopping cart with persistent storage
 *
 * Features:
 * - One cart per user (unique userId constraint)
 * - Array of cart items with quantities
 * - Instance methods for cart operations (add, update, remove, clear)
 * - Virtual properties for computed values (itemCount, totalCost)
 * - Automatic timestamp tracking
 */

const cartItemSchema = new mongoose.Schema({
  shopItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShopItem',
    required: [true, 'Shop item ID is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
    max: [99, 'Quantity cannot exceed 99'],
    validate: {
      validator: Number.isInteger,
      message: 'Quantity must be a whole number'
    }
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
}, {
  _id: false // Don't create _id for subdocuments
});

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
      index: true
    },
    items: {
      type: [cartItemSchema],
      default: []
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Index for faster cart lookups
cartSchema.index({ userId: 1 });

// Virtual: Item count
cartSchema.virtual('itemCount').get(function() {
  return this.items.reduce((count, item) => count + item.quantity, 0);
});

// Virtual: Total cost (computed from populated shopItem prices)
cartSchema.virtual('totalCost').get(function() {
  return this.items.reduce((total, item) => {
    if (item.shopItemId && item.shopItemId.price) {
      const price = item.shopItemId.discountPrice || item.shopItemId.price;
      return total + (price * item.quantity);
    }
    return total;
  }, 0);
});

/**
 * Instance Method: Add item to cart
 * @param {ObjectId} shopItemId - Product to add
 * @param {Number} quantity - Quantity to add (default: 1)
 * @returns {Promise<Cart>} - Updated cart
 */
cartSchema.methods.addItem = async function(shopItemId, quantity = 1) {
  const existingItem = this.items.find(item =>
    item.shopItemId.toString() === shopItemId.toString()
  );

  if (existingItem) {
    // Item already in cart - increase quantity
    existingItem.quantity += quantity;

    // Enforce max quantity limit
    if (existingItem.quantity > 99) {
      existingItem.quantity = 99;
    }
  } else {
    // New item - add to cart
    this.items.push({
      shopItemId,
      quantity: Math.min(quantity, 99), // Enforce max on add
      addedAt: new Date()
    });
  }

  this.lastUpdated = new Date();
  return this.save();
};

/**
 * Instance Method: Update item quantity
 * @param {ObjectId} shopItemId - Product to update
 * @param {Number} quantity - New quantity
 * @returns {Promise<Cart>} - Updated cart
 */
cartSchema.methods.updateQuantity = async function(shopItemId, quantity) {
  const item = this.items.find(item =>
    item.shopItemId.toString() === shopItemId.toString()
  );

  if (!item) {
    throw new Error('Item not found in cart');
  }

  // Update quantity with validation
  item.quantity = Math.max(1, Math.min(quantity, 99));
  this.lastUpdated = new Date();

  return this.save();
};

/**
 * Instance Method: Remove item from cart
 * @param {ObjectId} shopItemId - Product to remove
 * @returns {Promise<Cart>} - Updated cart
 */
cartSchema.methods.removeItem = async function(shopItemId) {
  this.items = this.items.filter(item =>
    item.shopItemId.toString() !== shopItemId.toString()
  );

  this.lastUpdated = new Date();
  return this.save();
};

/**
 * Instance Method: Clear all items from cart
 * @returns {Promise<Cart>} - Empty cart
 */
cartSchema.methods.clearCart = async function() {
  this.items = [];
  this.lastUpdated = new Date();
  return this.save();
};

/**
 * Instance Method: Validate stock availability for all items
 * @param {Function} callback - Optional callback with validation results
 * @returns {Promise<Object>} - Validation results { valid: boolean, issues: [] }
 */
cartSchema.methods.validateStock = async function() {
  const ShopItem = mongoose.model('ShopItem');
  const issues = [];

  for (const item of this.items) {
    const shopItem = await ShopItem.findById(item.shopItemId);

    if (!shopItem) {
      issues.push({
        shopItemId: item.shopItemId,
        issue: 'not_found',
        message: 'Product no longer available'
      });
    } else if (!shopItem.isActive) {
      issues.push({
        shopItemId: item.shopItemId,
        issue: 'inactive',
        message: 'Product is no longer active'
      });
    } else if (shopItem.stock === 0) {
      issues.push({
        shopItemId: item.shopItemId,
        issue: 'out_of_stock',
        message: 'Product is out of stock',
        productName: shopItem.name
      });
    } else if (item.quantity > shopItem.stock) {
      issues.push({
        shopItemId: item.shopItemId,
        issue: 'insufficient_stock',
        message: `Only ${shopItem.stock} available`,
        productName: shopItem.name,
        requestedQuantity: item.quantity,
        availableQuantity: shopItem.stock
      });
    }
  }

  return {
    valid: issues.length === 0,
    issues
  };
};

/**
 * Static Method: Get or create cart for user
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Cart>} - User's cart
 */
cartSchema.statics.getOrCreate = async function(userId) {
  let cart = await this.findOne({ userId });

  if (!cart) {
    cart = await this.create({ userId, items: [] });
  }

  return cart;
};

/**
 * Static Method: Get cart with populated shop items
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Cart>} - Populated cart
 */
cartSchema.statics.getPopulated = async function(userId) {
  return this.findOne({ userId })
    .populate({
      path: 'items.shopItemId',
      select: 'name description price sellingPrice discountPrice stock imageUrl category lowStockThreshold'
    });
};

// Pre-save hook: Update lastUpdated timestamp
cartSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

const Cart = mongoose.models.Cart || mongoose.model('Cart', cartSchema);

module.exports = Cart;
