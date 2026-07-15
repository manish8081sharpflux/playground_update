// server/models/CoinWallet.js
// const mongoose = require('mongoose');

// const transactionSchema = new mongoose.Schema({
//   type:        { type: String, enum: ['earn', 'spend'], default: 'earn' },
//   amount:      { type: Number, required: true },
//   reason:      { type: String },   // "algebra_by level 3"
//   gameLogId:   { type: mongoose.Schema.Types.ObjectId, ref: 'GameLog' },
//   createdAt:   { type: Date, default: Date.now }
// });

// const walletSchema = new mongoose.Schema({
//   userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
//   totalCoins:   { type: Number, default: 0 },
//   transactions: [transactionSchema]
// }, { timestamps: true });

// module.exports = mongoose.model('CoinWallet', walletSchema);

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type:      { type: String, enum: ['earn', 'spend'], default: 'earn' },
  amount:    { type: Number, required: true },
  reason:    { type: String },
  gameLogId: { type: mongoose.Schema.Types.ObjectId, ref: 'GameLog' },
  createdAt: { type: Date, default: Date.now }
});

const walletSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  totalCoins:   { type: Number, default: 0 },
  transactions: [transactionSchema]
}, { timestamps: true });

module.exports = mongoose.model('CoinWallet', walletSchema);