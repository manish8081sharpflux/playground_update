const express = require("express");
const { authorize, authenticate } = require("../../middleware/auth");
const { WtfPermissions } = require("../../constants/users");
const wtfSettingsRoutes = require("./wtfSettings");
const { wtfUploadWithErrorHandling } = require("../../middleware/upload");
const { cleanupOrphanedFiles } = require("../../middleware/upload");
const {
  wtfRateLimiters,
  wtfContentValidation,
  wtfSubmissionValidation,
  wtfInteractionValidation,
  handleValidationErrors,
  checkContentSizeLimits,
  wtfSecurityHeaders,
  wtfFileUploadSecurity,
} = require("../../middleware/wtfSecurity");
const {
  // Pin Management Controllers
  createPin,
  getActivePins,
  getPinById,
  updatePin,
  deletePin,
  changePinStatus,
  getPinsByStatus,
  getDrafts,

  // Interaction Controllers
  likePin,
  lovePin,
  markPinAsSeen,
  getPinInteractions,

  // Submission Controllers
  submitVoiceNote,
  submitMedia,
  submitArticle,
  getSubmissionsForReview,
  reviewSubmission,
  getArchivedSubmissions,
  unarchiveSubmission,

  // Analytics Controllers
  getWtfAnalytics,
  getInteractionAnalytics,
  getSubmissionAnalytics,

  // Dashboard Metrics Controllers
  getWtfDashboardMetrics,
  getDashboardCounts,
  getActivePinsCount,
  getWtfTotalEngagement,
  getCoachSuggestionsCount,
  getCoachSuggestions,
  createCoachSuggestion,

  // Student Management Controllers
  getStudentSubmissions,
  getStudentInteractionHistory,

  // Admin Management Controllers
  getPinsByAuthor,
  getSubmissionStats,

  // Coin Reward Controllers
  awardCoinsForPin,
  awardMilestoneCoins,
  expireOldPins,

  // Scheduler Management Controllers
  triggerPinExpiration,
  triggerFifoManagement,
  getSchedulerStatus,
  reorderPins,
} = require("../../controllers/wtfController");

const router = express.Router();

// ==================== PIN MANAGEMENT ROUTES ====================

// Create a new WTF pin (Admin only)
router.post(
  "/pins",
  authenticate,
  authorize(WtfPermissions.WTF_PIN_CREATE, "Create"),
  wtfUploadWithErrorHandling, // Add WTF-specific file upload middleware with error handling
  wtfSecurityHeaders,
  wtfRateLimiters.pinCreation,
  wtfFileUploadSecurity,
  wtfContentValidation,
  checkContentSizeLimits("pin"),
  handleValidationErrors,
  createPin
);

// Get active pins for students (Public - requires authentication)
router.get(
  "/pins",
  authenticate,
  wtfSecurityHeaders,
  wtfRateLimiters.general,
  getActivePins
);

// Get pins by status (Admin only)
router.get(
  "/pins/status/list",
  authenticate,
  authorize(WtfPermissions.WTF_PIN_READ, "Read"),
  wtfSecurityHeaders,
  wtfRateLimiters.admin,
  getPinsByStatus
);

// Get drafts (Admin only)
router.get(
  "/pins/drafts",
  authenticate,
  authorize(WtfPermissions.WTF_PIN_READ, "Read"),
  wtfSecurityHeaders,
  wtfRateLimiters.admin,
  getDrafts
);

// Reorder pins (Admin only)
router.post(
  "/pins/reorder",
  authenticate,
  authorize(WtfPermissions.WTF_PIN_UPDATE, "Update"),
  wtfSecurityHeaders,
  wtfRateLimiters.admin,
  reorderPins
);

// Get pin by ID (Public - requires authentication)
router.get(
  "/pins/:pinId",
  authenticate,
  wtfSecurityHeaders,
  wtfRateLimiters.general,
  getPinById
);

// Update pin (Admin only)
router.put(
  "/pins/:pinId",
  authenticate,
  authorize(WtfPermissions.WTF_PIN_UPDATE, "Update"),
  wtfSecurityHeaders,
  wtfRateLimiters.admin,
  wtfContentValidation,
  checkContentSizeLimits("pin"),
  handleValidationErrors,
  updatePin
);

// Delete pin (Admin only)
router.delete(
  "/pins/:pinId",
  authenticate,
  authorize(WtfPermissions.WTF_PIN_DELETE, "Delete"),
  deletePin
);

// Change pin status (Admin only)
router.patch(
  "/pins/:pinId/status",
  authenticate,
  authorize(WtfPermissions.WTF_PIN_UPDATE, "Update"),
  changePinStatus
);

// ==================== INTERACTION ROUTES ====================

