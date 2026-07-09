const { errorLogger, logger } = require("../config/pino-config");
const Notification = require("../models/notification");
const User = require("../models/user");

class NotificationService {
  /**
   * Create a personal notification for a specific user
   */
  static async createPersonalNotification(
    userId,
    title,
    message,
    category,
    metadata = {}
  ) {
    try {
      const notification = await Notification.createPersonal(
        userId,
        title,
        message,
        category,
        metadata
      );

      logger.info(
        { userId, title, category },
        "Personal notification created successfully"
      );

      return {
        success: true,
        data: notification,
        message: "Personal notification created successfully",
      };
    } catch (error) {
      errorLogger.error(
        { userId, title, category, error: error.message },
        "Error creating personal notification"
      );
      throw error;
    }
  }

  /**
   * Create a common notification for multiple users or all users
   */
  static async createCommonNotification(
    title,
    message,
    category,
    targetAudience = null,
    metadata = {}
  ) {
    try {
      const notification = await Notification.createCommon(
        title,
        message,
        category,
        targetAudience,
        metadata
      );

      logger.info(
        { title, category, targetAudience },
        "Common notification created successfully"
      );

      return {
        success: true,
        data: notification,
        message: "Common notification created successfully",
      };
    } catch (error) {
      errorLogger.error(
        { title, category, targetAudience, error: error.message },
        "Error creating common notification"
      );
      throw error;
    }
  }

  /**
   * Create a system-wide notification for all users
   */
  static async createSystemWideNotification(
    title,
    message,
    category,
    metadata = {}
  ) {
    try {
      const notification = await Notification.createSystemWide(
        title,
        message,
        category,
        metadata
      );

      logger.info(
        { title, category },
        "System-wide notification created successfully"
      );

      return {
        success: true,
        data: notification,
        message: "System-wide notification created successfully",
      };
    } catch (error) {
      errorLogger.error(
        { title, category, error: error.message },
        "Error creating system-wide notification"
      );
      throw error;
    }
  }

  /**
   * Get notifications for a specific user (personal + common)
   */
  static async getUserNotifications(userId, limit = 50, skip = 0) {
    try {
      const notifications = await Notification.getUserNotifications(
        userId,
        limit,
        skip
      );

      logger.info(
        { userId, count: notifications.length },
        "User notifications retrieved successfully"
      );

      return {
        success: true,
        data: notifications,
        message: "User notifications retrieved successfully",
      };
    } catch (error) {
      errorLogger.error(
        { userId, error: error.message },
        "Error retrieving user notifications"
      );
      throw error;
    }
  }

  /**
   * Get user notifications with smart filtering (based on last viewed time)
   */
  static async getUserNotificationsSmart(userId, limit = 50, skip = 0) {
    try {
      const notifications = await Notification.getUserNotificationsSmart(
        userId,
        limit,
        skip
      );

      logger.info(
        { userId, count: notifications.length },
        "Smart user notifications retrieved successfully"
      );

      return {
        success: true,
        data: notifications,
        message: "Smart user notifications retrieved successfully",
      };
    } catch (error) {
      errorLogger.error(
        { userId, error: error.message },
        "Error retrieving smart user notifications"
      );
      throw error;
    }
  }

  /**
   * Get unread notification count for a user
   */
  static async getUnreadCount(userId) {
    try {
      const count = await Notification.getUnreadCount(userId);

      return {
        success: true,
        data: { count },
        message: "Unread count retrieved successfully",
      };
    } catch (error) {
      errorLogger.error(
        { userId, error: error.message },
        "Error retrieving unread count"
      );
      throw error;
    }
  }

