// backend/routes/v2/lms/coach/grading.js
const express = require("express");
const router = express.Router();
const coachGradingController = require("../../../../controllers/lms/coach/coachGradingController");
const { authenticate, authorize } = require("../../../../middleware/auth");

/**
 * Grading Routes for Coaches
 * Base path: /api/v2/lms/coach/grading
 */

// Get admin-configured coin limits for the grading panel
router.get(
  "/coin-limits",
  authenticate,
  authorize("LMS Management", "Read"),
  coachGradingController.getCoinLimits
);

// Get all submissions for grading with filters
router.get(
  "/:coachId/submissions",
  authenticate,
  authorize("LMS Management", "Read"),
  coachGradingController.getSubmissions
);

// Get single submission details
router.get(
  "/submissions/:submissionId",
  authenticate,
  authorize("LMS Management", "Read"),
  coachGradingController.getSubmissionById
);

// Stream submitted file for authenticated preview/download
router.get(
  "/submissions/:submissionId/file",
  authenticate,
  authorize("LMS Management", "Read"),
  coachGradingController.streamSubmissionFile
);

// Submit grade for a submission
router.post(
  "/submissions/:submissionId/grade",
  authenticate,
  authorize("LMS Management", "Update"),
  coachGradingController.submitGrade
);

// Bulk grade multiple submissions
router.post(
  "/submissions/bulk-grade",
  authenticate,
  authorize("LMS Management", "Update"),
  coachGradingController.bulkGrade
);

// Save grading draft (auto-save)
router.put(
  "/submissions/:submissionId/draft",
  authenticate,
  authorize("LMS Management", "Update"),
  coachGradingController.saveDraft
);

// Flag submission for admin review
router.put(
  "/submissions/:submissionId/flag",
  authenticate,
  authorize("LMS Management", "Update"),
  coachGradingController.flagSubmission
);

// Skip submission for later review
router.put(
  "/submissions/:submissionId/skip",
  authenticate,
  authorize("LMS Management", "Update"),
  coachGradingController.skipSubmission
);

module.exports = router;
