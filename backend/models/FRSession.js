/**
 * Facial Recognition Session Model
 *
 * Tracks all facial recognition operations (registration, login, attendance) for:
 * - Security audit trail
 * - Performance monitoring
 * - Accuracy tracking
 * - Debugging failed recognitions
 *
 * Every FR operation creates a session record, whether successful or failed.
 *
 * @module FRSession
 */

const mongoose = require('mongoose');

const FRSessionSchema = new mongoose.Schema({
  // Session type
  sessionType: {
    type: String,
    enum: ['registration', 'login', 'attendance', 'verification', 'test'],
    required: true,
    index: true,
  },

  // Student involved (may be null for failed recognition)
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    index: true,
  },

  // User who initiated the session (for registration by admin)
  initiatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  // Success/failure status
  success: {
    type: Boolean,
    required: true,
    index: true,
  },

  // If failed, reason for failure
  failureReason: {
    type: String,
    enum: [
      'no_face_detected',
      'multiple_faces_detected',
      'poor_image_quality',
      'low_confidence',
      'liveness_failed',
      'no_matching_embedding',
      'student_not_found',
      'server_error',
      'timeout',
      'other',
    ],
  },

  // Failure details (additional context)
  failureDetails: {
    type: String,
  },

  // Recognition results
  recognition: {
    // Matched student ID (if recognized)
    matchedStudentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
    },

    // Confidence score (0-1)
    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },

    // Threshold used for matching
    threshold: {
      type: Number,
      min: 0,
      max: 1,
    },

    // Was threshold met?
    thresholdMet: {
      type: Boolean,
    },

    // Top 3 matches for debugging (if available)
    topMatches: [{
      studentId: mongoose.Schema.Types.ObjectId,
      confidence: Number,
    }],

    // Number of embeddings compared against
    comparisonsCount: {
      type: Number,
    },

    // Recognition latency (milliseconds)
    recognitionTimeMs: {
      type: Number,
    },
  },

  // Face detection results
  faceDetection: {
    // Number of faces detected
    facesDetected: {
      type: Number,
      default: 0,
    },

    // Face detection confidence
    detectionConfidence: {
      type: Number,
      min: 0,
      max: 1,
    },

    // Bounding box of detected face
    boundingBox: {
      x: Number,
      y: Number,
      width: Number,
      height: Number,
    },

    // Face detection latency (milliseconds)
    detectionTimeMs: {
      type: Number,
    },
  },

  // Image quality metrics
  imageQuality: {
    // Overall quality score
    overall: {
      type: Number,
      min: 0,
      max: 1,
    },

    // Lighting quality
    lighting: {
      type: Number,
      min: 0,
      max: 1,
    },

    // Blur/sharpness
    sharpness: {
      type: Number,
      min: 0,
      max: 1,
    },

    // Image dimensions
    width: Number,
    height: Number,

    // Image size in bytes
    sizeBytes: Number,
  },

  // Liveness detection results
  liveness: {
    // Liveness score (0-1)
    score: {
      type: Number,
      min: 0,
      max: 1,
    },

    // Threshold used
    threshold: {
      type: Number,
      min: 0,
      max: 1,
    },

    // Did it pass liveness check?
    passed: {
      type: Boolean,
    },

    // Liveness detection latency (milliseconds)
    livenessTimeMs: {
      type: Number,
    },
  },

  // Performance metrics
  performance: {
    // Total session duration (milliseconds)
    totalTimeMs: {
      type: Number,
      index: true,
    },

    // Backend used (tensorflow, wasm, webgl)
    backend: {
      type: String,
    },

    // GPU used?
    gpuUsed: {
      type: Boolean,
    },

    // Cache hit (for recognition)
    cacheHit: {
      type: Boolean,
    },
  },

  // Device/client information
  client: {
    // IP address
    ipAddress: {
      type: String,
    },

    // User agent
    userAgent: {
      type: String,
    },

    // Device type (desktop, mobile, tablet)
    deviceType: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'unknown'],
    },

    // Browser
    browser: {
      type: String,
    },

    // Platform (iOS, Android, Windows, etc.)
    platform: {
      type: String,
    },
  },

  // Balagruha context (for attendance sessions)
  balagruhaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Balagruha',
  },

  // Session metadata
  metadata: {
    // Any additional context
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },

  // Timestamp (legacy field, kept for backward compatibility)
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for common queries
FRSessionSchema.index({ sessionType: 1, success: 1, timestamp: -1 });
FRSessionSchema.index({ studentId: 1, timestamp: -1 });
FRSessionSchema.index({ timestamp: -1, sessionType: 1 });
FRSessionSchema.index({ success: 1, failureReason: 1 });

