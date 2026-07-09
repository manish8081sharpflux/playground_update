const { errorLogger } = require("../config/pino-config");
const Coin = require("../models/coin");
const WtfSettingsService = require("./wtfSettings");
const { default: mongoose } = require("mongoose");

// WTF Coin Configuration
const WTF_COIN_CONFIG = {
  // Pin creation rewards
  PIN_CREATION: {
    amount: 10,
    description: "Created a WTF pin",
    type: "wtf_pin_creation",
  },

  // Submission approval rewards
  SUBMISSION_APPROVAL: {
    amount: 15,
    description: "Submission approved and published",
    type: "wtf_submission_approval",
  },

  // Interaction rewards (daily limit)
  INTERACTION: {
    amount: 2,
    description: "Engaged with WTF content",
    type: "wtf_interaction",
    dailyLimit: 5, // Max 5 interactions per day for coins
  },

  // Bonus rewards
  BONUS: {
    FIRST_PIN: {
      amount: 25,
      description: "First WTF pin creation bonus",
      type: "wtf_pin_creation",
    },
    HIGH_ENGAGEMENT: {
      amount: 20,
      description: "High engagement pin bonus",
      type: "wtf_pin_creation",
    },
    WEEKLY_ACTIVE: {
      amount: 50,
      description: "Weekly active user bonus",
      type: "bonus",
    },
  },
};

class CoinService {
  // Award coins for WTF pin creation
  static async awardPinCreationCoins(
    userId,
    pinId,
    isFirstPin = false,
    metadata = {}
  ) {
    try {
      const config = WTF_COIN_CONFIG.PIN_CREATION;
      // Use configured reward if available; fallback to static config
      let amount = config.amount;
      try {
        const currentSettings = await WtfSettingsService.getCurrentSettings();
        if (
          currentSettings &&
          typeof currentSettings.wtfCoinReward === "number" &&
          currentSettings.wtfCoinReward >= 0
        ) {
          amount = currentSettings.wtfCoinReward;
        }
      } catch (e) {
        // keep fallback amount
      }
      let description = config.description;

      // Add bonus for first pin
      if (isFirstPin) {
        amount += WTF_COIN_CONFIG.BONUS.FIRST_PIN.amount;
        description = "First WTF pin creation with bonus";
      }

      // Add WTF-specific metadata
      metadata.wtfPinId = pinId;
      metadata.isFirstPin = isFirstPin;

      const result = await Coin.awardWtfCoins(
        userId,
        amount,
        config.type,
        description,
        metadata
      );

      // Create notification for coin award
      try {
        const NotificationService = require("./notification");
        await NotificationService.notifyCoinsAwarded(
          userId,
          amount,
          "WTF_PIN_CREATION",
          description,
          {
            pinId,
            isFirstPin,
            ...metadata,
          }
        );
      } catch (notificationError) {
        errorLogger.error(
          {
            userId,
            pinId,
            error: notificationError.message,
          },
          "Error creating coin award notification"
        );
        // Don't fail coin award if notification creation fails
      }

      errorLogger.info(
        { userId, pinId, amount, isFirstPin },
        "WTF pin creation coins awarded successfully"
      );

      return {
        success: true,
        data: {
          coinsAwarded: amount,
          newBalance: result.balance,
          description: description,
        },
        message: `Awarded ${amount} coins for pin creation`,
      };
    } catch (error) {
      errorLogger.error(
        { userId, pinId, error: error.message },
        "Error awarding WTF pin creation coins"
      );
      throw error;
    }
  }

