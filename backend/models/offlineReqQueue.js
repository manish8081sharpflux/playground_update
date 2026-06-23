const mongoose = require("mongoose");

const OfflineRequestQueueSchema = new mongoose.Schema(
  {
    operation: { type: String, required: true },
    apiPath: { type: String, required: true },
    method: { type: String, default: "POST" },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    attachmentString: { type: String, default: "" },
    attachments: [{ filePath: String, fieldName: String }],
    status: { type: String, default: "pending" },
    error: { type: String, default: "" },
    token: { type: String, default: "" },
    generatedId: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

const OfflineRequestQueue = mongoose.models.offline_request_queue || mongoose.model(
  "offline_request_queue",
  OfflineRequestQueueSchema
);

module.exports = OfflineRequestQueue;
