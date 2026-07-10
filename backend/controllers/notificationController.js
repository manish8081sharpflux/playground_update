const { errorLogger, logger } = require("../config/pino-config");
const NotificationService = require("../services/notification");
const { HTTP_STATUS_CODE } = require("../constants/general");

// ==================== USER NOTIFICATION ENDPOINTS ====================

/**
 * Get notifications for the authenticated user
 */
exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, skip = 0, unreadOnly = false } = req.query;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId,
        limit,
        skip,
      },
      "Request received to get user notifications"
    );

    const parsedLimit = parseInt(limit, 10);
    const parsedSkip = parseInt(skip, 10);
    const result = unreadOnly === "true" || unreadOnly === true
      ? await NotificationService.getUnreadNotifications(userId, parsedLimit, parsedSkip)
      : await NotificationService.getUserNotifications(userId, parsedLimit, parsedSkip);

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          userId,
          count: result.data.length,
        },
        "User notifications retrieved successfully"
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          error: result.message,
          userId,
        },
        "Failed to retrieve user notifications"
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
      "Error occurred while retrieving user notifications"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

/**
 * Get unread notification count for the authenticated user
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId,
      },
      "Request received to get unread notification count"
    );

    const result = await NotificationService.getSmartUnreadCount(userId);

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          userId,
          count: result.data.count,
        },
        "Unread count retrieved successfully"
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          error: result.message,
          userId,
        },
        "Failed to retrieve unread count"
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
      "Error occurred while retrieving unread count"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

/**
 * Mark a specific notification as read
 */
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId,
        notificationId,
      },
      "Request received to mark notification as read"
    );

    const result = await NotificationService.markAsRead(notificationId, userId);

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          userId,
          notificationId,
        },
        "Notification marked as read successfully"
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          error: result.message,
          userId,
          notificationId,
        },
        "Failed to mark notification as read"
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
        notificationId: req.params?.notificationId,
      },
      "Error occurred while marking notification as read"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

/**
 * Mark all notifications as read for the authenticated user
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId,
      },
      "Request received to mark all notifications as read"
    );

    const result = await NotificationService.markAllAsRead(userId);

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          userId,
        },
        "All notifications marked as read successfully"
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          error: result.message,
          userId,
        },
        "Failed to mark all notifications as read"
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
      "Error occurred while marking all notifications as read"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

/**
 * Update user's last viewed time (for smart notification filtering)
 */
exports.updateLastViewed = async (req, res) => {
  try {
    const userId = req.user.id;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId,
      },
      "Request received to update user last viewed time"
    );

    const result = await NotificationService.updateUserLastViewed(userId);

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          userId,
        },
        "User last viewed time updated successfully"
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          error: result.message,
          userId,
        },
        "Failed to update user last viewed time"
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
      "Error occurred while updating user last viewed time"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

/**
 * Delete a specific notification
 */
exports.deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId,
        notificationId,
      },
      "Request received to delete notification"
    );

    const result = await NotificationService.deleteNotification(
      notificationId,
      userId
    );

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          userId,
          notificationId,
        },
        "Notification deleted successfully"
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          error: result.message,
          userId,
          notificationId,
        },
        "Failed to delete notification"
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
        notificationId: req.params?.notificationId,
      },
      "Error occurred while deleting notification"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// ==================== ADMIN NOTIFICATION ENDPOINTS ====================

/**
 * Create a system-wide announcement (admin only)
 */
exports.createSystemAnnouncement = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { title, message, priority = "MEDIUM", metadata = {} } = req.body;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        adminId,
        title,
        priority,
      },
      "Request received to create system announcement"
    );

    // Validate required fields
    if (!title || !message) {
      return res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
        success: false,
        message: "Title and message are required",
      });
    }

    const result = await NotificationService.createSystemAnnouncement(
      title,
      message,
      priority,
      metadata
    );

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          adminId,
          title,
          priority,
        },
        "System announcement created successfully"
      );
      res.status(HTTP_STATUS_CODE.CREATED).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          error: result.message,
          adminId,
          title,
        },
        "Failed to create system announcement"
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
        adminId: req.user?.id,
      },
      "Error occurred while creating system announcement"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

