const mongoose = require('mongoose');

const contentLibrarySchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true,
    trim: true,
  },
  fileType: {
    type: String,
    required: true,
    enum: ['video', 'pdf', 'audio', 'image'],
  },
  fileUrl: {
    type: String,
    required: true, // CDN URL for accessing the file
  },
  s3Key: {
    type: String,
    required: true, // S3 object key for managing the file
  },
  fileSize: {
    type: Number,
    required: true, // Size in bytes
  },
  mimeType: {
    type: String,
    required: true, // e.g., 'video/mp4', 'application/pdf', etc.
  },
  metadata: {
    // Video-specific metadata
    duration: Number, // Duration in seconds (for video/audio)
    dimensions: {
      width: Number,
      height: Number,
    },
    // PDF-specific metadata
    pages: Number, // Number of pages (for PDFs)
    // Audio-specific metadata
    bitrate: String, // Audio bitrate
    // Thumbnail (for videos)
    thumbnailUrl: String,
    thumbnailKey: String,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  description: {
    type: String,
    trim: true,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  usedInCourses: [{
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
    },
    courseTitle: String,
    moduleId: mongoose.Schema.Types.ObjectId,
    chapterId: mongoose.Schema.Types.ObjectId,
    contentItemId: mongoose.Schema.Types.ObjectId,
  }],
  uploadStatus: {
    type: String,
    enum: ['pending', 'uploading', 'complete', 'failed'],
    default: 'pending',
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  lastAccessedAt: {
    type: Date,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
contentLibrarySchema.index({ fileType: 1, uploadedAt: -1 });
contentLibrarySchema.index({ fileName: 'text', tags: 'text', description: 'text' });
contentLibrarySchema.index({ uploadedBy: 1 });
contentLibrarySchema.index({ 'usedInCourses.courseId': 1 });

// Virtual for formatted file size
contentLibrarySchema.virtual('fileSizeFormatted').get(function() {
  const bytes = this.fileSize;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
});

// Virtual for formatted duration (for video/audio)
contentLibrarySchema.virtual('durationFormatted').get(function() {
  if (!this.metadata || !this.metadata.duration) return null;

  const totalSeconds = Math.floor(this.metadata.duration);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Static method to find files by type
contentLibrarySchema.statics.findByType = function(fileType, options = {}) {
  const query = this.find({ fileType });

  if (options.limit) query.limit(options.limit);
  if (options.skip) query.skip(options.skip);
  if (options.sort) query.sort(options.sort);

  return query;
};

// Static method to search files
contentLibrarySchema.statics.searchFiles = function(searchText, options = {}) {
  const query = this.find({ $text: { $search: searchText } });

  if (options.fileType) query.where({ fileType: options.fileType });
  if (options.limit) query.limit(options.limit);
  if (options.skip) query.skip(options.skip);

  return query.sort({ score: { $meta: 'textScore' } });
};

// Method to add course usage
contentLibrarySchema.methods.addCourseUsage = async function(courseData) {
  // Check if this course is already in usedInCourses
  const exists = this.usedInCourses.some(
    usage => usage.courseId.toString() === courseData.courseId.toString()
  );

  if (!exists) {
    this.usedInCourses.push(courseData);
    await this.save();
  }

  return this;
};

// Method to remove course usage
contentLibrarySchema.methods.removeCourseUsage = async function(courseId) {
  this.usedInCourses = this.usedInCourses.filter(
    usage => usage.courseId.toString() !== courseId.toString()
  );
  await this.save();
  return this;
};

// Pre-save hook to update lastAccessedAt
contentLibrarySchema.pre('save', function(next) {
  if (this.isModified('uploadStatus') && this.uploadStatus === 'complete') {
    this.lastAccessedAt = new Date();
  }
  next();
});

const ContentLibrary = mongoose.models.ContentLibrary || mongoose.model("ContentLibrary", contentLibrarySchema);
module.exports = ContentLibrary;
