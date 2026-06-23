/**
 * @deprecated Story 6.3 — Student model is deprecated. Use User model (role === 'student') instead.
 * All direct imports of this model have been migrated to User model.
 * This file is kept for backward compatibility and pending data migration.
 * DO NOT add new imports of this model.
 */
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    age: { type: Number, required: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    balagruhaId: { type: mongoose.Schema.Types.ObjectId, ref: "Balagruha" },
    parentalStatus: {
      type: String,
      enum: ["has both", "has one", "has none", "has guardian"],
    },
    guardianContact: { type: String },
    attendanceRecords: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Attendance" },
    ],
    medicalRecords: [
      { type: mongoose.Schema.Types.ObjectId, ref: "MedicalRecord" },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Safe model definition to prevent OverwriteModelError
const Student = mongoose.models.Student || mongoose.model("Student", studentSchema);

module.exports = Student;
