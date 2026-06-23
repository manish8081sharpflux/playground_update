const mongoose = require("mongoose");
const WtfPin = require("../models/wtfPin");
require("dotenv").config();

async function initEngagementMetrics() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/isfplayground"
    );
    console.log("Connected to MongoDB");

    // Find all pins that don't have engagementMetrics or have incomplete engagementMetrics
    const pins = await WtfPin.find({
      $or: [
        { engagementMetrics: { $exists: false } },
        { "engagementMetrics.likes": { $exists: false } },
        { "engagementMetrics.loves": { $exists: false } },
        { "engagementMetrics.seen": { $exists: false } },
        { "engagementMetrics.shares": { $exists: false } },
      ],
    });

    console.log(
      `Found ${pins.length} pins that need engagement metrics initialization`
    );

    // Initialize engagement metrics for each pin
    for (const pin of pins) {
      const updateData = {
        "engagementMetrics.likes": pin.engagementMetrics?.likes || 0,
        "engagementMetrics.loves": pin.engagementMetrics?.loves || 0,
        "engagementMetrics.seen": pin.engagementMetrics?.seen || 0,
        "engagementMetrics.shares": pin.engagementMetrics?.shares || 0,
      };

      await WtfPin.findByIdAndUpdate(pin._id, {
        $set: updateData,
      });

      console.log(
        `Updated pin ${pin._id} with engagement metrics:`,
        updateData
      );
    }

    console.log("Engagement metrics initialization completed successfully");
  } catch (error) {
    console.error("Error initializing engagement metrics:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run the script
initEngagementMetrics();