/**
 * Static method: Create registration session
 *
 * @param {Object} data - Session data
 * @returns {Promise<FRSession>} Created session
 */
FRSessionSchema.statics.createRegistrationSession = async function (data) {
  return await this.create({
    sessionType: 'registration',
    ...data,
  });
};

/**
 * Static method: Create login session
 *
 * @param {Object} data - Session data
 * @returns {Promise<FRSession>} Created session
 */
FRSessionSchema.statics.createLoginSession = async function (data) {
  return await this.create({
    sessionType: 'login',
    ...data,
  });
};

/**
 * Static method: Create attendance session
 *
 * @param {Object} data - Session data
 * @returns {Promise<FRSession>} Created session
 */
FRSessionSchema.statics.createAttendanceSession = async function (data) {
  return await this.create({
    sessionType: 'attendance',
    ...data,
  });
};

/**
 * Static method: Get success rate for time period
 *
 * @param {String} sessionType - Session type to analyze
 * @param {Date} startDate - Start of period
 * @param {Date} endDate - End of period
 * @returns {Promise<Object>} Success rate stats
 */
FRSessionSchema.statics.getSuccessRate = async function (sessionType, startDate, endDate) {
  const query = {
    sessionType,
    timestamp: { $gte: startDate, $lte: endDate },
  };

  const [total, successful, failed] = await Promise.all([
    this.countDocuments(query),
    this.countDocuments({ ...query, success: true }),
    this.countDocuments({ ...query, success: false }),
  ]);

  return {
    total,
    successful,
    failed,
    successRate: total > 0 ? (successful / total) * 100 : 0,
    failureRate: total > 0 ? (failed / total) * 100 : 0,
  };
};

/**
 * Static method: Get failure reasons breakdown
 *
 * @param {String} sessionType - Session type to analyze
 * @param {Date} startDate - Start of period
 * @param {Date} endDate - End of period
 * @returns {Promise<Array>} Failure reasons with counts
 */
FRSessionSchema.statics.getFailureReasons = async function (sessionType, startDate, endDate) {
  return await this.aggregate([
    {
      $match: {
        sessionType,
        success: false,
        timestamp: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$failureReason',
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);
};

/**
 * Static method: Get average performance metrics
 *
 * @param {String} sessionType - Session type to analyze
 * @param {Date} startDate - Start of period
 * @param {Date} endDate - End of period
 * @returns {Promise<Object>} Average performance stats
 */
FRSessionSchema.statics.getAveragePerformance = async function (sessionType, startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        sessionType,
        success: true,
        timestamp: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: null,
        avgTotalTime: { $avg: '$performance.totalTimeMs' },
        avgRecognitionTime: { $avg: '$recognition.recognitionTimeMs' },
        avgDetectionTime: { $avg: '$faceDetection.detectionTimeMs' },
        avgConfidence: { $avg: '$recognition.confidence' },
        cacheHitRate: {
          $avg: { $cond: ['$performance.cacheHit', 1, 0] },
        },
      },
    },
  ]);

  return result[0] || {
    avgTotalTime: 0,
    avgRecognitionTime: 0,
    avgDetectionTime: 0,
    avgConfidence: 0,
    cacheHitRate: 0,
  };
};

/**
 * Static method: Get student's recent sessions
 *
 * @param {ObjectId} studentId - Student ID
 * @param {Number} limit - Number of sessions to return
 * @returns {Promise<Array>} Recent sessions
 */
FRSessionSchema.statics.getStudentSessions = async function (studentId, limit = 10) {
  return await this.find({ studentId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

const FRSession = mongoose.models.FRSession || mongoose.model("FRSession", FRSessionSchema);
module.exports = FRSession;
