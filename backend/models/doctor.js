const mongoose = require("mongoose");

// Sprint6-Story-3-AC2: Doctor model for searchable dropdown
const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Doctor name is required"],
      trim: true,
    },
    // Optional fields for future enhancement
    specialty: {
      type: String,
      trim: true,
    },
    hospital: {
      type: String,
      trim: true,
    },
    contactNumber: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Create index for faster name searches
doctorSchema.index({ name: 1 });

const Doctor = mongoose.models.Doctor || mongoose.model("Doctor", doctorSchema);

module.exports = Doctor;
