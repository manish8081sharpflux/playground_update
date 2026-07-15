const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  completedLessons: [{ type: mongoose.Schema.Types.ObjectId }],
  completionPct:    { type: Number, default: 0 },
  quizAttempts: [{
    attemptedAt:  { type: Date, default: Date.now },
    score:        { type: Number },
    passed:       { type: Boolean },
    answers:      [{ questionIndex: Number, selectedIndex: Number, correct: Boolean }]
  }],
  bestQuizScore:    { type: Number, default: 0 },
  startedAt:        { type: Date, default: Date.now },
  completedAt:      { type: Date }
}, { timestamps: true });

progressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('Progress', progressSchema);
