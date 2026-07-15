const mongoose = require('mongoose');

const artWorkSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Drawing metadata
  title:       { type: String, default: 'Untitled Drawing' },
  description: { type: String, default: '' },

  // The drawing file — stored as base64 or file path
  imageData:   { type: String, required: true },  // base64 PNG
  fileSize:    { type: Number, default: 0 },       // bytes

  // Submission status
  status: {
    type: String,
    enum: ['submitted', 'evaluated', 'returned'],
    default: 'submitted',
  },

  // Admin evaluation
  points:      { type: Number, default: null },   // 0–100
  maxPoints:   { type: Number, default: 100 },
  feedback:    { type: String, default: '' },      // admin suggestion/comment
  evaluatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  evaluatedAt: { type: Date, default: null },

  // Coins awarded after evaluation
  coinsAwarded: { type: Number, default: 0 },

}, { timestamps: true });

module.exports = mongoose.model('ArtWork', artWorkSchema);