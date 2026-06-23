require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/user');

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/isfplayground';

async function listStudents() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const students = await User.find({ role: 'student' }).select('_id name email role');

    console.log(`Found ${students.length} students:\n`);
    students.forEach((student, index) => {
      console.log(`${index + 1}. ${student.name}`);
      console.log(`   Email: ${student.email}`);
      console.log(`   ID: ${student._id}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

listStudents();
