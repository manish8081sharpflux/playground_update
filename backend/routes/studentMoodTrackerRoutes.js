const express = require("express");
const router = express.Router();
const studentMoodTrackerController = require("../controllers/studentMoodTrackerController");
const {
  authenticateToken,
  authenticate,
  authorize,
} = require("../middleware/auth");

// Apply authentication middleware to all routes
// router.use(authenticateToken);

// Create or update mood entry
// Any authenticated user (student, coach, admin, etc.) can log their own mood —
// this does not require User Management permissions, since it only ever
// writes an entry tied to the requester's own userId.
router.post(
  "/",
  authenticate, // Ensure the user is authenticated
  studentMoodTrackerController.createOrUpdateMoodEntry
);

// Get mood entries by userId
router.get(
  "/user/:userId",
  authenticate,
  authorize("User Management", "Read"),
  studentMoodTrackerController.getMoodEntriesByUserId
);

// Get mood entries by date range
router.get(
  "/dateRange",
  authenticate,
  authorize("User Management", "Read"),
  studentMoodTrackerController.getMoodEntriesByDateRange
);

// Latest mood by balagruhaIds
router.post(
  "/latest",
  authenticate,
  authorize("User Management", "Read"),
  studentMoodTrackerController.getLatestMoodEntry
);

// Get, update, delete mood entry by id
router.get("/:id", authenticate, authorize("User Management", "Read"), studentMoodTrackerController.getMoodEntryById);
router.put("/:id", authenticate, authorize("User Management", "Update"), studentMoodTrackerController.updateMoodEntry);
router.delete("/:id", authenticate, authorize("User Management", "Delete"), studentMoodTrackerController.deleteMoodEntry);

module.exports = router;
