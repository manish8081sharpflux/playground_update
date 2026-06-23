const express = require("express");
const router = express.Router();
const offlineRequestQueueController = require("../controllers/offlineRequestQueue");
const { authenticate } = require("../middleware/auth");

router.post("/", authenticate, offlineRequestQueueController.createOfflineRequest);

router.get("/:requestId", authenticate, offlineRequestQueueController.getOfflineRequestById);

// API for handling sync the offline request to main server
router.post("/sync", authenticate, offlineRequestQueueController.syncOfflineRequestToServer);

// API for sync with the remote db
router.post(
  "/sync/db/remote",
  authenticate,
  offlineRequestQueueController.syncRemoteDBToLocalDB
);

module.exports = router;
