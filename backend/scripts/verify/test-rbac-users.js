require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/isfplayground', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', UserSchema, 'users');

async function findTestUsers() {
  try {
    console.log('=== Finding Test Users ===\n');

    // Find Admin user
    const admin = await User.findOne({ role: 'admin' }).lean();
    if (admin) {
      console.log('ADMIN USER:');
      console.log('  Email:', admin.email);
      console.log('  ID:', admin._id);
      console.log('  Role:', admin.role);
      console.log('  Name:', admin.firstName, admin.lastName);
      console.log();
    }

    // Find Coach user with balagruhaIds
    const coach = await User.findOne({
      role: 'coach',
      balagruhaIds: { $exists: true, $ne: [] }
    }).lean();
    if (coach) {
      console.log('COACH USER:');
      console.log('  Email:', coach.email);
      console.log('  ID:', coach._id);
      console.log('  Role:', coach.role);
      console.log('  Name:', coach.firstName, coach.lastName);
      console.log('  Balagruha IDs:', coach.balagruhaIds);
      console.log();
    }

    // Find Student user
    const student = await User.findOne({ role: 'student' }).lean();
    if (student) {
      console.log('STUDENT USER:');
      console.log('  Email:', student.email);
      console.log('  ID:', student._id);
      console.log('  Role:', student.role);
      console.log('  Name:', student.firstName, student.lastName);
      console.log('  Balagruha ID:', student.balagruhaId);
      console.log();
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

findTestUsers();
