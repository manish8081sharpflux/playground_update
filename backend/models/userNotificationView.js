const mongoose = require("mongoose");

const userNotificationViewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // One record per user
    },

    // When user last viewed their notifications
    lastViewedAt: {
      type: Date,
      default: Date.now,
    },

    // Track which common notifications user has seen
    seenCommonNotifications: [
      {
        notificationId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Notification",
        },
        seenAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Last cleanup time for seen notifications
    lastCleanupAt: {
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
userNotificationViewSchema.index({ userId: 1 });
userNotificationViewSchema.index({ lastViewedAt: -1 });

// Static method to get or create user view record
userNotificationViewSchema.statics.getOrCreateUserView = async function (
  userId
) {
  let userView = await this.findOne({ userId });

  if (!userView) {
    userView = new this({
      userId,
      lastViewedAt: new Date(),
      seenCommonNotifications: [],
    });
    await userView.save();
  }

  return userView;
};

// Static method to update user's last viewed time
userNotificationViewSchema.statics.updateLastViewed = async function (
  userId,
  timestamp = null
) {
  const userView = await this.getOrCreateUserView(userId);
  userView.lastViewedAt = timestamp || new Date();
  await userView.save();
  return userView;
};

// Static method to mark common notification as seen
userNotificationViewSchema.statics.markCommonNotificationAsSeen =
  async function (userId, notificationId) {
    const userView = await this.getOrCreateUserView(userId);

    // Check if already seen
    const alreadySeen = userView.seenCommonNotifications.find(
      (seen) => seen.notificationId.toString() === notificationId.toString()
    );

    if (!alreadySeen) {
      userView.seenCommonNotifications.push({
        notificationId,
        seenAt: new Date(),
      });
      await userView.save();
    }

    return userView;
  };

// Static method to cleanup old seen notifications (keep only last 30 days)
userNotificationViewSchema.statics.cleanupOldSeenNotifications =
  async function () {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await this.updateMany(
      { lastCleanupAt: { $lt: thirtyDaysAgo } },
      {
        $pull: {
          seenCommonNotifications: {
            seenAt: { $lt: thirtyDaysAgo },
          },
        },
        $set: { lastCleanupAt: new Date() },
      }
    );

    return result;
  };

const UserNotificationView = mongoose.models.UserNotificationView || mongoose.model(
  "UserNotificationView",
  userNotificationViewSchema
);

module.exports = UserNotificationView;
