const { default: mongoose } = require("mongoose");

const repairRequestSchema = new mongoose.Schema(
  {
    balagruhaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Balagruha",
      required: true,
    },
    issueName: { type: String, default: "", required: true },
    description: { type: String, default: "" },
    dateReported: { type: Date },
    urgency: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low",
    },
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed"],
      default: "pending",
    },
    estimatedCost: { type: Number },
    attachments: [
      {
        fileName: { type: String },
        fileUrl: { type: String },
        fileType: { type: String },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Reference to the User model who uploaded the file
        uploadedAt: { type: Date, default: Date.now },
      },
    ], // URLs or file paths for attachments
    repairDetails: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

const RepairRequests = mongoose.models.repair_requests || mongoose.model("repair_requests", repairRequestSchema);
module.exports = RepairRequests;
