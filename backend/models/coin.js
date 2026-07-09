const mongoose = require("mongoose");

const coinSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    balance: {
      type: Number,
      default: 0,
      min: [0, "Coin balance cannot be negative"],
    },
    transactions: [
      {
        type: {
          type: String,
          enum: [
            "earned",
            "spent",
            "bonus",
            "penalty",
            "wtf_pin_creation",
            "wtf_submission_approval",
            "wtf_interaction",
          ],
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
        description: {
          type: String,
          required: true,
        },
        source: {
          type: String,
          enum: [
            "wtf",
            "attendance",
            "task",
            "medical",
            "sports",
            "music",
            "general",
            "shop", // Sprint5-Story-08: Added for shop purchases
            "quiz_pass", // FIX-027: Granular source for quiz completion coins
            "grading", // FIX-027: Granular source for grading-awarded coins
            "manual_award", // FIX-027: Granular source for coach/admin manual awards
          ],
          required: true,
        },
        // For WTF-specific transactions
        wtfPinId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "wtf_pin",
        },
        wtfSubmissionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "wtf_submission",
        },
        wtfInteractionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "wtf_student_interaction",
        },
        // Metadata for transaction tracking
        // Using Mixed type to allow flexible metadata for different transaction types
        // Shop transactions: orderId, orderNumber, itemCount
        // WTF transactions: wtfPinId, wtfSubmissionId, wtfInteractionId
        // Other transactions: ipAddress, userAgent, sessionId, etc.
        metadata: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Weekly coin tracking
    weeklyStats: {
      coinsEarned: { type: Number, default: 0 },
      coinsSpent: { type: Number, default: 0 },
      lastResetDate: { type: Date, default: Date.now },
    },
    // Monthly coin tracking
    monthlyStats: {
      coinsEarned: { type: Number, default: 0 },
      coinsSpent: { type: Number, default: 0 },
      lastResetDate: { type: Date, default: Date.now },
    },
    // WTF-specific coin tracking
    wtfStats: {
      pinsCreated: { type: Number, default: 0 },
      submissionsApproved: { type: Number, default: 0 },
      interactionsMade: { type: Number, default: 0 },
      totalWtfCoinsEarned: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance
coinSchema.index({ userId: 1 });
coinSchema.index({ "transactions.createdAt": -1 });
coinSchema.index({ "transactions.type": 1 });
coinSchema.index({ "transactions.source": 1 });

// Pre-save middleware to validate coin balance
coinSchema.pre("save", function (next) {
  if (this.balance < 0) {
    return next(new Error("Coin balance cannot be negative"));
  }
  next();
});

// Instance method to add coins
coinSchema.methods.addCoins = function (
  amount,
  type,
  description,
  source,
  metadata = {},
  options = {}
) {
  if (amount <= 0) {
    throw new Error("Coin amount must be positive");
  }

  this.balance += amount;

  // Add transaction record
  this.transactions.push({
    type: "earned",
    amount: amount,
    description: description,
    source: source,
    metadata: metadata,
  });

  // Update weekly and monthly stats
  this.updateStats(amount, "earned");

  // Update WTF stats if applicable
  if (source === "wtf") {
    this.updateWtfStats(type, amount);
  }

  // Pass session to save() for transaction support
  const saveOptions = {};
  if (options.session) {
    saveOptions.session = options.session;
  }
  return this.save(saveOptions);
};

// Instance method to spend coins
coinSchema.methods.spendCoins = function (
  amount,
  type,
  description,
  source,
  metadata = {},
  options = {}
) {
  if (amount <= 0) {
    throw new Error("Coin amount must be positive");
  }

  if (this.balance < amount) {
    throw new Error("Insufficient coin balance");
  }

  this.balance -= amount;

  // Add transaction record
  this.transactions.push({
    type: "spent",
    amount: amount,
    description: description,
    source: source,
    metadata: metadata,
  });

  // Update weekly and monthly stats
  this.updateStats(amount, "spent");

  // Pass session to save() for transaction support
  const saveOptions = {};
  if (options.session) {
    saveOptions.session = options.session;
  }
  return this.save(saveOptions);
};

// Instance method to update stats
coinSchema.methods.updateStats = function (amount, transactionType) {
  const now = new Date();

  // Update weekly stats
  const weekStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - now.getDay()
  );
  if (this.weeklyStats.lastResetDate < weekStart) {
    this.weeklyStats = {
      coinsEarned: 0,
      coinsSpent: 0,
      lastResetDate: now,
    };
  }

  if (transactionType === "earned") {
    this.weeklyStats.coinsEarned += amount;
    this.monthlyStats.coinsEarned += amount;
  } else {
    this.weeklyStats.coinsSpent += amount;
    this.monthlyStats.coinsSpent += amount;
  }
};

