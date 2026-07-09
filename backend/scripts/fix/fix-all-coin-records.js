require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/isfplayground');

async function fixAllCoinRecords() {
  const Coin = mongoose.model('Coin', new mongoose.Schema({}, { strict: false }));
  const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));

  const coins = await Coin.find({}).lean();
  console.log(`Found ${coins.length} Coin records to process\n`);

  let updated = 0;

  for (const coin of coins) {
    // Calculate actual spent from orders
    const orders = await Order.find({
      userId: coin.userId,
      status: 'completed'
    }).select('totalAmount').lean();

    const totalSpent = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    // Set totalEarned = current balance + total spent
    // (since balance = earned - spent)
    const totalEarned = (coin.balance || 0) + totalSpent;

    // Update the record
    await Coin.updateOne(
      { _id: coin._id },
      {
        $set: {
          totalEarned: totalEarned,
          totalSpent: totalSpent
        }
      }
    );

    updated++;
    console.log(`✓ Updated userId ${coin.userId}: earned=${totalEarned}, spent=${totalSpent}, balance=${coin.balance}`);
  }

  console.log(`\n✅ Fixed ${updated} Coin records`);
  mongoose.disconnect();
}

fixAllCoinRecords().catch(console.error);
