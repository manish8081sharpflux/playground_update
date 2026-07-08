const mongoose = require("mongoose");

const StudentMoodTrackerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the Student model
      required: true,
    },
    mood: {
      type: String,
      enum: [
        "happy",
        "excited",
        "neutral",
        "sad",
        "very_sad",
        "afraid",
        "angry",
        "unwell",
      ], // Includes legacy student dashboard values
      required: true,
    },
    dateString: {
      type: String,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String, // Optional student note
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Pre-save middleware to create dateString from date
StudentMoodTrackerSchema.pre("save", function (next) {
  if (this.date) {
    const date = new Date(this.date);
    this.dateString = date.toISOString().split("T")[0]; // Format: YYYY-MM-DD
  }
  next();
});

const StudentMoodTracker = mongoose.models.StudentMoodTracker || mongoose.model(
  "StudentMoodTracker",
  StudentMoodTrackerSchema,
  "student_mood_trackers"
);

module.exports = StudentMoodTracker;
