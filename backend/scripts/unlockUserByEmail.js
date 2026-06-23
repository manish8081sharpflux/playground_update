const mongoose = require('mongoose');
const User = require('../models/user');

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/isfplayground';

async function unlockUserByEmail(email) {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log(`No user found with email: ${email}\n`);
      return;
    }

    console.log(`Found user: ${user.name} (${user.email})`);
    console.log(`Role: ${user.role}`);
    console.log(`Current login attempts: ${user.loginAttempts || 0}`);
    console.log(`Lock until: ${user.lockUntil ? new Date(user.lockUntil).toISOString() : 'Not locked'}`);
    console.log(`Is currently locked: ${user.isLocked()}\n`);

    if (user.isLocked()) {
      await user.resetLoginAttempts();
      console.log('✅ Account unlocked successfully!');
      console.log('Login attempts reset to 0\n');
    } else {
      console.log('⚠️  Account is not currently locked.');
      if (user.loginAttempts && user.loginAttempts > 0) {
        await user.resetLoginAttempts();
        console.log('✅ Login attempts reset to 0 anyway\n');
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

const email = process.argv[2] || 'purchase@gmail.com';
console.log(`Unlocking account for: ${email}\n`);

unlockUserByEmail(email);
