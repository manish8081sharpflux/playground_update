const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/user');
const { UserTypes } = require('./constants/users');

dotenv.config();

const dbConnection = process.env.NODE_ENV === 'local' 
  ? process.env.MONGO_URI_LOCAL 
  : process.env.MONGO_URI;

async function checkAllIdFields() {
  try {
    await mongoose.connect(dbConnection);
    console.log('✅ Connected to database');
    
    console.log('\n🔍 SEARCHING FOR USER WITH ANY FIELD CONTAINING "123"');
    console.log('=====================================================');
    
    // Get all users and examine their full structure
    const allUsers = await User.find({});
    console.log(`📊 Total users in database: ${allUsers.length}`);
    
    // Look for any field containing "123"
    const usersWithValue123 = [];
    
    allUsers.forEach(user => {
      const userObj = user.toObject();
      
      // Check all fields for the value "123"
      for (const [key, value] of Object.entries(userObj)) {
        if (value && value.toString().includes('123')) {
          usersWithValue123.push({
            user: user,
            field: key,
            value: value
          });
        }
      }
    });
    
    console.log(`\n🔍 Users with fields containing "123": ${usersWithValue123.length}`);
    
    if (usersWithValue123.length > 0) {
      console.log('\n📋 FOUND MATCHES:');
      usersWithValue123.forEach((match, index) => {
        console.log(`   ${index + 1}. User: ${match.user.name || 'No name'}`);
        console.log(`      ID: ${match.user._id}`);
        console.log(`      Role: ${match.user.role}`);
        console.log(`      Field: ${match.field}`);
        console.log(`      Value: ${match.value}`);
        console.log('');
      });
    } else {
      console.log('❌ No users found with any field containing "123"');
    }
    
    // Get sample user structure to see all available fields
    console.log('\n🔍 SAMPLE USER STRUCTURE:');
    console.log('==========================');
    
    const sampleStudent = await User.findOne({ role: UserTypes.STUDENT });
    if (sampleStudent) {
      const studentObj = sampleStudent.toObject();
      console.log('📋 All fields available in User model:');
      Object.keys(studentObj).forEach((key, index) => {
        const value = studentObj[key];
        const type = Array.isArray(value) ? 'Array' : typeof value;
        console.log(`   ${index + 1}. ${key}: ${type} = ${value}`);
      });
    }
    
    // Check if there are any custom fields or different schemas
    console.log('\n🔍 CHECKING FOR NUMERIC ID PATTERNS:');
    console.log('=====================================');
    
    // Look for users with simple numeric patterns in any field
    const numericPatterns = ['1', '12', '123', '1234', '12345'];
    
    for (const pattern of numericPatterns) {
      const matches = [];
      
      allUsers.forEach(user => {
        const userObj = user.toObject();
        
        for (const [key, value] of Object.entries(userObj)) {
          if (value && value.toString() === pattern) {
            matches.push({
              user: user,
              field: key,
              value: value
            });
          }
        }
      });
      
      if (matches.length > 0) {
        console.log(`\n   Pattern "${pattern}" found:`);
        matches.forEach(match => {
          console.log(`     User: ${match.user.name} (${match.user.role})`);
          console.log(`     Field: ${match.field} = ${match.value}`);
        });
      }
    }
    
    // Check database collections for any with "student" in the name
    console.log('\n🔍 CHECKING DATABASE COLLECTIONS:');
    console.log('===================================');
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log('📁 All collections:');
    collections.forEach((collection, index) => {
      console.log(`   ${index + 1}. ${collection.name}`);
    });
    
    // Check if there's a separate students collection
    const studentCollections = collections.filter(c => 
      c.name.toLowerCase().includes('student')
    );
    
    if (studentCollections.length > 0) {
      console.log('\n📁 Student-related collections:');
      
      for (const collection of studentCollections) {
        console.log(`\n   Collection: ${collection.name}`);
        try {
          const sampleDoc = await db.collection(collection.name).findOne({});
          if (sampleDoc) {
            console.log('   Sample document structure:');
            Object.keys(sampleDoc).forEach(key => {
              console.log(`     ${key}: ${typeof sampleDoc[key]} = ${sampleDoc[key]}`);
            });
            
            // Check if this collection has a document with "123"
            const docWith123 = await db.collection(collection.name).findOne({
              $or: Object.keys(sampleDoc).map(key => ({
                [key]: { $regex: "123", $options: "i" }
              }))
            });
            
            if (docWith123) {
              console.log('   ✅ Found document with "123" in this collection!');
              console.log('   Document:', JSON.stringify(docWith123, null, 2));
            }
          }
        } catch (error) {
          console.log(`   ❌ Error checking collection: ${error.message}`);
        }
      }
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
    
    console.log('\n📋 SUMMARY:');
    console.log('============');
    
    if (usersWithValue123.length > 0) {
      console.log('✅ Found users with "123" in their data');
      console.log('   Check the field names above to see what field to use');
    } else {
      console.log('❌ No users found with "123" in any field');
      console.log('   The student login might be looking for a different field');
      console.log('   or "123" might not be a valid identifier in this database');
    }
    
  } catch (error) {
    console.error('❌ Error during investigation:', error);
    process.exit(1);
  }
}

checkAllIdFields();