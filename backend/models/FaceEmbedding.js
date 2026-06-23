/**
 * Face Embedding Model
 *
 * Stores encrypted 128-d face embeddings for student facial recognition.
 * Each student has one active face embedding used for login/attendance.
 *
 * Security:
 * - Embeddings are encrypted at rest using AES-256-GCM
 * - Only encrypted data is stored in database
 * - Decryption happens in-memory during recognition
 *
 * @module FaceEmbedding
 */

const mongoose = require('mongoose');
const { encryptEmbedding, decryptEmbedding } = require('../utils/embeddingEncryption');

const FaceEmbeddingSchema = new mongoose.Schema({
  // Reference to student
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // One face embedding per student
    index: true,
  },

  // Encrypted face embedding (128-d descriptor from Human library)
  // Format: "iv:authTag:encryptedData" (hex string)
  embedding: {
    type: String,
    required: true,
    select: false, // Don't include in queries by default for security
  },

  // Metadata about the embedding
  metadata: {
    // Confidence score when embedding was created (0-1)
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },

    // Quality metrics from face detection
    quality: {
      // Face detection confidence
      detection: { type: Number, min: 0, max: 1 },
      // Face landmarks quality
      landmarks: { type: Number, min: 0, max: 1 },
      // Image quality (lighting, blur, etc.)
      image: { type: Number, min: 0, max: 1 },
    },

    // Liveness score when registered (anti-spoofing)
    livenessScore: {
      type: Number,
      min: 0,
      max: 1,
    },

    // Face detection bounding box (for debugging/audit)
    boundingBox: {
      x: Number,
      y: Number,
      width: Number,
      height: Number,
    },

    // Image dimensions when embedding was created
    imageDimensions: {
      width: Number,
      height: Number,
    },
  },

  // Who registered this face embedding
  registeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Registration method
  registrationMethod: {
    type: String,
    enum: ['admin_upload', 'self_registration', 'bulk_import', 'migration'],
    default: 'admin_upload',
  },

  // Is this embedding currently active?
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },

  // When this embedding was last used for successful recognition
  lastUsedAt: {
    type: Date,
    index: true,
  },

  // Number of times this embedding has been successfully matched
  usageCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
FaceEmbeddingSchema.index({ studentId: 1, isActive: 1 });
FaceEmbeddingSchema.index({ createdAt: -1 });
FaceEmbeddingSchema.index({ lastUsedAt: -1 });

/**
 * Instance method: Set embedding (encrypts before storing)
 *
 * @param {Array<number>} embeddingArray - 128-d face descriptor from Human library
 * @throws {Error} If encryption fails
 */
FaceEmbeddingSchema.methods.setEmbedding = function (embeddingArray) {
  try {
    this.embedding = encryptEmbedding(embeddingArray);
  } catch (error) {
    throw new Error(`Failed to encrypt embedding: ${error.message}`);
  }
};

/**
 * Instance method: Get embedding (decrypts from storage)
 *
 * @returns {Array<number>} Decrypted 128-d face descriptor
 * @throws {Error} If decryption fails or data tampered
 */
FaceEmbeddingSchema.methods.getEmbedding = function () {
  if (!this.embedding) {
    throw new Error('No embedding data available');
  }

  try {
    return decryptEmbedding(this.embedding);
  } catch (error) {
    throw new Error(`Failed to decrypt embedding: ${error.message}`);
  }
};

/**
 * Instance method: Update usage statistics
 * Call this when the embedding is successfully used for recognition
 */
FaceEmbeddingSchema.methods.recordUsage = async function () {
  this.lastUsedAt = new Date();
  this.usageCount += 1;
  await this.save();
};

/**
 * Static method: Get active embedding for student
 *
 * @param {ObjectId} studentId - Student ID
 * @returns {Promise<FaceEmbedding|null>} Active face embedding with decrypted data
 */
FaceEmbeddingSchema.statics.getActiveEmbedding = async function (studentId) {
  const embedding = await this.findOne({
    studentId,
    isActive: true,
  }).select('+embedding'); // Include encrypted embedding field

  return embedding;
};

/**
 * Static method: Get all active embeddings (for cache warming)
 *
 * @returns {Promise<Array>} Array of { studentId, embedding } objects
 */
FaceEmbeddingSchema.statics.getAllActiveEmbeddings = async function () {
  const embeddings = await this.find({
    isActive: true,
  }).select('studentId embedding').lean();

  // Decrypt embeddings
  return embeddings.map(doc => {
    try {
      return {
        studentId: doc.studentId.toString(),
        embedding: decryptEmbedding(doc.embedding),
      };
    } catch (error) {
      console.error(`Failed to decrypt embedding for student ${doc.studentId}:`, error.message);
      return null;
    }
  }).filter(Boolean); // Remove failed decryptions
};

/**
 * Static method: Deactivate old embedding and create new one
 *
 * @param {ObjectId} studentId - Student ID
 * @param {Array<number>} embeddingArray - New 128-d face descriptor
 * @param {Object} metadata - Embedding metadata
 * @param {ObjectId} registeredBy - User who registered
 * @returns {Promise<FaceEmbedding>} New face embedding document
 */
FaceEmbeddingSchema.statics.replaceEmbedding = async function (studentId, embeddingArray, metadata, registeredBy) {
  // The studentId field has a unique index, so the legacy "deactivate then
  // insert" pattern hit dup-key errors on re-enrollment. Delete-then-insert
  // gives us exactly one active record per student (the desired invariant).
  await this.deleteOne({ studentId });

  const newEmbedding = new this({
    studentId,
    metadata,
    registeredBy,
    isActive: true,
  });

  newEmbedding.setEmbedding(embeddingArray);
  await newEmbedding.save();

  return newEmbedding;
};

/**
 * Prevent embedding field from appearing in logs
 */
FaceEmbeddingSchema.methods.toJSON = function () {
  const obj = this.toObject({ virtuals: true });
  delete obj.embedding; // Never include raw embedding in JSON
  return obj;
};

const FaceEmbedding = mongoose.models.FaceEmbedding || mongoose.model("FaceEmbedding", FaceEmbeddingSchema);
module.exports = FaceEmbedding;
