const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  lessonId:   { type: mongoose.Schema.Types.ObjectId },
  startTime:  { type: Date, required: true, default: Date.now },
  endTime:    { type: Date },
  durationMs: { type: Number },           // computed on end
  isActive:   { type: Boolean, default: true }
}, { timestamps: true });

// Compute duration when session ends
sessionSchema.methods.closeSession = function () {
  this.endTime   = new Date();
  this.durationMs = this.endTime - this.startTime;
  this.isActive  = false;
  return this.save();
};

module.exports = mongoose.model('Session', sessionSchema);
