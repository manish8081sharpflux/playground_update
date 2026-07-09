/**
 * Facial Recognition Controller
 *
 * Handles API endpoints for face registration, recognition, and management.
 *
 * @module frController
 */

const frService = require('../services/frService');
const frCacheService = require('../services/frCacheService');
const FaceEmbedding = require('../models/FaceEmbedding');
const User = require('../models/user');
const multer = require('multer');
const { errorLogger } = require('../config/pino-config');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

/**
 * Register face for a student
 *
 * POST /api/v2/fr/register
 *
 * @body {string} studentId - Student ID
 * @file photo - Face photo (multipart/form-data) - OR -
 * @body {string} photo - Base64-encoded image (for mobile apps)
 * @returns {Object} Registration result
 *
 * Task 10: Mobile Integration - Supports both multipart and base64 formats
 */
async function registerFace(req, res) {
  try {
    const { studentId } = req.body;
    const registeredBy = req.user._id; // From JWT middleware

    // Validation
    if (!studentId) {
      return res.status(400).json({
        success: false,
        error: 'Student ID is required',
      });
    }

    // Get image buffer from either multipart file or base64 string
    let imageBuffer;

    if (req.file && req.file.buffer) {
      // Multipart/form-data (web uploads, Postman)
      imageBuffer = req.file.buffer;
    } else if (req.body.photo) {
      // Base64-encoded image (mobile apps, JSON API calls)
      try {
        // Handle both data URIs and plain base64
        const base64Data = req.body.photo.replace(/^data:image\/\w+;base64,/, '');
        imageBuffer = Buffer.from(base64Data, 'base64');

        // Validate buffer size (max 10MB like multer)
        if (imageBuffer.length > 10 * 1024 * 1024) {
          return res.status(400).json({
            success: false,
            error: 'Image too large (max 10MB)',
          });
        }
      } catch (err) {
        return res.status(400).json({
          success: false,
          error: 'Invalid base64 image data',
          details: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'Face photo is required (multipart file or base64 string)',
      });
    }

    // Check if student exists (User with role='student')
    const student = await User.findOne({ _id: studentId, role: 'student' });
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found',
      });
    }

    // Register face
    const result = await frService.registerFace(
      studentId,
      imageBuffer,
      registeredBy,
      'admin_upload'
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        studentId,
        studentName: student.name,
        confidence: result.confidence,
        quality: result.quality,
        livenessScore: result.livenessScore,
      },
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error in registerFace:');
    return res.status(500).json({
      success: false,
      error: 'Face registration failed due to server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Recognize face (identify who it is)
 *
 * POST /api/v2/fr/recognize
 *
 * @file photo - Face photo (multipart/form-data) - OR -
 * @body {string} photo - Base64-encoded image (for mobile apps)
 * @body {number} threshold - Optional confidence threshold (0-1, default 0.5)
 * @returns {Object} Recognition result with student info
 *
 * Task 10: Mobile Integration - Supports both multipart and base64 formats
 */
async function recognizeFace(req, res) {
  try {
    // Get image buffer from either multipart file or base64 string
    let imageBuffer;

    if (req.file && req.file.buffer) {
      // Multipart/form-data (web uploads, Postman)
      imageBuffer = req.file.buffer;
    } else if (req.body.photo) {
      // Base64-encoded image (mobile apps, JSON API calls)
      try {
        // Handle both data URIs and plain base64
        const base64Data = req.body.photo.replace(/^data:image\/\w+;base64,/, '');
        imageBuffer = Buffer.from(base64Data, 'base64');

        // Validate buffer size (max 10MB)
        if (imageBuffer.length > 10 * 1024 * 1024) {
          return res.status(400).json({
            success: false,
            error: 'Image too large (max 10MB)',
          });
        }
      } catch (err) {
        return res.status(400).json({
          success: false,
          error: 'Invalid base64 image data',
          details: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'Face photo is required (multipart file or base64 string)',
      });
    }

    const threshold = req.body.threshold ? parseFloat(req.body.threshold) : 0.5;

    // Validate threshold
    if (threshold < 0 || threshold > 1) {
      return res.status(400).json({
        success: false,
        error: 'Threshold must be between 0 and 1',
      });
    }

    // Recognize face
    const result = await frService.recognizeFace(imageBuffer, threshold);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Get student details (User with role='student')
    const student = await User.findOne({ _id: result.studentId, role: 'student' }).select('name email phoneNumber balagruhaIds');

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Recognized student not found in database',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Face recognized successfully',
      data: {
        studentId: result.studentId,
        student: {
          id: student._id,
          name: student.name,
          email: student.email,
          phoneNumber: student.phoneNumber,
          balagruhaIds: student.balagruhaIds,
        },
        confidence: result.confidence,
        threshold: result.threshold,
        quality: result.quality,
        topMatches: result.topMatches?.slice(0, 3), // Top 3 for debugging
      },
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error in recognizeFace:');
    return res.status(500).json({
      success: false,
      error: 'Face recognition failed due to server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Check if student has face registered
 *
 * GET /api/v2/fr/status/:studentId
 *
 * @param {string} studentId - Student ID
 * @returns {Object} Registration status
 */
async function getRegistrationStatus(req, res) {
  try {
    const { studentId } = req.params;

    // Check if student exists (User with role='student')
    const student = await User.findOne({ _id: studentId, role: 'student' });
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found',
      });
    }

    // Check if face embedding exists
    const embedding = await FaceEmbedding.findOne({
      studentId,
      isActive: true,
    }).select('createdAt metadata.confidence metadata.livenessScore usageCount lastUsedAt');

    const isRegistered = !!embedding;

    return res.status(200).json({
      success: true,
      data: {
        studentId,
        studentName: student.name,
        isRegistered,
        registration: isRegistered ? {
          registeredAt: embedding.createdAt,
          confidence: embedding.metadata?.confidence,
          livenessScore: embedding.metadata?.livenessScore,
          usageCount: embedding.usageCount,
          lastUsedAt: embedding.lastUsedAt,
        } : null,
      },
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error in getRegistrationStatus:');
    return res.status(500).json({
      success: false,
      error: 'Failed to get registration status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Delete face registration for student
 *
 * DELETE /api/v2/fr/register/:studentId
 *
 * @param {string} studentId - Student ID
 * @returns {Object} Deletion result
 */
async function deleteFaceRegistration(req, res) {
  try {
    const { studentId } = req.params;

    // Check if student exists (User with role='student')
    const student = await User.findOne({ _id: studentId, role: 'student' });
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found',
      });
    }

    // Deactivate all embeddings for this student
    const result = await FaceEmbedding.updateMany(
      { studentId, isActive: true },
      { $set: { isActive: false, updatedAt: new Date() } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'No active face registration found for this student',
      });
    }

    // Invalidate cache
    await frCacheService.invalidateCache(studentId.toString());

    return res.status(200).json({
      success: true,
      message: 'Face registration deleted successfully',
      data: {
        studentId,
        studentName: student.name,
        deactivatedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error in deleteFaceRegistration:');
    return res.status(500).json({
      success: false,
      error: 'Failed to delete face registration',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Get FR statistics (admin only)
 *
 * GET /api/v2/fr/stats
 *
 * @query {string} startDate - Optional start date
 * @query {string} endDate - Optional end date
 * @returns {Object} FR statistics
 */
async function getFRStats(req, res) {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default: last 7 days
    const end = endDate ? new Date(endDate) : new Date();

    const FRSession = require('../models/FRSession');

    // Get stats from FRSession model
    const [
      registrationStats,
      loginStats,
      totalRegistrations,
      totalActive,
    ] = await Promise.all([
      FRSession.getSuccessRate('registration', start, end),
      FRSession.getSuccessRate('login', start, end),
      FaceEmbedding.countDocuments({}),
      FaceEmbedding.countDocuments({ isActive: true }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        period: { start, end },
        registration: registrationStats,
        login: loginStats,
        embeddings: {
          total: totalRegistrations,
          active: totalActive,
          inactive: totalRegistrations - totalActive,
        },
      },
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error in getFRStats:');
    return res.status(500).json({
      success: false,
      error: 'Failed to get FR statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

module.exports = {
  registerFace,
  recognizeFace,
  getRegistrationStatus,
  deleteFaceRegistration,
  getFRStats,
  upload, // Export multer middleware
};
