const mongoose = require("mongoose");

// Sprint6-Story-3-BugFix-006: Hospital model for searchable dropdown
const hospitalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Hospital name is required"],
      trim: true,
    },
    // Optional fields for future enhancement
    address: {
      type: String,
      trim: true,
    },
    city: {
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
hospitalSchema.index({ name: 1 });

const Hospital = mongoose.models.Hospital || mongoose.model("Hospital", hospitalSchema);

module.exports = Hospital;
