require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/isfplayground');

async function addCoinTransactions() {
  const Coin = mongoose.model('Coin', new mongoose.Schema({}, { strict: false }));
  const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));

  const coins = await Coin.find({}).lean();
  console.log(`Processing ${coins.length} Coin records\n`);

  let updated = 0;

  for (const coin of coins) {
    const transactions = [];

    // Add earned transaction (initial balance)
    if (coin.totalEarned && coin.totalEarned > 0) {
      transactions.push({
        type: 'earned',
        amount: coin.totalEarned,
        description: 'Initial earned coins',
        createdAt: new Date('2025-01-01')
      });
    }

    // Add spent transactions from orders
    const orders = await Order.find({
      userId: coin.userId,
      status: 'completed'
    }).select('totalAmount placedAt').lean();

    orders.forEach(order => {
      if (order.totalAmount > 0) {
        transactions.push({
          type: 'spent',
          amount: order.totalAmount,
          description: 'Shop purchase',
          createdAt: order.placedAt || new Date()
        });
      }
    });

    // Update Coin record with transactions array
    await Coin.updateOne(
      { _id: coin._id },
      { $set: { transactions } }
    );

    updated++;
    console.log(`✓ Updated userId ${coin.userId}: ${transactions.length} transactions added`);
  }

  console.log(`\n✅ Added transactions to ${updated} Coin records`);
  mongoose.disconnect();
}

addCoinTransactions().catch(console.error);
