const mongoose = require("mongoose");

const trainingSession = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    location: { type: String, default: "" },
    labels: [{ type: String }], // Array of labels for categorization
    type: {
      type: String,
      enum: ["sports", "fitness", "nutrition", "general", "music"],
      default: "general",
    }, // Type of task (sports, fitness, nutrition)
    drillsAndExercises: { type: String, default: "" },
    notificationPreferences: { type: [String], default: "" },
    status: { type: String, default: "active", enum: ["active", "cancelled"] },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    balagruhaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Balagruha",
      required: true,
    },
    assignedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Array of student IDs
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

const TrainingSession = mongoose.models.training_sessions || mongoose.model("training_sessions", trainingSession);
module.exports = TrainingSession;
