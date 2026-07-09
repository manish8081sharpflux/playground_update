const mongoose = require("mongoose");
const Coin = require("../models/coin");
const WtfPin = require("../models/wtfPin");
const WtfSubmission = require("../models/wtfSubmission");
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
 * Migration function to populate missing wtfPinId fields
 */
async function migrateWtfPinIds() {
  try {
    console.log("🚀 Starting WTF Pin ID migration...");

    // Find all coin records with WTF-related transactions
    const coinRecords = await Coin.find({
      "transactions.type": {
        $in: ["wtf_pin_creation", "wtf_submission_approval", "wtf_interaction"],
      },
    });

    console.log(
      `📊 Found ${coinRecords.length} coin records with WTF transactions`
    );

    let totalTransactions = 0;
    let updatedTransactions = 0;
    let skippedTransactions = 0;

    for (const coinRecord of coinRecords) {
      for (const transaction of coinRecord.transactions) {
        totalTransactions++;

        // Skip if already has wtfPinId
        if (transaction.wtfPinId) {
          skippedTransactions++;
          continue;
        }

        // Try to find the WTF pin based on transaction details
        let wtfPin = null;

        if (transaction.type === "wtf_pin_creation") {
          // For pin creation, try to find by user and creation date
          // Look for pins created by this user around the transaction date
          const userPins = await WtfPin.find({
            author: coinRecord.userId,
            createdAt: {
              $gte: new Date(
                transaction.createdAt.getTime() - 24 * 60 * 60 * 1000
              ), // 1 day before
              $lte: new Date(
                transaction.createdAt.getTime() + 24 * 60 * 60 * 1000
              ), // 1 day after
            },
          }).sort({ createdAt: -1 });

          if (userPins.length > 0) {
            // Take the closest pin by creation time
            wtfPin = userPins[0];
          }
        } else if (transaction.type === "wtf_submission_approval") {
          // For submission approval, try to find by submission
          if (transaction.wtfSubmissionId) {
            const submission = await WtfSubmission.findById(
              transaction.wtfSubmissionId
            );
            if (submission && submission.wtfPinId) {
              wtfPin = await WtfPin.findById(submission.wtfPinId);
            }
          }
        }

        if (wtfPin) {
          // Update the transaction with the found pin ID
          transaction.wtfPinId = wtfPin._id;
          updatedTransactions++;
          console.log(
            `✅ Updated transaction ${transaction._id} with pin ID ${wtfPin._id} (${wtfPin.type}: ${wtfPin.title})`
          );
        } else {
          console.log(
            `⚠️  Could not find pin for transaction ${transaction._id} (${transaction.type})`
          );
        }
      }

      // Save the updated coin record
      await coinRecord.save();
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
    errorLogger.error({ error: error.message }, "WTF Pin ID migration failed");
    throw error;
  }
}

/**
 * Alternative migration using description matching
 */
async function migrateWtfPinIdsByDescription() {
  try {
    console.log("🚀 Starting WTF Pin ID migration by description...");

    // Find all coin records with WTF-related transactions
    const coinRecords = await Coin.find({
      "transactions.type": {
        $in: ["wtf_pin_creation", "wtf_submission_approval", "wtf_interaction"],
      },
    });

    console.log(
      `📊 Found ${coinRecords.length} coin records with WTF transactions`
    );

    let totalTransactions = 0;
    let updatedTransactions = 0;
    let skippedTransactions = 0;

    for (const coinRecord of coinRecords) {
      for (const transaction of coinRecord.transactions) {
        totalTransactions++;

        // Skip if already has wtfPinId
        if (transaction.wtfPinId) {
          skippedTransactions++;
          continue;
        }

        // Try to find the WTF pin based on description
        let wtfPin = null;

        if (transaction.description && transaction.description.includes('"')) {
          // Extract title from description like "Your video "Title" was featured on WTF!"
          const titleMatch = transaction.description.match(/"([^"]+)"/);
          if (titleMatch) {
            const title = titleMatch[1];

            // Search for pins with this title
            const pins = await WtfPin.find({
              title: { $regex: title, $options: "i" }, // Case-insensitive search
            });

            if (pins.length > 0) {
              wtfPin = pins[0];
            }
          }
        }

        if (wtfPin) {
          // Update the transaction with the found pin ID
          transaction.wtfPinId = wtfPin._id;
          updatedTransactions++;
          console.log(
            `✅ Updated transaction ${transaction._id} with pin ID ${wtfPin._id} (${wtfPin.type}: ${wtfPin.title})`
          );
        } else {
          console.log(
            `⚠️  Could not find pin for transaction ${transaction._id} (${transaction.type})`
          );
        }
      }

      // Save the updated coin record
      await coinRecord.save();
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
      "WTF Pin ID migration by description failed"
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

    console.log("🔄 Running WTF Pin ID migration...\n");

    // First try the time-based migration
    console.log("📅 Attempting time-based migration...");
    const timeResult = await migrateWtfPinIds();

    if (timeResult.updatedTransactions === 0) {
      console.log(
        "\n📝 No transactions updated with time-based migration, trying description-based..."
      );
      const descResult = await migrateWtfPinIdsByDescription();

      if (descResult.updatedTransactions === 0) {
        console.log(
          "\n⚠️  No transactions could be migrated. This might mean:"
        );
        console.log("   1. All transactions already have wtfPinId");
        console.log("   2. No matching pins found in the database");
        console.log("   3. Transaction data is not in the expected format");
      }
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
  migrateWtfPinIdsByDescription,
  runMigration,
};
