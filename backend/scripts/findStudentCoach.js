const mongoose = require('mongoose');
const User = require('../models/user');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function findStudentBalagruha() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    // Find the student
    const student = await User.findOne({ userId: 123 });

    if (!student) {
      console.log('Student not found');
      process.exit(1);
    }

    console.log('=== STUDENT INFO ===');
    console.log('Name:', student.name);
    console.log('UserId:', student.userId);
    console.log('Email:', student.email);
    console.log('Role:', student.role);
    console.log('Balagruha IDs:', student.balagruhaIds);
    console.log();

    if (student.balagruhaIds && student.balagruhaIds.length > 0) {
      console.log('=== BALAGRUHA INFO ===');
      student.balagruhaIds.forEach((bgId, index) => {
        console.log(`Balagruha ${index + 1} ID:`, bgId);
      });
      console.log();

      // Find coaches assigned to these balagruhas
      const balagruhaIds = student.balagruhaIds;
      const coaches = await User.find({
        role: 'coach',
        balagruhaIds: { $in: balagruhaIds }
      }).select('name email userId balagruhaIds');

      console.log('=== COACHES ASSIGNED TO THESE BALAGRUHAS ===');
      if (coaches.length > 0) {
        coaches.forEach((coach, index) => {
          console.log(`Coach ${index + 1}:`);
          console.log('  Name:', coach.name);
          console.log('  Email:', coach.email);
          console.log('  UserId:', coach.userId);
          console.log('  Balagruha IDs:', coach.balagruhaIds);
          console.log();
        });
      } else {
        console.log('No coaches found for these Balagruhas');
      }
    } else {
      console.log('Student not assigned to any Balagruha');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

findStudentBalagruha();
