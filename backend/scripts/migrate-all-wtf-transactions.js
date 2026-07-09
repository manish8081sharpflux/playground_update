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
 * Comprehensive migration for ALL WTF transaction types
 */
async function migrateAllWtfTransactions() {
  try {
    console.log("🚀 Starting comprehensive WTF transaction migration...");

    // Find all coin records with WTF transactions (source: 'wtf')
    const coinRecords = await Coin.find({
      "transactions.source": "wtf",
    });

    console.log(
      `📊 Found ${coinRecords.length} coin records with WTF transactions`
    );

    let totalTransactions = 0;
    let updatedTypes = 0;
    let updatedPinIds = 0;
    let skippedTransactions = 0;

    for (const coinRecord of coinRecords) {
      console.log(`\n👤 Processing user: ${coinRecord.userId}`);

      for (const transaction of coinRecord.transactions) {
        if (transaction.source !== "wtf") continue;

        totalTransactions++;

        // Step 1: Fix transaction types based on description
        let transactionTypeChanged = false;

        if (transaction.type === "earned") {
          if (transaction.description.includes("WTF pin")) {
            transaction.type = "wtf_pin_creation";
            transactionTypeChanged = true;
            updatedTypes++;
            console.log(
              `   🔄 Fixed transaction type: ${transaction._id} -> wtf_pin_creation`
            );
          } else if (
            transaction.description === "Submission approved and published"
          ) {
            transaction.type = "wtf_submission_approval";
            transactionTypeChanged = true;
            updatedTypes++;
            console.log(
              `   🔄 Fixed transaction type: ${transaction._id} -> wtf_submission_approval`
            );
          }
        }

        // Step 2: Add wtfPinId based on transaction type
        if (!transaction.wtfPinId) {
          let wtfPin = null;

          if (transaction.type === "wtf_pin_creation") {
            // For pin creation, find by user and creation date
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

            if (userPins.length > 0) {
              wtfPin = userPins[0];
            }
          } else if (transaction.type === "wtf_submission_approval") {
            // For submission approval, try to find by user and time
            // Look for pins created by this user around the transaction date
            const userPins = await WtfPin.find({
              author: coinRecord.userId,
              createdAt: {
                $gte: new Date(
                  transaction.createdAt.getTime() - 7 * 24 * 60 * 60 * 1000
                ), // 7 days before (submissions might be approved later)
                $lte: new Date(
                  transaction.createdAt.getTime() + 1 * 24 * 60 * 60 * 1000
                ), // 1 day after
              },
            }).sort({ createdAt: -1 });

            if (userPins.length > 0) {
              wtfPin = userPins[0];
            }
          }

          if (wtfPin) {
            transaction.wtfPinId = wtfPin._id;
            updatedPinIds++;
            console.log(
              `   ✅ Added wtfPinId: ${transaction._id} -> ${wtfPin._id} (${wtfPin.type}: ${wtfPin.title})`
            );
          } else {
            console.log(
              `   ⚠️  No pin found for transaction: ${transaction._id}`
            );

            // Try to find any pins by this user
            const allUserPins = await WtfPin.find({
              author: coinRecord.userId,
            }).sort({ createdAt: -1 });
            if (allUserPins.length > 0) {
              console.log(`      📍 User has ${allUserPins.length} total pins`);
              console.log(
                `      📍 Most recent pin: ${allUserPins[0].title} (${allUserPins[0].createdAt})`
              );
            }
          }
        } else {
          skippedTransactions++;
          console.log(
            `   ⏭️  Transaction ${transaction._id} already has wtfPinId: ${transaction.wtfPinId}`
          );
        }
      }

      // Save the updated coin record
      await coinRecord.save();
      console.log(`   💾 Saved coin record for user ${coinRecord.userId}`);
    }

    console.log("\n📈 Migration Summary:");
    console.log(`   Total transactions processed: ${totalTransactions}`);
    console.log(`   Transaction types updated: ${updatedTypes}`);
    console.log(`   wtfPinId fields added: ${updatedPinIds}`);
    console.log(
      `   Transactions skipped (already had wtfPinId): ${skippedTransactions}`
    );

    return {
      success: true,
      totalTransactions,
      updatedTypes,
      updatedPinIds,
      skippedTransactions,
    };
  } catch (error) {
    console.error("❌ Migration failed:", error);
    errorLogger.error(
      { error: error.message },
      "Comprehensive WTF transaction migration failed"
    );
    throw error;
  }
}

