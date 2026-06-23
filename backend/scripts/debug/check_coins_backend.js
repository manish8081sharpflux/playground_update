const mongoose = require('mongoose');
const User = require('./models/user');
const Submission = require('./models/Submission');
require('dotenv').config();

const db = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/isfplayground';

mongoose.connect(db).then(async () => {
  console.log('Connected to DB');
  
  // Find User 'asmi'
  const user = await User.findOne({ username: 'asmi' }); 
  if (!user) {
    const users = await User.find({}).limit(5);
    console.log('Users found:', users.map(u => ({ id: u._id, name: u.firstName + ' ' + u.lastName, username: u.username, coins: u.coins })));
    if (users.length > 0) checkSub(users[0]._id);
    else process.exit();
  } else {
    console.log('User found:', user.username, 'ID:', user._id, 'Coins:', user.coins);
    checkSub(user._id);
  }

  async function checkSub(uid) {
    const subs = await Submission.find({ studentId: uid }).sort({ submittedAt: -1 });
    console.log('Submissions:', subs.map(s => ({ 
      id: s._id,
      type: s.submissionType, 
      taskInfo: s.taskTitle,
      taskId: s.taskId, 
      score: s.grade.score, 
      points: s.grade.points, 
      date: s.submittedAt 
    })));
    process.exit();
  }
}).catch(e => { console.error(e); process.exit(1); });
