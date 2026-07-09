require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/isfplayground');

async function seedCoinData() {
  const Coin = mongoose.model('Coin', new mongoose.Schema({}, { strict: false }));
  const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

  // Get students who have made purchases
  const orders = await Order.find({ status: 'completed' }).select('userId totalAmount').lean();

  console.log(`Found ${orders.length} completed orders`);

  const userSpending = {};
  orders.forEach(order => {
    const userId = order.userId.toString();
    userSpending[userId] = (userSpending[userId] || 0) + order.totalAmount;
  });

  console.log(`\nProcessing ${Object.keys(userSpending).length} users with purchases...`);

  // Create or update Coin records for each user
  let created = 0;
  let updated = 0;

  for (const [userIdStr, totalSpent] of Object.entries(userSpending)) {
    const userId = new mongoose.Types.ObjectId(userIdStr);
    const user = await User.findById(userId).select('name').lean();

    // Calculate coin balance (earned - spent)
    const totalEarned = totalSpent * 2; // Example: earned twice what they spent
    const balance = totalEarned - totalSpent;

    const existingCoin = await Coin.findOne({ userId });

    if (existingCoin) {
      await Coin.updateOne(
        { userId },
        {
          $set: {
            balance,
            totalEarned,
            totalSpent
          }
        }
      );
      updated++;
      console.log(`✓ Updated ${user?.name || 'Unknown'}: earned=${totalEarned}, spent=${totalSpent}, balance=${balance}`);
    } else {
      await Coin.create({
        userId,
        balance,
        totalEarned,
        totalSpent,
        transactions: []
      });
      created++;
      console.log(`✓ Created ${user?.name || 'Unknown'}: earned=${totalEarned}, spent=${totalSpent}, balance=${balance}`);
    }
  }

  console.log(`\n✅ Coin data seeding complete!`);
  console.log(`   Created: ${created} new records`);
  console.log(`   Updated: ${updated} existing records`);

  mongoose.disconnect();
}

seedCoinData().catch(console.error);