// Instance method to update WTF stats
coinSchema.methods.updateWtfStats = function (type, amount) {
  switch (type) {
    case "wtf_pin_creation":
      this.wtfStats.pinsCreated += 1;
      break;
    case "wtf_submission_approval":
      this.wtfStats.submissionsApproved += 1;
      break;
    case "wtf_interaction":
      this.wtfStats.interactionsMade += 1;
      break;
  }

  this.wtfStats.totalWtfCoinsEarned += amount;
};

// Instance method to get transaction history
coinSchema.methods.getTransactionHistory = function (limit = 50, skip = 0) {
  return this.transactions
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(skip, skip + limit);
};

// Instance method to get WTF transaction history
coinSchema.methods.getWtfTransactionHistory = function (limit = 50) {
  return this.transactions
    .filter((transaction) => transaction.source === "wtf")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
};

// Static method to find or create coin record for user
// Accepts optional { session } to participate in a Mongo transaction so
// reads/writes inside the txn see a consistent snapshot.
coinSchema.statics.findOrCreateForUser = async function (userId, options = {}) {
  // Convert userId to ObjectId if it's a string (from req.user.id or req.user._id)
  // This ensures Mongoose can properly match the userId field in the database
  const userObjectId = mongoose.Types.ObjectId.isValid(userId)
    ? (typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId)
    : userId;

  const queryOpts = options.session ? { session: options.session } : {};

  let coinRecord = await this.findOne({ userId: userObjectId }, null, queryOpts);

  if (!coinRecord) {
    coinRecord = new this({
      userId: userObjectId,
      balance: 0,
      transactions: [],
      weeklyStats: {
        coinsEarned: 0,
        coinsSpent: 0,
        lastResetDate: new Date(),
      },
      monthlyStats: {
        coinsEarned: 0,
        coinsSpent: 0,
        lastResetDate: new Date(),
      },
      wtfStats: {
        pinsCreated: 0,
        submissionsApproved: 0,
        interactionsMade: 0,
        totalWtfCoinsEarned: 0,
      },
    });
    await coinRecord.save(queryOpts);
  }

  return coinRecord;
};

// Static method to get user coin balance
coinSchema.statics.getUserBalance = async function (userId) {
  const coinRecord = await this.findOne({ userId });
  return coinRecord ? coinRecord.balance : 0;
};

// Static method to award WTF coins
coinSchema.statics.awardWtfCoins = async function (
  userId,
  amount,
  type,
  description,
  metadata = {}
) {
  const coinRecord = await this.findOrCreateForUser(userId);

  // Add WTF-specific metadata
  metadata.wtfTransaction = true;
  metadata.awardedAt = new Date().toISOString();

  return await coinRecord.addCoins(amount, type, description, "wtf", metadata);
};

// Static method to get top coin earners
coinSchema.statics.getTopEarners = async function (
  limit = 10,
  period = "weekly"
) {
  const matchStage = {};

  if (period === "weekly") {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    matchStage["weeklyStats.lastResetDate"] = { $gte: weekStart };
  } else if (period === "monthly") {
    const monthStart = new Date();
    monthStart.setMonth(monthStart.getMonth() - 1);
    matchStage["monthlyStats.lastResetDate"] = { $gte: monthStart };
  }

  return await this.aggregate([
    { $match: matchStage },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        userId: 1,
        userName: "$user.name",
        userRole: "$user.role",
        balance: 1,
        weeklyStats: 1,
        monthlyStats: 1,
        wtfStats: 1,
      },
    },
    { $sort: { balance: -1 } },
    { $limit: limit },
  ]);
};

const Coin = mongoose.models.Coin || mongoose.model("Coin", coinSchema);

module.exports = Coin;
