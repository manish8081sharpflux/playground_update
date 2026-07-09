require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/isfplayground', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', UserSchema, 'users');

async function setTestPasswords() {
  try {
    console.log('=== Setting Test Passwords ===\n');

    const testPassword = 'test123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(testPassword, salt);

    // Update admin
    await User.updateOne(
      { email: 'admin@gmail.com' },
      { $set: { password: hashedPassword } }
    );
    console.log('Admin password set to: test123');

    // Update coach
    await User.updateOne(
      { email: 'isfinbengaluru@gmail.com' },
      { $set: { password: hashedPassword } }
    );
    console.log('Coach password set to: test123');

    // Update student
    await User.updateOne(
      { email: 'vis@gmail.com' },
      { $set: { password: hashedPassword } }
    );
    console.log('Student password set to: test123');

    console.log('\nAll passwords updated successfully!');
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

setTestPasswords();
