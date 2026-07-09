/**
 * Script to reset samplet user password
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Use the MONGO_URI from .env
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

const User = require('../models/user');

async function resetPassword() {
  try {
    console.log('\n🔍 Finding samplet user...');

    const user = await User.findOne({ email: 'samplet@gmail.com' });

    if (!user) {
      console.error('❌ User samplet@gmail.com not found');
      process.exit(1);
    }

    console.log('✅ Found user:', user.name, '(', user.email, ')');
    console.log('📍 Current balagruhas:', user.balagruhaIds.length);
    console.log('🔑 Has password:', !!user.password);

    // Reset password to password123 (set as plain text, pre-save hook will hash it)
    user.password = 'password123';
    await user.save();

    console.log('\n✅ Password reset successfully to: password123');
    console.log('👤 User can now login with:');
    console.log('   Email: samplet@gmail.com');
    console.log('   Password: password123');

  } catch (error) {
    console.error('\n❌ Error resetting password:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔒 Database connection closed');
    process.exit(0);
  }
}

// Run the password reset
resetPassword();
