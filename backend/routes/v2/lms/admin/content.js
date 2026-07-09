const express = require('express');
const router = express.Router();
const contentController = require('../../../../controllers/contentController');
const { authenticate } = require('../../../../middleware/auth');
const { authorize } = require('../../../../middleware/auth');
const { lmsUploadWithErrorHandling } = require('../../../../middleware/upload');

// ==================== CONTENT UPLOAD ENDPOINTS ====================

/**
 * Create presigned URL for direct browser-to-S3 upload
 * POST /api/v2/lms/admin/content/upload-url
 */
router.post(
  '/upload-url',
  authenticate,
  authorize('LMS Management', 'Manage'),
  contentController.createUploadUrl
);

/**
 * Record metadata after direct browser-to-S3 upload completes
 * POST /api/v2/lms/admin/content/complete-upload
 */
router.post(
  '/complete-upload',
  authenticate,
  authorize('LMS Management', 'Manage'),
  contentController.completeDirectUpload
);

/**
 * Upload files directly to S3 via backend (backend proxy pattern)
 * POST /api/v2/lms/admin/content/upload
 * Expects multipart/form-data with 'files' field (up to 10 files, max 500MB each)
 * Auth required: Admin with LMS Management permissions
 */
router.post(
  '/upload',
  authenticate,
  authorize('LMS Management', 'Manage'),
  lmsUploadWithErrorHandling,
  contentController.uploadFiles
);

// ==================== CONTENT LIBRARY ENDPOINTS ====================

/**
 * Get all files with filtering, search, and sorting
 * GET /api/v2/lms/admin/content/library
 * Query params: fileType, search, sort, limit, offset
 * Auth required: Admin with LMS Management permissions
 */
router.get(
  '/library',
  authenticate,
  authorize('LMS Management', 'Read'),
  contentController.getAllFiles
);

/**
 * Get single file details by ID
 * GET /api/v2/lms/admin/content/library/:id
 * Auth required: Admin with LMS Management permissions
 */
router.get(
  '/library/:id',
  authenticate,
  authorize('LMS Management', 'Read'),
  contentController.getFileById
);

/**
 * Update file metadata (description, tags)
 * PUT /api/v2/lms/admin/content/library/:id
 * Auth required: Admin with LMS Management permissions
 */
router.put(
  '/library/:id',
  authenticate,
  authorize('LMS Management', 'Manage'),
  contentController.updateFileMetadata
);

/**
 * Delete file from S3 and MongoDB
 * DELETE /api/v2/lms/admin/content/library/:id
 * Auth required: Admin with LMS Management permissions
 */
router.delete(
  '/library/:id',
  authenticate,
  authorize('LMS Management', 'Manage'),
  contentController.deleteFile
);

// ==================== CONTENT STATISTICS ENDPOINT ====================

/**
 * Get content library statistics
 * GET /api/v2/lms/admin/content/stats
 * Auth required: Admin with LMS Management permissions
 */
router.get(
  '/stats',
  authenticate,
  authorize('LMS Management', 'Read'),
  contentController.getContentStats
);

module.exports = router;
