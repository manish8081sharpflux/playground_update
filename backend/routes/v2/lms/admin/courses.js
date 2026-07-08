const express = require('express');
const router = express.Router();
const courseController = require('../../../../controllers/lms/admin/courseController');
const adminAssignmentController = require('../../../../controllers/lms/admin/adminAssignmentController');
const { authenticate, authorize } = require('../../../../middleware/auth');

// ==================== ADMIN COURSE ASSIGNMENT (MUST BE BEFORE :id ROUTES) ====================

/**
 * @route GET /api/v2/lms/admin/courses/assignments
 * @desc Admin gets all course assignments
 * @access Private (Admin only)
 */
router.get(
  '/assignments',
  authenticate,
  authorize('LMS Management', 'Manage'),
  adminAssignmentController.getAllAssignments
);

/**
 * @route POST /api/v2/lms/admin/courses/assignments
 * @desc Admin assigns course to Balagruhas or specific students
 * @access Private (Admin only)
 */
router.post(
  '/assignments',
  authenticate,
  authorize('LMS Management', 'Manage'),
  adminAssignmentController.createAdminAssignment
);

/**
 * @route PUT /api/v2/lms/admin/courses/assignments/:assignmentId
 * @desc Admin updates an assignment (due date, status)
 * @access Private (Admin only)
 */
router.put(
  '/assignments/:assignmentId',
  authenticate,
  authorize('LMS Management', 'Manage'),
  adminAssignmentController.updateAssignment
);

/**
 * @route DELETE /api/v2/lms/admin/courses/assignments/:assignmentId
 * @desc Admin permanently deletes an assignment
 * @access Private (Admin only)
 */
router.delete(
  '/assignments/:assignmentId',
  authenticate,
  authorize('LMS Management', 'Manage'),
  adminAssignmentController.deleteAssignment
);

// ==================== COURSE AUDIT LOG ====================

/**
 * @route GET /api/v2/lms/admin/courses/audit-log
 * @desc Admin-queryable audit log for course lifecycle changes (publish/unpublish/archive)
 * @query {string} [courseId] - Optional filter by course ID
 * @query {number} [page=1] - Page number
 * @query {number} [limit=25] - Items per page (max 100)
 * @access Private (Admin only)
 */
router.get(
  '/audit-log',
  authenticate,
  authorize('LMS Management', 'Manage'),
  courseController.getCourseAuditLog
);

// ==================== COURSE CRUD OPERATIONS ====================

/**
 * @route GET /api/v2/lms/admin/courses
 * @desc Get all courses with optional filters (status, category, search)
 * @access Private (Admin: all courses; Coach: scope-filtered to balagruha assignments)
 */
router.get(
  '/',
  authenticate,
  authorize('LMS Management', 'Read'),
  courseController.getAllCourses
);

/**
 * @route POST /api/v2/lms/admin/courses
 * @desc Create new course (defaults to Draft status)
 * @access Private (Admin only)
 */
router.post(
  '/',
  authenticate,
  authorize('LMS Management', 'Manage'),
  courseController.createCourse
);

/**
 * @route GET /api/v2/lms/admin/courses/:id
 * @desc Get single course by ID with full details
 * @access Private (Admin: any; Coach: only if course has an active assignment to their balagruhas)
 */
router.get(
  '/:id',
  authenticate,
  authorize('LMS Management', 'Read'),
  courseController.getCourseById
);

/**
 * @route PUT /api/v2/lms/admin/courses/:id
 * @desc Update course metadata (title, description, category, etc.)
 * @access Private (Admin only)
 */
router.put(
  '/:id',
  authenticate,
  authorize('LMS Management', 'Manage'),
  courseController.updateCourse
);

/**
 * @route DELETE /api/v2/lms/admin/courses/:id
 * @desc Delete course permanently
 * @access Private (Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  authorize('LMS Management', 'Manage'),
  courseController.deleteCourse
);

// ==================== STRUCTURE MANAGEMENT ====================

/**
 * @route GET /api/v2/lms/admin/courses/:courseId/modules
 * @desc Get all modules for a course
 * @access Private (Admin only)
 */
router.get(
  '/:courseId/modules',
  authenticate,
  authorize('LMS Management', 'Manage'),
  courseController.getModulesByCourseId
);

/**
 * @route POST /api/v2/lms/admin/courses/:courseId/modules
 * @desc Add module to course
 * @access Private (Admin only)
 */
router.post(
  '/:courseId/modules',
  authenticate,
  authorize('LMS Management', 'Manage'),
  courseController.addModule
);

/**
 * @route PUT /api/v2/lms/admin/courses/:courseId/modules/:moduleId
 * @desc Update module
 * @access Private (Admin only)
 */
router.put(
  '/:courseId/modules/:moduleId',
  authenticate,
  authorize('LMS Management', 'Manage'),
  courseController.updateModule
);

/**
 * @route DELETE /api/v2/lms/admin/courses/:courseId/modules/:moduleId
 * @desc Delete module
 * @access Private (Admin only)
 */
