require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/isfplayground');

async function debugLeaderboard() {
  const Coin = mongoose.model('Coin', new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

  console.log('Step 1: Check Coin records with transactions\n');
  const coins = await Coin.find({}).select('userId transactions').lean();
  coins.forEach((c, i) => {
    console.log(`${i+1}. userId: ${c.userId}, transactions: ${c.transactions?.length || 0}`);
  });

  console.log('\n\nStep 2: Run aggregation with $lookup\n');
  const step1 = await Coin.aggregate([
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $limit: 3 }
  ]);

  console.log('Results after $lookup:', step1.length);
  step1.forEach((record, i) => {
    console.log(`  ${i+1}. userId: ${record.userId}, user array length: ${record.user?.length || 0}`);
    if (record.user?.length > 0) {
      console.log(`      user role: ${record.user[0].role}, name: ${record.user[0].name}`);
    }
  });

  console.log('\n\nStep 3: Run aggregation with $unwind\n');
  const step2 = await Coin.aggregate([
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    { $limit: 3 }
  ]);

  console.log('Results after $unwind:', step2.length);
  step2.forEach((record, i) => {
    console.log(`  ${i+1}. userId: ${record.userId}, user role: ${record.user.role}, name: ${record.user.name}`);
  });

  console.log('\n\nStep 4: Run aggregation with $match (role=student)\n');
  const step3 = await Coin.aggregate([
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    { $match: { 'user.role': 'student' } }
  ]);

  console.log('Results after $match:', step3.length);
  step3.forEach((record, i) => {
    console.log(`  ${i+1}. userId: ${record.userId}, user: ${record.user.name}, transactions: ${record.transactions?.length || 0}`);
  });

  console.log('\n\nStep 5: Check a sample record structure\n');
  if (step3.length > 0) {
    const sample = step3[0];
    console.log('Sample record:');
    console.log('  userId:', sample.userId);
    console.log('  user.name:', sample.user.name);
    console.log('  user.role:', sample.user.role);
    console.log('  transactions:', JSON.stringify(sample.transactions, null, 2));
    console.log('  totalEarned:', sample.totalEarned);
    console.log('  totalSpent:', sample.totalSpent);
  }

  mongoose.disconnect();
}

debugLeaderboard().catch(console.error);
