const express = require('express');
const router = express.Router();
const coachAssignmentController = require('../../../../controllers/lms/coach/coachAssignmentController');
const { authenticate, authorize } = require('../../../../middleware/auth');

// ==================== COURSE ASSIGNMENT OPERATIONS ====================

/**
 * @route GET /api/v2/lms/coach/courses/published
 * @desc Get all published courses available for assignment
 * @access Private (Coach only)
 */
router.get(
  '/courses/published',
  authenticate,
  authorize("LMS Management", "Read"),
  coachAssignmentController.getPublishedCourses
);

/**
 * @route GET /api/v2/lms/coach/:coachId/students
 * @desc Get all students in coach's Balagruha
 * @access Private (Coach only)
 */
router.get(
  '/:coachId/students',
  authenticate,
  authorize("LMS Management", "Read"),
  coachAssignmentController.getCoachStudents
);

/**
 * @route POST /api/v2/lms/coach/assignments
 * @desc Create new course assignment
 * @access Private (Coach only)
 */
router.post(
  '/assignments',
  authenticate,
  authorize("LMS Management", "Create"),
  coachAssignmentController.createAssignment
);

/**
 * @route GET /api/v2/lms/coach/:coachId/assignments
 * @desc Get all assignments created by coach
 * @access Private (Coach only)
 */
router.get(
  '/:coachId/assignments',
  authenticate,
  authorize("LMS Management", "Read"),
  coachAssignmentController.getCoachAssignments
);

/**
 * @route GET /api/v2/lms/coach/assignments/:assignmentId
 * @desc Get single assignment by ID
 * @access Private (Coach only)
 */
router.get(
  '/assignments/:assignmentId',
  authenticate,
  authorize("LMS Management", "Read"),
  coachAssignmentController.getAssignmentById
);

/**
 * @route GET /api/v2/lms/coach/assignments/:assignmentId/progress-report
 * @desc Per-student progress breakdown for the View Progress Report button
 * @access Private (Coach)
 */
router.get(
  '/assignments/:assignmentId/progress-report',
  authenticate,
  authorize("LMS Management", "Read"),
  coachAssignmentController.getAssignmentProgressReport
);

/**
 * @route PUT /api/v2/lms/coach/assignments/:assignmentId
 * @desc Update assignment (due date, status)
 * @access Private (Coach only)
 */
router.put(
  '/assignments/:assignmentId',
  authenticate,
  authorize("LMS Management", "Update"),
  coachAssignmentController.updateAssignment
);

/**
 * @route DELETE /api/v2/lms/coach/assignments/:assignmentId
 * @desc Unassign/cancel course assignment
 * @access Private (Coach only)
 */
router.delete(
  '/assignments/:assignmentId',
  authenticate,
  authorize("LMS Management", "Delete"),
  coachAssignmentController.deleteAssignment
);

/**
 * @route GET /api/v2/lms/coach/:coachId/stats
 * @desc Get coach assignment statistics
 * @access Private (Coach only)
 */
router.get(
  '/:coachId/stats',
  authenticate,
  authorize("LMS Management", "Read"),
  coachAssignmentController.getCoachStats
);

/**
 * @route GET /api/v2/lms/coach/:coachId/balagruha-courses
 * @desc Get courses currently assigned to the coach's balagruhas, with
 *       assignment context (balagruha names, student counts, progress).
 * @access Private (Coach: own ID only; Admin: any)
 */
router.get(
  '/:coachId/balagruha-courses',
  authenticate,
  authorize("LMS Management", "Read"),
  coachAssignmentController.getBalagruhaCourses
);

/**
 * @route PUT /api/v2/lms/coach/assignments/:assignmentId/progress
 * @desc Update assignment progress
 * @access Private (Coach only)
 */
router.put(
  '/assignments/:assignmentId/progress',
  authenticate,
  authorize("LMS Management", "Update"),
  coachAssignmentController.updateAssignmentProgress
);

module.exports = router;