  /**
   * Get smart unread count based on last viewed time
   */
  static async getSmartUnreadCount(userId) {
    try {
      const count = await Notification.getSmartUnreadCount(userId);

      return {
        success: true,
        data: { count },
        message: "Smart unread count retrieved successfully",
      };
    } catch (error) {
      errorLogger.error(
        { userId, error: error.message },
        "Error retrieving smart unread count"
      );
      throw error;
    }
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findById(notificationId);

      if (!notification) {
        return {
          success: false,
          message: "Notification not found",
        };
      }

      // Check if user owns this notification or if it's a global notification
      if (
        notification.userId &&
        notification.userId.toString() !== userId.toString()
      ) {
        return {
          success: false,
          message: "Unauthorized to mark this notification as read",
        };
      }

      await notification.markAsRead();

      logger.info(
        { notificationId, userId },
        "Notification marked as read successfully"
      );

      return {
        success: true,
        message: "Notification marked as read successfully",
      };
    } catch (error) {
      errorLogger.error(
        { notificationId, userId, error: error.message },
        "Error marking notification as read"
      );
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId) {
    try {
      await Notification.markAllAsRead(userId);

      logger.info({ userId }, "All notifications marked as read successfully");

      return {
        success: true,
        message: "All notifications marked as read successfully",
      };
    } catch (error) {
      errorLogger.error(
        { userId, error: error.message },
        "Error marking all notifications as read"
      );
      throw error;
    }
  }