/**
 * Create an ISF shop update notification (admin only)
 */
exports.createShopUpdateNotification = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { title, message, metadata = {} } = req.body;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        adminId,
        title,
      },
      "Request received to create shop update notification"
    );

    // Validate required fields
    if (!title || !message) {
      return res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
        success: false,
        message: "Title and message are required",
      });
    }

    const result = await NotificationService.createShopUpdateNotification(
      title,
      message,
      metadata
    );

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          adminId,
          title,
        },
        "Shop update notification created successfully"
      );
      res.status(HTTP_STATUS_CODE.CREATED).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          error: result.message,
          adminId,
          title,
        },
        "Failed to create shop update notification"
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
        adminId: req.user?.id,
      },
      "Error occurred while creating shop update notification"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

/**
 * Send a personal notification to a specific student (admin only)
 */
exports.sendAdminPersonalNotification = async (req, res) => {
  try {
    const adminId = req.user.id;
    const {
      studentId,
      title,
      message,
      category = "GENERAL",
      metadata = {},
    } = req.body;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        adminId,
        studentId,
        title,
      },
      "Request received to send admin personal notification"
    );

    // Validate required fields
    if (!studentId || !title || !message) {
      return res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
        success: false,
        message: "Student ID, title, and message are required",
      });
    }

    const result = await NotificationService.createPersonalNotification(
      studentId,
      title,
      message,
      category,
      { adminId, ...metadata }
    );

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          adminId,
          studentId,
          title,
        },
        "Admin personal notification sent successfully"
      );
      res.status(HTTP_STATUS_CODE.CREATED).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          error: result.message,
          adminId,
          studentId,
          title,
        },
        "Failed to send admin personal notification"
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
        adminId: req.user?.id,
      },
      "Error occurred while sending admin personal notification"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

/**
 * Get notification statistics for admin dashboard
 */
exports.getNotificationStats = async (req, res) => {
  try {
    const adminId = req.user.id;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        adminId,
      },
      "Request received to get notification statistics"
    );

    const result = await NotificationService.getNotificationStats();

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          adminId,
        },
        "Notification statistics retrieved successfully"
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          error: result.message,
          adminId,
        },
        "Failed to retrieve notification statistics"
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
        adminId: req.user?.id,
      },
      "Error occurred while retrieving notification statistics"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

/**
 * Cleanup expired notifications (admin only)
 */
exports.cleanupExpiredNotifications = async (req, res) => {
  try {
    const adminId = req.user.id;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        adminId,
      },
      "Request received to cleanup expired notifications"
    );

    const result = await NotificationService.cleanupExpiredNotifications();

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          adminId,
          deletedCount: result.data.deletedCount,
        },
        "Expired notifications cleaned up successfully"
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          error: result.message,
          adminId,
        },
        "Failed to cleanup expired notifications"
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
        adminId: req.user?.id,
      },
      "Error occurred while cleaning up expired notifications"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// ==================== COACH NOTIFICATION ENDPOINTS ====================

/**
 * Send a message notification to a student (coach only)
 */
exports.sendCoachMessage = async (req, res) => {
  try {
    const coachId = req.user.id;
    const { studentId, message, metadata = {} } = req.body;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        coachId,
        studentId,
      },
      "Request received to send coach message notification"
    );

    // Validate required fields
    if (!studentId || !message) {
      return res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
        success: false,
        message: "Student ID and message are required",
      });
    }

    // Get coach name for the notification
    const coachName = req.user.name || "Your Coach";

    const result = await NotificationService.notifyCoachMessage(
      studentId,
      coachName,
      message,
      { coachId, ...metadata }
    );

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          coachId,
          studentId,
        },
        "Coach message notification sent successfully"
      );
      res.status(HTTP_STATUS_CODE.CREATED).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          error: result.message,
          coachId,
          studentId,
        },
        "Failed to send coach message notification"
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
        coachId: req.user?.id,
      },
      "Error occurred while sending coach message notification"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

