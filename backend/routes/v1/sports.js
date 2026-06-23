const express = require("express");
const router = express.Router();
const { authorize, authenticate } = require("../../middleware/auth");
const {
  createSportsTask,
  updateSportsTask,
  getSportsTasks,
  createTrainingSession,
  getAllTrainingSessions,
  getStudentsWithSportsTask,
  getSportsInsights,
  editTrainingSession,
  deleteTrainingSession,
  addOrUpdateSportsTaskAttachment,
  addCommentToSportsTask,
  createSportsTrainingSession,
} = require("../../controllers/sports");
const { upload } = require("../../middleware/upload");

// Create a new task (with file upload)
router.post(
  "/task",
  authenticate, // Ensure the user is authenticated
  authorize("Task Management", "Create"), // Ensure the user has permission to create tasks
  upload.array("attachments", 5), // Allow up to 5 file uploads
  createSportsTask
);

// API for update the task
router.put(
  "/task/:taskId",
  authenticate,
  authorize("Task Management", "Update"),
  updateSportsTask
);
// API for update/ set the task attachment
router.post(
  "/task/attachments/:taskId",
  authenticate,
  authorize("Task Management", "Update"),
  upload.fields([
    { name: "attachments", maxCount: 5 }, // Up to 5 files for facialData
  ]),
  addOrUpdateSportsTaskAttachment
);

router.post(
  "/tasks/comment/:taskId",
  authenticate,
  authorize("Task Management", "Update"),
  upload.fields([
    { name: "attachments", maxCount: 5 }, // Up to 5 files for facialData
  ]),
  addCommentToSportsTask
);
// API for fetch sports tasks with pagination
router.post(
  "/tasks/list",
  authenticate,
  authorize("Task Management", "Read"),
  getSportsTasks
);

// API for creating a sports training session
router.post(
  "/training-session",
  authenticate,
  authorize("Task Management", "Create"),
  createSportsTrainingSession
);

// API for fetch the sports overview by balagruhaId ( pass balagruhaIds as comma separated  date as query param)
router.get(
  "/overview",
  authenticate,
  authorize("Task Management", "Read"),
  getSportsInsights
);
// API for fetch the list of sports training sessions ( pass balagruhaIds and type as query param)
router.get(
  "/training-sessions",
  authenticate,
  authorize("Task Management", "Read"),
  getAllTrainingSessions
);
// API for get student list with sports task by balagruhaId
router.post(
  "/students/all",
  authenticate,
  authorize("Task Management", "Read"),
  getStudentsWithSportsTask
);
// API for edit training session
router.put(
  "/training-session/:trainingSessionId",
  authenticate,
  authorize("Task Management", "Update"),
  editTrainingSession
);
// API for delete training session
router.delete(
  "/training-session/:trainingSessionId",
  authenticate,
  authorize("Task Management", "Delete"),
  deleteTrainingSession
);

module.exports = router;
