const mongoose = require('mongoose');
const User = require('../models/user');

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/isfplayground';

async function findUserByName(searchName) {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Search for users by name (case-insensitive partial match)
    const users = await User.find({
      name: { $regex: searchName, $options: 'i' }
    }).select('_id name email role');

    if (users.length === 0) {
      console.log(`No users found with name containing "${searchName}"\n`);
    } else {
      console.log(`Found ${users.length} user(s) with name containing "${searchName}":\n`);
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name || 'No name'}`);
        console.log(`   Email: ${user.email || 'No email'}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   ID: ${user._id}\n`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

const searchName = process.argv[2] || 'Aaradhya';
console.log(`Searching for user with name containing: "${searchName}"\n`);

findUserByName(searchName);
