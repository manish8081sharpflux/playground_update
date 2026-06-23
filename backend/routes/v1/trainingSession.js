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

// API for creating a sports training session
router.post(
  "/",
  authenticate,
  authorize("Task Management", "Create"),
  createSportsTrainingSession
);
// API for fetch the list of sports training sessions ( pass balagruhaIds and type as query param)
router.get(
  "/",
  authenticate,
  authorize("Task Management", "Read"),
  getAllTrainingSessions
);
// API for edit training session
router.put(
  "/:trainingSessionId",
  authenticate,
  authorize("Task Management", "Update"),
  editTrainingSession
);
// API for delete training session
router.delete(
  "/:trainingSessionId",
  authenticate,
  authorize("Task Management", "Delete"),
  deleteTrainingSession
);

module.exports = router;
