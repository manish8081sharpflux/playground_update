const express = require('express');
const router = express.Router();
const purchaseRequestController = require('../../controllers/purchaseRequestController');
const { authenticate } = require('../../middleware/auth');
const checkPermission = require('../../middleware/checkPermission');
const checkPurchaseRequestAccess = require('../../middleware/checkPurchaseRequestAccess'); // Sprint5-Story-24: Multi-role access
const { upload } = require('../../middleware/upload');  // File upload middleware
const {
  validateCreateRequest,
  validateRequestId,
  validateApproval,
  validateRejection,
  validateStockUpdate
} = require('../../middleware/validation/purchaseRequestValidation');

/**
 * Purchase Request Routes - Sprint5-Story-17
 * Base path: /api/v2/shop/admin/purchase-requests
 */

/**
 * Purchase Manager Routes
 */

// Get low-stock products (for request creation dropdown) - BUG-S17-004 FIX
// Sprint5-Story-24: Changed to multi-role access
router.get(
  '/products/low-stock',
  authenticate,
  checkPurchaseRequestAccess(),
  purchaseRequestController.getLowStockProducts
);

// Create new purchase request (with file upload support)
// Sprint5-Story-24: Changed to multi-role access (Coach, Medical, Admin, PM)
router.post(
  '/',
  authenticate,
  checkPurchaseRequestAccess(),
  upload.array('attachments', 5),  // Max 5 files
  validateCreateRequest,
  purchaseRequestController.createPurchaseRequest
);

// Get own purchase requests
// Sprint5-Story-24: Changed to multi-role access
router.get(
  '/my',
  authenticate,
  checkPurchaseRequestAccess(),
  purchaseRequestController.getMyPurchaseRequests
);

// Update existing request
// Sprint5-Story-EditDelete: Allow editing pending requests
router.put(
  '/:id',
  authenticate,
  checkPurchaseRequestAccess(),
  upload.array('attachments', 5),
  validateRequestId,
  purchaseRequestController.updatePurchaseRequest
);

// Delete request
// Sprint5-Story-EditDelete: Allow hard delete for pending/cancelled requests
router.delete(
  '/:id',
  authenticate,
  checkPurchaseRequestAccess(),
  validateRequestId,
  purchaseRequestController.deletePurchaseRequest
);

// Cancel pending request
// Sprint5-Story-24: Changed to multi-role access
router.put(
  '/:id/cancel',
  authenticate,
  checkPurchaseRequestAccess(),
  validateRequestId,
  purchaseRequestController.cancelPurchaseRequest
);

/**
 * Admin Routes - Sprint5-Story-18
 * NOTE: These must come BEFORE /:id route to avoid being caught as ID parameter
 */

// Story 3.9: Get pending request count for navigation badge
router.get(
  '/pending-count',
  authenticate,
  checkPurchaseRequestAccess(),
  purchaseRequestController.getPendingCount
);

// FIX-037: Get unique requesters for filter dropdown (server-side coach filter)
router.get(
  '/requesters',
  authenticate,
  checkPurchaseRequestAccess(),
  purchaseRequestController.getRequesters
);

// FIX-038: Batch order multiple purchase requests
router.post(
  '/batch-order',
  authenticate,
  checkPurchaseRequestAccess(),
  purchaseRequestController.batchOrder
);

// Get purchase request statistics
router.get(
  '/stats',
  authenticate,
  checkPermission('Purchase Management', 'Manage'),
  purchaseRequestController.getPurchaseRequestStats
);

// Get all purchase requests (Admin)
router.get(
  '/',
  authenticate,
  checkPurchaseRequestAccess(),
  purchaseRequestController.getAllPurchaseRequests
);

// Get single request details
// Sprint5-Story-24: Changed to multi-role access
// NOTE: This must come AFTER all static routes like /pending-count, /stats, /
router.get(
  '/:id',
  authenticate,
  checkPurchaseRequestAccess(),
  validateRequestId,
  purchaseRequestController.getPurchaseRequestById
);

// Approve purchase request
router.post(
  '/:id/approve',
  authenticate,
  checkPermission('Purchase Management', 'Manage'),
  validateRequestId,
  validateApproval,
  purchaseRequestController.approvePurchaseRequest
);

// Reject purchase request
router.post(
  '/:id/reject',
  authenticate,
  checkPermission('Purchase Management', 'Manage'),
  validateRequestId,
  validateRejection,
  purchaseRequestController.rejectPurchaseRequest
);

/**
 * Purchase Manager Routes - Sprint5-Story-19
 * Stock Update / Complete Request
 */

// Complete purchase request with stock update (Purchase Manager)
router.post(
  '/:id/complete',
  authenticate,
  checkPermission('Purchase Management', 'Update'),
  validateRequestId,
  validateStockUpdate,
  purchaseRequestController.completePurchaseRequest
);

/**
 * Story 2.1: State Machine & Shortcut Routes
 */

// Update Status (State Machine Transitions)
router.patch(
  '/:id/status',
  authenticate,
  // Permission check is inside the controller based on transitions
  validateRequestId,
  purchaseRequestController.updateStatus
);

// Assign from Stock (Shortcut)
router.post(
  '/:id/assign-stock',
  authenticate,
  checkPermission('Purchase Management', 'Update'),
  validateRequestId,
  purchaseRequestController.assignFromStock
);

module.exports = router;
