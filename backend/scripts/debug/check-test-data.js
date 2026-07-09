require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/isfplayground', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const OrderSchema = new mongoose.Schema({}, { strict: false });
const Order = mongoose.model('Order', OrderSchema, 'orders');

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', UserSchema, 'users');

async function checkData() {
  try {
    console.log('=== Checking Test Data ===\n');

    // Count orders
    const orderCount = await Order.countDocuments();
    console.log(`Total Orders: ${orderCount}`);

    if (orderCount > 0) {
      const sampleOrders = await Order.find().limit(5).lean();
      console.log('\nSample Orders:');
      sampleOrders.forEach((order, i) => {
        console.log(`${i+1}. Order ID: ${order._id}`);
        console.log(`   User ID: ${order.userId}`);
        console.log(`   Status: ${order.status}`);
        console.log(`   Total: ${order.totalAmount}`);
        console.log();
      });
    }

    // Count students
    const studentCount = await User.countDocuments({ role: 'student' });
    console.log(`Total Students: ${studentCount}`);

    // Get students in coach's Balagruhas
    const coachBalagruhaIds = [
      '6809e02280aacbb08e74ce36',
      '6809e03c80aacbb08e74cebe',
      '6809e05380aacbb08e74cf8b'
    ];

    const studentsInCoachBalagruhas = await User.countDocuments({
      role: 'student',
      balagruhaId: { $in: coachBalagruhaIds.map(id => new mongoose.Types.ObjectId(id)) }
    });
    console.log(`Students in Coach's Balagruhas: ${studentsInCoachBalagruhas}`);

    // Get the test student
    const testStudent = await User.findOne({ email: 'vis@gmail.com' }).lean();
    if (testStudent) {
      console.log(`\nTest Student:`);
      console.log(`  ID: ${testStudent._id}`);
      console.log(`  Email: ${testStudent.email}`);
      console.log(`  Balagruha: ${testStudent.balagruhaId || 'NOT SET'}`);
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkData();
