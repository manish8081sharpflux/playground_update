const mongoose = require('mongoose');
const User = require('../models/user');
const Coin = require('../models/coin');

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// MongoDB connection string
const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/isfplayground';

async function addCoinsToStudent(studentId, amount) {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the student
    const student = await User.findById(studentId);

    if (!student) {
      console.error(`Student with ID ${studentId} not found`);
      process.exit(1);
    }

    console.log(`Found student: ${student.name} (${student.email})`);

    // Find or create coin record for user
    const coinRecord = await Coin.findOrCreateForUser(studentId);
    console.log(`Current coin balance: ${coinRecord.balance} coins`);

    // Add coins using the model method
    await coinRecord.addCoins(
      amount,
      'earned',
      'Manual coin addition for QA testing',
      'general',
      {
        script: 'addCoinsToStudent.js',
        purpose: 'QA testing',
        addedAt: new Date().toISOString()
      }
    );

    console.log(`✅ Successfully added ${amount} coins to ${student.name}`);
    console.log(`New coin balance: ${coinRecord.balance} coins`);
    console.log(`Total transactions: ${coinRecord.transactions.length}`);

  } catch (error) {
    console.error('Error adding coins:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Get student ID and amount from command line arguments
const studentId = process.argv[2] || '123';
const amount = parseInt(process.argv[3]) || 500;

console.log(`Adding ${amount} coins to student ID: ${studentId}\n`);

addCoinsToStudent(studentId, amount);
