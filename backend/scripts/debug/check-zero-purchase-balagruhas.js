require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/isfplayground');

async function check() {
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));

  // Find coach
  const coach = await User.findOne({ email: 'isfinbengaluru@gmail.com' }).select('name balagruhaIds').lean();
  console.log(`\nCoach: ${coach.name}`);
  console.log(`Assigned Balagruhas: ${coach.balagruhaIds.map(id => id.toString()).join(', ')}`);

  // Find students with zero purchases
  const allStudents = await User.find({ role: 'student' }).select('name balagruhaIds').lean();

  const studentsWithOrders = await Order.distinct('userId', { status: 'completed' });
  const studentIdStrings = studentsWithOrders.map(id => id.toString());

  const zeroPurchaseStudents = allStudents.filter(s => !studentIdStrings.includes(s._id.toString()));

  console.log(`\nTotal students: ${allStudents.length}`);
  console.log(`Students with orders: ${studentsWithOrders.length}`);
  console.log(`Students with ZERO purchases: ${zeroPurchaseStudents.length}`);

  // Check which Balagruhas the zero-purchase students belong to
  const balagruhaCount = {};
  zeroPurchaseStudents.forEach(s => {
    if (s.balagruhaIds && s.balagruhaIds.length > 0) {
      s.balagruhaIds.forEach(bid => {
        const bidStr = bid.toString();
        balagruhaCount[bidStr] = (balagruhaCount[bidStr] || 0) + 1;
      });
    }
  });

  console.log(`\nBalagruha distribution of zero-purchase students:`);
  Object.entries(balagruhaCount).forEach(([bid, count]) => {
    const inCoachScope = coach.balagruhaIds.map(id => id.toString()).includes(bid);
    console.log(`  ${bid}: ${count} students ${inCoachScope ? '✓ (Coach assigned)' : '✗ (NOT assigned)'}`);
  });

  // Count how many zero-purchase students are in coach's Balagruhas
  const coachBalagruhaStrings = coach.balagruhaIds.map(id => id.toString());
  const zeroPurchaseInCoachScope = zeroPurchaseStudents.filter(s => {
    return s.balagruhaIds && s.balagruhaIds.some(bid => coachBalagruhaStrings.includes(bid.toString()));
  });

  console.log(`\n✓ Zero-purchase students in Coach's Balagruhas: ${zeroPurchaseInCoachScope.length}`);
  console.log(`✗ Zero-purchase students NOT in Coach's Balagruhas: ${zeroPurchaseStudents.length - zeroPurchaseInCoachScope.length}`);

  mongoose.disconnect();
}

check().catch(console.error);
