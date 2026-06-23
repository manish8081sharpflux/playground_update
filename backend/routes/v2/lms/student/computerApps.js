const express = require('express');
const router = express.Router({ mergeParams: true });
const computerAppsController = require('../../../../controllers/lms/student/computerAppsController');
const { authenticate } = require('../../../../middleware/auth');
const verifyStudentOwnership = require('../../../../middleware/verifyStudentOwnership');

/**
 * Computer Apps Routes - Epic 01 Story 02
 * Base path: /api/v2/lms/student/:studentId/courses/computer-apps
 */

// @route   GET /api/v2/lms/student/:studentId/courses/computer-apps
// @desc    Get all Computer Apps applications with progress
// @access  Private
router.get('/', authenticate, verifyStudentOwnership, computerAppsController.getComputerApps);

// @route   GET /api/v2/lms/student/:studentId/courses/computer-apps/:courseId/hierarchy
// @desc    Get course hierarchy (Modules/Chapters/Items)
// @access  Private
router.get('/:courseId/hierarchy', authenticate, verifyStudentOwnership, computerAppsController.getCourseHierarchy);

// @route   GET /api/v2/lms/student/:studentId/courses/computer-apps/:courseId/content/:contentId
// @desc    Get specific content item details
// @access  Private
router.get('/:courseId/content/:contentId', authenticate, verifyStudentOwnership, computerAppsController.getContentDetails);

// @route   GET /api/v2/lms/student/:studentId/courses/computer-apps/quiz/:quizId
// @desc    Get quiz details and questions
// @access  Private
router.get('/quiz/:quizId', authenticate, verifyStudentOwnership, computerAppsController.getQuiz);

// @route   POST /api/v2/lms/student/:studentId/courses/computer-apps/quiz/submit
// @desc    Submit quiz answers
// @access  Private
router.post('/quiz/submit', authenticate, verifyStudentOwnership, computerAppsController.submitQuiz);

// @route   POST /api/v2/lms/student/:studentId/courses/computer-apps/mark-complete
// @desc    Mark content item as complete
// @access  Private
router.post('/mark-complete', authenticate, verifyStudentOwnership, computerAppsController.markComplete);

module.exports = router;