// Like/unlike pin (Students only)
router.post(
  "/pins/:pinId/like",
  authenticate,
  authorize(WtfPermissions.WTF_INTERACTION_CREATE, "Create"),
  wtfSecurityHeaders,
  wtfRateLimiters.pinInteractions,
  wtfInteractionValidation,
  handleValidationErrors,
  likePin
);

// Love/unlove pin (Students only)
router.post(
  "/pins/:pinId/love",
  authenticate,
  authorize(WtfPermissions.WTF_INTERACTION_CREATE, "Create"),
  wtfSecurityHeaders,
  wtfRateLimiters.pinInteractions,
  handleValidationErrors,
  lovePin
);

// Mark pin as seen (Students only)
router.post(
  "/pins/:pinId/seen",
  authenticate,
  authorize(WtfPermissions.WTF_INTERACTION_CREATE, "Create"),
  wtfSecurityHeaders,
  wtfRateLimiters.pinInteractions,
  wtfInteractionValidation,
  handleValidationErrors,
  markPinAsSeen
);

// Get pin interactions (Public - requires authentication)
router.get("/pins/:pinId/interactions", authenticate, getPinInteractions);

// ==================== SUBMISSION ROUTES ====================

// Submit voice note (Students only)
router.post(
  "/submissions/voice",
  authenticate,
  authorize(WtfPermissions.WTF_SUBMISSION_CREATE, "Create"),
  wtfUploadWithErrorHandling,
  wtfSecurityHeaders,
  wtfRateLimiters.submissions,
  wtfSubmissionValidation,
  checkContentSizeLimits("submission"),
  wtfFileUploadSecurity,
  handleValidationErrors,
  submitVoiceNote
);

// Submit media (image/video) (Students only)
router.post(
  "/submissions/media",
  authenticate,
  authorize(WtfPermissions.WTF_SUBMISSION_CREATE, "Create"),
  wtfUploadWithErrorHandling,
  wtfSecurityHeaders,
  wtfRateLimiters.submissions,
  wtfSubmissionValidation,
  checkContentSizeLimits("submission"),
  wtfFileUploadSecurity,
  handleValidationErrors,
  submitMedia
);

// Submit article (Students only)
router.post(
  "/submissions/article",
  authenticate,
  authorize(WtfPermissions.WTF_SUBMISSION_CREATE, "Create"),
  wtfSecurityHeaders,
  wtfRateLimiters.submissions,
  wtfSubmissionValidation,
  checkContentSizeLimits("submission"),
  handleValidationErrors,
  submitArticle
);

// Get submissions for review (Admin only)
router.get(
  "/submissions/review",
  authenticate,
  authorize(WtfPermissions.WTF_SUBMISSION_READ, "Read"),
  getSubmissionsForReview
);

// Review submission (Admin only)
router.put(
  "/submissions/:submissionId/review",
  authenticate,
  authorize(WtfPermissions.WTF_SUBMISSION_UPDATE, "Update"),
  reviewSubmission
);

// Archived submissions (Admin only)
router.get(
  "/submissions/archived",
  authenticate,
  authorize(WtfPermissions.WTF_SUBMISSION_READ, "Read"),
  getArchivedSubmissions
);

// Unarchive a submission (Admin only)
router.patch(
  "/submissions/:submissionId/unarchive",
  authenticate,
  authorize(WtfPermissions.WTF_SUBMISSION_UPDATE, "Update"),
  unarchiveSubmission
);

// ==================== ANALYTICS ROUTES ====================

// Get WTF analytics (Admin only)
router.get(
  "/analytics",
  authenticate,
  authorize(WtfPermissions.WTF_ANALYTICS_READ, "Read"),
  getWtfAnalytics
);

// Get interaction analytics (Admin only)
router.get(
  "/analytics/interactions",
  authenticate,
  authorize(WtfPermissions.WTF_ANALYTICS_READ, "Read"),
  getInteractionAnalytics
);

// Get submission analytics (Admin only)
router.get(
  "/analytics/submissions",
  authenticate,
  authorize(WtfPermissions.WTF_ANALYTICS_READ, "Read"),
  getSubmissionAnalytics
);

// ==================== DASHBOARD METRICS ROUTES ====================

// Get unified dashboard counts (Admin only) - NEW UNIFIED API
router.get(
  "/dashboard/counts",
  authenticate,
  authorize(WtfPermissions.WTF_ANALYTICS_READ, "Read"),
  getDashboardCounts
);

// Get WTF dashboard metrics (Admin only) - Legacy
router.get(
  "/dashboard/metrics",
  authenticate,
  authorize(WtfPermissions.WTF_ANALYTICS_READ, "Read"),
  getWtfDashboardMetrics
);

// Get active pins count (Admin only)
router.get(
  "/pins/active/count",
  authenticate,
  authorize(WtfPermissions.WTF_ANALYTICS_READ, "Read"),
  getActivePinsCount
);

