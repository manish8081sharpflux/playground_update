const mongoose = require('mongoose');
const User = require('../models/user');

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/isfplayground';

async function findUserById(searchTerm) {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Search for users where ID contains the search term OR matches exactly
    const allUsers = await User.find({}).select('_id name email role');

    // Filter users that have the search term in their ID
    const matchingUsers = allUsers.filter(user =>
      user._id.toString().includes(searchTerm)
    );

    if (matchingUsers.length === 0) {
      console.log(`No users found with ID containing "${searchTerm}"\n`);
      console.log('Listing all students:');
      const students = allUsers.filter(u => u.role === 'student');
      students.forEach((student, index) => {
        console.log(`${index + 1}. ${student.name} (${student.email})`);
        console.log(`   ID: ${student._id}\n`);
      });
    } else {
      console.log(`Found ${matchingUsers.length} user(s) with ID containing "${searchTerm}":\n`);
      matchingUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name || 'No name'}`);
        console.log(`   Email: ${user.email}`);
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

const searchTerm = process.argv[2] || '123';
console.log(`Searching for user with ID containing: "${searchTerm}"\n`);

findUserById(searchTerm);
