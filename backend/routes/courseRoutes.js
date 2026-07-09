const express = require("express");
const router = express.Router();
const courseController = require("../controllers/courseController");
const { upload } = require("../middleware/upload");
const { authenticate, authorize } = require("../middleware/auth");

// Create a new course (with file upload)
router.post(
  "/",
  authenticate,
  authorize("Course Management", "Create"),
  upload.any(),
  courseController.createCourse
);

module.exports = router;