router.delete(
  '/:courseId/modules/:moduleId',
  authenticate,
  authorize('LMS Management', 'Manage'),
  courseController.deleteModule
);

/**
 * @route POST /api/v2/lms/admin/courses/:courseId/modules/:moduleId/chapters
 * @desc Add chapter to module
 * @access Private (Admin only)
 */
router.post(
  '/:courseId/modules/:moduleId/chapters',
  authenticate,
  authorize('LMS Management', 'Manage'),
  courseController.addChapter
);

/**
 * @route PUT /api/v2/lms/admin/courses/:courseId/modules/:moduleId/chapters/:chapterId
 * @desc Update chapter
 * @access Private (Admin only)
 */
router.put(
  '/:courseId/modules/:moduleId/chapters/:chapterId',
  authenticate,
  authorize('LMS Management', 'Manage'),
  courseController.updateChapter
);

/**
 * @route DELETE /api/v2/lms/admin/courses/:courseId/modules/:moduleId/chapters/:chapterId
 * @desc Delete chapter
 * @access Private (Admin only)
 */
router.delete(
  '/:courseId/modules/:moduleId/chapters/:chapterId',
  authenticate,
  authorize('LMS Management', 'Manage'),
  courseController.deleteChapter
);

/**
 * @route POST /api/v2/lms/admin/courses/:courseId/modules/:moduleId/chapters/:chapterId/content
 * @desc Add content item to chapter
 * @access Private (Admin only)
 */
router.post(
  '/:courseId/modules/:moduleId/chapters/:chapterId/content',
  authenticate,
  authorize('LMS Management', 'Manage'),
  courseController.addContentItem
);

/**
 * @route PUT /api/v2/lms/admin/courses/:courseId/modules/:moduleId/chapters/:chapterId/content/:contentId
 * @desc Update content item
 * @access Private (Admin only)
 */
router.put(
  '/:courseId/modules/:moduleId/chapters/:chapterId/content/:contentId',
  authenticate,
  authorize('LMS Management', 'Manage'),
  courseController.updateContentItem
);

/**
 * @route DELETE /api/v2/lms/admin/courses/:courseId/modules/:moduleId/chapters/:chapterId/content/:contentId
 * @desc Delete content item
 * @access Private (Admin only)
 */
router.delete(
  '/:courseId/modules/:moduleId/chapters/:chapterId/content/:contentId',
  authenticate,
  authorize('LMS Management', 'Manage'),
  courseController.deleteContentItem
);

/**
 * @route PUT /api/v2/lms/admin/courses/:courseId/reorder
 * @desc Reorder modules, chapters, or content items (drag-and-drop)
 * @access Private (Admin only)
 */
router.put(
  '/:courseId/reorder',
  authenticate,
  authorize('LMS Management', 'Manage'),
  courseController.reorderItems
);

// ==================== PUBLISHING WORKFLOW ====================

/**
 * @route GET /api/v2/lms/admin/courses/:courseId/validate
 * @desc Get detailed validation results for publishing (Epic 02 Story 05)
 * @access Private (Admin only)
 */
router.get(
  '/:courseId/validate',
  authenticate,
  authorize('LMS Management', 'Manage'),
  courseController.validateCourseDetailed
);

/**
 * @route PUT /api/v2/lms/admin/courses/:courseId/publish
 * @desc Publish course (validates required fields first)
 * @access Private (Admin only)
 */
router.put(
  '/:courseId/publish',
  authenticate,
  authorize('LMS Management', 'Manage'),
  courseController.publishCourse
);

/**
 * @route PUT /api/v2/lms/admin/courses/:courseId/archive
 * @desc Archive course (hides from students and coaches)
 * @access Private (Admin only)
 */
router.put(
  '/:courseId/archive',
  authenticate,
  authorize('LMS Management', 'Manage'),
  courseController.archiveCourse
);

/**
 * @route PUT /api/v2/lms/admin/courses/:courseId/restore
 * @desc Restore archived course to Published or Draft
 * @access Private (Admin only)
 */
router.put(
  '/:courseId/restore',
  authenticate,
  authorize('LMS Management', 'Manage'),
  courseController.restoreCourse
);

/**
 * @route PUT /api/v2/lms/admin/courses/:courseId/unpublish
 * @desc Unpublish course (change from published to draft) - Epic 02 Story 05
 * @access Private (Admin only)
 */
router.put(
  '/:courseId/unpublish',
  authenticate,
  authorize('LMS Management', 'Manage'),
  courseController.unpublishCourse
);

/**
 * @route POST /api/v2/lms/admin/courses/:courseId/duplicate
 * @desc Duplicate course (creates copy in Draft status)
 * @access Private (Admin only)
 */
router.post(
  '/:courseId/duplicate',
  authenticate,
  authorize('LMS Management', 'Manage'),
  courseController.duplicateCourse
);

module.exports = router;
