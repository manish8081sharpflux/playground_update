const express = require('express');
const router = express.Router();
const courseController = require('../../../../controllers/lms/admin/courseController');
const { authenticate, authorize } = require('../../../../middleware/auth');

// ==================== MODULE QUERY OPERATIONS ====================

/**
 * @route GET /api/v2/lms/admin/modules/:moduleId/chapters
 * @desc Get all chapters for a module
 * @access Private (Admin only)
 */
router.get(
  '/:moduleId/chapters',
  authenticate,
  authorize('LMS Management', 'Manage'),
  courseController.getChaptersByModuleId
);

module.exports = router;
