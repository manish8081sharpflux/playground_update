const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        // userId is required for personal notifications, optional for common ones
        return this.isPersonal !== false;
      },
    },
    title: {
      type: String,
      required: [true, "Notification title is required"],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: [
        "PERSONAL", // Personal notifications (pin added, coins awarded, etc.)
        "COMMON", // Common notifications (system updates, announcements)
        "ACHIEVEMENT", // Achievement notifications
        "COACH_MESSAGE", // Messages from coaches
        "SYSTEM_UPDATE", // System-wide updates
      ],
      default: "PERSONAL",
    },
    category: {
      type: String,
      enum: [
        "WTF_PIN_ADDED", // When student's work gets pinned to WTF
        "COINS_AWARDED", // When coins are assigned to student
        "ACHIEVEMENT_UNLOCKED", // When student unlocks achievement
        "COACH_MESSAGE", // Message from coach
        "ISF_SHOP_UPDATE", // Shop updates
        "SYSTEM_ANNOUNCEMENT", // System announcements
        "TASK_ASSIGNED", // New task assigned
        "ATTENDANCE_REMINDER", // Attendance reminders
        "WORKSHOP_ANNOUNCEMENT", // Workshop announcements
        "COMMUNITY_UPDATE", // Community updates
        "NEW_CONTENT", // New content available
        "GENERAL", // General notifications
      ],
      default: "GENERAL",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    isPersonal: {
      type: Boolean,
      default: true,
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM",
    },
    // Metadata for different notification types
    metadata: {
      // For WTF pin notifications
      pinId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "wtf_pin",
      },
      contentType: String,
      pinnedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },

      // For coin notifications
      coinAmount: Number,
      coinSource: String,

      // For achievement notifications
      achievementId: String,
      achievementName: String,

      // For task notifications
      taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "task",
      },

      // For coach messages
      coachId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },

      // General metadata
      relatedEntityId: mongoose.Schema.Types.ObjectId,
      relatedEntityType: String,
      actionUrl: String, // URL to navigate to when notification is clicked
    },

    // Expiration and scheduling
    expiresAt: {
      type: Date,
      default: null, // null means never expires
    },

    // For common notifications - if null, it's personal
    targetAudience: {
      type: [String], // Array of roles or specific user IDs
      default: null,
    },

    // For system-wide notifications
    isSystemWide: {
      type: Boolean,
      default: false,
    },

    // For notifications that need to be shown to all users
    isGlobal: {
      type: Boolean,
      default: false,
    },

    // Track when user last viewed their notifications (for session persistence)
    lastViewedAt: {
      type: Date,
      default: null,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for efficient querying
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1, category: 1, createdAt: -1 });
notificationSchema.index({ isGlobal: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Instance method to mark as read
notificationSchema.methods.markAsRead = function () {
  this.isRead = true;
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to mark as unread
notificationSchema.methods.markAsUnread = function () {
  this.isRead = false;
  this.updatedAt = new Date();
  return this.save();
};

// Static method to create personal notification
notificationSchema.statics.createPersonal = async function (
  userId,
  title,
  message,
  category,
  metadata = {}
) {
  const notification = new this({
    userId,
    title,
    message,
    type: "PERSONAL",
    category,
    isPersonal: true,
    metadata,
  });

  return await notification.save();
};

// Static method to create common notification
notificationSchema.statics.createCommon = async function (
  title,
  message,
  category,
  targetAudience = null,
  metadata = {}
) {
  const notification = new this({
    userId: null, // No specific user for common notifications
    title,
    message,
    type: "COMMON",
    category,
    isPersonal: false,
    isGlobal: true, // Mark as global so it appears in common notifications
    targetAudience,
    metadata,
  });

  return await notification.save();
};

// Static method to create system-wide notification
notificationSchema.statics.createSystemWide = async function (
  title,
  message,
  category,
  metadata = {}
) {
  const notification = new this({
    userId: null,
    title,
    message,
    type: "COMMON",
    category,
    isPersonal: false,
    isSystemWide: true,
    isGlobal: true,
    metadata,
  });

  return await notification.save();
};

// Static method to get user notifications (personal + common)
notificationSchema.statics.getUserNotifications = async function (
  userId,
  limit = 50,
  skip = 0
) {
  const personalNotifications = await this.find({ userId, isRead: false })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  const commonNotifications = await this.find({
    isGlobal: true,
    isRead: false,
    createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
  })
    .sort({ createdAt: -1 })
    .limit(limit);

  // Combine and sort by creation date
  const allNotifications = [...personalNotifications, ...commonNotifications]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);

  return allNotifications;
};

// Static method to get user notifications with smart filtering based on last viewed time
notificationSchema.statics.getUserNotificationsSmart = async function (
  userId,
  limit = 50,
  skip = 0
) {
  const UserNotificationView = require("./userNotificationView");

  // Get user's last viewed time
  const userView = await UserNotificationView.getOrCreateUserView(userId);
  const lastViewedAt = userView.lastViewedAt;

  // Get personal notifications (unread or created after last viewed)
  const personalNotifications = await this.find({
    userId,
    $or: [{ isRead: false }, { createdAt: { $gt: lastViewedAt } }],
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  // Get common notifications created after last viewed
  const commonNotifications = await this.find({
    isGlobal: true,
    createdAt: {
      $gt: lastViewedAt,
      $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    },
  })
    .sort({ createdAt: -1 })
    .limit(limit);

  // Combine and sort by creation date
  const allNotifications = [...personalNotifications, ...commonNotifications]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);

  return allNotifications;
};

// Static method to get unread count for user
notificationSchema.statics.getUnreadCount = async function (userId) {
  const personalCount = await this.countDocuments({ userId, isRead: false });
  const commonCount = await this.countDocuments({
    isGlobal: true,
    isRead: false,
    createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
  });

  return personalCount + commonCount;
};

// Static method to get smart unread count based on last viewed time
notificationSchema.statics.getSmartUnreadCount = async function (userId) {
  const UserNotificationView = require("./userNotificationView");

  // Get user's last viewed time
  const userView = await UserNotificationView.getOrCreateUserView(userId);
  const lastViewedAt = userView.lastViewedAt;

  // Count personal notifications (unread or created after last viewed)
  const personalCount = await this.countDocuments({
    userId,
    $or: [{ isRead: false }, { createdAt: { $gt: lastViewedAt } }],
  });

  // Count common notifications created after last viewed
  const commonCount = await this.countDocuments({
    isGlobal: true,
    createdAt: {
      $gt: lastViewedAt,
      $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    },
  });

  return personalCount + commonCount;
};

// Static method to mark all user notifications as read
notificationSchema.statics.markAllAsRead = async function (userId) {
  // Mark personal notifications as read
  await this.updateMany(
    { userId, isRead: false },
    { isRead: true, updatedAt: new Date() }
  );

  // Get the latest notification creation time to set lastViewedAt after all notifications
  const latestNotification = await this.findOne({}).sort({ createdAt: -1 });
  const latestTime = latestNotification
    ? latestNotification.createdAt
    : new Date();

  // Update user's last viewed time to a time STRICTLY after all existing notifications
  // Add 2 seconds to ensure it's greater than the latest notification time
  const UserNotificationView = require("./userNotificationView");
  await UserNotificationView.updateLastViewed(
    userId,
    new Date(latestTime.getTime() + 2000)
  ); // +2 seconds

  return true;
};

// Static method to cleanup expired notifications
notificationSchema.statics.cleanupExpired = async function () {
  const result = await this.deleteMany({
    expiresAt: { $ne: null, $lt: new Date() },
  });

  return result.deletedCount;
};

const Notification = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);

module.exports = Notification;