/**
 * Verify the fixes
 */
async function verifyFixes() {
  try {
    console.log("\n🔍 Verifying fixes...");

    // Check transactions with correct types
    const pinCreationTransactions = await Coin.countDocuments({
      "transactions.type": "wtf_pin_creation",
    });
    console.log(
      `📊 Transactions with correct type (wtf_pin_creation): ${pinCreationTransactions}`
    );

    const submissionApprovalTransactions = await Coin.countDocuments({
      "transactions.type": "wtf_submission_approval",
    });
    console.log(
      `📊 Transactions with correct type (wtf_submission_approval): ${submissionApprovalTransactions}`
    );

    // Check transactions with wtfPinId
    const transactionsWithPinId = await Coin.countDocuments({
      "transactions.wtfPinId": { $exists: true, $ne: null },
    });
    console.log(`📊 Transactions with wtfPinId: ${transactionsWithPinId}`);

    // Check transactions without wtfPinId
    const transactionsWithoutPinId = await Coin.countDocuments({
      "transactions.type": {
        $in: ["wtf_pin_creation", "wtf_submission_approval"],
      },
      "transactions.wtfPinId": { $exists: false },
    });
    console.log(
      `📊 WTF transactions without wtfPinId: ${transactionsWithoutPinId}`
    );

    // Sample fixed transactions
    console.log("\n✅ Sample fixed transactions:");

    const samplePinCreation = await Coin.findOne({
      "transactions.type": "wtf_pin_creation",
      "transactions.wtfPinId": { $exists: true },
    });

    if (samplePinCreation) {
      const fixedTransaction = samplePinCreation.transactions.find(
        (t) => t.type === "wtf_pin_creation" && t.wtfPinId
      );
      if (fixedTransaction) {
        console.log(`   Pin Creation: ${fixedTransaction._id}`);
        console.log(`   Type: ${fixedTransaction.type}`);
        console.log(`   wtfPinId: ${fixedTransaction.wtfPinId}`);
      }
    }

    const sampleSubmissionApproval = await Coin.findOne({
      "transactions.type": "wtf_submission_approval",
      "transactions.wtfPinId": { $exists: true },
    });

    if (sampleSubmissionApproval) {
      const fixedTransaction = sampleSubmissionApproval.transactions.find(
        (t) => t.type === "wtf_submission_approval" && t.wtfPinId
      );
      if (fixedTransaction) {
        console.log(`   Submission Approval: ${fixedTransaction._id}`);
        console.log(`   Type: ${fixedTransaction.type}`);
        console.log(`   wtfPinId: ${fixedTransaction.wtfPinId}`);
      }
    }
  } catch (error) {
    console.error("❌ Verification failed:", error);
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  try {
    await connectDB();

    console.log("🔄 Running comprehensive WTF transaction migration...\n");

    const result = await migrateAllWtfTransactions();

    if (result.updatedTypes === 0 && result.updatedPinIds === 0) {
      console.log("\n⚠️  No transactions were updated. This might mean:");
      console.log(
        "   1. All transactions already have correct types and wtfPinId"
      );
      console.log("   2. No matching pins found in the database");
      console.log("   3. The transaction data is not in the expected format");
    }

    // Verify the fixes
    await verifyFixes();

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
  migrateAllWtfTransactions,
  verifyFixes,
  runMigration,
};