  /**
   * Update user's last viewed time (for smart notification filtering)
   */
  static async updateUserLastViewed(userId) {
    try {
      const UserNotificationView = require("../models/userNotificationView");
      await UserNotificationView.updateLastViewed(userId);

      logger.info({ userId }, "User last viewed time updated successfully");

      return {
        success: true,
        message: "User last viewed time updated successfully",
      };
    } catch (error) {
      errorLogger.error(
        { userId, error: error.message },
        "Error updating user last viewed time"
      );
      throw error;
    }
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(notificationId, userId) {
    try {
      const notification = await Notification.findById(notificationId);

      if (!notification) {
        return {
          success: false,
          message: "Notification not found",
        };
      }

      // Check if user owns this notification
      if (
        notification.userId &&
        notification.userId.toString() !== userId.toString()
      ) {
        return {
          success: false,
          message: "Unauthorized to delete this notification",
        };
      }

      await Notification.findByIdAndDelete(notificationId);

      logger.info(
        { notificationId, userId },
        "Notification deleted successfully"
      );

      return {
        success: true,
        message: "Notification deleted successfully",
      };
    } catch (error) {
      errorLogger.error(
        { notificationId, userId, error: error.message },
        "Error deleting notification"
      );
      throw error;
    }
  }

  /**
   * Create notification when student's work gets pinned to WTF
   * Sends both personal notification to student AND common notification to all students
   */
  static async notifyWtfPinAdded(studentId, pinData) {
    try {
      // 1. Personal notification for the student
      const personalTitle = "Work Featured on WTF!";
      const personalMessage = `Your ${pinData.contentType.toLowerCase()} "${
        pinData.title
      }" has been featured on the WTF board!`;
      const personalCategory = "WTF_PIN_ADDED";
      const personalMetadata = {
        pinId: pinData.pinId,
        contentType: pinData.contentType,
        pinnedBy: pinData.pinnedBy?.adminId,
        actionUrl: `/wtf/pin/${pinData.pinId}`,
        isPersonal: true,
      };

      const personalResult = await this.createPersonalNotification(
        studentId,
        personalTitle,
        personalMessage,
        personalCategory,
        personalMetadata
      );

      // 2. Common notification for all students
      const commonTitle = "New Content Featured on WTF!";
      const commonMessage = `A new ${pinData.contentType.toLowerCase()} "${
        pinData.title
      }" has been featured on the WTF board! Check it out!`;
      const commonCategory = "WTF_PIN_ADDED";
      const commonMetadata = {
        pinId: pinData.pinId,
        contentType: pinData.contentType,
        pinnedBy: pinData.pinnedBy?.adminId,
        actionUrl: `/wtf/pin/${pinData.pinId}`,
        isPersonal: false,
      };

      const commonResult = await this.createCommonNotification(
        commonTitle,
        commonMessage,
        commonCategory,
        ["student"], // Target audience: students only
        commonMetadata
      );

      logger.info(
        {
          studentId,
          pinId: pinData.pinId,
          personalResult: personalResult.success,
          commonResult: commonResult.success,
        },
        "WTF pin notifications (personal + common) created successfully"
      );

      return {
        success: true,
        personal: personalResult,
        common: commonResult,
        message: "WTF pin notifications created successfully",
      };
    } catch (error) {
      errorLogger.error(
        { studentId, pinData: pinData?.pinId, error: error.message },
        "Error creating WTF pin notifications"
      );
      // Don't throw - notification failure shouldn't block pin creation
      return {
        success: false,
        message: "Failed to create notifications",
        error: error.message,
      };
    }
  }

  /**
   * Create notification when coins are awarded to a student
   */
  static async notifyCoinsAwarded(
    studentId,
    coinAmount,
    source,
    description,
    metadata = {}
  ) {
    try {
      const title = "ISF Coins Awarded!";
      const message = `You've earned ${coinAmount} ISF coins for: ${description}`;
      const category = "COINS_AWARDED";
      const notificationMetadata = {
        coinAmount,
        coinSource: source,
        actionUrl: "/dashboard",
        ...metadata,
      };

      const result = await this.createPersonalNotification(
        studentId,
        title,
        message,
        category,
        notificationMetadata
      );

      logger.info(
        { studentId, coinAmount, source },
        "Coin award notification created successfully"
      );

      return result;
    } catch (error) {
      errorLogger.error(
        { studentId, coinAmount, source, error: error.message },
        "Error creating coin award notification"
      );
      // Don't throw - notification failure shouldn't block coin award
      return {
        success: false,
        message: "Failed to create notification",
        error: error.message,
      };
    }
  }

  /**
   * Create notification for achievement unlocked
   * Sends both personal notification to student AND common notification to all students
   */
  static async notifyAchievementUnlocked(
    studentId,
    achievementName,
    metadata = {}
  ) {
    try {
      // 1. Personal notification for the student
      const personalTitle = "Achievement Unlocked!";
      const personalMessage = `Congratulations! You've earned the "${achievementName}" badge!`;
      const personalCategory = "ACHIEVEMENT_UNLOCKED";
      const personalMetadata = {
        achievementName,
        actionUrl: "/dashboard",
        isPersonal: true,
        ...metadata,
      };

      const personalResult = await this.createPersonalNotification(
        studentId,
        personalTitle,
        personalMessage,
        personalCategory,
        personalMetadata
      );

      // 2. Common notification for all students
      const commonTitle = "New Achievement Unlocked!";
      const commonMessage = `A student has unlocked the "${achievementName}" achievement! Great job!`;
      const commonCategory = "ACHIEVEMENT_UNLOCKED";
      const commonMetadata = {
        achievementName,
        actionUrl: "/achievements",
        isPersonal: false,
        ...metadata,
      };

      const commonResult = await this.createCommonNotification(
        commonTitle,
        commonMessage,
        commonCategory,
        ["student"], // Target audience: students only
        commonMetadata
      );

      logger.info(
        {
          studentId,
          achievementName,
          personalResult: personalResult.success,
          commonResult: commonResult.success,
        },
        "Achievement notifications (personal + common) created successfully"
      );

      return {
        success: true,
        personal: personalResult,
        common: commonResult,
        message: "Achievement notifications created successfully",
      };
    } catch (error) {
      errorLogger.error(
        { studentId, achievementName, error: error.message },
        "Error creating achievement notifications"
      );
      return {
        success: false,
        message: "Failed to create notifications",
        error: error.message,
      };
    }
  }

  /**
   * Create notification for coach message
   */
  static async notifyCoachMessage(
    studentId,
    coachName,
    message,
    metadata = {}
  ) {
    try {
      const title = "New Message from Coach";
      const notificationMessage = `${coachName}: ${message}`;
      const category = "COACH_MESSAGE";
      const notificationMetadata = {
        coachId: metadata.coachId,
        actionUrl: "/dashboard",
        ...metadata,
      };

      const result = await this.createPersonalNotification(
        studentId,
        title,
        notificationMessage,
        category,
        notificationMetadata
      );

      logger.info(
        { studentId, coachName },
        "Coach message notification created successfully"
      );

      return result;
    } catch (error) {
      errorLogger.error(
        { studentId, coachName, error: error.message },
        "Error creating coach message notification"
      );
      return {
        success: false,
        message: "Failed to create notification",
        error: error.message,
      };
    }
  }

  /**
   * Create system-wide announcement
   */
  static async createSystemAnnouncement(
    title,
    message,
    priority = "MEDIUM",
    metadata = {}
  ) {
    try {
      const category = "SYSTEM_ANNOUNCEMENT";
      const notificationMetadata = {
        priority,
        actionUrl: metadata.actionUrl || "/dashboard",
        ...metadata,
      };

      const result = await this.createSystemWideNotification(
        title,
        message,
        category,
        notificationMetadata
      );

      logger.info(
        { title, priority },
        "System announcement created successfully"
      );

      return result;
    } catch (error) {
      errorLogger.error(
        { title, priority, error: error.message },
        "Error creating system announcement"
      );
      throw error;
    }
  }

  /**
   * Create ISF shop update notification
   */
  static async createShopUpdateNotification(title, message, metadata = {}) {
    try {
      const category = "ISF_SHOP_UPDATE";
      const notificationMetadata = {
        actionUrl: "/shop",
        ...metadata,
      };

      const result = await this.createSystemWideNotification(
        title,
        message,
        category,
        notificationMetadata
      );

      logger.info({ title }, "Shop update notification created successfully");

      return result;
    } catch (error) {
      errorLogger.error(
        { title, error: error.message },
        "Error creating shop update notification"
      );
      throw error;
    }
  }

  /**
   * Create community notification for new content/activities
   * This is a common notification that goes to all students
   */
  static async createCommunityNotification(
    title,
    message,
    category,
    targetAudience = ["student"],
    metadata = {}
  ) {
    try {
      const notificationMetadata = {
        actionUrl: metadata.actionUrl || "/dashboard",
        isPersonal: false,
        ...metadata,
      };

      const result = await this.createCommonNotification(
        title,
        message,
        category,
        targetAudience,
        notificationMetadata
      );

      logger.info(
        { title, category, targetAudience },
        "Community notification created successfully"
      );

      return result;
    } catch (error) {
      errorLogger.error(
        { title, category, targetAudience, error: error.message },
        "Error creating community notification"
      );
      return {
        success: false,
        message: "Failed to create community notification",
        error: error.message,
      };
    }
  }

  /**
   * Cleanup expired notifications
   */
  static async cleanupExpiredNotifications() {
    try {
      const deletedCount = await Notification.cleanupExpired();

      if (deletedCount > 0) {
        logger.info(
          { deletedCount },
          "Expired notifications cleaned up successfully"
        );
      }

      return {
        success: true,
        data: { deletedCount },
        message: "Cleanup completed successfully",
      };
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error cleaning up expired notifications"
      );
      throw error;
    }
  }

  /**
   * Get notification statistics for admin dashboard
   */
  static async getNotificationStats() {
    try {
      const totalNotifications = await Notification.countDocuments();
      const unreadNotifications = await Notification.countDocuments({
        isRead: false,
      });
      const personalNotifications = await Notification.countDocuments({
        isPersonal: true,
      });
      const commonNotifications = await Notification.countDocuments({
        isPersonal: false,
      });

      // Get notifications by category
      const categoryStats = await Notification.aggregate([
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
            unread: {
              $sum: { $cond: ["$isRead", 0, 1] },
            },
          },
        },
        { $sort: { count: -1 } },
      ]);

      const stats = {
        total: totalNotifications,
        unread: unreadNotifications,
        personal: personalNotifications,
        common: commonNotifications,
        byCategory: categoryStats,
      };

      return {
        success: true,
        data: stats,
        message: "Notification statistics retrieved successfully",
      };
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error retrieving notification statistics"
      );
      throw error;
    }
  }
}

module.exports = NotificationService;
