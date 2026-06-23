require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const mongoose = require("mongoose");
const Coin = require("./models/coin");

// Test the filtering logic
async function testFilters() {
  try {
    console.log("Testing coin transaction filters...");

    // Test 1: No filters
    console.log("\n=== Test 1: No filters ===");
    const noFilters = await Coin.aggregate([
      { $unwind: "$transactions" },
      { $limit: 5 },
    ]);
    console.log("No filters result:", noFilters.length, "transactions");

    // Test 2: Source filter
    console.log("\n=== Test 2: Source filter (wtf) ===");
    const sourceFilter = await Coin.aggregate([
      { $match: { "transactions.source": "wtf" } },
      { $unwind: "$transactions" },
      { $limit: 5 },
    ]);
    console.log("Source filter result:", sourceFilter.length, "transactions");

    // Test 3: Date filter
    console.log("\n=== Test 3: Date filter (last 30 days) ===");
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateFilter = await Coin.aggregate([
      {
        $match: {
          "transactions.createdAt": { $gte: thirtyDaysAgo },
        },
      },
      { $unwind: "$transactions" },
      { $limit: 5 },
    ]);
    console.log("Date filter result:", dateFilter.length, "transactions");

    console.log("\nFilter tests completed successfully!");
  } catch (error) {
    console.error("Error testing filters:", error);
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
      return testFilters();
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

module.exports = { testFilters };
