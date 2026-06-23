require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/isfplayground', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const Order = require('./models/order');
const User = require('./models/user');

const coachBalagruhaIds = [
  new mongoose.Types.ObjectId('6809e02280aacbb08e74ce36'),
  new mongoose.Types.ObjectId('6809e03c80aacbb08e74cebe'),
  new mongoose.Types.ObjectId('6809e05380aacbb08e74cf8b')
];

const testStudentId = new mongoose.Types.ObjectId('680de27f2fcea3062d68ad76');
const anotherBalagruhaId = new mongoose.Types.ObjectId('6809e06b80aacbb08e74d020'); // Different Balagruha

async function createTestData() {
  try {
    console.log('=== Creating Test Data for RBAC Scope Testing ===\n');

    // 1. Set Balagruha for test student
    await User.updateOne(
      { _id: testStudentId },
      { $set: { balagruhaId: coachBalagruhaIds[0] } } // Assign to coach's first Balagruha
    );
    console.log('✓ Assigned test student to Coach\'s Balagruha');

    // 2. Create test orders for the test student (in coach's Balagruha)
    const testStudentOrders = [];
    for (let i = 0; i < 3; i++) {
      const order = await Order.create({
        userId: testStudentId,
        items: [{ itemId: new mongoose.Types.ObjectId(), name: 'Test Item', price: 10, quantity: 1 }],
        totalAmount: 10,
        status: 'completed',
        deliveryStatus: 'delivered',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      testStudentOrders.push(order._id);
    }
    console.log(`✓ Created 3 orders for test student (in Coach's Balagruha)`);

    // 3. Find students in coach's Balagruhas
    const studentsInCoachBalagruhas = await User.find({
      role: 'student',
      balagruhaId: { $in: coachBalagruhaIds }
    }).limit(5).lean();

    console.log(`✓ Found ${studentsInCoachBalagruhas.length} students in Coach's Balagruhas`);

    if (studentsInCoachBalagruhas.length > 0) {
      // Create orders for a student in coach's Balagruha
      const coachStudent = studentsInCoachBalagruhas[0];
      for (let i = 0; i < 2; i++) {
        await Order.create({
          userId: coachStudent._id,
          items: [{ itemId: new mongoose.Types.ObjectId(), name: 'Test Item', price: 15, quantity: 1 }],
          totalAmount: 15,
          status: 'completed',
          deliveryStatus: 'delivered',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      console.log(`✓ Created 2 orders for another student in Coach's Balagruha`);
    }

    // 4. Find a student NOT in coach's Balagruhas
    const studentNotInCoachBalagruhas = await User.findOne({
      role: 'student',
      balagruhaId: { $nin: coachBalagruhaIds, $ne: null }
    }).lean();

    if (studentNotInCoachBalagruhas) {
      // Create orders for student NOT in coach's Balagruha
      for (let i = 0; i < 2; i++) {
        await Order.create({
          userId: studentNotInCoachBalagruhas._id,
          items: [{ itemId: new mongoose.Types.ObjectId(), name: 'Test Item', price: 20, quantity: 1 }],
          totalAmount: 20,
          status: 'completed',
          deliveryStatus: 'delivered',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      console.log(`✓ Created 2 orders for student NOT in Coach's Balagruhas`);
      console.log(`  Student ID: ${studentNotInCoachBalagruhas._id}`);
      console.log(`  Balagruha ID: ${studentNotInCoachBalagruhas.balagruhaId}`);
    }

    console.log('\n=== Test Data Summary ===');
    console.log(`Test Student ID: ${testStudentId}`);
    console.log(`Test Student Balagruha: ${coachBalagruhaIds[0]}`);
    console.log(`Coach Balagruha IDs: ${coachBalagruhaIds.join(', ')}`);
    console.log('\nExpected Results:');
    console.log('  - Admin: Should see ALL orders (existing + new 7 orders)');
    console.log('  - Coach: Should see ONLY orders from students in assigned Balagruhas (5 orders)');
    console.log('  - Student: Should see ONLY own orders (3 orders)');

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createTestData();
