const mongoose = require('mongoose');
const Coin = require('../models/coin');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const userId = process.argv[2] || '685be594abeded0850dd202d';

async function checkTransactions() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    const coinRecord = await Coin.findOne({ user: userId }).populate('user', 'name email');

    if (!coinRecord) {
      console.log('No coin record found for user:', userId);
      process.exit(1);
    }

    console.log('User:', coinRecord.user.name);
    console.log('Email:', coinRecord.user.email);
    console.log('Current Balance:', coinRecord.balance, 'coins');
    console.log('Total Transactions:', coinRecord.transactions.length);
    console.log('\n--- Last 3 Transactions ---\n');

    coinRecord.transactions.slice(-3).forEach((t, i) => {
      console.log(`${i+1}. Type: ${t.type}, Amount: ${t.amount}, Source: ${t.source}`);
      console.log(`   Description: ${t.description}`);
      if (t.metadata) {
        console.log(`   Metadata:`, JSON.stringify(t.metadata, null, 2));
      }
      console.log(`   Date: ${new Date(t.date).toLocaleString()}`);
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkTransactions();
