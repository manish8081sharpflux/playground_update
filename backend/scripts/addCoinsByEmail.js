const mongoose = require('mongoose');
const User = require('../models/user');
const Coin = require('../models/coin');

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/isfplayground';

async function addCoinsByEmail(email, amount) {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Find student by email
    const student = await User.findOne({ email: email });

    if (!student) {
      console.error(`Student with email ${email} not found`);
      console.log('\nTrying to list all users...');
      const allUsers = await User.find({}).select('email role name');
      console.log(`Found ${allUsers.length} users in database:`);
      allUsers.forEach(u => console.log(`  - ${u.email} (${u.role}) - ${u.name}`));
      process.exit(1);
    }

    console.log(`Found student: ${student.name} (${student.email})`);
    console.log(`Student ID: ${student._id}`);

    // Find or create coin record
    const coinRecord = await Coin.findOrCreateForUser(student._id);
    console.log(`Current coin balance: ${coinRecord.balance} coins\n`);

    // Add coins
    await coinRecord.addCoins(
      amount,
      'earned',
      'Manual coin addition for QA testing',
      'general',
      {
        script: 'addCoinsByEmail.js',
        purpose: 'QA testing',
        addedAt: new Date().toISOString()
      }
    );

    console.log(`✅ Successfully added ${amount} coins to ${student.name}`);
    console.log(`New coin balance: ${coinRecord.balance} coins`);
    console.log(`Total transactions: ${coinRecord.transactions.length}`);

  } catch (error) {
    console.error('Error adding coins:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

// Get email and amount from command line
const email = process.argv[2] || 'tony.loui.thomas@gmail.com';
const amount = parseInt(process.argv[3]) || 500;

console.log(`Adding ${amount} coins to student: ${email}\n`);

addCoinsByEmail(email, amount);
