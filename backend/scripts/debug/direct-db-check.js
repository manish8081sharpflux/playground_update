const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const dbConnection = process.env.NODE_ENV === 'local' 
  ? process.env.MONGO_URI_LOCAL 
  : process.env.MONGO_URI;

async function checkDatabaseDirectly() {
  try {
    await mongoose.connect(dbConnection);
    console.log('✅ Connected to database');
    
    console.log('\n🔍 PHASE 1: Direct Database Query');
    console.log('==================================');
    
    // Define the WtfPin schema directly for this script
    const wtfPinSchema = new mongoose.Schema({
      title: String,
      content: String,
      type: String,
      status: String,
      createdAt: Date,
      expiresAt: Date,
      author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    });
    
    const WtfPin = mongoose.model('WtfPin', wtfPinSchema);
    
    // Get all active pins
    const activePins = await WtfPin.find({ status: 'active' })
      .populate('author', 'name role')
      .sort({ createdAt: -1 })
      .limit(50);
    
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
          ...pin.toObject(),
          daysOverdue: Math.abs(daysUntilExpiry)
        });
      } else {
        validPins.push({
          ...pin.toObject(),
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
        console.log(`   Pin ID: ${pin._id}`);
        console.log('');
      });
    }
    
    console.log('\n🔍 PHASE 2: Testing Expired Pins Query');
    console.log('========================================');
    
    // Test the expired pins query directly
    const expiredPinsDirect = await WtfPin.find({
      status: 'active',
      expiresAt: { $lte: now }
    }).populate('author', 'name role');
    
    console.log(`✅ Direct query found ${expiredPinsDirect.length} expired pins`);
    
    if (expiredPinsDirect.length > 0) {
      console.log('\n📋 Expired pins from direct query:');
      expiredPinsDirect.forEach((pin, index) => {
        console.log(`${index + 1}. ${pin.title || 'No title'}`);
        console.log(`   Created: ${new Date(pin.createdAt).toLocaleDateString()}`);
        console.log(`   Expires: ${new Date(pin.expiresAt).toLocaleDateString()}`);
        console.log(`   Pin ID: ${pin._id}`);
      });
    }
    
    console.log('\n🔍 PHASE 3: Database Schema Verification');
    console.log('==========================================');
    
    // Check if the expiresAt field exists and has correct values
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
      console.log('5. 🗑️ Consider running manual cleanup for the expired pins');
    } else {
      console.log('1. ✅ No expired pins found - database is clean');
      console.log('2. 🔍 The issue might be in the dashboard filtering logic');
    }
    
  } catch (error) {
    console.error('❌ Error during investigation:', error);
    process.exit(1);
  }
}

checkDatabaseDirectly();
