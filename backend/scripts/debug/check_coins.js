const mongoose = require('mongoose');
const User = require('./backend/models/user');
const Submission = require('./backend/models/Submission');
require('dotenv').config({ path: './backend/.env' });

const db = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/isfplayground';

mongoose.connect(db).then(async () => {
  console.log('Connected');
  
  // Find User 'asmi'
  const user = await User.findOne({ username: 'asmi' }); // Or whatever name
  if (!user) {
    // Try finding by generic query if name unsure, or list users
    const users = await User.find({}).limit(5);
    console.log('Users found:', users.map(u => ({ id: u._id, name: u.firstName + ' ' + u.lastName, username: u.username, coins: u.coins })));
    if (users.length > 0) checkSub(users[0]._id);
  } else {
    console.log('User found:', user.username, 'ID:', user._id, 'Coins:', user.coins);
    checkSub(user._id);
  }

  async function checkSub(uid) {
    const subs = await Submission.find({ studentId: uid }).sort({ submittedAt: -1 });
    console.log('Submissions:', subs.map(s => ({ 
      type: s.submissionType, 
      taskInfo: s.taskTitle,
      taskId: s.taskId, 
      score: s.grade.score, 
      points: s.grade.points, 
      date: s.submittedAt 
    })));
    process.exit();
  }
}).catch(e => console.error(e));
