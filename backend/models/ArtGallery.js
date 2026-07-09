// backend/models/ArtGallery.js
const mongoose = require('mongoose');

const ArtGallerySchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'Untitled Sketch',
      maxlength: 200,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    s3Key: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
      default: null,
    },
    canvasSize: {
      width: { type: Number, default: 1024 },
      height: { type: Number, default: 768 },
    },
    metadata: {
      fileSize: { type: Number, default: null },
      mimeType: { type: String, default: null },
      sessionDuration: { type: Number, default: 0 }, // seconds
    },
    // Whether this gallery item has been submitted for grading
    submitted: {
      type: Boolean,
      default: false,
    },
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ArtGallerySchema.index({ student: 1, createdAt: -1 });

const ArtGallery =
  mongoose.models.ArtGallery ||
  mongoose.model('ArtGallery', ArtGallerySchema);

module.exports = ArtGallery;
