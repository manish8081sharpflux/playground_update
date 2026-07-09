const mongoose = require("mongoose");

const wtfStudentInteractionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student ID is required"],
    },
    pinId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "wtf_pin",
      required: [true, "Pin ID is required"],
    },
    type: {
      type: String,
      enum: ["like", "seen", "love"],
      required: [true, "Interaction type is required"],
    },
    // For like interactions, we can track additional data
    likeType: {
      type: String,
      enum: ["thumbs_up", "green_heart"],
      required: function () {
        return this.type === "like";
      },
    },
    // For seen interactions, we can track view duration
    viewDuration: {
      type: Number, // Duration in seconds
      min: [0, "View duration cannot be negative"],
      required: function () {
        return this.type === "seen";
      },
    },
    // Track if the interaction was from a specific device/session
    sessionId: {
      type: String,
      trim: true,
    },
    // Track the source of the interaction
    source: {
      type: String,
      enum: ["web", "mobile", "tablet"],
      default: "web",
    },
    // Additional metadata
    metadata: {
      userAgent: String,
      ipAddress: String,
      timestamp: { type: Date, default: Date.now },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance
wtfStudentInteractionSchema.index({ pinId: 1, type: 1 });
wtfStudentInteractionSchema.index({ studentId: 1, createdAt: -1 });
wtfStudentInteractionSchema.index({ type: 1, createdAt: -1 });

// Compound unique index to prevent duplicate interactions
// For likes, we need to include likeType to allow both thumbs_up and green_heart
wtfStudentInteractionSchema.index(
  { studentId: 1, pinId: 1, type: 1, likeType: 1 },
  { unique: true, partialFilterExpression: { type: "like" } }
);

// For love interactions, use the original constraint
wtfStudentInteractionSchema.index(
  { studentId: 1, pinId: 1, type: 1 },
  { unique: true, partialFilterExpression: { type: { $in: ["seen", "love"] } } }
);

// Pre-save middleware to validate interaction data
wtfStudentInteractionSchema.pre("save", function (next) {
  // Validate like type for like interactions
  if (this.type === "like" && !this.likeType) {
    return next(new Error("Like type is required for like interactions"));
  }

  // Validate view duration for seen interactions
  if (this.type === "seen" && (!this.viewDuration || this.viewDuration < 0)) {
    return next(
      new Error("Valid view duration is required for seen interactions")
    );
  }

  // Love interactions don't need additional validation
  if (this.type === "love") {
    // Ensure likeType is not set for love interactions
    if (this.likeType) {
      this.likeType = undefined;
    }
  }

  next();
});

// Instance method to get interaction summary
wtfStudentInteractionSchema.methods.getSummary = function () {
  return {
    studentId: this.studentId,
    pinId: this.pinId,
    type: this.type,
    likeType: this.likeType,
    viewDuration: this.viewDuration,
    createdAt: this.createdAt,
  };
};

// Static method to get interaction counts for a pin
wtfStudentInteractionSchema.statics.getPinInteractionCounts = function (pinId) {
  return this.aggregate([
    { $match: { pinId: new mongoose.Types.ObjectId(pinId) } },
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
        // For likes, also group by like type
        likeTypes: {
          $push: {
            $cond: [{ $eq: ["$type", "like"] }, "$likeType", null],
          },
        },
      },
    },
  ]);
};

// Static method to get student's interactions for a pin
wtfStudentInteractionSchema.statics.getStudentPinInteractions = function (
  studentId,
  pinId
) {
  return this.find({
    studentId: new mongoose.Types.ObjectId(studentId),
    pinId: new mongoose.Types.ObjectId(pinId),
  }).select("type likeType viewDuration createdAt");
};

// Static method to check if student has interacted with a pin
// For likes, we need to check both type and likeType
wtfStudentInteractionSchema.statics.hasStudentInteracted = function (
  studentId,
  pinId,
  type,
  likeType = null
) {
  const query = {
    studentId: new mongoose.Types.ObjectId(studentId),
    pinId: new mongoose.Types.ObjectId(pinId),
    type: type,
  };

  // For likes, also check the likeType
  if (type === "like" && likeType) {
    query.likeType = likeType;
  }

  // For love and seen interactions, no additional fields needed
  // likeType should not be included for these types

  console.log("🔍 hasStudentInteracted query:", JSON.stringify(query, null, 2));

  return this.exists(query);
};

// Static method to get student's interaction history
wtfStudentInteractionSchema.statics.getStudentInteractionHistory = function (
  studentId,
  limit = 50
) {
  return this.find({
    studentId: new mongoose.Types.ObjectId(studentId),
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("pinId", "title type author")
    .select("type likeType viewDuration pinId createdAt");
};

// Static method to get recent interactions for analytics
wtfStudentInteractionSchema.statics.getRecentInteractions = function (
  days = 7
) {
  const date = new Date();
  date.setDate(date.getDate() - days);

  return this.find({
    createdAt: { $gte: date },
  })
    .sort({ createdAt: -1 })
    .populate("pinId", "title type author")
    .populate("studentId", "name role");
};

// Static method to find interactions by student
wtfStudentInteractionSchema.statics.findByStudent = function (studentId) {
  return this.find({
    studentId: new mongoose.Types.ObjectId(studentId),
  }).populate("pinId", "title type author");
};

// Static method to find interactions by pin
wtfStudentInteractionSchema.statics.findByPin = function (pinId) {
  return this.find({
    pinId: new mongoose.Types.ObjectId(pinId),
  }).populate("studentId", "name role");
};

// Static method to get interaction counts (alias for getPinInteractionCounts)
wtfStudentInteractionSchema.statics.getInteractionCounts = function (pinId) {
  return this.getPinInteractionCounts(pinId);
};

const WtfStudentInteraction = mongoose.models.wtf_student_interaction || mongoose.model(
  "wtf_student_interaction",
  wtfStudentInteractionSchema
);

module.exports = WtfStudentInteraction;
