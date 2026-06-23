const express = require("express");
const router = express.Router();
const medicalRecordController = require("../controllers/medicalRecordController");
const { authenticate, authorize } = require("../middleware/auth");

// Delete specific medical history item
router.delete(
  "/user/:userId/history/:medicalHistoryId",
  authenticate,
  authorize("Medical Management", "Delete"),
  medicalRecordController.deleteMedicalHistoryItem
);

// Update specific medical history item
router.put(
  "/user/:userId/history/:medicalHistoryId",
  authenticate,
  authorize("Medical Management", "Update"),
  medicalRecordController.updateMedicalHistoryItem
);

module.exports = router;