  // Award coins for submission approval
  static async awardSubmissionApprovalCoins(
    userId,
    submissionId,
    metadata = {}
  ) {
    try {
      const config = WTF_COIN_CONFIG.SUBMISSION_APPROVAL;

      // Use configured reward if available; fallback to static config amount
      let amount = config.amount;
      try {
        // WtfSettingsService is a singleton instance with async methods
        const configuredReward = await WtfSettingsService.getCoinReward();
        if (typeof configuredReward === "number" && configuredReward >= 0) {
          amount = configuredReward;
        }
      } catch (e) {
        // Keep fallback amount if settings not available
      }

      // Add WTF-specific metadata
      metadata.wtfSubmissionId = submissionId;

      const result = await Coin.awardWtfCoins(
        userId,
        amount,
        config.type,
        config.description,
        metadata
      );

      errorLogger.info(
        { userId, submissionId, amount },
        "WTF submission approval coins awarded successfully"
      );

      return {
        success: true,
        data: {
          coinsAwarded: amount,
          newBalance: result.balance,
          description: config.description,
        },
        message: `Awarded ${amount} coins for submission approval`,
      };
    } catch (error) {
      errorLogger.error(
        { userId, submissionId, error: error.message },
        "Error awarding WTF submission approval coins"
      );
      throw error;
    }
  }

  // Award coins for interactions (with daily limit)
  static async awardInteractionCoins(userId, interactionId, metadata = {}) {
    try {
      const config = WTF_COIN_CONFIG.INTERACTION;

      // Check daily interaction limit
      const coinRecord = await Coin.findOrCreateForUser(userId);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayInteractions = coinRecord.transactions.filter(
        (transaction) =>
          transaction.type === "wtf_interaction" &&
          transaction.createdAt >= today
      );

      if (todayInteractions.length >= config.dailyLimit) {
        return {
          success: false,
          data: null,
          message: "Daily interaction coin limit reached",
        };
      }

      // Add WTF-specific metadata
      metadata.wtfInteractionId = interactionId;
      metadata.dailyInteractionCount = todayInteractions.length + 1;

      const result = await Coin.awardWtfCoins(
        userId,
        config.amount,
        config.type,
        config.description,
        metadata
      );

      errorLogger.info(
        {
          userId,
          interactionId,
          amount: config.amount,
          dailyCount: todayInteractions.length + 1,
        },
        "WTF interaction coins awarded successfully"
      );

      return {
        success: true,
        data: {
          coinsAwarded: config.amount,
          newBalance: result.balance,
          description: config.description,
          dailyInteractionsRemaining:
            config.dailyLimit - (todayInteractions.length + 1),
        },
        message: `Awarded ${config.amount} coins for interaction`,
      };
    } catch (error) {
      errorLogger.error(
        { userId, interactionId, error: error.message },
        "Error awarding WTF interaction coins"
      );
      throw error;
    }
  }

  // Award bonus coins for high engagement
  static async awardHighEngagementBonus(
    userId,
    pinId,
    engagementRate,
    metadata = {}
  ) {
    try {
      const config = WTF_COIN_CONFIG.BONUS.HIGH_ENGAGEMENT;

      // Only award if engagement rate is above 80%
      if (engagementRate < 80) {
        return {
          success: false,
          data: null,
          message: "Engagement rate too low for bonus",
        };
      }

      // Add WTF-specific metadata
      metadata.wtfPinId = pinId;
      metadata.engagementRate = engagementRate;

      const result = await Coin.awardWtfCoins(
        userId,
        config.amount,
        config.type,
        config.description,
        metadata
      );

      errorLogger.info(
        { userId, pinId, amount: config.amount, engagementRate },
        "WTF high engagement bonus awarded successfully"
      );

      return {
        success: true,
        data: {
          coinsAwarded: config.amount,
          newBalance: result.balance,
          description: config.description,
          engagementRate: engagementRate,
        },
        message: `Awarded ${config.amount} coins for high engagement`,
      };
    } catch (error) {
      errorLogger.error(
        { userId, pinId, error: error.message },
        "Error awarding WTF high engagement bonus"
      );
      throw error;
    }
  }

  // Award weekly active user bonus
  static async awardWeeklyActiveBonus(userId, metadata = {}) {
    try {
      const config = WTF_COIN_CONFIG.BONUS.WEEKLY_ACTIVE;

      // Add WTF-specific metadata
      metadata.weeklyActive = true;

      const result = await Coin.awardWtfCoins(
        userId,
        config.amount,
        config.type,
        config.description,
        metadata
      );

      errorLogger.info(
        { userId, amount: config.amount },
        "WTF weekly active bonus awarded successfully"
      );

      return {
        success: true,
        data: {
          coinsAwarded: config.amount,
          newBalance: result.balance,
          description: config.description,
        },
        message: `Awarded ${config.amount} coins for weekly activity`,
      };
    } catch (error) {
      errorLogger.error(
        { userId, error: error.message },
        "Error awarding WTF weekly active bonus"
      );
      throw error;
    }
  }

