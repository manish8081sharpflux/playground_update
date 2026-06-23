const mongoose = require('mongoose');

/**
 * InventoryTransaction Model - Sprint5-Story-06
 * Tracks all inventory changes with full audit trail
 */

const inventoryTransactionSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ShopItem',
      required: true,
      index: true
    },
    transactionType: {
      type: String,
      enum: ['purchase', 'sale', 'adjustment', 'return', 'correction', 'purchase_request', 'received', 'deployed', 'bulk_import'],
      required: true
    },
    quantity: {
      type: Number,
      required: true
      // Can be positive (stock increase) or negative (stock decrease)
    },
    previousStock: {
      type: Number,
      required: true
    },
    newStock: {
      type: Number,
      required: true
    },
    reference: {
      // Reference to related document (e.g., order, purchase order, purchase request)
      type: {
        type: String,
        enum: ['order', 'purchase', 'manual', 'bulk_import', 'purchase_request'],
        default: 'manual'
      },
      id: {
        type: mongoose.Schema.Types.ObjectId
      }
    },
    reason: {
      type: String,
      required: true,
      maxlength: 100
    },
    notes: {
      type: String,
      maxlength: 500
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for efficient querying
inventoryTransactionSchema.index({ productId: 1, createdAt: -1 });
inventoryTransactionSchema.index({ performedBy: 1 });
inventoryTransactionSchema.index({ transactionType: 1 });

// Virtual for formatted quantity display
inventoryTransactionSchema.virtual('quantityFormatted').get(function() {
  return this.quantity >= 0 ? `+${this.quantity}` : `${this.quantity}`;
});

const InventoryTransaction = mongoose.models.InventoryTransaction || mongoose.model("InventoryTransaction", inventoryTransactionSchema);

module.exports = InventoryTransaction;
