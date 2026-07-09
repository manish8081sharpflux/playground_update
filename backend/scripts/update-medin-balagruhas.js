/**
 * Script to update medin user with multiple balagruhas
 * This adds 3 balagruhas to the medical in-charge user
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

const User = require('../models/user');
const Balagruha = require('../models/balagruha');

async function updateMedinUser() {
  try {
    console.log('\n🔍 Finding samplet user...');

    // Find the samplet user
    const medinUser = await User.findOne({ email: 'samplet@gmail.com' });

    if (!medinUser) {
      console.error('❌ User samplet@gmail.com not found');
      process.exit(1);
    }

    console.log('✅ Found user:', medinUser.name, '(', medinUser.email, ')');
    console.log('📍 Current balagruhas:', medinUser.balagruhaIds.length);

    // Get all balagruhas
    console.log('\n🔍 Finding all balagruhas...');
    const allBalagruhas = await Balagruha.find({}).select('_id name').lean();

    console.log('✅ Found', allBalagruhas.length, 'balagruhas:');
    allBalagruhas.forEach((bal, idx) => {
      console.log(`   ${idx + 1}. ${bal.name} (${bal._id})`);
    });

    // Select first 3 balagruhas (or all if less than 3)
    const balagruhasToAssign = allBalagruhas.slice(0, Math.min(3, allBalagruhas.length));
    const balagruhaIds = balagruhasToAssign.map(b => b._id);

    console.log('\n📝 Assigning these balagruhas to medin user:');
    balagruhasToAssign.forEach((bal, idx) => {
      console.log(`   ${idx + 1}. ${bal.name}`);
    });

    // Update the user
    medinUser.balagruhaIds = balagruhaIds;
    await medinUser.save();

    console.log('\n✅ Successfully updated samplet user with', balagruhaIds.length, 'balagruhas');
    console.log('📍 New balagruha IDs:', balagruhaIds.map(id => id.toString()).join(', '));

    console.log('\n✨ Update complete! Please log out and log back in as samplet@gmail.com to see the changes.');

  } catch (error) {
    console.error('\n❌ Error updating user:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔒 Database connection closed');
    process.exit(0);
  }
}

// Run the update
updateMedinUser();
