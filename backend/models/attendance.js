const { default: mongoose } = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    balagruhaId: { type: mongoose.Schema.Types.ObjectId, ref: "Balagruha" },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    date: { type: Date, default: Date.now },
    dateString: { type: String },
    status: {
      type: String,
      enum: ["present", "absent"],
      required: true,
      default: "absent",
    },
    notes: { type: String },

    // FR Rebuild - Manual Override Support (Sprint 1.1 Epic 02 Story 01 Task 9)
    // Ensures manual attendance marking always available (FR is enhancement, not blocker)
    isManualOverride: {
      type: Boolean,
      default: false,
      index: true, // Index for querying manual overrides
    },
    frSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FRSession",
      default: null, // Links to FR session if FR was attempted
    },
    overrideReason: {
      type: String,
      enum: [
        "fr_failed",          // FR recognition failed
        "fr_unavailable",     // FR system unavailable
        "technical_issue",    // Technical problem (camera, network, etc.)
        "user_preference",    // User chose manual over FR
        "emergency",          // Emergency situation requiring quick marking
        "other",              // Other reason (specify in notes)
      ],
      default: null, // Only required when isManualOverride is true
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // User who manually marked attendance (if manual override)
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance - Story 6.7: Missing Database Indexes
attendanceSchema.index({ studentId: 1 });
attendanceSchema.index({ balagruhaId: 1 });
attendanceSchema.index({ balagruhaId: 1, date: -1 }); // Scope filter + date sorting
attendanceSchema.index({ studentId: 1, date: -1 }); // Student lookup + date sorting

const Attendance = mongoose.models.Attendance || mongoose.model("Attendance", attendanceSchema);

module.exports = Attendance;
