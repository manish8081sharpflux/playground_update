const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/user');

dotenv.config();

const dbConnection = process.env.NODE_ENV === 'local' 
  ? process.env.MONGO_URI_LOCAL 
  : process.env.MONGO_URI;

async function debugUserIdField() {
  try {
    await mongoose.connect(dbConnection);
    console.log('✅ Connected to database');
    
    console.log('\n🔍 DEBUGGING userId FIELD');
    console.log('===========================');
    
    // Get users that have userId field
    const usersWithUserId = await User.find({ userId: { $exists: true } }).limit(10);
    console.log(`📊 Found ${usersWithUserId.length} users with userId field`);
    
    if (usersWithUserId.length > 0) {
      console.log('\n📋 Sample users with userId:');
      usersWithUserId.forEach((user, index) => {
        console.log(`   ${index + 1}. Name: ${user.name}`);
        console.log(`      userId: ${user.userId} (type: ${typeof user.userId})`);
        console.log(`      role: ${user.role}`);
        console.log(`      status: ${user.status}`);
        console.log('');
      });
    }
    
    // Specifically search for the value 123 in various ways
    console.log('\n🔍 SEARCHING FOR "123" IN DIFFERENT WAYS:');
    console.log('==========================================');
    
    // Try as string
    const byString = await User.findOne({ userId: "123" });
    console.log(`String search { userId: "123" }: ${byString ? 'FOUND' : 'NOT FOUND'}`);
    if (byString) {
      console.log(`   User: ${byString.name}, userId: ${byString.userId} (${typeof byString.userId})`);
    }
    
    // Try as number
    const byNumber = await User.findOne({ userId: 123 });
    console.log(`Number search { userId: 123 }: ${byNumber ? 'FOUND' : 'NOT FOUND'}`);
    if (byNumber) {
      console.log(`   User: ${byNumber.name}, userId: ${byNumber.userId} (${typeof byNumber.userId})`);
    }
    
    // Try regex search
    const byRegex = await User.findOne({ userId: /123/ });
    console.log(`Regex search { userId: /123/ }: ${byRegex ? 'FOUND' : 'NOT FOUND'}`);
    if (byRegex) {
      console.log(`   User: ${byRegex.name}, userId: ${byRegex.userId} (${typeof byRegex.userId})`);
    }
    
    // Try to find the specific users I found earlier
    console.log('\n🔍 SEARCHING FOR SPECIFIC USERS FROM EARLIER:');
    console.log('===============================================');
    
    const aaradhya = await User.findById('685be594abeded0850dd202d');
    if (aaradhya) {
      console.log(`✅ Found Aaradhya Ram Katale:`);
      console.log(`   userId: ${aaradhya.userId} (type: ${typeof aaradhya.userId})`);
      console.log(`   role: ${aaradhya.role}`);
      console.log(`   status: ${aaradhya.status}`);
    } else {
      console.log(`❌ Aaradhya Ram Katale not found by ID`);
    }
    
    const aardhana = await User.findById('685bf6b3abeded0850dd2313');
    if (aardhana) {
      console.log(`✅ Found Aardhana Tinnu Bhosale:`);
      console.log(`   userId: ${aardhana.userId} (type: ${typeof aardhana.userId})`);
      console.log(`   role: ${aardhana.role}`);
      console.log(`   status: ${aardhana.status}`);
    } else {
      console.log(`❌ Aardhana Tinnu Bhosale not found by ID`);
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
    
  } catch (error) {
    console.error('❌ Error during debug:', error);
    process.exit(1);
  }
}

debugUserIdField();