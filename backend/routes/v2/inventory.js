const express = require('express');
const router = express.Router();
const inventoryController = require('../../controllers/inventoryController');
const { authenticate, authorize } = require('../../middleware/auth');
const {
  validateStockAdjustment,
  validateBulkUpdate,
  validateProductId
} = require('../../middleware/validation/inventoryValidation');

/**
 * Inventory Routes - Sprint5-Story-06 & Sprint5-Story-07
 * All routes require authentication and 'Shop Management' module 'Manage' permission
 *
 * IMPORTANT: Literal routes MUST come before parameterized routes to avoid conflicts
 */

/**
 * @route POST /api/v2/shop/admin/inventory/bulk-update
 * @desc Bulk update stock levels via CSV
 * @access Admin only
 */
router.post(
  '/bulk-update',
  authenticate,
  authorize('Shop Management', 'Manage'),
  validateBulkUpdate,
  inventoryController.bulkUpdateStock
);

/**
 * @route GET /api/v2/shop/admin/stock-alerts
 * @desc Get stock alert counts for admin panel (Sprint5-Story-15)
 * @access Admin only
 */
router.get(
  '/stock-alerts',
  authenticate,
  authorize('Shop Management', 'Manage'),
  inventoryController.getStockAlerts
);

/**
 * @route GET /api/v2/shop/admin/quick-stats
 * @desc Get quick stats for admin panel (Sprint5-Story-15)
 * @access Admin only
 */
router.get(
  '/quick-stats',
  authenticate,
  authorize('Shop Management', 'Manage'),
  inventoryController.getQuickStats
);

/**
 * @route GET /api/v2/shop/admin/inventory/low-stock
 * @desc Get products with stock <= lowStockThreshold (Sprint5-Story-07)
 * @access Admin only
 */
router.get(
  '/low-stock',
  authenticate,
  authorize('Shop Management', 'Manage'),
  inventoryController.getLowStockProducts
);

/**
 * Story 3.6: Stock Levels for PM Dashboard "Present Stock" tab
 * @route GET /api/v2/shop/admin/inventory/stock-levels
 * @desc Get all products with stock status
 * @access Purchase Manager, Admin
 */
router.get(
  '/stock-levels',
  authenticate,
  inventoryController.getStockLevels
);

/**
 * Story 3.6: Most Consumed Analytics for PM Dashboard
 * @route GET /api/v2/shop/admin/inventory/most-consumed
 * @desc Get products ranked by consumption frequency
 * @access Purchase Manager, Admin
 */
router.get(
  '/most-consumed',
  authenticate,
  inventoryController.getMostConsumed
);

/**
 * @route GET /api/v2/shop/admin/inventory/out-of-stock
 * @desc Get products with stock = 0 (Sprint5-Story-07)
 * @access Admin only
 */
router.get(
  '/out-of-stock',
  authenticate,
  authorize('Shop Management', 'Manage'),
  inventoryController.getOutOfStockProducts
);

/**
 * @route GET /api/v2/shop/admin/inventory/export
 * @desc Export current inventory to CSV format
 * @access Admin only
 */
router.get(
  '/export',
  authenticate,
  authorize('Shop Management', 'Manage'),
  inventoryController.exportInventory
);

/**
 * @route GET /api/v2/shop/admin/inventory/master-report
 * @desc Master Inventory Report (In Store + Deployed)
 * @access Admin only
 */
router.get(
  '/master-report',
  authenticate,
  authorize('Shop Management', 'Manage'),
  inventoryController.getMasterInventoryReport
);

/**
 * @route GET /api/v2/shop/admin/inventory
 * @desc Get inventory dashboard with all products and stock levels
 * @access Admin only
 */
router.get(
  '/',
  authenticate,
  authorize('Shop Management', 'Manage'),
  inventoryController.getInventoryDashboard
);

/**
 * @route PATCH /api/v2/shop/admin/inventory/:productId/adjust
 * @desc Manually adjust product stock with audit trail
 * @access Admin only
 */
router.patch(
  '/:productId/adjust',
  authenticate,
  authorize('Shop Management', 'Manage'),
  validateStockAdjustment,
  inventoryController.adjustStock
);

/**
 * @route GET /api/v2/shop/admin/inventory/:productId/audit
 * @desc Get audit trail for a product
 * @access Admin only
 */
router.get(
  '/:productId/audit',
  authenticate,
  authorize('Shop Management', 'Manage'),
  validateProductId,
  inventoryController.getAuditTrail
);

module.exports = router;
