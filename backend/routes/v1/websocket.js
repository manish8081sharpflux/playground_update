const express = require("express");
const { authorize, authenticate } = require("../../middleware/auth");
const {
  getWebSocketStatus,
  initializeWebSocket,
  closeAllConnections,
  triggerPinCreated,
  triggerPinLiked,
  triggerPinSeen,
  triggerSubmissionCreated,
  triggerSubmissionReviewed,
  broadcastMessage,
} = require("../../controllers/wtfWebSocketController");

const router = express.Router();

// ==================== WEBSOCKET MANAGEMENT ROUTES ====================

// Get WebSocket status (Admin only)
router.get(
  "/status",
  authenticate,
  authorize("WTF Management", "Read"),
  getWebSocketStatus
);

// Initialize WebSocket server (Admin only)
router.post(
  "/initialize",
  authenticate,
  authorize("WTF Management", "Create"),
  initializeWebSocket
);

// Close all WebSocket connections (Admin only)
router.post(
  "/close-all",
  authenticate,
  authorize("WTF Management", "Update"),
  closeAllConnections
);

// ==================== EVENT TRIGGER ROUTES ====================

// Trigger pin created event (Admin only)
router.post(
  "/events/pin-created",
  authenticate,
  authorize("WTF Management", "Create"),
  triggerPinCreated
);

// Trigger pin liked event (Admin only)
router.post(
  "/events/pin-liked",
  authenticate,
  authorize("WTF Management", "Create"),
  triggerPinLiked
);

// Trigger pin seen event (Admin only)
router.post(
  "/events/pin-seen",
  authenticate,
  authorize("WTF Management", "Create"),
  triggerPinSeen
);

// Trigger submission created event (Admin only)
router.post(
  "/events/submission-created",
  authenticate,
  authorize("WTF Management", "Create"),
  triggerSubmissionCreated
);

// Trigger submission reviewed event (Admin only)
router.post(
  "/events/submission-reviewed",
  authenticate,
  authorize("WTF Management", "Create"),
  triggerSubmissionReviewed
);

// ==================== MESSAGE BROADCAST ROUTES ====================

// Broadcast message to all connected clients (Admin only)
router.post(
  "/broadcast",
  authenticate,
  authorize("WTF Management", "Create"),
  broadcastMessage
);

module.exports = router;
