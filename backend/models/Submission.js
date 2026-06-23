// backend/models/Submission.js
const mongoose = require("mongoose");

const SubmissionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    taskId: {
      type: String,
      required: true,
    },
    taskTitle: {
      type: String,
      required: true,
    },
    submissionType: {
      type: String,
      enum: ["art", "video", "audio", "quiz"],
      required: true,
      index: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
      default: null,
    },
    metadata: {
      duration: {
        type: Number, // For video/audio (seconds)
        default: null,
      },
      fileSize: {
        type: Number, // Bytes
        default: null,
      },
      dimensions: {
        width: Number,
        height: Number,
      },
      mimeType: {
        type: String,
        default: null,
      },
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    timeSpent: {
      type: Number, // Minutes spent on task
      default: 0,
    },
    status: {
      type: String,
      enum: ["pending", "graded", "flagged", "skipped"],
      default: "pending",
      index: true,
    },
    // Grade information (added when graded)
    grade: {
      quality: {
        type: String,
        enum: ["excellent", "good", "needs_improvement"],
        default: null,
      },
      coinsAwarded: {
        type: Number,
        min: 0,
        max: 100,
        default: null,
      },
      feedback: {
        type: String,
        maxlength: 500,
        default: null,
      },
      evaluationCriteria: {
        clearPronunciation: { type: Boolean, default: false },
        appropriatePace: { type: Boolean, default: false },
        goodExpression: { type: Boolean, default: false },
        memorized: { type: Boolean, default: false },
        confidentDelivery: { type: Boolean, default: false },
        addressesQuestion: { type: Boolean, default: false },
        clearSpeech: { type: Boolean, default: false },
        completeThought: { type: Boolean, default: false },
        providesExamples: { type: Boolean, default: false },
      },
      gradedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      gradedAt: {
        type: Date,
        default: null,
      },
    },
    // Draft grading (for auto-save)
    draft: {
      quality: {
        type: String,
        enum: ["excellent", "good", "needs_improvement"],
        default: null,
      },
      coinsAwarded: {
        type: Number,
        min: 0,
        max: 100,
        default: null,
      },
      feedback: {
        type: String,
        maxlength: 500,
        default: null,
      },
      savedAt: {
        type: Date,
        default: null,
      },
    },
    // Flagging information
    flagged: {
      reason: {
        type: String,
        default: null,
      },
      flaggedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      flaggedAt: {
        type: Date,
        default: null,
      },
    },
    // For offline submissions
    offlineSubmission: {
      type: Boolean,
      default: false,
    },
    syncedAt: {
      type: Date,
      default: null,
    },
    // Skip information
    skippedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance
SubmissionSchema.index({ studentId: 1, courseId: 1 });
SubmissionSchema.index({ studentId: 1, status: 1 });
SubmissionSchema.index({ courseId: 1, status: 1 });
SubmissionSchema.index({ submissionType: 1, status: 1 });
SubmissionSchema.index({ "grade.gradedBy": 1 });
SubmissionSchema.index({ submittedAt: -1 });

// Static method to find submissions by coach
SubmissionSchema.statics.findByCoach = async function (coachId, filters = {}) {
  const User = mongoose.model("User");

  // Find all students in coach's Balagruha
  const coach = await User.findById(coachId);
  if (!coach || !coach.balagruhaIds || coach.balagruhaIds.length === 0) {
    return [];
  }

  const students = await User.find({
    balagruhaIds: { $in: coach.balagruhaIds },
    role: "student",
  });

  const studentIds = students.map((s) => s._id);

  // Build query
  const query = {
    studentId: { $in: studentIds },
  };

  if (filters.courseType && filters.courseType !== "all") {
    query.submissionType = filters.courseType.toLowerCase();
  }

  if (filters.status && filters.status !== "all") {
    query.status = filters.status;
  }

  if (filters.balagruhaId && filters.balagruhaId !== "all") {
    // Filter already applied by coach's Balagruha
  }

  if (filters.dateRange) {
    const now = new Date();
    if (filters.dateRange === "today") {
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      query.submittedAt = { $gte: startOfDay };
    } else if (filters.dateRange === "this_week") {
      const startOfWeek = new Date(now.setDate(now.getDate() - 7));
      query.submittedAt = { $gte: startOfWeek };
    } else if (filters.dateRange === "this_month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      query.submittedAt = { $gte: startOfMonth };
    }
  }

  // Sorting
  let sort = { submittedAt: 1 }; // oldest first by default
  if (filters.sortBy === "newest_first") {
    sort = { submittedAt: -1 };
  } else if (filters.sortBy === "student_name") {
    sort = { studentId: 1 };
  }

  // Pagination
  const limit = filters.limit || 20;
  const offset = filters.offset || 0;

  const submissions = await this.find(query)
    .populate({
      path: "studentId",
      select: "name email role balagruhaIds",
      populate: {
        path: "balagruhaIds",
        select: "name"
      }
    })
    .populate("courseId", "title category")
    .populate("grade.gradedBy", "name email")
    .sort(sort)
    .limit(limit)
    .skip(offset);

  return submissions;
};

// Static method to get coach stats
SubmissionSchema.statics.getCoachStats = async function (coachId) {
  const User = mongoose.model("User");

  // Find all students in coach's Balagruha
  const coach = await User.findById(coachId);
  if (!coach || !coach.balagruhaIds || coach.balagruhaIds.length === 0) {
    return {
      pending: 0,
      graded: 0,
      flagged: 0,
      thisWeek: 0,
    };
  }

  const students = await User.find({
    balagruhaIds: { $in: coach.balagruhaIds },
    role: "student",
  });

  const studentIds = students.map((s) => s._id);

  const pending = await this.countDocuments({
    studentId: { $in: studentIds },
    status: "pending",
  });

  const graded = await this.countDocuments({
    studentId: { $in: studentIds },
    status: "graded",
  });

  const flagged = await this.countDocuments({
    studentId: { $in: studentIds },
    status: "flagged",
  });

  // This week
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - 7);
  const thisWeek = await this.countDocuments({
    studentId: { $in: studentIds },
    submittedAt: { $gte: startOfWeek },
  });

  return {
    pending,
    graded,
    flagged,
    thisWeek,
  };
};

// Instance method to mark as graded
SubmissionSchema.methods.markAsGraded = function (gradeData) {
  this.status = "graded";
  this.grade = {
    quality: gradeData.quality,
    coinsAwarded: gradeData.coinsAwarded,
    feedback: gradeData.feedback || null,
    evaluationCriteria: gradeData.evaluationCriteria || {},
    gradedBy: gradeData.gradedBy,
    gradedAt: new Date(),
  };
  // Clear draft after grading
  this.draft = {
    quality: null,
    coinsAwarded: null,
    feedback: null,
    savedAt: null,
  };
  return this.save();
};

// Instance method to save draft
SubmissionSchema.methods.saveDraft = function (draftData) {
  this.draft = {
    quality: draftData.quality,
    coinsAwarded: draftData.coinsAwarded,
    feedback: draftData.feedback || null,
    savedAt: new Date(),
  };
  return this.save();
};

// Instance method to flag submission
SubmissionSchema.methods.flagSubmission = function (reason, flaggedBy) {
  this.status = "flagged";
  this.flagged = {
    reason,
    flaggedBy,
    flaggedAt: new Date(),
  };
  return this.save();
};

// Instance method to mark as skipped
SubmissionSchema.methods.markAsSkipped = function () {
  this.status = "skipped";
  this.skippedAt = new Date();
  return this.save();
};

const Submission = mongoose.models.Submission || mongoose.model("Submission", SubmissionSchema);

module.exports = Submission;
