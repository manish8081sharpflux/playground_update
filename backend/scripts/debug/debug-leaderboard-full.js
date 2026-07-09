require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/isfplayground');

async function debugLeaderboardFull() {
  const Coin = mongoose.model('Coin', new mongoose.Schema({}, { strict: false }));

  console.log('Testing full leaderboard aggregation pipeline\n');

  const result = await Coin.aggregate([
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    { $match: { 'user.role': 'student' } },
    {
      $addFields: {
        // Calculate total earned from transactions
        calculatedTotalEarned: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: '$transactions',
                  as: 'txn',
                  cond: { $eq: ['$$txn.type', 'earned'] }
                }
              },
              as: 'earnedTxn',
              in: '$$earnedTxn.amount'
            }
          }
        },
        // Calculate total spent from transactions
        calculatedTotalSpent: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: '$transactions',
                  as: 'txn',
                  cond: { $eq: ['$$txn.type', 'spent'] }
                }
              },
              as: 'spentTxn',
              in: '$$spentTxn.amount'
            }
          }
        }
      }
    },
    {
      $project: {
        rank: 1,
        studentName: '$user.name',
        email: '$user.email',
        calculatedTotalEarned: 1,
        calculatedTotalSpent: 1,
        storedTotalEarned: '$totalEarned',
        storedTotalSpent: '$totalSpent',
        currentBalance: '$balance',
        transactionCount: { $size: { $ifNull: ['$transactions', []] } }
      }
    },
    { $sort: { calculatedTotalSpent: -1 } },
    { $limit: 10 }
  ]);

  console.log(`Found ${result.length} students in leaderboard\n`);

  result.forEach((student, i) => {
    console.log(`${i+1}. ${student.studentName}`);
    console.log(`   Calculated: earned=${student.calculatedTotalEarned}, spent=${student.calculatedTotalSpent}`);
    console.log(`   Stored: earned=${student.storedTotalEarned}, spent=${student.storedTotalSpent}`);
    console.log(`   Balance: ${student.currentBalance}, Transactions: ${student.transactionCount}`);
  });

  mongoose.disconnect();
}

debugLeaderboardFull().catch(console.error);
