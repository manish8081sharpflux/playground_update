const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/user');
const { UserTypes } = require('./constants/users');

dotenv.config();

const dbConnection = process.env.NODE_ENV === 'local' 
  ? process.env.MONGO_URI_LOCAL 
  : process.env.MONGO_URI;

async function testStudentLogin() {
  try {
    await mongoose.connect(dbConnection);
    console.log('✅ Connected to database');
    
    console.log('\n🔍 TESTING STUDENT LOGIN LOGIC');
    console.log('===============================');
    
    const userId = "123";
    console.log(`Testing login with userId: "${userId}"`);
    
    // Simulate the exact logic from the auth endpoint
    const isValid = mongoose.Types.ObjectId.isValid(userId);
    console.log(`Step 1: Is "${userId}" a valid ObjectId? ${isValid}`);
    
    let user = null;
    
    if (isValid) {
      user = await User.findById(userId);
      console.log(`Step 2a: Found user by ObjectId? ${user ? 'YES' : 'NO'}`);
    }
    
    if (!user) {
      user = await User.findOne({ userId: userId });
      console.log(`Step 2b: Found user by userId field? ${user ? 'YES' : 'NO'}`);
      if (user) {
        console.log(`   - User Name: ${user.name}`);
        console.log(`   - User ID: ${user._id}`);
        console.log(`   - User Role: ${user.role}`);
        console.log(`   - User Status: ${user.status}`);
      }
    }
    
    if (!user) {
      user = await User.findOne({ email: userId });
      console.log(`Step 2c: Found user by email? ${user ? 'YES' : 'NO'}`);
    }
    
    console.log(`\nStep 3: Final user found? ${user ? 'YES' : 'NO'}`);
    
    if (user) {
      console.log(`Step 4: User role is "${user.role}"`);
      console.log(`Step 5: UserTypes.STUDENT is "${UserTypes.STUDENT}"`);
      console.log(`Step 6: Role matches student? ${user.role === UserTypes.STUDENT}`);
      console.log(`Step 7: User status: ${user.status}`);
      
      if (user.role === UserTypes.STUDENT && user.status === 'active') {
        console.log('\n✅ LOGIN SHOULD SUCCEED!');
        console.log('User Details:');
        console.log(`   - Name: ${user.name}`);
        console.log(`   - ID: ${user._id}`);
        console.log(`   - UserId: ${user.userId}`);
        console.log(`   - Email: ${user.email || 'No email'}`);
        console.log(`   - Role: ${user.role}`);
        console.log(`   - Status: ${user.status}`);
        console.log(`   - Age: ${user.age}`);
      } else {
        console.log('\n❌ LOGIN WILL FAIL!');
        if (user.role !== UserTypes.STUDENT) {
          console.log(`   Reason: Role mismatch. Expected "student", got "${user.role}"`);
        }
        if (user.status !== 'active') {
          console.log(`   Reason: User status is "${user.status}", not "active"`);
        }
      }
    } else {
      console.log('\n❌ LOGIN WILL FAIL!');
      console.log('   Reason: No user found with any matching field');
    }
    
    // Also check if there are multiple users with the same userId
    const allUsersWithId123 = await User.find({ userId: "123" });
    console.log(`\n📊 Total users with userId "123": ${allUsersWithId123.length}`);
    
    if (allUsersWithId123.length > 1) {
      console.log('⚠️ WARNING: Multiple users found with same userId!');
      allUsersWithId123.forEach((u, index) => {
        console.log(`   ${index + 1}. ${u.name} (${u._id}) - Status: ${u.status}`);
      });
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
    process.exit(1);
  }
}

testStudentLogin();