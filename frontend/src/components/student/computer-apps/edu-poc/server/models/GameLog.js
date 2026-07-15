// server/models/GameLog.js
// const mongoose = require('mongoose');

// const gameLogSchema = new mongoose.Schema({
//   userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   activityName: { type: String, required: true },   // e.g. "algebra_by"
//   activityTitle:{ type: String },                   // e.g. "Table Memory"
//   level:        { type: Number, default: 1 },
//   startTime:    { type: Date },
//   endTime:      { type: Date },
//   durationMs:   { type: Number },
//   score:        { type: Number },                   // 0–100
//   passed:       { type: Boolean, default: false },
//   coinsAwarded: { type: Number, default: 0 },
//   sessionId: { type: String, index: true },
//   synced:       { type: Boolean, default: true }
// }, { timestamps: true });

// module.exports = mongoose.model('GameLog', gameLogSchema);

const mongoose = require('mongoose');

const gameLogSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  activityName:  { type: String, required: true },
  activityTitle: { type: String },
  level:         { type: Number, default: 1 },
  startTime:     { type: Date },
  endTime:       { type: Date },
  durationMs:    { type: Number, default: 0 },
  score:         { type: Number, default: 0 },
  passed:        { type: Boolean, default: false },
  coinsAwarded:  { type: Number, default: 0 },
  sessionId:     { type: String, index: true },
}, { timestamps: true });

module.exports = mongoose.model('GameLog', gameLogSchema);
