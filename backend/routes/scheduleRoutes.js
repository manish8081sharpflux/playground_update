const express = require("express");
const router = express.Router();
const scheduleController = require("../controllers/scheduleController");
const { authenticate, authorize } = require("../middleware/auth");

// Create a new schedule
router.post("/", authenticate, authorize("Schedule Management", "Create"), scheduleController.createSchedule);

// Get schedule by ID
router.get(
  "/:scheduleId",
  authenticate,
  authorize("Schedule Management", "Read"),
  scheduleController.getScheduleById
);

// Get all schedules with filters
router.get(
  "/",
  authenticate,
  authorize("Schedule Management", "Read"),
  scheduleController.getSchedules
);

// Update schedule
router.put("/:scheduleId", authenticate, authorize("Schedule Management", "Update"), scheduleController.updateSchedule);

// Delete schedule
router.delete("/:scheduleId", authenticate, authorize("Schedule Management", "Delete"), scheduleController.deleteSchedule);

// Get schedules by user
router.get(
  "/user/:userId",
  authenticate,
  authorize("Schedule Management", "Read"),
  scheduleController.getSchedulesByUser
);

// Create a post API for fetch the schedules list for admin
router.post("/admin", authenticate, authorize("Schedule Management", "Read"), scheduleController.getSchedulesForAdmin);

// Create POST API for fetch the schedules list for coach
router.post("/coach", authenticate, authorize("Schedule Management", "Read"), scheduleController.getSchedulesForCoach);

// Update schedule status
router.put(
  "/status/:scheduleId",
  authenticate,
  authorize("Schedule Management", "Update"),
  scheduleController.updateScheduleStatus
);

module.exports = router;
