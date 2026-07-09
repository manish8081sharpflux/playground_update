const mongoose = require("mongoose");
const WtfPin = require("../models/wtfPin");
require("dotenv").config();

async function createTestPins() {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/isfplayground";
    console.log("🔧 Connecting to:", mongoUri);
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Check if pins already exist
    const existingPins = await WtfPin.countDocuments();
    if (existingPins > 0) {
      console.log(`🔧 Found ${existingPins} existing pins, skipping creation`);
      return;
    }

    // Create a test user ID (you'll need to replace this with a real user ID from your users collection)
    const testUserId = new mongoose.Types.ObjectId();

    // Create test pins
    const testPins = [
      {
        title: "vvv",
        content: "Audio content",
        type: "audio",
        mediaUrl: "test-audio.mp3",
        author: testUserId,
        status: "active",
        isOfficial: false,
        language: "english",
        tags: ["audio", "podcast"],
        engagementMetrics: {
          likes: 0,
          loves: 0,
          seen: 0,
          shares: 0,
        },
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      },
      {
        title: "Video",
        content: "Video content",
        type: "video",
        mediaUrl: "test-video.mp4",
        author: testUserId,
        status: "active",
        isOfficial: false,
        language: "english",
        tags: ["video", "performance"],
        engagementMetrics: {
          likes: 0,
          loves: 0,
          seen: 0,
          shares: 0,
        },
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      },
      {
        title: "Video",
        content: "Another video content",
        type: "video",
        mediaUrl: "test-video-2.mp4",
        author: testUserId,
        status: "active",
        isOfficial: false,
        language: "english",
        tags: ["video", "tutorial"],
        engagementMetrics: {
          likes: 0,
          loves: 0,
          seen: 0,
          shares: 0,
        },
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      },
    ];

    console.log("🔧 Creating test pins...");
    const createdPins = await WtfPin.insertMany(testPins);

    console.log(`✅ Created ${createdPins.length} test pins:`);
    createdPins.forEach((pin) => {
      console.log(`  - ${pin.title} (${pin.type}) - ID: ${pin._id}`);
    });

    // Verify the pins were created
    const totalPins = await WtfPin.countDocuments();
    console.log(`🔧 Total pins in database: ${totalPins}`);
  } catch (error) {
    console.error("❌ Error creating test pins:", error);
    console.error("❌ Error stack:", error.stack);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run the script
createTestPins();
