const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const dbConnection = process.env.NODE_ENV === 'local' 
  ? process.env.MONGO_URI_LOCAL 
  : process.env.MONGO_URI;

async function investigateWtfPins() {
  try {
    await mongoose.connect(dbConnection);
    console.log('✅ Connected to database');
    
    console.log('\n🔍 INVESTIGATING WTF_PINS COLLECTION');
    console.log('=====================================');
    
    // Define the WtfPin schema with the correct collection name
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
    }, { collection: 'wtf_pins' }); // Specify the correct collection name
    
    const WtfPin = mongoose.model('WtfPin', wtfPinSchema);
    
    // Get ALL pins from wtf_pins collection
    const allPins = await WtfPin.find({})
      .populate('author', 'name role')
      .sort({ createdAt: -1 })
      .limit(100);
    
    console.log(`\n📊 Found ${allPins.length} total pins in wtf_pins collection`);
    
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
    
    // Show active pins specifically
    const activePins = allPins.filter(pin => pin.status === 'active');
    console.log(`\n📋 ACTIVE PINS (${activePins.length} found):`);
    activePins.forEach((pin, index) => {
      const createdAt = new Date(pin.createdAt);
      const expiresAt = new Date(pin.expiresAt);
      const isExpired = now > expiresAt;
      const daysUntilExpiry = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
      
      console.log(`${index + 1}. ${pin.title || 'No title'}`);
      console.log(`   Created: ${createdAt.toLocaleDateString()}`);
      console.log(`   Expires: ${expiresAt.toLocaleDateString()}`);
      console.log(`   Status: ${isExpired ? '❌ EXPIRED' : '✅ Valid'}`);
      console.log(`   Days: ${isExpired ? `${Math.abs(daysUntilExpiry)} overdue` : `${daysUntilExpiry} remaining`}`);
      console.log(`   Author: ${pin.author?.name || 'Unknown'}`);
      console.log('');
    });
    
    // Show unpinned pins (which might include expired ones)
    const unpinnedPins = allPins.filter(pin => pin.status === 'unpinned');
    console.log(`\n📋 UNPINNED PINS (${unpinnedPins.length} found):`);
    unpinnedPins.forEach((pin, index) => {
      const createdAt = new Date(pin.createdAt);
      const expiresAt = new Date(pin.expiresAt);
      const isExpired = now > expiresAt;
      const daysUntilExpiry = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
      
      console.log(`${index + 1}. ${pin.title || 'No title'}`);
      console.log(`   Created: ${createdAt.toLocaleDateString()}`);
      console.log(`   Expires: ${expiresAt.toLocaleDateString()}`);
      console.log(`   Status: ${isExpired ? '❌ EXPIRED' : '✅ Valid'}`);
      console.log(`   Days: ${isExpired ? `${Math.abs(daysUntilExpiry)} overdue` : `${daysUntilExpiry} remaining`}`);
      console.log(`   Author: ${pin.author?.name || 'Unknown'}`);
      console.log('');
    });
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
    
    console.log('\n📋 ANALYSIS:');
    console.log('=============');
    
    if (expiredPins.length > 0) {
      console.log('🚨 FOUND EXPIRED PINS THAT NEED CLEANUP!');
      console.log(`   Total expired pins: ${expiredPins.length}`);
      console.log('   These pins should be automatically removed by the scheduler');
      console.log('   The fact that they still exist suggests:');
      console.log('   1. The scheduler is not running properly');
      console.log('   2. The pin expiration logic has bugs');
      console.log('   3. The pins are not being queried correctly');
    }
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total Pins: ${allPins.length}`);
    console.log(`   Active Pins: ${activePins.length}`);
    console.log(`   Unpinned Pins: ${unpinnedPins.length}`);
    console.log(`   Expired Pins: ${expiredPins.length}`);
    
  } catch (error) {
    console.error('❌ Error during investigation:', error);
    process.exit(1);
  }
}

investigateWtfPins();
