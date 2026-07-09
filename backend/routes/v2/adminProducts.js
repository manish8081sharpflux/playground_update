const express = require('express');
const router = express.Router();
const adminProductController = require('../../controllers/adminProductController');
const { authenticate, authorize } = require('../../middleware/auth');
const checkPurchaseRequestAccess = require('../../middleware/checkPurchaseRequestAccess'); // Sprint5-Story-25
const {
  validateProductCreate,
  validateProductUpdate,
  validateProductId,
  validateProductQuery
} = require('../../middleware/validation/adminProductValidation');

/**
 * Admin Product Routes - Sprint5-Story-05
 * All routes require authentication and 'shop' module 'manage' permission
 */

/**
 * @route GET /api/v2/shop/admin/products
 * @desc Get all products (admin view - includes inactive)
 * @access Admin only
 */
router.get(
  '/products',
  authenticate,
  authorize('Shop Management', 'Manage'),
  validateProductQuery,
  adminProductController.getAllProducts
);

/**
 * @route GET /api/v2/shop/admin/products/:productId
 * @desc Get single product by ID
 * @access Admin only
 */
router.get(
  '/products/:productId',
  authenticate,
  authorize('Shop Management', 'Manage'),
  validateProductId,
  adminProductController.getProduct
);

/**
 * @route POST /api/v2/shop/admin/products
 * @desc Create new product
 * @access Admin only
 */
router.post(
  '/products',
  authenticate,
  authorize('Shop Management', 'Manage'),
  validateProductCreate,
  adminProductController.createProduct
);

/**
 * @route PUT /api/v2/shop/admin/products/:productId
 * @desc Update product
 * @access Admin only
 */
router.put(
  '/products/:productId',
  authenticate,
  authorize('Shop Management', 'Manage'),
  validateProductUpdate,
  adminProductController.updateProduct
);

/**
 * @route DELETE /api/v2/shop/admin/products/:productId
 * @desc Soft delete product (set isActive: false)
 * @access Admin only
 */
router.delete(
  '/products/:productId',
  authenticate,
  authorize('Shop Management', 'Manage'),
  validateProductId,
  adminProductController.deleteProduct
);

/**
 * @route POST /api/v2/shop/admin/products/:productId/restore
 * @desc Restore soft-deleted product (set isActive: true)
 * @access Admin only
 */
router.post(
  '/products/:productId/restore',
  authenticate,
  authorize('Shop Management', 'Manage'),
  validateProductId,
  adminProductController.restoreProduct
);

// ==================== PENDING PRODUCTS (Sprint5-Story-25) ====================

/**
 * @route POST /api/v2/shop/admin/products/pending
 * @desc Create pending product (inline product addition)
 * @access Multi-role (Coach, Medical, Admin, PM)
 */
router.post(
  '/products/pending',
  authenticate,
  checkPurchaseRequestAccess(),
  adminProductController.createPendingProduct
);

/**
 * @route GET /api/v2/shop/admin/products/pending
 * @desc Get all pending products
 * @access Multi-role (Coach, Medical, Admin, PM)
 */
router.get(
  '/products/pending',
  authenticate,
  checkPurchaseRequestAccess(),
  adminProductController.getPendingProducts
);

module.exports = router;
