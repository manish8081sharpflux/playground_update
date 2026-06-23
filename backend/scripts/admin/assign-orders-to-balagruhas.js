require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/isfplayground', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const Order = require('./models/order');
const User = require('./models/user');

const coachBalagruhaIds = [
  '6809e02280aacbb08e74ce36',
  '6809e03c80aacbb08e74cebe',
  '6809e05380aacbb08e74cf8b'
];

const testStudentId = '680de27f2fcea3062d68ad76';

async function assignOrdersToBalagruhas() {
  try {
    console.log('=== Assigning Orders to Balagruhas for Testing ===\n');

    // 1. Assign test student to coach's first Balagruha
    await User.updateOne(
      { _id: new mongoose.Types.ObjectId(testStudentId) },
      { $set: { balagruhaId: new mongoose.Types.ObjectId(coachBalagruhaIds[0]) } }
    );
    console.log('✓ Assigned test student to Coach\'s Balagruha');
    console.log(`  Student ID: ${testStudentId}`);
    console.log(`  Balagruha: ${coachBalagruhaIds[0]}`);

    // 2. Get all existing orders
    const allOrders = await Order.find().lean();
    console.log(`\n✓ Found ${allOrders.length} existing orders`);

    if (allOrders.length === 0) {
      console.log('\n⚠️  No orders found. Cannot proceed with test.');
      await mongoose.connection.close();
      return;
    }

    // 3. Find students in different scenarios
    const studentsInCoachBalagruhas = await User.find({
      role: 'student',
      balagruhaId: { $in: coachBalagruhaIds.map(id => new mongoose.Types.ObjectId(id)) }
    }).limit(3).lean();

    const studentsNotInCoachBalagruhas = await User.find({
      role: 'student',
      balagruhaId: { $nin: coachBalagruhaIds.map(id => new mongoose.Types.ObjectId(id)), $ne: null }
    }).limit(2).lean();

    console.log(`✓ Found ${studentsInCoachBalagruhas.length} students in Coach's Balagruhas`);
    console.log(`✓ Found ${studentsNotInCoachBalagruhas.length} students NOT in Coach's Balagruhas`);

    // 4. Assign orders to test student (3 orders)
    const testStudentOrders = allOrders.slice(0, 3);
    for (const order of testStudentOrders) {
      await Order.updateOne(
        { _id: order._id },
        { $set: { userId: new mongoose.Types.ObjectId(testStudentId) } }
      );
    }
    console.log(`\n✓ Assigned 3 orders to test student`);

    // 5. Assign orders to students in coach's Balagruhas (3 orders)
    let orderIndex = 3;
    if (studentsInCoachBalagruhas.length > 0) {
      const coachStudentOrders = allOrders.slice(orderIndex, orderIndex + 3);
      for (let i = 0; i < coachStudentOrders.length; i++) {
        const studentIndex = i % studentsInCoachBalagruhas.length;
        await Order.updateOne(
          { _id: coachStudentOrders[i]._id },
          { $set: { userId: studentsInCoachBalagruhas[studentIndex]._id } }
        );
      }
      console.log(`✓ Assigned 3 orders to students in Coach's Balagruhas`);
      orderIndex += 3;
    }

    // 6. Assign orders to students NOT in coach's Balagruhas (3 orders)
    if (studentsNotInCoachBalagruhas.length > 0) {
      const otherStudentOrders = allOrders.slice(orderIndex, orderIndex + 3);
      for (let i = 0; i < otherStudentOrders.length; i++) {
        const studentIndex = i % studentsNotInCoachBalagruhas.length;
        await Order.updateOne(
          { _id: otherStudentOrders[i]._id },
          { $set: { userId: studentsNotInCoachBalagruhas[studentIndex]._id } }
        );
      }
      console.log(`✓ Assigned 3 orders to students NOT in Coach's Balagruhas`);
    }

    console.log('\n=== Test Data Setup Complete ===');
    console.log(`Test Student ID: ${testStudentId}`);
    console.log(`Test Student Balagruha: ${coachBalagruhaIds[0]}`);
    console.log(`Coach's Balagruha IDs: ${coachBalagruhaIds.join(', ')}`);
    console.log('\nExpected Results:');
    console.log('  - Admin: Should see ALL 13 orders');
    console.log('  - Coach: Should see 6 orders (3 for test student + 3 for other students in assigned Balagruhas)');
    console.log('  - Student (vis@gmail.com): Should see ONLY 3 orders (own orders)');

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

assignOrdersToBalagruhas();
