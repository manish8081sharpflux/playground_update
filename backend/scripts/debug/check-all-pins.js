const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const dbConnection = process.env.NODE_ENV === 'local' 
  ? process.env.MONGO_URI_LOCAL 
  : process.env.MONGO_URI;

async function checkAllPins() {
  try {
    await mongoose.connect(dbConnection);
    console.log('✅ Connected to database');
    
    console.log('\n🔍 PHASE 1: Check All Pins in Database');
    console.log('========================================');
    
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
    
    // Get ALL pins regardless of status
    const allPins = await WtfPin.find({})
      .populate('author', 'name role')
      .sort({ createdAt: -1 })
      .limit(100);
    
    console.log(`\n📊 Found ${allPins.length} total pins in database`);
    
    if (allPins.length === 0) {
      console.log('❌ No pins found in database at all');
      console.log('   This could mean:');
      console.log('   1. Database is empty');
      console.log('   2. Wrong database connection');
      console.log('   3. Wrong collection name');
      console.log('   4. Database connection issue');
      return;
    }
    
    // Group pins by status
    const pinsByStatus = {};
    allPins.forEach(pin => {
      const status = pin.status || 'unknown';
      if (!pinsByStatus[status]) {
        pinsByStatus[status] = [];
      }
      pinsByStatus[status].push(pin);
    });
    
    console.log('\n📈 PINS BY STATUS:');
    Object.keys(pinsByStatus).forEach(status => {
      console.log(`   ${status}: ${pinsByStatus[status].length} pins`);
    });
    
    // Check for expired pins regardless of status
    const now = new Date();
    const expiredPins = [];
    
    allPins.forEach(pin => {
      if (pin.expiresAt && now > pin.expiresAt) {
        const daysOverdue = Math.ceil((now - pin.expiresAt) / (1000 * 60 * 60 * 24));
        expiredPins.push({
          ...pin.toObject(),
          daysOverdue
        });
      }
    });
    
    if (expiredPins.length > 0) {
      console.log(`\n🚨 EXPIRED PINS (regardless of status):`);
      console.log(`=========================================`);
      expiredPins.forEach((pin, index) => {
        console.log(`${index + 1}. ${pin.title || 'No title'}`);
        console.log(`   Status: ${pin.status}`);
        console.log(`   Created: ${new Date(pin.createdAt).toLocaleDateString()}`);
        console.log(`   Expires: ${new Date(pin.expiresAt).toLocaleDateString()}`);
        console.log(`   Days Overdue: ${pin.daysOverdue}`);
        console.log(`   Author: ${pin.author?.name || 'Unknown'}`);
        console.log(`   Pin ID: ${pin._id}`);
        console.log('');
      });
    }
    
    // Show sample pins from each status
    console.log('\n📋 SAMPLE PINS BY STATUS:');
    Object.keys(pinsByStatus).forEach(status => {
      const pins = pinsByStatus[status];
      if (pins.length > 0) {
        console.log(`\n   ${status.toUpperCase()} (${pins.length} pins):`);
        pins.slice(0, 3).forEach((pin, index) => {
          console.log(`     ${index + 1}. ${pin.title || 'No title'}`);
          console.log(`        Created: ${new Date(pin.createdAt).toLocaleDateString()}`);
          if (pin.expiresAt) {
            console.log(`        Expires: ${new Date(pin.expiresAt).toLocaleDateString()}`);
          }
          console.log(`        Author: ${pin.author?.name || 'Unknown'}`);
        });
      }
    });
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
    
    console.log('\n📋 ANALYSIS:');
    console.log('=============');
    
    if (allPins.length === 0) {
      console.log('❌ Database appears to be empty or inaccessible');
    } else if (expiredPins.length > 0) {
      console.log('🚨 Found expired pins that need cleanup');
      console.log('   These pins should be automatically removed by the scheduler');
    } else {
      console.log('✅ No expired pins found');
    }
    
  } catch (error) {
    console.error('❌ Error during investigation:', error);
    process.exit(1);
  }
}

checkAllPins();
