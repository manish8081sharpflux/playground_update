const { errorLogger, logger } = require("../config/pino-config");
const { HTTP_STATUS_CODE } = require("../constants/general");
const CoinService = require("../services/coin");
const { default: mongoose } = require("mongoose");

// Get user coin balance
exports.getUserBalance = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(HTTP_STATUS_CODE.UNAUTHORIZED).json({
        success: false,
        message: "User authentication required",
      });
    }

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId,
      },
      `Request received to fetch user coin balance`
    );

    const result = await CoinService.getUserBalance(userId);

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          userId,
          balance: result.data.balance,
        },
        `Successfully fetched user coin balance`
      );
      // Set cache-control headers to prevent caching of balance data
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          userId,
          error: result.message,
        },
        `Failed to fetch user coin balance`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
        error: error.message,
      },
      `Error occurred while fetching user coin balance`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Get user coin statistics
exports.getUserCoinStats = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(HTTP_STATUS_CODE.UNAUTHORIZED).json({
        success: false,
        message: "User authentication required",
      });
    }

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId,
      },
      `Request received to fetch user coin statistics`
    );

    const result = await CoinService.getUserCoinStats(userId);

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          userId,
        },
        `Successfully fetched user coin statistics`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          userId,
          error: result.message,
        },
        `Failed to fetch user coin statistics`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
        error: error.message,
      },
      `Error occurred while fetching user coin statistics`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Get user transaction history (Sprint5-Story-09: Enhanced with filtering)
exports.getUserTransactionHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { type, source, startDate, endDate, page, limit, sortBy } = req.query;

    if (!userId) {
      return res.status(HTTP_STATUS_CODE.UNAUTHORIZED).json({
        success: false,
        message: "User authentication required",
      });
    }

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId,
        query: req.query,
      },
      `Request received to fetch user transaction history`
    );

    const result = await CoinService.getUserTransactionHistory(userId, {
      type,
      source,
      startDate,
      endDate,
      page,
      limit,
      sortBy
    });

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          userId,
          transactionsCount: result.data.transactions.length,
        },
        `Successfully fetched user transaction history`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          userId,
          error: result.message,
        },
        `Failed to fetch user transaction history`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
        error: error.message,
      },
      `Error occurred while fetching user transaction history`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Export user transaction history as CSV (Sprint5-Story-09: AC7)
exports.exportTransactionHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { type, source, startDate, endDate } = req.query;

    if (!userId) {
      return res.status(HTTP_STATUS_CODE.UNAUTHORIZED).json({
        success: false,
        message: "User authentication required",
      });
    }

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId,
        query: req.query,
      },
      `Request received to export transaction history`
    );

    const result = await CoinService.exportTransactionHistory(userId, {
      type,
      source,
      startDate,
      endDate
    });

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          userId,
        },
        `Successfully exported transaction history`
      );

      // Set headers for CSV download
      const filename = `transaction-history-${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(HTTP_STATUS_CODE.OK).send(result.data);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          userId,
          error: result.message,
        },
        `Failed to export transaction history`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
        error: error.message,
      },
      `Error occurred while exporting transaction history`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Get WTF transaction history
exports.getWtfTransactionHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { limit = 50 } = req.query;

    if (!userId) {
      return res.status(HTTP_STATUS_CODE.UNAUTHORIZED).json({
        success: false,
        message: "User authentication required",
      });
    }

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId,
        query: req.query,
      },
      `Request received to fetch WTF transaction history`
    );

    const result = await CoinService.getWtfTransactionHistory(
      userId,
      parseInt(limit)
    );

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          userId,
          wtfTransactionsCount: result.data.transactions.length,
        },
        `Successfully fetched WTF transaction history`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          userId,
          error: result.message,
        },
        `Failed to fetch WTF transaction history`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
        error: error.message,
      },
      `Error occurred while fetching WTF transaction history`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Get top coin earners (Admin only)
exports.getTopEarners = async (req, res) => {
  try {
    const { limit = 10, period = "weekly" } = req.query;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        query: req.query,
        userId: req.user?.id,
      },
      `Request received to fetch top coin earners`
    );

    const result = await CoinService.getTopEarners(parseInt(limit), period);

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          topEarnersCount: result.data.topEarners.length,
          period,
          userId: req.user?.id,
        },
        `Successfully fetched top coin earners`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          error: result.message,
          userId: req.user?.id,
        },
        `Failed to fetch top coin earners`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        error: error.message,
        userId: req.user?.id,
      },
      `Error occurred while fetching top coin earners`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Check first pin bonus eligibility
exports.checkFirstPinBonusEligibility = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(HTTP_STATUS_CODE.UNAUTHORIZED).json({
        success: false,
        message: "User authentication required",
      });
    }

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId,
      },
      `Request received to check first pin bonus eligibility`
    );

    const isEligible = await CoinService.isEligibleForFirstPinBonus(userId);

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId,
        isEligible,
      },
      `Successfully checked first pin bonus eligibility`
    );

    res.status(HTTP_STATUS_CODE.OK).json({
      success: true,
      data: {
        isEligible: isEligible,
      },
      message: "First pin bonus eligibility checked successfully",
    });
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
        error: error.message,
      },
      `Error occurred while checking first pin bonus eligibility`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Check weekly active bonus eligibility (Authenticated users)
exports.checkWeeklyActiveBonusEligibility = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(HTTP_STATUS_CODE.UNAUTHORIZED).json({
        success: false,
        message: "User authentication required",
      });
    }

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId,
      },
      `Request received to check weekly active bonus eligibility`
    );

    const result = await CoinService.isEligibleForWeeklyActiveBonus(userId);

    if (result) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          userId,
          eligible: result,
        },
        `Successfully checked weekly active bonus eligibility`
      );
      res.status(HTTP_STATUS_CODE.OK).json({
        success: true,
        data: { eligible: result },
        message: "Weekly active bonus eligibility checked successfully",
      });
    } else {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          userId,
          eligible: result,
        },
        `User not eligible for weekly active bonus`
      );
      res.status(HTTP_STATUS_CODE.OK).json({
        success: true,
        data: { eligible: result },
        message: "User not eligible for weekly active bonus",
      });
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
        error: error.message,
      },
      `Error occurred while checking weekly active bonus eligibility`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Get all coin transactions across all users (Admin only)
exports.getAllTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      userId,
      type,
      source,
      dateFrom,
      dateTo,
    } = req.query;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
        query: req.query,
      },
      `Request received to fetch student coin transactions`
    );

    const filters = {};
    if (userId) filters.userId = userId;
    if (type) filters.type = type;
    if (source) filters.source = source;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    // Map pinType filter to type filter for WTF pin filtering
    if (req.query.pinType) {
      filters.pinType = req.query.pinType;
    }

    const result = await CoinService.getAllTransactions(
      parseInt(limit),
      (parseInt(page) - 1) * parseInt(limit),
      filters
    );

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          userId: req.user?.id,
          transactionsCount: result.data.transactions.length,
        },
        `Successfully fetched student coin transactions`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          userId: req.user?.id,
          error: result.message,
        },
        `Failed to fetch student coin transactions`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
        error: error.message,
      },
      `Error occurred while fetching student coin transactions`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};
