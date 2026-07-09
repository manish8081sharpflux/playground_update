const mongoose = require("mongoose");
const WtfPin = require("../models/wtfPin");
const { updateEngagementMetrics } = require("../data-access/wtfPin");
require("dotenv").config();

async function testEngagement() {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/isfplayground";
    console.log("🔧 Connecting to:", mongoUri);
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Check what database we're connected to
    const dbName = mongoose.connection.db.databaseName;
    console.log("🔧 Connected to database:", dbName);

    // List all collections
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    console.log(
      "🔧 Available collections:",
      collections.map((c) => c.name)
    );

    // Check if there are any documents in the wtf_pins collection
    const pinCount = await WtfPin.countDocuments();
    console.log("🔧 Total pins in wtf_pins collection:", pinCount);

    // Find a pin to test with
    const pin = await WtfPin.findOne();
    if (!pin) {
      console.log("❌ No pins found at all");
      return;
    }

    console.log("🔧 Testing with pin:", {
      id: pin._id,
      title: pin.title,
      status: pin.status,
      currentMetrics: pin.engagementMetrics,
    });

    // Test the updateEngagementMetrics function
    console.log("🔧 Testing updateEngagementMetrics...");
    const result = await updateEngagementMetrics(pin._id, { likes: 1 });

    if (result.success) {
      console.log(
        "✅ updateEngagementMetrics succeeded:",
        result.data.engagementMetrics
      );
    } else {
      console.log("❌ updateEngagementMetrics failed:", result.message);
    }

    // Verify the update in the database
    const updatedPin = await WtfPin.findById(pin._id);
    console.log("🔧 Pin after update:", {
      id: updatedPin._id,
      title: updatedPin.title,
      metrics: updatedPin.engagementMetrics,
    });
  } catch (error) {
    console.error("❌ Error in test:", error);
    console.error("❌ Error stack:", error.stack);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run the test
testEngagement();
