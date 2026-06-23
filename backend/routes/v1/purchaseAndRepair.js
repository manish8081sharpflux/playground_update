const express = require("express");
const router = express.Router();
const { authorize, authenticate } = require("../../middleware/auth");
const { upload } = require("../../middleware/upload");
const repairRequestController = require("../../controllers/purchaseAndRepair");

// Repair Requests Routes
// Create a new repair request with file upload support
router.post(
  "/repair-requests",
  authenticate,
  authorize("Machine Management", "Read"),
  upload.array("attachments", 5), // Allow up to 5 files
  repairRequestController.createRepairRequest
);

// Get all repair requests with pagination and filtering
router.get(
  "/repair-requests",
  authenticate,
  authorize("Machine Management", "Read"),
  repairRequestController.getAllRepairRequests
);

// Get a single repair request by ID
router.get(
  "/repair-requests/:id",
  authenticate,
  authorize("Machine Management", "Read"),
  repairRequestController.getRepairRequestById
);

// Update a repair request
router.put(
  "/repair-requests/:id",
  authenticate,
  authorize("Machine Management", "Read"),
  upload.array("attachments", 5), // Allow up to 5 files for updates
  repairRequestController.updateRepairRequest
);

// Delete a repair request
router.delete(
  "/repair-requests/:id",
  authenticate,
  authorize("Machine Management", "Read"),
  repairRequestController.deleteRepairRequest
);

// API for toggle status change teh repair request
router.put(
  "/repair-requests/status/:id",
  authenticate,
  authorize("Machine Management", "Read"),
  repairRequestController.toggleRepairRequestStatus
);

// Purchase Order Routes
// Create a purchase order with file upload support
router.post(
  "/purchase-orders",
  authenticate,
  authorize("Machine Management", "Read"),
  upload.array("attachments", 5), // Allow up to 5 files
  repairRequestController.createPurchaseOrder
);

// Get all purchase orders with pagination and filtering
router.get(
  "/purchase-orders",
  authenticate,
  authorize("Machine Management", "Read"),
  repairRequestController.getAllPurchaseOrders
);

// Get a single purchase order by ID
router.get(
  "/purchase-orders/:id",
  authenticate,
  authorize("Machine Management", "Read"),
  repairRequestController.getPurchaseOrderById
);

// Update a purchase order
router.put(
  "/purchase-orders/:id",
  authenticate,
  authorize("Machine Management", "Read"),
  upload.array("attachments", 5), // Allow up to 5 files for updates
  repairRequestController.updatePurchaseOrder
);

// Delete a purchase order
router.delete(
  "/purchase-orders/:id",
  authenticate,
  authorize("Machine Management", "Read"),
  repairRequestController.deletePurchaseOrder
);

// Update purchase order status
router.put(
  "/purchase-orders/status/:id",
  authenticate,
  authorize("Machine Management", "Read"),
  repairRequestController.updatePurchaseOrderStatus
);

// API for purchase manager overview details
router.get(
  "/overview",
  authenticate,
  authorize("Machine Management", "Read"),
  repairRequestController.getPurchaseManagerOverview
);

module.exports = router;
