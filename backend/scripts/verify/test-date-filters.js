require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const mongoose = require("mongoose");
const Coin = require("./models/coin");

// Test the date filtering logic
async function testDateFilters() {
  try {
    console.log("Testing date filtering...");

    // Test 1: Get all transactions to see date format
    console.log("\n=== Test 1: Sample transactions with dates ===");
    const sampleTransactions = await Coin.aggregate([
      { $unwind: "$transactions" },
      { $limit: 5 },
      {
        $project: {
          source: "$transactions.source",
          createdAt: "$transactions.createdAt",
          createdAtType: { $type: "$transactions.createdAt" },
        },
      },
    ]);

    sampleTransactions.forEach((t, i) => {
      console.log(`Transaction ${i + 1}:`, {
        source: t.source,
        createdAt: t.createdAt,
        createdAtType: t.createdAtType,
        createdAtISO: t.createdAt ? t.createdAt.toISOString() : "null",
      });
    });

    // Test 2: Date range filter (last 30 days)
    console.log("\n=== Test 2: Date range filter (last 30 days) ===");
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    console.log("Filtering from:", thirtyDaysAgo.toISOString());

    const dateFiltered = await Coin.aggregate([
      {
        $match: {
          "transactions.createdAt": { $gte: thirtyDaysAgo },
        },
      },
      { $unwind: "$transactions" },
      { $limit: 5 },
      {
        $project: {
          source: "$transactions.source",
          createdAt: "$transactions.createdAt",
        },
      },
    ]);

    console.log("Date filtered result:", dateFiltered.length, "transactions");
    dateFiltered.forEach((t, i) => {
      console.log(`Filtered ${i + 1}:`, {
        source: t.source,
        createdAt: t.createdAt,
        createdAtISO: t.createdAt ? t.createdAt.toISOString() : "null",
      });
    });

    // Test 3: Specific date format test
    console.log("\n=== Test 3: Specific date format test ===");
    const testDate = new Date("2025-01-01");
    console.log("Testing with date:", testDate.toISOString());

    const specificDateFilter = await Coin.aggregate([
      {
        $match: {
          "transactions.createdAt": { $gte: testDate },
        },
      },
      { $unwind: "$transactions" },
      { $limit: 3 },
      {
        $project: {
          source: "$transactions.source",
          createdAt: "$transactions.createdAt",
        },
      },
    ]);

    console.log(
      "Specific date filter result:",
      specificDateFilter.length,
      "transactions"
    );

    console.log("\nDate filter tests completed!");
  } catch (error) {
    console.error("Error testing date filters:", error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  // Connect to MongoDB
  mongoose
    .connect(process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/isfplayground", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log("Connected to MongoDB");
      return testDateFilters();
    })
    .then(() => {
      console.log("Test completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Test failed:", error);
      process.exit(1);
    });
}

module.exports = { testDateFilters };
