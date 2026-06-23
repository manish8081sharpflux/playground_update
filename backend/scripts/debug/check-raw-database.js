const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const dbConnection = process.env.NODE_ENV === 'local' 
  ? process.env.MONGO_URI_LOCAL 
  : process.env.MONGO_URI;

async function checkRawDatabase() {
  try {
    await mongoose.connect(dbConnection);
    console.log('✅ Connected to database');
    
    console.log('\n🔍 CHECKING RAW DATABASE DATA');
    console.log('==============================');
    
    const db = mongoose.connection.db;
    
    // Query the users collection directly (bypassing Mongoose schema)
    const rawUser = await db.collection('users').findOne({ 
      name: 'Aaradhya Ram Katale' 
    });
    
    if (rawUser) {
      console.log('✅ Found Aaradhya Ram Katale in raw database:');
      console.log('Raw document structure:');
      Object.keys(rawUser).forEach(key => {
        console.log(`   ${key}: ${rawUser[key]} (${typeof rawUser[key]})`);
      });
      
      if (rawUser.userId !== undefined) {
        console.log(`\n🎯 FOUND userId in raw data: ${rawUser.userId} (type: ${typeof rawUser.userId})`);
      }
    } else {
      console.log('❌ User not found in raw database');
    }
    
    // Check for all users with userId field in raw database
    console.log('\n🔍 USERS WITH userId FIELD (RAW DATABASE):');
    console.log('============================================');
    
    const usersWithUserId = await db.collection('users').find({ 
      userId: { $exists: true, $ne: null } 
    }).limit(5).toArray();
    
    console.log(`📊 Found ${usersWithUserId.length} users with userId in raw database`);
    
    usersWithUserId.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name || 'No name'}`);
      console.log(`   _id: ${user._id}`);
      console.log(`   userId: ${user.userId} (type: ${typeof user.userId})`);
      console.log(`   role: ${user.role}`);
      console.log(`   status: ${user.status}`);
    });
    
    // Try to find user with userId: 123 in different formats
    console.log('\n🔍 SEARCHING FOR userId: 123 IN RAW DATABASE:');
    console.log('===============================================');
    
    const userByNumber = await db.collection('users').findOne({ userId: 123 });
    console.log(`Search by number (123): ${userByNumber ? 'FOUND' : 'NOT FOUND'}`);
    if (userByNumber) {
      console.log(`   User: ${userByNumber.name}, userId: ${userByNumber.userId}`);
    }
    
    const userByString = await db.collection('users').findOne({ userId: "123" });
    console.log(`Search by string ("123"): ${userByString ? 'FOUND' : 'NOT FOUND'}`);
    if (userByString) {
      console.log(`   User: ${userByString.name}, userId: ${userByString.userId}`);
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
    
  } catch (error) {
    console.error('❌ Error during check:', error);
    process.exit(1);
  }
}

checkRawDatabase();