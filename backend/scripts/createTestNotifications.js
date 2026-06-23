const mongoose = require("mongoose");
const NotificationService = require("../services/notification");
const User = require("../models/user");
require("dotenv").config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const dbConnection =
      process.env.NODE_ENV === "local"
        ? process.env.MONGO_URI_LOCAL
        : process.env.MONGO_URI;

    await mongoose.connect(dbConnection, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};

// Create test notifications
const createTestNotifications = async () => {
  try {
    console.log("🚀 Starting to create test notifications...");

    // Find a student user
    const student = await User.findOne({ role: "student" });
    if (!student) {
      console.log(
        "❌ No student user found. Please create a student user first."
      );
      return;
    }

    console.log(`👤 Found student: ${student.name} (ID: ${student._id})`);

    // Create personal notifications
    console.log("📝 Creating personal notifications...");

    // 1. WTF Pin Added notification
    await NotificationService.notifyWtfPinAdded(student._id, {
      pinId: new mongoose.Types.ObjectId(),
      title: "My Amazing Drawing",
      contentType: "IMAGE",
      pinnedBy: { adminId: new mongoose.Types.ObjectId() },
    });
    console.log("✅ WTF Pin Added notification created");

    // 2. Coins Awarded notification
    await NotificationService.notifyCoinsAwarded(
      student._id,
      50,
      "WTF_CONTENT_PINNED",
      "Your artwork was featured on WTF!",
      {
        pinId: new mongoose.Types.ObjectId(),
        contentType: "IMAGE",
      }
    );
    console.log("✅ Coins Awarded notification created");

    // 3. Achievement Unlocked notification
    await NotificationService.notifyAchievementUnlocked(
      student._id,
      "Fast Learner",
      {
        achievementId: "fast_learner_001",
        actionUrl: "/dashboard",
      }
    );
    console.log("✅ Achievement Unlocked notification created");

    // 4. Coach Message notification
    await NotificationService.notifyCoachMessage(
      student._id,
      "Coach Sarah",
      "Great work on your latest submission! Keep it up!",
      {
        coachId: new mongoose.Types.ObjectId(),
        actionUrl: "/dashboard",
      }
    );
    console.log("✅ Coach Message notification created");

    // Create common notifications
    console.log("📢 Creating common notifications...");

    // 5. System Announcement
    await NotificationService.createSystemAnnouncement(
      "System Maintenance",
      "The system will be under maintenance from 2:00 AM to 4:00 AM tomorrow. Please save your work.",
      "MEDIUM",
      {
        actionUrl: "/dashboard",
      }
    );
    console.log("✅ System Announcement notification created");

    // 6. ISF Shop Update
    await NotificationService.createShopUpdateNotification(
      "New Items in ISF Shop!",
      "Check out the latest educational games and learning materials now available in the ISF shop.",
      {
        actionUrl: "/shop",
      }
    );
    console.log("✅ ISF Shop Update notification created");

    // 7. Another personal notification
    await NotificationService.notifyCoinsAwarded(
      student._id,
      25,
      "ATTENDANCE_BONUS",
      "Perfect attendance this week!",
      {
        source: "attendance",
        actionUrl: "/dashboard",
      }
    );
    console.log("✅ Attendance Bonus notification created");

    console.log("\n🎉 All test notifications created successfully!");
    console.log(`📊 Total notifications created: 7`);
    console.log(`👤 Student: ${student.name}`);
    console.log(`🔔 Check the notification bell to see them!`);
  } catch (error) {
    console.error("❌ Error creating test notifications:", error.message);
    console.error(error.stack);
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await createTestNotifications();
  } catch (error) {
    console.error("❌ Script execution failed:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB disconnected");
    process.exit(0);
  }
};

// Run the script
if (require.main === module) {
  main();
}

module.exports = { createTestNotifications };
