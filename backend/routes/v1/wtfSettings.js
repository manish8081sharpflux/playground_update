const express = require("express");
const router = express.Router();
const { authorize, authenticate } = require("../../middleware/auth");
const { upload, fontUpload } = require("../../middleware/upload");
const {
  getCurrentSettings,
  updateSettings,
  uploadBackgroundImage,
  uploadFontFile,
  deleteBackgroundImage,
  getSettingsHistory,
  getCoinReward,
  updateCoinReward,
} = require("../../controllers/wtfSettingsController");

// Get current WTF settings (accessible to all authenticated users)
router.get(
  "/current",
  authenticate,
  getCurrentSettings
);

// Update WTF settings (admin only)
router.put(
  "/update",
  authenticate,
  authorize("WTF Management", "Update"),
  updateSettings
);

// Upload background image (admin only)
router.post(
  "/background-image",
  authenticate,
  authorize("WTF Management", "Update"),
  upload.single("backgroundImage"),
  uploadBackgroundImage
);

// Upload font file (admin only)
router.post(
  "/font",
  authenticate,
  authorize("WTF Management", "Update"),
  fontUpload.single("font"),
  uploadFontFile
);

// Delete background image (admin only)
router.delete(
  "/background-image",
  authenticate,
  authorize("WTF Management", "Update"),
  deleteBackgroundImage
);

// Get settings history (admin only)
router.get(
  "/history",
  authenticate,
  authorize("WTF Management", "Update"),
  getSettingsHistory
);

// Get coin reward value (admin only for now)
router.get(
  "/coin-reward",
  authenticate,
  authorize("WTF Management", "Update"),
  getCoinReward
);

// Update coin reward value (admin only)
router.put(
  "/coin-reward",
  authenticate,
  authorize("WTF Management", "Update"),
  updateCoinReward
);

module.exports = router;
