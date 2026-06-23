/**
 * @deprecated Story 6.5 — ActivityLog model is orphaned (zero imports across entire codebase).
 * Archived 2026-03-16. DO NOT import this model. If activity logging is needed in the future,
 * create a new model with proper integration.
 */
const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    ipAddress: { type: String },
    details: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

const ActivityLog = mongoose.models.ActivityLog || mongoose.model("ActivityLog", activityLogSchema);
module.exports = ActivityLog;
