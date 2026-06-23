const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const dbConnection = process.env.NODE_ENV === 'local' 
  ? process.env.MONGO_URI_LOCAL 
  : process.env.MONGO_URI;

async function investigateExpiredPins() {
  try {
    await mongoose.connect(dbConnection);
    console.log('✅ Connected to database');
    
    // Import the data access methods
    const { getExpiredPins, getPinsByStatus } = require('./data-access/wtfPin');
    
    console.log('\n🔍 PHASE 1: Checking Database State');
    console.log('=====================================');
    
    // Get all active pins
    const activePinsResult = await getPinsByStatus('active', 1, 50);
    
    if (!activePinsResult.success) {
      console.error('❌ Failed to get active pins:', activePinsResult.message);
      return;
    }
    
    const activePins = activePinsResult.data;
    console.log(`\n📊 Found ${activePins.length} active pins in database`);
    
    const now = new Date();
    const expiredPins = [];
    const validPins = [];
    
    // Analyze each pin
    activePins.forEach((pin, index) => {
      const createdAt = new Date(pin.createdAt);
      const expiresAt = new Date(pin.expiresAt);
      const isExpired = now > expiresAt;
      const daysUntilExpiry = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
      
      if (isExpired) {
        expiredPins.push({
          ...pin,
          daysOverdue: Math.abs(daysUntilExpiry)
        });
      } else {
        validPins.push({
          ...pin,
          daysUntilExpiry
        });
      }
      
      console.log(`${index + 1}. ${pin.title || 'No title'}`);
      console.log(`   Created: ${createdAt.toLocaleDateString()}`);
      console.log(`   Expires: ${expiresAt.toLocaleDateString()}`);
      console.log(`   Status: ${isExpired ? '❌ EXPIRED' : '✅ Valid'}`);
      console.log(`   Days: ${isExpired ? `${Math.abs(daysUntilExpiry)} overdue` : `${daysUntilExpiry} remaining`}`);
      console.log(`   Author: ${pin.author?.name || 'Unknown'} (${pin.author?.role || 'Unknown'})`);
      console.log('');
    });
    
    console.log(`\n📈 SUMMARY:`);
    console.log(`   Total Active Pins: ${activePins.length}`);
    console.log(`   Valid Pins: ${validPins.length}`);
    console.log(`   Expired Pins: ${expiredPins.length}`);
    
    if (expiredPins.length > 0) {
      console.log(`\n🚨 EXPIRED PINS THAT SHOULD BE CLEANED UP:`);
      console.log(`=============================================`);
      expiredPins.forEach((pin, index) => {
        console.log(`${index + 1}. ${pin.title || 'No title'}`);
        console.log(`   Created: ${new Date(pin.createdAt).toLocaleDateString()}`);
        console.log(`   Expires: ${new Date(pin.expiresAt).toLocaleDateString()}`);
        console.log(`   Days Overdue: ${pin.daysOverdue}`);
        console.log(`   Author: ${pin.author?.name || 'Unknown'}`);
        console.log('');
      });
    }
    
    console.log('\n🔍 PHASE 2: Testing Expired Pins Query');
    console.log('========================================');
    
    // Test the getExpiredPins function
    const expiredPinsResult = await getExpiredPins();
    
    if (!expiredPinsResult.success) {
      console.error('❌ Failed to get expired pins:', expiredPinsResult.message);
    } else {
      console.log(`✅ getExpiredPins() found ${expiredPinsResult.data.length} expired pins`);
      console.log(`   Expiration cutoff: ${expiredPinsResult.expirationCutoff}`);
      
      if (expiredPinsResult.data.length > 0) {
        console.log('\n📋 Expired pins from getExpiredPins():');
        expiredPinsResult.data.forEach((pin, index) => {
          console.log(`${index + 1}. ${pin.title || 'No title'}`);
          console.log(`   Created: ${new Date(pin.createdAt).toLocaleDateString()}`);
          console.log(`   Expires: ${new Date(pin.expiresAt).toLocaleDateString()}`);
        });
      }
    }
    
    console.log('\n🔍 PHASE 3: Database Schema Verification');
    console.log('==========================================');
    
    // Check if the expiresAt field exists and has correct values
    const WtfPin = require('./models/wtfPin');
    const samplePin = await WtfPin.findOne({ status: 'active' });
    
    if (samplePin) {
      console.log('✅ Sample pin found');
      console.log(`   Has expiresAt field: ${samplePin.expiresAt ? 'Yes' : 'No'}`);
      if (samplePin.expiresAt) {
        console.log(`   expiresAt value: ${samplePin.expiresAt}`);
        console.log(`   expiresAt type: ${typeof samplePin.expiresAt}`);
        console.log(`   expiresAt instanceof Date: ${samplePin.expiresAt instanceof Date}`);
      }
      console.log(`   Has createdAt field: ${samplePin.createdAt ? 'Yes' : 'No'}`);
      if (samplePin.createdAt) {
        console.log(`   createdAt value: ${samplePin.createdAt}`);
      }
    } else {
      console.log('❌ No sample pins found');
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
    
    console.log('\n📋 RECOMMENDATIONS:');
    console.log('====================');
    
    if (expiredPins.length > 0) {
      console.log('1. 🚨 MANUAL CLEANUP NEEDED: There are expired pins that need immediate cleanup');
      console.log('2. 🔍 Check why the automatic scheduler is not running');
      console.log('3. 🧪 Test the manual pin expiration endpoint');
      console.log('4. 📊 Verify the dashboard is properly filtering expired pins');
    } else {
      console.log('1. ✅ No expired pins found - database is clean');
      console.log('2. 🔍 The issue might be in the dashboard filtering logic');
    }
    
  } catch (error) {
    console.error('❌ Error during investigation:', error);
    process.exit(1);
  }
}

investigateExpiredPins();
