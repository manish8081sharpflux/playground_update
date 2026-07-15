// server/models/CoinConfig.js  — admin sets coins per game+level
// const mongoose = require('mongoose');

// const coinConfigSchema = new mongoose.Schema({
//   activityName: { type: String, required: true },
//   activityTitle:{ type: String },
//   level:        { type: Number, required: true },
//   coins:        { type: Number, required: true, default: 5 },
//   createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
// }, { timestamps: true });

// coinConfigSchema.index({ activityName: 1, level: 1 }, { unique: true });

// module.exports = mongoose.model('CoinConfig', coinConfigSchema);

const mongoose = require('mongoose');

const coinConfigSchema = new mongoose.Schema({
  activityName:  { type: String, required: true },
  activityTitle: { type: String },
  level:         { type: Number, required: true },
  coins:         { type: Number, required: true, default: 5 },
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

coinConfigSchema.index({ activityName: 1, level: 1 }, { unique: true });

module.exports = mongoose.model('CoinConfig', coinConfigSchema);
