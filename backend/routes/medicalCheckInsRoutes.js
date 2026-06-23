const express = require("express");
const router = express.Router();
const medicalCheckInsController = require("../controllers/medicalCheckInsController");
const { upload } = require("../middleware/upload");
const { authenticate, authorize } = require("../middleware/auth");

// Create a new medical check-in (with file upload)
router.post(
  "/",
  authenticate,
  authorize("Medical Management", "Create"),
  upload.fields([
    { name: "attachments", maxCount: 5 },
    { name: "prescriptions", maxCount: 5 },
    { name: "testResults", maxCount: 5 },
    { name: "followUpDescriptions", maxCount: 5 },
    { name: "followUpTestResults", maxCount: 5 },
  ]),
  medicalCheckInsController.createMedicalCheckIn
);

// Get all medical check-ins (with optional filters)
router.get("/", authenticate, authorize("Medical Management", "Read"), medicalCheckInsController.getAllMedicalCheckIns);

// Get medical check-ins by student ID
router.get(
  "/student/:studentId",
  authenticate,
  authorize("Medical Management", "Read"),
  medicalCheckInsController.getMedicalCheckInsByStudentId
);

// Get medical check-in by ID
router.get(
  "/:checkInId",
  authenticate,
  authorize("Medical Management", "Read"),
  medicalCheckInsController.getMedicalCheckInById
);

// Update medical check-in
router.put(
  "/:checkInId",
  authenticate,
  authorize("Medical Management", "Update"),
  upload.none(),
  medicalCheckInsController.updateMedicalCheckIn
);

// Delete medical check-in
router.delete(
  "/:checkInId",
  authenticate,
  authorize("Medical Management", "Delete"),
  medicalCheckInsController.deleteMedicalCheckIn
);

// Add or update attachments to a medical check-in
router.put(
  "/attachments/:checkInId",
  authenticate,
  authorize("Medical Management", "Update"),
  upload.fields([
    { name: "attachments", maxCount: 5 },
    { name: "prescriptions", maxCount: 5 },
    { name: "testResults", maxCount: 5 },
    { name: "followUpDescriptions", maxCount: 5 },
    { name: "followUpTestResults", maxCount: 5 },
  ]),
  medicalCheckInsController.addOrUpdateAttachments
);

// Delete an attachment from a medical check-in
router.delete(
  "/attachments/:checkInId/:attachmentId",
  authenticate,
  authorize("Medical Management", "Delete"),
  medicalCheckInsController.deleteAttachment
);

// Get all medical check-ins by balagruha Ids list
router.post(
  "/students/list",
  authenticate,
  authorize("Medical Management", "Read"),
  medicalCheckInsController.getMedicalCheckInsByBalagruhaIds
);

module.exports = router;