  // Get user coin balance
  static async getUserBalance(userId) {
    try {
      const balance = await Coin.getUserBalance(userId);

      return {
        success: true,
        data: {
          balance: balance,
        },
        message: "User balance retrieved successfully",
      };
    } catch (error) {
      errorLogger.error(
        { userId, error: error.message },
        "Error getting user coin balance"
      );
      throw error;
    }
  }

  // Get user coin statistics
  static async getUserCoinStats(userId) {
    try {
      const coinRecord = await Coin.findOrCreateForUser(userId);

      return {
        success: true,
        data: {
          balance: coinRecord.balance,
          weeklyStats: coinRecord.weeklyStats,
          monthlyStats: coinRecord.monthlyStats,
          wtfStats: coinRecord.wtfStats,
        },
        message: "User coin statistics retrieved successfully",
      };
    } catch (error) {
      errorLogger.error(
        { userId, error: error.message },
        "Error getting user coin statistics"
      );
      throw error;
    }
  }

  // Get user transaction history (Sprint5-Story-09: Enhanced with filtering)
  static async getUserTransactionHistory(userId, filters = {}) {
    try {
      const {
        type,
        source,
        startDate,
        endDate,
        page = 1,
        limit = 50,
        sortBy = "newest_first",
      } = filters;
      const skip = (page - 1) * limit;

      const coinRecord = await Coin.findOrCreateForUser(userId);
      let transactions = [...coinRecord.transactions];
      const getTransactionDate = (transaction) =>
        new Date(transaction.createdAt || transaction.timestamp);

      // Apply filters
      if (type) {
        transactions = transactions.filter(t => t.type === type);
      }

      if (source) {
        transactions = transactions.filter(t => t.source === source);
      }

      if (startDate) {
        const start = new Date(startDate);
        transactions = transactions.filter(t => getTransactionDate(t) >= start);
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // End of day
        transactions = transactions.filter(t => getTransactionDate(t) <= end);
      }

      if (sortBy === "oldest_first") {
        transactions.sort((a, b) => getTransactionDate(a) - getTransactionDate(b));
      } else if (sortBy === "highest_amount") {
        transactions.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
      } else {
        transactions.sort((a, b) => getTransactionDate(b) - getTransactionDate(a));
      }

      const totalTransactions = transactions.length;

      // Apply pagination
      const paginatedTransactions = transactions.slice(skip, skip + limit);

      // Calculate summary
      const summary = {
        totalEarned: transactions
          .filter(t => t.type === 'earned')
          .reduce((sum, t) => sum + t.amount, 0),
        totalSpent: transactions
          .filter(t => t.type === 'spent')
          .reduce((sum, t) => sum + t.amount, 0),
        currentBalance: coinRecord.balance
      };

      return {
        success: true,
        data: {
          transactions: paginatedTransactions,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalTransactions,
            pages: Math.ceil(totalTransactions / limit)
          },
          summary
        },
        message: "User transaction history retrieved successfully",
      };
    } catch (error) {
      errorLogger.error(
        { userId, error: error.message },
        "Error getting user transaction history"
      );
      throw error;
    }
  }

  // Export user transaction history as CSV (Sprint5-Story-09: AC7)
  static async exportTransactionHistory(userId, filters = {}) {
    try {
      const { type, source, startDate, endDate } = filters;

      const coinRecord = await Coin.findOrCreateForUser(userId);
      let transactions = [...coinRecord.transactions];

      // Apply same filters as getUserTransactionHistory
      if (type) {
        transactions = transactions.filter(t => t.type === type);
      }

      if (source) {
        transactions = transactions.filter(t => t.source === source);
      }

      if (startDate) {
        const start = new Date(startDate);
        transactions = transactions.filter(t => new Date(t.createdAt) >= start);
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        transactions = transactions.filter(t => new Date(t.createdAt) <= end);
      }

      // Sort by date (newest first)
      transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Build CSV content
      const csvHeaders = ['Date', 'Type', 'Source', 'Description', 'Amount', 'Balance After'];
      const csvRows = [csvHeaders.join(',')];

      let runningBalance = coinRecord.balance;

      // Reverse to calculate balance after each transaction
      const reversedTransactions = [...transactions].reverse();
      const transactionBalances = [];

      for (const txn of reversedTransactions) {
        transactionBalances.push(runningBalance);
        if (txn.type === 'earned') {
          runningBalance -= txn.amount;
        } else {
          runningBalance += txn.amount;
        }
      }

      transactionBalances.reverse();

      // Generate CSV rows
      transactions.forEach((txn, index) => {
        const date = new Date(txn.createdAt).toLocaleString('en-US');
        const type = txn.type.charAt(0).toUpperCase() + txn.type.slice(1);
        const source = txn.source.toUpperCase();
        const description = `"${txn.description.replace(/"/g, '""')}"`;
        const amount = txn.type === 'spent' ? `-${txn.amount}` : `+${txn.amount}`;
        const balanceAfter = transactionBalances[index];

        csvRows.push([date, type, source, description, amount, balanceAfter].join(','));
      });

      return {
        success: true,
        data: csvRows.join('\n'),
        message: "Transaction history exported successfully",
      };
    } catch (error) {
      errorLogger.error(
        { userId, error: error.message },
        "Error exporting transaction history"
      );
      throw error;
    }
  }

  // Get WTF transaction history
  static async getWtfTransactionHistory(userId, limit = 50) {
    try {
      const coinRecord = await Coin.findOrCreateForUser(userId);
      const transactions = coinRecord.getWtfTransactionHistory(limit);

      return {
        success: true,
        data: {
          transactions: transactions,
          totalWtfTransactions: transactions.length,
        },
        message: "WTF transaction history retrieved successfully",
      };
    } catch (error) {
      errorLogger.error(
        { userId, error: error.message },
        "Error getting WTF transaction history"
      );
      throw error;
    }
  }

  // Get top coin earners
  static async getTopEarners(limit = 10, period = "weekly") {
    try {
      const topEarners = await Coin.getTopEarners(limit, period);

      return {
        success: true,
        data: {
          topEarners: topEarners,
          period: period,
        },
        message: "Top coin earners retrieved successfully",
      };
    } catch (error) {
      errorLogger.error(
        { period, error: error.message },
        "Error getting top coin earners"
      );
      throw error;
    }
  }

  // Check if user is eligible for first pin bonus
  static async isEligibleForFirstPinBonus(userId) {
    try {
      const coinRecord = await Coin.findOrCreateForUser(userId);
      return coinRecord.wtfStats.pinsCreated === 0;
    } catch (error) {
      errorLogger.error(
        { userId, error: error.message },
        "Error checking first pin bonus eligibility"
      );
      throw error;
    }
  }

  // Check if user is eligible for weekly active bonus
  static async isEligibleForWeeklyActiveBonus(userId) {
    try {
      const coinRecord = await Coin.findOrCreateForUser(userId);
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);

      const weeklyTransactions = coinRecord.transactions.filter(
        (transaction) =>
          transaction.source === "wtf" && transaction.createdAt >= weekStart
      );

      return weeklyTransactions.length >= 5; // At least 5 WTF activities this week
    } catch (error) {
      errorLogger.error(
        { userId, error: error.message },
        "Error checking weekly active bonus eligibility"
      );
      throw error;
    }
  }

  // Get all coin transactions across all users (Admin only)
  static async getAllTransactions(limit = 100, skip = 0, filters = {}) {
    try {
      let query = {};

      // Apply filters if provided
      if (filters.userId) {
        query.userId = filters.userId;
      }
      if (filters.source && filters.source.trim() !== "") {
        query["transactions.source"] = filters.source;
      }
      // Note: pinType and date filtering are handled in the aggregation pipeline after lookup
      // We don't need to restrict the initial query for these filters

      // Aggregate to get all transactions with user details
      const pipeline = [
        { $match: query },
        { $unwind: "$transactions" },
        { $sort: { "transactions.createdAt": -1 } },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        // Lookup WTF pin information for pin-related transactions (left join to preserve all transactions)
        {
          $lookup: {
            from: "wtf_pins",
            localField: "transactions.wtfPinId",
            foreignField: "_id",
            as: "wtfPin",
          },
        },
        {
          $addFields: {
            "transactions.userName": { $arrayElemAt: ["$user.name", 0] },
            "transactions.userRole": { $arrayElemAt: ["$user.role", 0] },
            "transactions.userId": "$userId",
            "transactions.pinType": {
              $cond: {
                if: { $gt: [{ $size: "$wtfPin" }, 0] },
                then: { $arrayElemAt: ["$wtfPin.type", 0] },
                else: null,
              },
            },
            "transactions.pinTitle": {
              $cond: {
                if: { $gt: [{ $size: "$wtfPin" }, 0] },
                then: { $arrayElemAt: ["$wtfPin.title", 0] },
                else: null,
              },
            },
          },
        },
        // Apply pin type filter if specified
        ...(filters.pinType && filters.pinType.trim() !== ""
          ? [
              {
                $match: {
                  "transactions.pinType": filters.pinType,
                },
              },
            ]
          : []),
        // Apply date filters if specified
        ...(filters.dateFrom && filters.dateFrom.trim() !== ""
          ? [
              {
                $match: {
                  "transactions.createdAt": {
                    $gte: new Date(filters.dateFrom),
                  },
                },
              },
            ]
          : []),
        ...(filters.dateTo && filters.dateTo.trim() !== ""
          ? [
              {
                $match: {
                  "transactions.createdAt": {
                    $lte: new Date(filters.dateTo),
                  },
                },
              },
            ]
          : []),
        // Filter to only show student transactions (exclude admin and coach)
        {
          $match: {
            "transactions.userRole": { $in: ["student"] },
          },
        },
        {
          $project: {
            _id: 0,
            transaction: "$transactions",
          },
        },
        { $skip: skip },
        { $limit: limit },
      ];

      const transactions = await Coin.aggregate(pipeline);

      // Get total count for pagination (only student transactions)
      const countPipeline = [
        { $match: query },
        { $unwind: "$transactions" },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        // Lookup WTF pin information for pin-related transactions (needed for pin type filtering)
        {
          $lookup: {
            from: "wtf_pins",
            localField: "transactions.wtfPinId",
            foreignField: "_id",
            as: "wtfPin",
          },
        },
        {
          $addFields: {
            "transactions.userRole": { $arrayElemAt: ["$user.role", 0] },
            "transactions.pinType": {
              $cond: {
                if: { $gt: [{ $size: "$wtfPin" }, 0] },
                then: { $arrayElemAt: ["$wtfPin.type", 0] },
                else: null,
              },
            },
          },
        },
        // Apply pin type filter if specified
        ...(filters.pinType && filters.pinType.trim() !== ""
          ? [
              {
                $match: {
                  "transactions.pinType": filters.pinType,
                },
              },
            ]
          : []),
        // Apply date filters if specified
        ...(filters.dateFrom && filters.dateFrom.trim() !== ""
          ? [
              {
                $match: {
                  "transactions.createdAt": {
                    $gte: new Date(filters.dateFrom),
                  },
                },
              },
            ]
          : []),
        ...(filters.dateTo && filters.dateTo.trim() !== ""
          ? [
              {
                $match: {
                  "transactions.createdAt": {
                    $lte: new Date(filters.dateTo),
                  },
                },
              },
            ]
          : []),
        // Filter to only count student transactions
        {
          $match: {
            "transactions.userRole": { $in: ["student"] },
          },
        },
        { $count: "total" },
      ];

      const countResult = await Coin.aggregate(countPipeline);
      const totalTransactions =
        countResult.length > 0 ? countResult[0].total : 0;

      return {
        success: true,
        data: {
          transactions: transactions.map((t) => t.transaction),
          totalTransactions,
          pagination: {
            page: Math.floor(skip / limit) + 1,
            limit,
            total: totalTransactions,
            pages: Math.ceil(totalTransactions / limit),
          },
        },
        message: "Student coin transactions retrieved successfully",
      };
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error getting student coin transactions"
      );
      throw error;
    }
  }
}

module.exports = CoinService;
