const express = require("express");
const { authorize, authenticate } = require("../../middleware/auth");
const {
  initializeScheduler,
  getSchedulerStatus,
  stopScheduler,
  restartScheduler,
  triggerPinExpiration,
  triggerFifoManagement,
  triggerLifecycleManagement,
  getLifecycleStats,
} = require("../../controllers/schedulerController");

const router = express.Router();

// ==================== SCHEDULER MANAGEMENT ROUTES ====================

// Initialize scheduler (Admin only)
router.post(
  "/initialize",
  authenticate,
  authorize("WTF Management", "Create"),
  initializeScheduler
);

// Get scheduler status (Admin only)
router.get(
  "/status",
  authenticate,
  authorize("WTF Management", "Read"),
  getSchedulerStatus
);

// Stop scheduler (Admin only)
router.post(
  "/stop",
  authenticate,
  authorize("WTF Management", "Update"),
  stopScheduler
);

// Restart scheduler (Admin only)
router.post(
  "/restart",
  authenticate,
  authorize("WTF Management", "Update"),
  restartScheduler
);

// ==================== MANUAL JOB TRIGGER ROUTES ====================

// Manually trigger pin expiration job (Admin only)
router.post(
  "/jobs/trigger-pin-expiration",
  authenticate,
  authorize("WTF Management", "Update"),
  triggerPinExpiration
);

// Manually trigger FIFO management job (Admin only)
router.post(
  "/jobs/trigger-fifo-management",
  authenticate,
  authorize("WTF Management", "Update"),
  triggerFifoManagement
);

// Manually trigger complete lifecycle management (Admin only)
router.post(
  "/jobs/trigger-lifecycle-management",
  authenticate,
  authorize("WTF Management", "Update"),
  triggerLifecycleManagement
);

// ==================== LIFECYCLE STATISTICS ROUTES ====================

// Get lifecycle statistics (Admin only)
router.get(
  "/stats/lifecycle",
  authenticate,
  authorize("WTF Analytics", "Read"),
  getLifecycleStats
);

module.exports = router;
