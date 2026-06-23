const { errorLogger, logger } = require("../config/pino-config");
const { HTTP_STATUS_CODE } = require("../constants/general");
const wtfWebSocketService = require("../services/wtfWebSocket");

// Get WebSocket connection status
exports.getWebSocketStatus = async (req, res) => {
  try {
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
      },
      "Request received to get WTF WebSocket status"
    );

    const stats = wtfWebSocketService.getConnectionStats();

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
        totalConnections: stats.totalConnections,
        totalRooms: stats.totalRooms,
      },
      "WTF WebSocket status retrieved successfully"
    );

    res.status(HTTP_STATUS_CODE.OK).json({
      success: true,
      data: {
        isInitialized: wtfWebSocketService.isInitialized,
        stats: stats,
      },
      message: "WebSocket status retrieved successfully",
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
      "Error getting WTF WebSocket status"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Initialize WebSocket server
exports.initializeWebSocket = async (req, res) => {
  try {
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
      },
      "Request received to initialize WTF WebSocket server"
    );

    // Note: WebSocket server should be initialized with the HTTP server
    // This endpoint is for checking initialization status
    const isInitialized = wtfWebSocketService.isInitialized;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
        isInitialized,
      },
      "WTF WebSocket initialization status checked"
    );

    res.status(HTTP_STATUS_CODE.OK).json({
      success: true,
      data: {
        isInitialized: isInitialized,
        message: isInitialized
          ? "WebSocket server is already initialized"
          : "WebSocket server needs to be initialized with HTTP server",
      },
      message: "WebSocket initialization status checked",
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
      "Error checking WTF WebSocket initialization"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Close all WebSocket connections
exports.closeAllConnections = async (req, res) => {
  try {
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
      },
      "Request received to close all WTF WebSocket connections"
    );

    wtfWebSocketService.closeAllConnections();

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
      },
      "All WTF WebSocket connections closed successfully"
    );

    res.status(HTTP_STATUS_CODE.OK).json({
      success: true,
      data: {
        message: "All WebSocket connections closed successfully",
      },
      message: "WebSocket connections closed successfully",
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
      "Error closing WTF WebSocket connections"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Manually trigger pin created event
exports.triggerPinCreated = async (req, res) => {
  try {
    const { pinData } = req.body;

    if (!pinData) {
      return res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
        success: false,
        message: "Pin data is required",
      });
    }

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
        pinId: pinData._id,
      },
      "Request received to trigger WTF pin created event"
    );

    wtfWebSocketService.handlePinCreated(pinData);

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
        pinId: pinData._id,
      },
      "WTF pin created event triggered successfully"
    );

    res.status(HTTP_STATUS_CODE.OK).json({
      success: true,
      data: {
        message: "Pin created event triggered successfully",
        pinId: pinData._id,
      },
      message: "Pin created event triggered successfully",
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
      "Error triggering WTF pin created event"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Manually trigger pin liked event
exports.triggerPinLiked = async (req, res) => {
  try {
    const { pinId, userId, likeData } = req.body;

    if (!pinId || !userId) {
      return res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
        success: false,
        message: "Pin ID and user ID are required",
      });
    }

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
        pinId,
        targetUserId: userId,
      },
      "Request received to trigger WTF pin liked event"
    );

    wtfWebSocketService.handlePinLiked(pinId, userId, likeData || {});

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
        pinId,
        targetUserId: userId,
      },
      "WTF pin liked event triggered successfully"
    );

    res.status(HTTP_STATUS_CODE.OK).json({
      success: true,
      data: {
        message: "Pin liked event triggered successfully",
        pinId,
        userId,
      },
      message: "Pin liked event triggered successfully",
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
      "Error triggering WTF pin liked event"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Manually trigger pin seen event
exports.triggerPinSeen = async (req, res) => {
  try {
    const { pinId, userId, viewData } = req.body;

    if (!pinId || !userId) {
      return res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
        success: false,
        message: "Pin ID and user ID are required",
      });
    }

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
        pinId,
        targetUserId: userId,
      },
      "Request received to trigger WTF pin seen event"
    );

    wtfWebSocketService.handlePinSeen(pinId, userId, viewData || {});

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
        pinId,
        targetUserId: userId,
      },
      "WTF pin seen event triggered successfully"
    );

    res.status(HTTP_STATUS_CODE.OK).json({
      success: true,
      data: {
        message: "Pin seen event triggered successfully",
        pinId,
        userId,
      },
      message: "Pin seen event triggered successfully",
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
      "Error triggering WTF pin seen event"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Manually trigger submission created event
exports.triggerSubmissionCreated = async (req, res) => {
  try {
    const { submissionData } = req.body;

    if (!submissionData) {
      return res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
        success: false,
        message: "Submission data is required",
      });
    }

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
        submissionId: submissionData._id,
      },
      "Request received to trigger WTF submission created event"
    );

    wtfWebSocketService.handleSubmissionCreated(submissionData);

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
        submissionId: submissionData._id,
      },
      "WTF submission created event triggered successfully"
    );

    res.status(HTTP_STATUS_CODE.OK).json({
      success: true,
      data: {
        message: "Submission created event triggered successfully",
        submissionId: submissionData._id,
      },
      message: "Submission created event triggered successfully",
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
      "Error triggering WTF submission created event"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Manually trigger submission reviewed event
exports.triggerSubmissionReviewed = async (req, res) => {
  try {
    const { submissionId, reviewData, submissionData } = req.body;

    if (!submissionId || !reviewData) {
      return res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
        success: false,
        message: "Submission ID and review data are required",
      });
    }

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
        submissionId,
      },
      "Request received to trigger WTF submission reviewed event"
    );

    wtfWebSocketService.handleSubmissionReviewed(submissionId, reviewData);

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
        submissionId,
      },
      "WTF submission reviewed event triggered successfully"
    );

    res.status(HTTP_STATUS_CODE.OK).json({
      success: true,
      data: {
        message: "Submission reviewed event triggered successfully",
        submissionId,
      },
      message: "Submission reviewed event triggered successfully",
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
      "Error triggering WTF submission reviewed event"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Broadcast message to all connected clients
exports.broadcastMessage = async (req, res) => {
  try {
    const { message, type = "custom" } = req.body;

    if (!message) {
      return res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
        success: false,
        message: "Message is required",
      });
    }

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
        messageType: type,
      },
      "Request received to broadcast WTF WebSocket message"
    );

    const wsMessage = {
      type: type,
      data: {
        message: message,
        timestamp: new Date().toISOString(),
        broadcastBy: req.user?.id,
      },
    };

    wtfWebSocketService.broadcastToAll(wsMessage);

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
        messageType: type,
      },
      "WTF WebSocket message broadcasted successfully"
    );

    res.status(HTTP_STATUS_CODE.OK).json({
      success: true,
      data: {
        message: "Message broadcasted successfully",
        type: type,
      },
      message: "Message broadcasted successfully",
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
      "Error broadcasting WTF WebSocket message"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};
