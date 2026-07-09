const express = require('express');
const router = express.Router();
const translationController = require('../../../../controllers/lms/admin/translationController');
const { authenticate, authorize } = require('../../../../middleware/auth');

// ==================== TRANSLATION MANAGEMENT ====================

/**
 * @route GET /api/v2/lms/admin/translations/courses/:courseId/progress
 * @desc Get translation progress for a course
 * @access Private (Admin only)
 */
router.get(
  '/courses/:courseId/progress',
  authenticate,
  authorize('LMS Management', 'Manage'),
  translationController.getTranslationProgress
);

/**
 * @route GET /api/v2/lms/admin/translations/courses/:courseId/items
 * @desc Get list of all translatable items in a course
 * @access Private (Admin only)
 */
router.get(
  '/courses/:courseId/items',
  authenticate,
  authorize('LMS Management', 'Manage'),
  translationController.getTranslatableItems
);

/**
 * @route PUT /api/v2/lms/admin/translations/courses/:courseId/items/:itemId
 * @desc Save translation for a specific item
 * @access Private (Admin only)
 */
router.put(
  '/courses/:courseId/items/:itemId',
  authenticate,
  authorize('LMS Management', 'Manage'),
  translationController.saveTranslation
);

/**
 * @route PUT /api/v2/lms/admin/translations/courses/:courseId/publish
 * @desc Publish all translations for a course
 * @access Private (Admin only)
 */
router.put(
  '/courses/:courseId/publish',
  authenticate,
  authorize('LMS Management', 'Manage'),
  translationController.publishTranslations
);

module.exports = router;
