const mongoose = require('mongoose');
const { SHOP_CATEGORIES } = require('../constants/shopCategories');

const PURCHASE_REQUEST_STATUSES = [
  // Story 2.1 strict lifecycle
  'pending',
  'ordered',
  'delivered_store',
  'delivered_balagruha',

  // Existing workflow statuses used elsewhere in the codebase
  'pending_approval',
  'approved',
  'completed',
  'cancelled',

  // Existing non-happy-path statuses
  'rejected',
  'on_hold'
];

const PURCHASE_REQUEST_CATEGORIES = SHOP_CATEGORIES;

const PURCHASE_REQUEST_PRIORITIES = ['low', 'medium', 'high'];

const purchaseRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      unique: true,
      required: false,  // Auto-generated in pre-save hook
      // Auto-generated: "PR-" + counter (e.g., PR-001, PR-002)
    },

    // Balagruha or STOCK (Sprint5-Story-21)
    // Can be either:
    //   - ObjectId: Specific Balagruha (visible to that Balagruha's users only)
    //   - String 'STOCK': General inventory (visible to ALL users)
    balagruhaId: {
      type: mongoose.Schema.Types.Mixed,  // Allow ObjectId or String 'STOCK'
      required: true,
      validate: {
        validator: function (v) {
          return v === 'STOCK' || mongoose.Types.ObjectId.isValid(v);
        },
        message: 'balagruhaId must be either "STOCK" or a valid Balagruha ID'
      },
      index: true
    },

    // Category Classification
    category: {
      type: String,
      required: true,
      enum: PURCHASE_REQUEST_CATEGORIES,
      trim: true,
      index: true
    },

    // Deadline (C3): per-request
    deadline: {
      type: Date,
      required: false,
      index: true
    },

    // Priority (C3)
    priority: {
      type: String,
      enum: PURCHASE_REQUEST_PRIORITIES,
      default: 'medium',
      index: true
    },

    // Multi-Product Items Array
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'ShopItem',
          required: false
        },
        productName: {
          type: String,
          required: true
        },
        productSKU: {
          type: String,
          required: true
        },
        requestedQuantity: {
          type: Number,
          required: true,
          min: [1, 'Quantity must be at least 1']
        },
        currentStock: {
          type: Number,
          required: true
        },
        lowStockThreshold: {
          type: Number,
          required: true
        },
        estimatedUnitCost: {
          type: Number,
          required: false,
          default: 0,
          min: [0, 'Cost cannot be negative']
        },
        estimatedTotalCost: {
          type: Number,
          required: false,
          default: 0
        },
        // Per-Product Purchase Details (filled during stock update)
        receivedQuantity: {
          type: Number,
          min: [0, 'Received quantity cannot be negative']
        },
        actualUnitCost: {
          type: Number,
          min: [0, 'Cost cannot be negative']
        },
        actualTotalCost: {
          type: Number,
          min: [0, 'Cost cannot be negative']
        }
      }
    ],

    // File Attachments
    attachments: [
      {
        filename: {
          type: String,
          required: true
        },
        fileUrl: {
          type: String,
          required: true
        },
        uploadedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    // Request Details
    totalEstimatedCost: {
      type: Number,
      default: 0
    },
    reason: {
      type: String,
      required: false,
      maxlength: [200, 'Reason cannot exceed 200 characters'],
      trim: true
    },
    justification: {
      type: String,
      maxlength: [500, 'Justification cannot exceed 500 characters'],
      trim: true
    },

    // Request Metadata
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // Status Management (Story 2.1: Strict 4-step lifecycle)
    status: {
      type: String,
      enum: PURCHASE_REQUEST_STATUSES,
      default: 'pending',
      index: true
    },

    // Status History (Story 2.1)
    statusHistory: [{
      status: {
        type: String,
        required: true,
        enum: PURCHASE_REQUEST_STATUSES
      },
      changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      changedAt: {
        type: Date,
        default: Date.now
      },
      notes: {
        type: String
      }
    }],

    // Sprint5-Story-24: Threshold analysis for automatic approval routing
    thresholdAnalysis: {
      maxItemCost: {
        type: Number,
        required: false
      },
      totalOrderCost: {
        type: Number,
        required: false
      },
      itemThreshold: {
        type: Number,
        default: 1000  // Rs 1,000 per item threshold
      },
      orderThreshold: {
        type: Number,
        default: 25000  // Rs 25,000 total order threshold
      },
      requiresApproval: {
        type: Boolean,
        default: true
      }
    },

    // Approval/Rejection
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: {
      type: Date
    },
    reviewNotes: {
      type: String,
      maxlength: [500, 'Review notes cannot exceed 500 characters']
    },

    // Purchase Details (filled after approval during stock update - request-level)
    supplierName: {
      type: String,
      trim: true
    },
    invoiceNumber: {
      type: String,
      trim: true
    },
    purchaseDate: {
      type: Date
    },
    actualTotalCost: {
      type: Number,
      min: [0, 'Cost cannot be negative']
    },

    // Completion (multi-product tracking)
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    completedAt: {
      type: Date
    },
    inventoryTransactionIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryTransaction'
      // Array of transaction IDs (one per product)
    }],

    // STOCK Allocation Tracking (Sprint5-Story-21)
    // Future feature: Allocate STOCK purchases to specific Balagruhas
    // OUT OF SCOPE for Story 21 - prepared for future implementation
    allocatedToBalagruhas: [{
      balagruhaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Balagruha',
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: [1, 'Allocated quantity must be at least 1']
      },
      allocatedAt: {
        type: Date,
        default: Date.now
      },
      allocatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      notes: {
        type: String,
        maxlength: [200, 'Allocation notes cannot exceed 200 characters']
      }
    }],

    // Story 2.6: Repair Technician & Delivery Tracking
    // Repair technician name (required for Repairs category at delivered_store)
    repairTechnicianName: {
      type: String,
      required: false,
      trim: true,
      maxlength: [100, 'Technician name cannot exceed 100 characters']
    },

    // Story 2.6: Coach who delivered to Balagruha
    deliveredByCoachId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },

    // Story 2.6: Timestamp when delivered to Balagruha
    deliveredToBalagruhaAt: {
      type: Date,
      required: false
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance
purchaseRequestSchema.index({ requestedBy: 1, status: 1 });
purchaseRequestSchema.index({ balagruhaId: 1, status: 1 });
purchaseRequestSchema.index({ createdAt: -1 });

// Auto-generate requestId and calculate totalEstimatedCost
purchaseRequestSchema.pre('save', async function (next) {
  // Generate requestId for new documents using atomic findOneAndUpdate counter
  // to avoid race conditions when multiple requests are created concurrently
  if (this.isNew && !this.requestId) {
    const Counter = mongoose.models.Counter || mongoose.model('Counter', new mongoose.Schema({
      _id: { type: String, required: true },
      seq: { type: Number, default: 0 }
    }));

    const counter = await Counter.findOneAndUpdate(
      { _id: 'purchaseRequest' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    this.requestId = `PR-${String(counter.seq).padStart(5, '0')}`;
  }

  // Calculate totalEstimatedCost from items
  if (this.items && this.items.length > 0) {
    this.totalEstimatedCost = this.items.reduce((sum, item) => sum + item.estimatedTotalCost, 0);
  }

  next();
});

// Virtual: requestAge (in hours)
purchaseRequestSchema.virtual('requestAge').get(function () {
  const now = new Date();
  const diffMs = now - this.createdAt;
  return Math.floor(diffMs / (1000 * 60 * 60));  // hours
});

// Virtual: totalItems
purchaseRequestSchema.virtual('totalItems').get(function () {
  return this.items ? this.items.length : 0;
});

// Virtual: totalQuantity
purchaseRequestSchema.virtual('totalQuantity').get(function () {
  return this.items ? this.items.reduce((sum, item) => sum + item.requestedQuantity, 0) : 0;
});

// Safe model definition to prevent OverwriteModelError
const PurchaseRequest = mongoose.models.PurchaseRequest || mongoose.model('PurchaseRequest', purchaseRequestSchema);

module.exports = PurchaseRequest;
