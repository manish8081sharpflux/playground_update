const mongoose = require("mongoose");

const gcomprisGameLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    activityName: { type: String, required: true, index: true },
    activityTitle: { type: String },
    level: { type: Number, default: 1 },
    startTime: { type: Date },
    endTime: { type: Date },
    durationMs: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    coinsAwarded: { type: Number, default: 0 },
    sessionId: { type: String, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("GcomprisGameLog", gcomprisGameLogSchema);