// Get total engagement (Admin only)
router.get(
  "/analytics/engagement",
  authenticate,
  authorize(WtfPermissions.WTF_ANALYTICS_READ, "Read"),
  getWtfTotalEngagement
);

// Get coach suggestions count (Admin only)
router.get(
  "/coach-suggestions/count",
  authenticate,
  authorize(WtfPermissions.WTF_ANALYTICS_READ, "Read"),
  getCoachSuggestionsCount
);

// Get coach suggestions (Admin only)
router.get(
  "/coach-suggestions",
  authenticate,
  authorize(WtfPermissions.WTF_ANALYTICS_READ, "Read"),
  getCoachSuggestions
);

// Create coach suggestion (Coaches only)
router.post(
  "/coach-suggestions",
  authenticate,
  authorize(WtfPermissions.WTF_COACH_SUGGESTION_CREATE, "Create"),
  // Parse multipart form-data if the client sends FormData (even without a file)
  wtfUploadWithErrorHandling,
  wtfSecurityHeaders,
  wtfRateLimiters.submissions,
  wtfContentValidation,
  checkContentSizeLimits("suggestion"),
  handleValidationErrors,
  createCoachSuggestion
);

// ==================== STUDENT MANAGEMENT ROUTES ====================

// Get student submissions (Students only - their own submissions)
router.get(
  "/submissions",
  authenticate,
  authorize(WtfPermissions.WTF_SUBMISSION_READ, "Read"),
  getStudentSubmissions
);

// Get student interaction history (Students only - their own interactions)
router.get(
  "/interactions/history",
  authenticate,
  authorize(WtfPermissions.WTF_INTERACTION_READ, "Read"),
  getStudentInteractionHistory
);

// ==================== ADMIN MANAGEMENT ROUTES ====================

// Get pins by author (Admin only)
router.get(
  "/pins/author/:authorId",
  authenticate,
  authorize(WtfPermissions.WTF_PIN_READ, "Read"),
  getPinsByAuthor
);

// Get submission stats (Admin only)
router.get(
  "/submissions/stats",
  authenticate,
  authorize(WtfPermissions.WTF_ANALYTICS_READ, "Read"),
  getSubmissionStats
);

// ==================== COIN REWARD ROUTES ====================

// Award coins for pinned content (Admin only)
router.post(
  "/pins/:pinId/award-coins",
  authenticate,
  authorize(WtfPermissions.WTF_PIN_CREATE, "Create"),
  wtfSecurityHeaders,
  wtfRateLimiters.general,
  awardCoinsForPin
);

// Award milestone coins for popular content (System/Admin)
router.post(
  "/pins/:pinId/milestone-coins",
  authenticate,
  authorize(WtfPermissions.WTF_ANALYTICS_READ, "Read"),
  wtfSecurityHeaders,
  wtfRateLimiters.general,
  awardMilestoneCoins
);

// Manual trigger for pin expiration (Admin only)
router.post(
  "/admin/expire-pins",
  authenticate,
  authorize(WtfPermissions.WTF_PIN_CREATE, "Create"),
  wtfSecurityHeaders,
  wtfRateLimiters.general,
  expireOldPins
);

// ==================== SCHEDULER MANAGEMENT ROUTES ====================

// Manual trigger for pin expiration process (Admin only)
router.post(
  "/admin/scheduler/expire-pins",
  authenticate,
  authorize(WtfPermissions.WTF_PIN_DELETE, "Delete"),
  wtfSecurityHeaders,
  wtfRateLimiters.general,
  triggerPinExpiration
);

// Manual trigger for FIFO management process (Admin only)
router.post(
  "/admin/scheduler/fifo-cleanup",
  authenticate,
  authorize(WtfPermissions.WTF_PIN_DELETE, "Delete"),
  wtfSecurityHeaders,
  wtfRateLimiters.general,
  triggerFifoManagement
);

// Get scheduler status (Admin only)
router.get(
  "/admin/scheduler/status",
  authenticate,
  authorize(WtfPermissions.WTF_ANALYTICS_READ, "Read"),
  wtfSecurityHeaders,
  wtfRateLimiters.general,
  getSchedulerStatus
);

// ==================== ADMIN UTILITY ROUTES ====================

// Clean up orphaned files (Admin only)
router.post(
  "/admin/cleanup-files",
  authenticate,
  authorize(WtfPermissions.WTF_ADMIN, "Admin"),
  (req, res) => {
    try {
      cleanupOrphanedFiles();
      res.json({
        success: true,
        message: "File cleanup completed successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "File cleanup failed",
        error: error.message,
      });
    }
  }
);

// WTF Settings Routes
router.use("/settings", wtfSettingsRoutes);

module.exports = router;
