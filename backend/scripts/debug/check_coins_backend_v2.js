const mongoose = require('mongoose');
const User = require('./models/user');
const Submission = require('./models/Submission');
require('dotenv').config();

const db = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/isfplayground';

mongoose.connect(db).then(async () => {
  console.log('Connected to DB');
  
  const user = await User.findOne({ username: 'asmi' }); 
  if (!user) {
    console.log('User asmi not found. Listing all:');
    const users = await User.find({});
    users.forEach(u => console.log(u.username, u.coins));
  } else {
    console.log('User found:', user.username, 'Coins:', user.coins);
    const subs = await Submission.find({ studentId: user._id });
    console.log('Submissions Count:', subs.length);
    subs.forEach(s => console.log(s.taskTitle, s.grade?.points, s.submittedAt));
  }
  process.exit();
}).catch(e => { console.error(e); process.exit(1); });
