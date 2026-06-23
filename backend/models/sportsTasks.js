const mongoose = require("mongoose");

const sportsTaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    drillOrExerciseType: { type: String, default: "" },
    duration: { type: String, default: "" },
    assignedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }, // Reference to the User model
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }, // Reference to the creator (Admin or Coach)
    deadline: { type: Date, required: true },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["pending", "in progress", "completed"],
      default: "pending",
    },
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        comment: { type: String },
        attachments: [
          {
            fileName: { type: String },
            fileUrl: { type: String },
            fileType: { type: String },
            uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Reference to the User model who uploaded the file
            uploadedAt: { type: Date, default: Date.now },
          },
        ],
        createdAt: { type: Date, default: Date.now },
      },
    ],
    attachments: [
      {
        fileName: { type: String },
        fileUrl: { type: String },
        fileType: { type: String },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Reference to the User model who uploaded the file
        uploadedAt: { type: Date, default: Date.now },
      },
    ], // URLs or file paths for attachments
    performanceMetrics: {
      time: { type: String, default: "" },
      score: { type: String, default: "" },
      repetitions: { type: String, default: "" },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance - Story 6.7: Missing Database Indexes
sportsTaskSchema.index({ assignedUser: 1 });
sportsTaskSchema.index({ status: 1 });
sportsTaskSchema.index({ assignedUser: 1, status: 1 }); // Task list filtering by user + status
sportsTaskSchema.index({ createdAt: -1 }); // Sorting by creation date

const SportsTask = mongoose.models.sports_tasks || mongoose.model("sports_tasks", sportsTaskSchema);
module.exports = SportsTask;
