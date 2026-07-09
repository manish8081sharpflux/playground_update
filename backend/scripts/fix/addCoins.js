require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/isfplayground').then(async () => {
  const db = mongoose.connection.db;

  // Update user with 100 coins
  const result = await db.collection('users').updateOne(
    { _id: new mongoose.Types.ObjectId('685be594abeded0850dd202d') },
    { $set: { coinBalance: 100 } }
  );

  console.log('Update result:', result.modifiedCount, 'user(s) updated');

  // Verify the update
  const user = await db.collection('users').findOne(
    { _id: new mongoose.Types.ObjectId('685be594abeded0850dd202d') }
  );

  console.log('User coin balance:', user?.coinBalance);

  await mongoose.disconnect();
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
