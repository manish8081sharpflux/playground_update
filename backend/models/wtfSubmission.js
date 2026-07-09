const mongoose = require("mongoose");

const wtfSubmissionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student ID is required"],
    },
    type: {
      type: String,
      enum: ["voice", "article"],
      required: [true, "Submission type is required"],
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    content: {
      type: String,
      required: function () {
        return this.type === "article";
      },
      trim: true,
      maxlength: [10000, "Article content cannot exceed 10000 characters"],
    },
    // For voice submissions
    audioUrl: {
      type: String,
      required: function () {
        return this.type === "voice";
      },
      trim: true,
    },
    audioDuration: {
      type: Number, // Duration in seconds
      min: [0, "Audio duration cannot be negative"],
      required: function () {
        // For coach suggestions, audio duration is optional
        return (
          this.type === "voice" &&
          !(this.metadata && this.metadata.isCoachSuggestion)
        );
      },
    },
    audioTranscription: {
      type: String,
      trim: true,
    },
    // For article submissions
    language: {
      type: String,
      enum: ["hindi", "english", "both"],
      default: "english",
      required: function () {
        return this.type === "article";
      },
    },
    // Common fields
    status: {
      type: String,
      enum: [
        "pending",
        "reviewed",
        "considered",
        "approved",
        "rejected",
        "archived",
      ],
      default: "pending",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
    reviewNotes: {
      type: String,
      trim: true,
      maxlength: [1000, "Review notes cannot exceed 1000 characters"],
    },
    // If approved, link to the created pin
    approvedPinId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "wtf_pin",
    },
    // Tags for categorization
    tags: [{ type: String, trim: true }],
    // Draft functionality
    isDraft: {
      type: Boolean,
      default: false,
    },
    // Additional metadata
    metadata: {
      wordCount: Number, // For articles
      characterCount: Number, // For articles
      fileSize: Number, // For voice notes (in bytes)
      recordingQuality: String, // For voice notes
      userAgent: String,
      ipAddress: String,
      // Coach suggestion specific fields
      isCoachSuggestion: Boolean,
      originalType: String, // The original suggestion type (image, video, etc.)
      studentName: String,
      balagruha: String,
      suggestedBy: String,
      coachId: mongoose.Schema.Types.ObjectId,
      suggestedDate: Date,
      reason: String,
      level: String,
      category: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance
wtfSubmissionSchema.index({ studentId: 1, createdAt: -1 });
wtfSubmissionSchema.index({ status: 1, createdAt: -1 });
wtfSubmissionSchema.index({ type: 1, status: 1 });
wtfSubmissionSchema.index({ reviewedBy: 1, reviewedAt: -1 });
wtfSubmissionSchema.index({ approvedPinId: 1 });

// Pre-save middleware to validate submission data
wtfSubmissionSchema.pre("save", function (next) {
  // Validate content for articles
  if (this.type === "article") {
    if (!this.content || this.content.trim().length === 0) {
      return next(new Error("Article content is required"));
    }

    if (this.content.length > 10000) {
      return next(new Error("Article content cannot exceed 10000 characters"));
    }
  }

  // Validate audio for voice submissions
  if (this.type === "voice") {
    if (!this.audioUrl) {
      return next(new Error("Audio URL is required for voice submissions"));
    }

    // For coach suggestions, allow missing duration
    const isCoachSuggestion = this.metadata && this.metadata.isCoachSuggestion;
    if (!isCoachSuggestion) {
      if (this.audioDuration == null || this.audioDuration < 0) {
        return next(new Error("Valid audio duration is required"));
      }
      // Limit voice duration to 60 seconds (1 minute)
      if (this.audioDuration > 60) {
        return next(new Error("Voice recording cannot exceed 60 seconds"));
      }
    }
  }

  // Update metadata for articles
  if (this.type === "article" && this.content) {
    this.metadata.wordCount = this.content.split(/\s+/).length;
    this.metadata.characterCount = this.content.length;
  }

  next();
});

// Pre-save middleware to handle review status changes
wtfSubmissionSchema.pre("save", function (next) {
  // If status is being changed to approved/rejected, set review timestamp
  if (
    this.isModified("status") &&
    ["approved", "rejected"].includes(this.status)
  ) {
    this.reviewedAt = new Date();
  }

  next();
});

// Instance method to get submission summary
wtfSubmissionSchema.methods.getSummary = function () {
  return {
    id: this._id,
    studentId: this.studentId,
    type: this.type,
    title: this.title,
    status: this.status,
    createdAt: this.createdAt,
    reviewedAt: this.reviewedAt,
    approvedPinId: this.approvedPinId,
  };
};

// Instance method to check if submission is reviewable
wtfSubmissionSchema.methods.isReviewable = function () {
  return this.status === "pending" && !this.isDraft;
};

// Instance method to check if submission is pending
wtfSubmissionSchema.methods.isPending = function () {
  return this.status === "pending";
};

// Instance method to approve submission
wtfSubmissionSchema.methods.approve = function (reviewerId, notes = "") {
  this.status = "approved";
  this.reviewedBy = reviewerId;
  this.reviewNotes = notes;
  this.reviewedAt = new Date();
  return this.save();
};

// Instance method to reject submission
wtfSubmissionSchema.methods.reject = function (reviewerId, notes = "") {
  this.status = "rejected";
  this.reviewedBy = reviewerId;
  this.reviewNotes = notes;
  this.reviewedAt = new Date();
  return this.save();
};

// Static method to get pending submissions
wtfSubmissionSchema.statics.getPendingSubmissions = function (
  limit = 50,
  skip = 0
) {
  return this.find({
    status: "pending",
    isDraft: false,
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate("studentId", "name role")
    .populate("reviewedBy", "name role");
};

// Static method to get student's submissions
wtfSubmissionSchema.statics.getStudentSubmissions = function (
  studentId,
  limit = 50
) {
  return this.find({
    studentId: new mongoose.Types.ObjectId(studentId),
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("reviewedBy", "name role")
    .populate("approvedPinId", "title type");
};

// Static method to get submissions by type
wtfSubmissionSchema.statics.getSubmissionsByType = function (
  type,
  status = null,
  limit = 50
) {
  const query = { type };
  if (status) query.status = status;

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("studentId", "name role")
    .populate("reviewedBy", "name role");
};

// Static method to get submission statistics
wtfSubmissionSchema.statics.getSubmissionStats = function () {
  return this.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        types: { $addToSet: "$type" },
      },
    },
  ]);
};

// Static method to get recent submissions for analytics
wtfSubmissionSchema.statics.getRecentSubmissions = function (days = 7) {
  const date = new Date();
  date.setDate(date.getDate() - days);

  return this.find({
    createdAt: { $gte: date },
  })
    .sort({ createdAt: -1 })
    .populate("studentId", "name role")
    .populate("reviewedBy", "name role");
};

// Static method to find pending submissions (alias for getPendingSubmissions)
wtfSubmissionSchema.statics.findPendingSubmissions = function () {
  return this.getPendingSubmissions();
};

// Static method to find submissions by student (alias for getStudentSubmissions)
wtfSubmissionSchema.statics.findByStudent = function (studentId) {
  return this.getStudentSubmissions(studentId);
};

const WtfSubmission = mongoose.models.wtf_submission || mongoose.model("wtf_submission", wtfSubmissionSchema);
module.exports = WtfSubmission;
