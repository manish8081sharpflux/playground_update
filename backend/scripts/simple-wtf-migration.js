const mongoose = require("mongoose");
const Coin = require("../models/coin");
const WtfPin = require("../models/wtfPin");
const { errorLogger } = require("../config/pino-config");

// Load environment variables
require("dotenv").config({ path: "../.env" });

// Database connection - use the same connection as the main app
const MONGODB_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://localhost:27017/isfplayground";

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
}

async function disconnectDB() {
  try {
    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error disconnecting from MongoDB:", error);
  }
}

/**
 * Simple migration to populate wtfPinId for existing transactions
 */
async function migrateWtfPinIds() {
  try {
    console.log("🚀 Starting simple WTF Pin ID migration...");

    // Find all coin records with WTF pin creation transactions
    const coinRecords = await Coin.find({
      "transactions.type": "wtf_pin_creation",
    });

    console.log(
      `📊 Found ${coinRecords.length} coin records with WTF pin creation transactions`
    );

    let totalTransactions = 0;
    let updatedTransactions = 0;
    let skippedTransactions = 0;

    for (const coinRecord of coinRecords) {
      console.log(`\n👤 Processing user: ${coinRecord.userId}`);

      for (const transaction of coinRecord.transactions) {
        if (transaction.type !== "wtf_pin_creation") continue;

        totalTransactions++;

        // Skip if already has wtfPinId
        if (transaction.wtfPinId) {
          skippedTransactions++;
          console.log(
            `   ⏭️  Transaction ${transaction._id} already has wtfPinId: ${transaction.wtfPinId}`
          );
          continue;
        }

        console.log(
          `   🔍 Looking for pin for transaction: ${transaction._id}`
        );
        console.log(`      Description: ${transaction.description}`);
        console.log(`      Created: ${transaction.createdAt}`);

        // Try to find the WTF pin by user and creation date
        // Look for pins created by this user around the transaction date (±2 days)
        const userPins = await WtfPin.find({
          author: coinRecord.userId,
          createdAt: {
            $gte: new Date(
              transaction.createdAt.getTime() - 2 * 24 * 60 * 60 * 1000
            ), // 2 days before
            $lte: new Date(
              transaction.createdAt.getTime() + 2 * 24 * 60 * 60 * 1000
            ), // 2 days after
          },
        }).sort({ createdAt: -1 });

        console.log(`      Found ${userPins.length} pins in time range`);

        if (userPins.length > 0) {
          // Take the closest pin by creation time
          const wtfPin = userPins[0];
          console.log(
            `      ✅ Matched with pin: ${wtfPin._id} (${wtfPin.type}: ${wtfPin.title})`
          );

          // Update the transaction with the found pin ID
          transaction.wtfPinId = wtfPin._id;
          updatedTransactions++;
        } else {
          console.log(`      ⚠️  No pins found in time range`);

          // Try to find any pins by this user
          const allUserPins = await WtfPin.find({
            author: coinRecord.userId,
          }).sort({ createdAt: -1 });
          console.log(`      📍 User has ${allUserPins.length} total pins`);

          if (allUserPins.length > 0) {
            console.log(
              `      📍 Most recent pin: ${allUserPins[0].title} (${allUserPins[0].createdAt})`
            );
          }
        }
      }

      // Save the updated coin record
      await coinRecord.save();
      console.log(`   💾 Saved coin record for user ${coinRecord.userId}`);
    }

    console.log("\n📈 Migration Summary:");
    console.log(`   Total transactions processed: ${totalTransactions}`);
    console.log(`   Transactions updated: ${updatedTransactions}`);
    console.log(
      `   Transactions skipped (already had wtfPinId): ${skippedTransactions}`
    );
    console.log(
      `   Transactions without pin match: ${
        totalTransactions - updatedTransactions - skippedTransactions
      }`
    );

    return {
      success: true,
      totalTransactions,
      updatedTransactions,
      skippedTransactions,
    };
  } catch (error) {
    console.error("❌ Migration failed:", error);
    errorLogger.error(
      { error: error.message },
      "Simple WTF Pin ID migration failed"
    );
    throw error;
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  try {
    await connectDB();

    console.log("🔄 Running simple WTF Pin ID migration...\n");

    const result = await migrateWtfPinIds();

    if (result.updatedTransactions === 0) {
      console.log("\n⚠️  No transactions were updated. This might mean:");
      console.log("   1. All transactions already have wtfPinId");
      console.log("   2. No matching pins found in the database");
      console.log("   3. The time range (±2 days) is too narrow");
      console.log(
        "\n💡 You can try running the full migration script for more options."
      );
    }

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = {
  migrateWtfPinIds,
  runMigration,
};
