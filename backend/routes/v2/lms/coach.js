const express = require('express');
const router = express.Router();
const manualAwardController = require('../../../controllers/lms/coach/manualAwardController');
const coachReportsController = require('../../../controllers/lms/coach/coachReportsController');

// Middleware to verify coach role (mocked for now or use existing middleware)
const { authenticate, authorize } = require('../../../middleware/auth');

/**
 * Story 03: Manual Awards
 */
router.post('/awards', authenticate, authorize("LMS Management", "Create"), manualAwardController.awardCoins);
router.get('/awards/history', authenticate, authorize("LMS Management", "Read"), manualAwardController.getAwardHistory);

/**
 * Story 04: Reports
 */
router.get('/reports/overview', authenticate, authorize("LMS Management", "Read"), coachReportsController.getOverviewStats);
router.get('/reports/leaderboard', authenticate, authorize("LMS Management", "Read"), coachReportsController.getLeaderboard);
router.get('/reports/course-completion', authenticate, authorize("LMS Management", "Read"), coachReportsController.getCourseCompletionRates);
router.get('/reports/course/:courseId', authenticate, authorize("LMS Management", "Read"), coachReportsController.getCourseDetail);
router.get('/reports/slow-learners', authenticate, authorize("LMS Management", "Read"), coachReportsController.getSlowLearners);

module.exports = router;
