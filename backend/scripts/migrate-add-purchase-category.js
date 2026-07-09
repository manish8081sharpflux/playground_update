/**
 * Migration Script: Add category field to existing purchase requests
 * Sprint5-Story-20
 *
 * Purpose: Sets default category 'Others' for all existing purchase requests
 * that don't have a category field.
 *
 * Usage:
 *   node backend/scripts/migrate-add-purchase-category.js
 */

const mongoose = require('mongoose');
const PurchaseRequest = require('../models/purchaseRequest');
require('dotenv').config();

async function migratePurchaseCategories() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/isfplayground';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Find all purchase requests without category
    console.log('Searching for purchase requests without category...');
    const requestsWithoutCategory = await PurchaseRequest.find({
      category: { $exists: false }
    });

    console.log(`Found ${requestsWithoutCategory.length} purchase requests without category\n`);

    if (requestsWithoutCategory.length === 0) {
      console.log('✅ All purchase requests already have category field. No migration needed.');
      await mongoose.connection.close();
      return;
    }

    // Update all requests without category to 'Others'
    console.log('Updating purchase requests to default category "Others"...');
    const result = await PurchaseRequest.updateMany(
      { category: { $exists: false } },
      { $set: { category: 'Others' } }
    );

    console.log(`✅ Migration complete!`);
    console.log(`   - Modified: ${result.modifiedCount} records`);
    console.log(`   - Matched: ${result.matchedCount} records\n`);

    // Verify migration
    console.log('Verifying migration...');
    const remainingWithoutCategory = await PurchaseRequest.find({
      category: { $exists: false }
    });

    if (remainingWithoutCategory.length === 0) {
      console.log('✅ Verification successful: All purchase requests now have category field\n');
    } else {
      console.log(`⚠️  Warning: ${remainingWithoutCategory.length} requests still without category\n`);
    }

    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migratePurchaseCategories();
