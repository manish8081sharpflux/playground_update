require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/isfplayground', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', UserSchema, 'users');

async function checkStudentBalagruhaField() {
  try {
    console.log('=== Checking Student Balagruha Field ===\n');

    // Get test student
    const testStudent = await User.findOne({ email: 'vis@gmail.com' }).lean();
    console.log('Test Student:');
    console.log('  _id:', testStudent._id);
    console.log('  email:', testStudent.email);
    console.log('  balagruhaId:', testStudent.balagruhaId);
    console.log('  balagruhaIds:', testStudent.balagruhaIds);
    console.log();

    // Get a few random students
    const students = await User.find({ role: 'student' }).limit(5).lean();
    console.log('Sample Students:');
    students.forEach((s, i) => {
      console.log(`${i+1}. ${s.email || s.name || s._id}`);
      console.log('   balagruhaId:', s.balagruhaId);
      console.log('   balagruhaIds:', s.balagruhaIds);
    });

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkStudentBalagruhaField();
