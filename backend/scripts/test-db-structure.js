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

async function testDatabaseStructure() {
  try {
    console.log("🔍 Testing database structure...\n");

    // Check coin records
    const totalCoins = await Coin.countDocuments();
    console.log(`📊 Total coin records: ${totalCoins}`);

    const wtfTransactions = await Coin.countDocuments({
      "transactions.type": {
        $in: ["wtf_pin_creation", "wtf_submission_approval", "wtf_interaction"],
      },
    });
    console.log(`📊 Coin records with WTF transactions: ${wtfTransactions}`);

    // Check specific transaction types
    const pinCreationTransactions = await Coin.countDocuments({
      "transactions.type": "wtf_pin_creation",
    });
    console.log(
      `📊 Coin records with pin creation transactions: ${pinCreationTransactions}`
    );

    // Check transactions with wtfPinId
    const transactionsWithPinId = await Coin.countDocuments({
      "transactions.wtfPinId": { $exists: true, $ne: null },
    });
    console.log(`📊 Coin records with wtfPinId: ${transactionsWithPinId}`);

    // Check transactions without wtfPinId
    const transactionsWithoutPinId = await Coin.countDocuments({
      "transactions.type": "wtf_pin_creation",
      "transactions.wtfPinId": { $exists: false },
    });
    console.log(
      `📊 Coin records with pin creation but no wtfPinId: ${transactionsWithoutPinId}`
    );

    // Check WTF pins
    const totalPins = await WtfPin.countDocuments();
    console.log(`📊 Total WTF pins: ${totalPins}`);

    // Check pins by type
    const pinsByType = await WtfPin.aggregate([
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    console.log("\n📌 Pins by type:");
    pinsByType.forEach((type) => {
      console.log(`   ${type._id}: ${type.count}`);
    });

    // Sample some transactions
    console.log("\n🔍 Sample transactions:");
    const sampleCoin = await Coin.findOne({
      "transactions.type": "wtf_pin_creation",
    });

    if (sampleCoin) {
      const wtfTransaction = sampleCoin.transactions.find(
        (t) => t.type === "wtf_pin_creation"
      );
      if (wtfTransaction) {
        console.log(`   Transaction ID: ${wtfTransaction._id}`);
        console.log(`   Type: ${wtfTransaction.type}`);
        console.log(`   Description: ${wtfTransaction.description}`);
        console.log(`   Created: ${wtfTransaction.createdAt}`);
        console.log(`   wtfPinId: ${wtfTransaction.wtfPinId || "NOT SET"}`);
        console.log(`   User ID: ${sampleCoin.userId}`);
      }
    }

    // Sample some pins
    console.log("\n🔍 Sample WTF pin:");
    const samplePin = await WtfPin.findOne();
    if (samplePin) {
      console.log(`   Pin ID: ${samplePin._id}`);
      console.log(`   Title: ${samplePin.title}`);
      console.log(`   Type: ${samplePin.type}`);
      console.log(`   Author: ${samplePin.author}`);
      console.log(`   Created: ${samplePin.createdAt}`);
    }

    console.log("\n✅ Database structure test completed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    errorLogger.error(
      { error: error.message },
      "Database structure test failed"
    );
    throw error;
  }
}

async function runTest() {
  try {
    await connectDB();

    console.log("🧪 Running database structure test...\n");

    await testDatabaseStructure();
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

// Run test if this script is executed directly
if (require.main === module) {
  runTest();
}

module.exports = {
  testDatabaseStructure,
  runTest,
};
