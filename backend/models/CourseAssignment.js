const mongoose = require("mongoose");

// Sprint 2 Epic 03 Story 01: Course Assignment Schema
const CourseAssignmentSchema = new mongoose.Schema(
  {
    // Reference to the course being assigned
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },

    // Coach who created the assignment
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Assignment target (Balagruha or specific students)
    assignedTo: {
      type: {
        type: String,
        required: true,
        enum: ["balagruha", "students"],
      },
      // If type is "balagruha" - supports multiple Balagruhas
      balagruhaIds: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Balagruha",
        },
      ],
      // Legacy: single Balagruha (backward compatibility)
      balagruhaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Balagruha",
      },
      // If type is "students"
      studentIds: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
    },

    // Optional due date for course completion
    dueDate: {
      type: Date,
      default: null,
    },

    // Notification settings
    notifications: {
      inApp: {
        type: Boolean,
        default: true,
      },
      email: {
        type: Boolean,
        default: true,
      },
      sent: {
        type: Boolean,
        default: false,
      },
      sentAt: {
        type: Date,
      },
      recipientCount: {
        type: Number,
        default: 0,
      },
    },

    // Assignment metadata
    assignedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },

    // Assignment status
    status: {
      type: String,
      enum: ["active", "completed", "expired", "cancelled"],
      default: "active",
    },

    // Progress tracking (calculated on demand)
    progress: {
      totalStudents: { type: Number, default: 0 },
      studentsStarted: { type: Number, default: 0 },
      studentsCompleted: { type: Number, default: 0 },
      averageCompletionPercentage: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance
CourseAssignmentSchema.index({ assignedBy: 1, createdAt: -1 });
CourseAssignmentSchema.index({ "assignedTo.balagruhaId": 1 });
CourseAssignmentSchema.index({ "assignedTo.studentIds": 1 });
CourseAssignmentSchema.index({ "assignedTo.balagruhaIds": 1 }); // Story 6.7: Multi-balagruha assignment lookup
CourseAssignmentSchema.index({ status: 1 });
CourseAssignmentSchema.index({ dueDate: 1 });

// Virtual for checking if assignment is overdue
CourseAssignmentSchema.virtual("isOverdue").get(function () {
  if (!this.dueDate) return false;
  return new Date() > this.dueDate && this.status === "active";
});

// Virtual for days remaining (or overdue by)
CourseAssignmentSchema.virtual("daysRemaining").get(function () {
  if (!this.dueDate) return null;
  const now = new Date();
  const diffTime = this.dueDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for completion rate
CourseAssignmentSchema.virtual("completionRate").get(function () {
  if (this.progress.totalStudents === 0) return 0;
  return Math.round(
    (this.progress.studentsCompleted / this.progress.totalStudents) * 100
  );
});

// Virtual for start rate
CourseAssignmentSchema.virtual("startRate").get(function () {
  if (this.progress.totalStudents === 0) return 0;
  return Math.round(
    (this.progress.studentsStarted / this.progress.totalStudents) * 100
  );
});

// Instance method to mark as completed
CourseAssignmentSchema.methods.markCompleted = async function () {
  this.status = "completed";
  return await this.save();
};

// Instance method to mark as expired
CourseAssignmentSchema.methods.markExpired = async function () {
  this.status = "expired";
  return await this.save();
};

// Instance method to cancel assignment
CourseAssignmentSchema.methods.cancel = async function () {
  this.status = "cancelled";
  return await this.save();
};

// Instance method to update progress
CourseAssignmentSchema.methods.updateProgress = async function (progressData) {
  this.progress = {
    ...this.progress,
    ...progressData,
  };
  return await this.save();
};

// Static method to find active assignments by coach
CourseAssignmentSchema.statics.findByCoach = function (coachId) {
  return this.find({ assignedBy: coachId, status: "active" })
    .populate("courseId", "title category thumbnail")
    .populate("assignedTo.balagruhaId", "name")
    .sort({ createdAt: -1 });
};

// Static method to find assignments by student
CourseAssignmentSchema.statics.findByStudent = function (studentId) {
  return this.find({
    $or: [
      { "assignedTo.studentIds": studentId },
      // Will need to expand for Balagruha assignments via populate
    ],
    status: "active",
  })
    .populate("courseId", "title category thumbnail description")
    .populate("assignedBy", "firstName lastName")
    .sort({ dueDate: 1 });
};

// Static method to find overdue assignments
CourseAssignmentSchema.statics.findOverdue = function () {
  return this.find({
    dueDate: { $lt: new Date() },
    status: "active",
  });
};

// Static method to find assignments by Balagruha
CourseAssignmentSchema.statics.findByBalagruha = function (balagruhaId) {
  return this.find({
    "assignedTo.type": "balagruha",
    "assignedTo.balagruhaId": balagruhaId,
    status: "active",
  })
    .populate("courseId", "title category thumbnail")
    .populate("assignedBy", "firstName lastName")
    .sort({ createdAt: -1 });
};

// Static method to get assignment counts by coach
CourseAssignmentSchema.statics.getCoachStats = async function (coachId) {
  const assignments = await this.find({ assignedBy: coachId });

  return {
    total: assignments.length,
    active: assignments.filter((a) => a.status === "active").length,
    completed: assignments.filter((a) => a.status === "completed").length,
    overdue: assignments.filter((a) => a.isOverdue).length,
    totalStudentsAssigned: assignments.reduce(
      (sum, a) => sum + a.progress.totalStudents,
      0
    ),
  };
};

const CourseAssignment = mongoose.models.CourseAssignment || mongoose.model("CourseAssignment", CourseAssignmentSchema);

module.exports = CourseAssignment;
