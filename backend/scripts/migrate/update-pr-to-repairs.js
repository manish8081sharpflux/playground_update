#!/usr/bin/env node
/**
 * Script to update PR-029 category from "ISF Shop" to "Repairs"
 * This creates test data for Story 2.6 P0 smoke tests (Repair Technician Name feature)
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });

// MongoDB connection
const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/isfplayground';

async function updatePurchaseRequestToRepairs() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Access purchase_requests collection directly
    const PurchaseRequest = mongoose.connection.collection('purchase_requests');

    // Find PR-029 (currently ORDERED with ISF Shop category)
    console.log('🔍 Finding PR-029...');
    const pr = await PurchaseRequest.findOne({ requestId: 'PR-029' });
    
    if (!pr) {
      console.error('❌ PR-029 not found!');
      process.exit(1);
    }

    console.log('📋 Current PR-029 data:');
    console.log(`   Request ID: ${pr.requestId}`);
    console.log(`   Status: ${pr.status}`);
    console.log(`   Category: ${pr.category}`);
    console.log(`   Product: ${pr.items?.[0]?.productName || 'N/A'}`);
    console.log('');

    // Update category to "Repairs"
    console.log('🔧 Updating category to "Repairs"...');
    const result = await PurchaseRequest.updateOne(
      { requestId: 'PR-029' },
      { 
        $set: { 
          category: 'Repairs',
          updatedAt: new Date()
        } 
      }
    );

    if (result.modifiedCount === 1) {
      console.log('✅ Successfully updated PR-029 to category="Repairs"!\n');
      
      // Verify the update
      const updated = await PurchaseRequest.findOne({ requestId: 'PR-029' });
      console.log('✅ Verified updated data:');
      console.log(`   Request ID: ${updated.requestId}`);
      console.log(`   Status: ${updated.status}`);
      console.log(`   Category: ${updated.category} ← CHANGED`);
      console.log(`   Product: ${updated.items?.[0]?.productName || 'N/A'}`);
      console.log('');
      console.log('🎯 PR-029 is now ready for Story 2.6 P0 tests!');
      console.log('   → Navigate to "Repairs" category filter in Purchase Management');
      console.log('   → Click "On Going Order" tab');
      console.log('   → You should see PR-029 with "Repairs" category');
    } else {
      console.error('❌ Failed to update PR-029');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

// Run the update
updatePurchaseRequestToRepairs();
