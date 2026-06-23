/**
 * @deprecated Story 6.5 — MachineAssignment model is orphaned (zero imports across entire codebase).
 * Also has broken ref: "Admin" (Admin model does not exist; should be "User").
 * Archived 2026-03-16. DO NOT import this model.
 */
const mongoose = require("mongoose");

const MachineAssignmentHistorySchema = new mongoose.Schema(
  {
    HistoryID: {
      type: mongoose.Schema.Types.ObjectId,
      auto: true,
    },
    MachineID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Machine",
      required: true,
    },
    PreviousBalagruhaID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Balagruha",
      default: null,
    },
    NewBalagruhaID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Balagruha",
      required: true,
    },
    AssignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    AssignmentDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

const MachineAssignmentHistory = mongoose.models.MachineAssignmentHistory || mongoose.model(
  "MachineAssignmentHistory",
  MachineAssignmentHistorySchema
);

module.exports = MachineAssignmentHistory;
