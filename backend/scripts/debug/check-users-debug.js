const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/user');
const { UserTypes } = require('./constants/users');

dotenv.config();

const dbConnection = process.env.NODE_ENV === 'local' 
  ? process.env.MONGO_URI_LOCAL 
  : process.env.MONGO_URI;

async function checkUsers() {
  try {
    await mongoose.connect(dbConnection);
    console.log('✅ Connected to database');
    
    console.log('\n🔍 USER ANALYSIS');
    console.log('=================');
    
    // Get all users
    const allUsers = await User.find({}).select('_id name email role status age gender');
    console.log(`📊 Total users in database: ${allUsers.length}`);
    
    // Group users by role
    const usersByRole = {};
    allUsers.forEach(user => {
      if (!usersByRole[user.role]) {
        usersByRole[user.role] = [];
      }
      usersByRole[user.role].push(user);
    });
    
    console.log('\n📊 Users by Role:');
    Object.keys(usersByRole).forEach(role => {
      console.log(`   ${role}: ${usersByRole[role].length} users`);
    });
    
    // Find student users specifically
    const students = await User.find({ role: UserTypes.STUDENT }).select('_id name email role status age gender');
    console.log(`\n👥 Student Users Found: ${students.length}`);
    
    if (students.length > 0) {
      console.log('\n📋 Student Details:');
      students.forEach((student, index) => {
        console.log(`   ${index + 1}. ID: ${student._id}`);
        console.log(`      Name: ${student.name || 'No name'}`);
        console.log(`      Email: ${student.email || 'No email'}`);
        console.log(`      Role: ${student.role}`);
        console.log(`      Status: ${student.status}`);
        console.log(`      Age: ${student.age || 'Not set'}`);
        console.log(`      Gender: ${student.gender || 'Not set'}`);
        console.log('');
      });
    }
    
    // Specifically check for user with ID "123"
    console.log('\n🔍 CHECKING FOR userId "123":');
    console.log('=================================');
    
    // Check if "123" is a valid ObjectId
    const isValidObjectId = mongoose.Types.ObjectId.isValid("123");
    console.log(`   Is "123" a valid ObjectId: ${isValidObjectId}`);
    
    // Try to find user by _id
    let userById = null;
    if (isValidObjectId) {
      userById = await User.findById("123").select('_id name email role status');
      console.log(`   User found by ID: ${userById ? 'Yes' : 'No'}`);
      if (userById) {
        console.log(`      Name: ${userById.name}`);
        console.log(`      Email: ${userById.email}`);
        console.log(`      Role: ${userById.role}`);
        console.log(`      Status: ${userById.status}`);
      }
    }
    
    // Try to find user by email
    const userByEmail = await User.findOne({ email: "123" }).select('_id name email role status');
    console.log(`   User found by email: ${userByEmail ? 'Yes' : 'No'}`);
    if (userByEmail) {
      console.log(`      ID: ${userByEmail._id}`);
      console.log(`      Name: ${userByEmail.name}`);
      console.log(`      Role: ${userByEmail.role}`);
      console.log(`      Status: ${userByEmail.status}`);
    }
    
    // Check what the login logic would do
    console.log('\n🔍 SIMULATING LOGIN LOGIC:');
    console.log('===========================');
    
    const userId = "123";
    const isValid = mongoose.Types.ObjectId.isValid(userId);
    console.log(`   Step 1: Is "${userId}" valid ObjectId? ${isValid}`);
    
    const user = isValid 
      ? await User.findById(userId)
      : await User.findOne({ email: userId });
    
    console.log(`   Step 2: User found? ${user ? 'Yes' : 'No'}`);
    
    if (user) {
      console.log(`   Step 3: User role is "${user.role}"`);
      console.log(`   Step 4: UserTypes.STUDENT is "${UserTypes.STUDENT}"`);
      console.log(`   Step 5: Role matches? ${user.role === UserTypes.STUDENT}`);
      
      if (user.role !== UserTypes.STUDENT) {
        console.log(`   ❌ LOGIN FAILS: User role "${user.role}" does not match "${UserTypes.STUDENT}"`);
      } else {
        console.log(`   ✅ LOGIN SHOULD SUCCEED`);
      }
    } else {
      console.log(`   ❌ LOGIN FAILS: No user found with ID or email "${userId}"`);
    }
    
    // Show some existing student IDs for reference
    if (students.length > 0) {
      console.log('\n📋 EXISTING STUDENT IDs (for reference):');
      console.log('==========================================');
      students.slice(0, 5).forEach((student, index) => {
        console.log(`   ${index + 1}. ${student._id}`);
      });
      if (students.length > 5) {
        console.log(`   ... and ${students.length - 5} more`);
      }
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
    
    console.log('\n📋 DIAGNOSIS:');
    console.log('==============');
    
    if (!user) {
      console.log('❌ ISSUE: No user exists with ID or email "123"');
      console.log('   SOLUTIONS:');
      console.log('   1. Use a valid student ObjectId from the list above');
      console.log('   2. Create a student user with email "123"');
      console.log('   3. Check if the student user was deleted or has a different ID');
    } else if (user.role !== UserTypes.STUDENT) {
      console.log(`❌ ISSUE: User "123" exists but has role "${user.role}", not "student"`);
      console.log('   SOLUTIONS:');
      console.log('   1. Update the user\'s role to "student"');
      console.log('   2. Use a different user ID that belongs to a student');
    } else {
      console.log('✅ User "123" should be able to log in successfully');
    }
    
  } catch (error) {
    console.error('❌ Error during user check:', error);
    process.exit(1);
  }
}

checkUsers();