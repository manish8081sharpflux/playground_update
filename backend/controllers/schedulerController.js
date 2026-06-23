const { errorLogger, logger } = require("../config/pino-config");
const { HTTP_STATUS_CODE } = require("../constants/general");
const schedulerService = require("../services/scheduler");
const WtfService = require("../services/wtf");

// Initialize scheduler
exports.initializeScheduler = async (req, res) => {
  try {
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
      },
      "Request received to initialize WTF scheduler"
    );

    await schedulerService.initialize();

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
      },
      "WTF scheduler initialized successfully"
    );

    res.status(HTTP_STATUS_CODE.OK).json({
      success: true,
      data: {
        message: "WTF scheduler initialized successfully",
        jobs: schedulerService.getJobStatus(),
      },
      message: "Scheduler initialized successfully",
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
      "Error initializing WTF scheduler"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Get scheduler status
exports.getSchedulerStatus = async (req, res) => {
  try {
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
      },
      "Request received to get WTF scheduler status"
    );

    const jobStatus = schedulerService.getJobStatus();

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
        jobCount: Object.keys(jobStatus).length,
      },
      "WTF scheduler status retrieved successfully"
    );

    res.status(HTTP_STATUS_CODE.OK).json({
      success: true,
      data: {
        isInitialized: schedulerService.isInitialized,
        jobs: jobStatus,
        totalJobs: Object.keys(jobStatus).length,
      },
      message: "Scheduler status retrieved successfully",
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
      "Error getting WTF scheduler status"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Stop all scheduler jobs
exports.stopScheduler = async (req, res) => {
  try {
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
      },
      "Request received to stop WTF scheduler"
    );

    schedulerService.stopAllJobs();

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
      },
      "WTF scheduler stopped successfully"
    );

    res.status(HTTP_STATUS_CODE.OK).json({
      success: true,
      data: {
        message: "WTF scheduler stopped successfully",
        jobs: schedulerService.getJobStatus(),
      },
      message: "Scheduler stopped successfully",
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
      "Error stopping WTF scheduler"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Restart scheduler
exports.restartScheduler = async (req, res) => {
  try {
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
      },
      "Request received to restart WTF scheduler"
    );

    await schedulerService.restartAllJobs();

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
      },
      "WTF scheduler restarted successfully"
    );

    res.status(HTTP_STATUS_CODE.OK).json({
      success: true,
      data: {
        message: "WTF scheduler restarted successfully",
        jobs: schedulerService.getJobStatus(),
      },
      message: "Scheduler restarted successfully",
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
      "Error restarting WTF scheduler"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Manually trigger pin expiration job
exports.triggerPinExpiration = async (req, res) => {
  try {
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
      },
      "Request received to manually trigger WTF pin expiration"
    );

    const startTime = Date.now();
    const result = await schedulerService.processExpiredPins();
    const duration = Date.now() - startTime;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
        expiredPinsCount: result.expiredPinsCount,
        duration,
      },
      "WTF pin expiration triggered manually"
    );

    res.status(HTTP_STATUS_CODE.OK).json({
      success: true,
      data: {
        expiredPinsCount: result.expiredPinsCount,
        duration,
        message: "Pin expiration job executed successfully",
      },
      message: "Pin expiration job executed successfully",
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
      "Error triggering WTF pin expiration"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Manually trigger FIFO management job
exports.triggerFifoManagement = async (req, res) => {
  try {
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
      },
      "Request received to manually trigger WTF FIFO management"
    );

    const startTime = Date.now();
    const result = await schedulerService.processFifoManagement();
    const duration = Date.now() - startTime;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
        fifoPinsCount: result.fifoPinsCount,
        duration,
      },
      "WTF FIFO management triggered manually"
    );

    res.status(HTTP_STATUS_CODE.OK).json({
      success: true,
      data: {
        fifoPinsCount: result.fifoPinsCount,
        duration,
        message: "FIFO management job executed successfully",
      },
      message: "FIFO management job executed successfully",
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
      "Error triggering WTF FIFO management"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Manually trigger lifecycle management
exports.triggerLifecycleManagement = async (req, res) => {
  try {
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
      },
      "Request received to manually trigger WTF lifecycle management"
    );

    const startTime = Date.now();

    // Execute both pin expiration and FIFO management
    const expirationResult = await schedulerService.processExpiredPins();
    const fifoResult = await schedulerService.processFifoManagement();

    const duration = Date.now() - startTime;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
        expiredPinsCount: expirationResult.expiredPinsCount,
        fifoPinsCount: fifoResult.fifoPinsCount,
        duration,
      },
      "WTF lifecycle management triggered manually"
    );

    res.status(HTTP_STATUS_CODE.OK).json({
      success: true,
      data: {
        expiredPinsCount: expirationResult.expiredPinsCount,
        fifoPinsCount: fifoResult.fifoPinsCount,
        totalPinsProcessed:
          expirationResult.expiredPinsCount + fifoResult.fifoPinsCount,
        duration,
        message: "Lifecycle management job executed successfully",
      },
      message: "Lifecycle management job executed successfully",
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
      "Error triggering WTF lifecycle management"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Get lifecycle statistics
exports.getLifecycleStats = async (req, res) => {
  try {
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
      },
      "Request received to get WTF lifecycle statistics"
    );

    // Get active pins count
    const activePinsResult = await WtfService.getActivePinsForStudents({
      limit: 1000,
    });
    const activePinsCount = activePinsResult.success
      ? activePinsResult.data.pins.length
      : 0;

    // Get expired pins count (pins that should be expired)
    const expiredPinsResult = await WtfService.getExpiredPins();
    const expiredPinsCount = expiredPinsResult.success
      ? expiredPinsResult.data.length
      : 0;

    // Get FIFO pins count (pins that should be removed due to FIFO)
    const fifoPinsResult = await WtfService.getPinsForFifoManagement();
    const fifoPinsCount = fifoPinsResult.success
      ? fifoPinsResult.data.length
      : 0;

    const stats = {
      activePinsCount,
      expiredPinsCount,
      fifoPinsCount,
      totalPinsToProcess: expiredPinsCount + fifoPinsCount,
      schedulerStatus: schedulerService.getJobStatus(),
    };

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
        stats,
      },
      "WTF lifecycle statistics retrieved successfully"
    );

    res.status(HTTP_STATUS_CODE.OK).json({
      success: true,
      data: stats,
      message: "Lifecycle statistics retrieved successfully",
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
      "Error getting WTF lifecycle statistics"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};
