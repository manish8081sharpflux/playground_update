require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/isfplayground');

async function check() {
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

  // Find students with zero purchases
  const students = await User.find({ role: 'student' }).limit(15).select('name email balagruhaIds').lean();

  console.log('Sample students (zero-purchase candidates):');
  students.forEach((s, i) => {
    const balagruhaInfo = s.balagruhaIds && s.balagruhaIds.length > 0
      ? `[${s.balagruhaIds.length} Balagruhas]`
      : 'MISSING/EMPTY';
    console.log(`${i+1}. ${s.name}: balagruhaIds = ${balagruhaInfo}`);
  });

  const withBalagruha = students.filter(s => s.balagruhaIds && s.balagruhaIds.length > 0).length;
  const withoutBalagruha = students.filter(s => !s.balagruhaIds || s.balagruhaIds.length === 0).length;

  console.log(`\n✓ Students WITH balagruhaIds: ${withBalagruha}`);
  console.log(`✗ Students WITHOUT balagruhaIds: ${withoutBalagruha}`);

  mongoose.disconnect();
}

check().catch(console.error);
