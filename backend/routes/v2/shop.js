const express = require('express');
const router = express.Router();
const shopController = require('../../controllers/shopController');
const shopProductImageController = require('../../controllers/shopProductImageController');
const { authenticate, authorize } = require('../../middleware/auth');
const { upload } = require('../../middleware/upload');

/**
 * @route GET /api/v2/shop/products
 * @desc Get all products with filtering and pagination
 * @access Public
 */
router.get('/products', shopController.getProducts);

/**
 * @route GET /api/v2/shop/products/featured
 * @desc Get featured products
 * @access Public
 */
router.get('/products/featured', shopController.getFeaturedProducts);

/**
 * @route GET /api/v2/shop/products/:id
 * @desc Get single product by ID
 * @access Public
 */
router.get('/products/:id', shopController.getProductById);

/**
 * @route GET /api/v2/shop/categories
 * @desc Get categories with product counts
 * @access Public
 */
router.get('/categories', shopController.getCategories);

// ==================== PRODUCT IMAGE MANAGEMENT (Story-14) ====================

/**
 * @route POST /api/v2/shop/products/:productId/images
 * @desc Upload product images (max 5 images)
 * @access Private (Coach, Admin)
 */
router.post(
  '/products/:productId/images',
  authenticate,
  authorize('Shop Management', 'Manage'),
  upload.array('images', 5),
  shopProductImageController.uploadProductImages
);

/**
 * @route DELETE /api/v2/shop/products/:productId/images/:imageId
 * @desc Delete a product image
 * @access Private (Coach, Admin)
 */
router.delete(
  '/products/:productId/images/:imageId',
  authenticate,
  authorize('Shop Management', 'Manage'),
  shopProductImageController.deleteProductImage
);

/**
 * @route PUT /api/v2/shop/products/:productId/images/:imageId/primary
 * @desc Set primary product image
 * @access Private (Coach, Admin)
 */
router.put(
  '/products/:productId/images/:imageId/primary',
  authenticate,
  authorize('Shop Management', 'Manage'),
  shopProductImageController.setPrimaryImage
);

// ==================== PURCHASE MANAGER DASHBOARD TABS (Story 3.6) ====================

/**
 * @route GET /api/v2/shop/admin/inventory/stock-levels
 * @desc Get stock levels for Present Stock tab
 * @access Private (Purchase Manager)
 */
router.get(
  '/admin/inventory/stock-levels',
  authenticate,
  authorize('Purchase Management', 'Read'),
  shopController.getStockLevels
);

/**
 * @route GET /api/v2/shop/vendors
 * @desc Get vendors with product counts
 * @access Private (Purchase Manager)
 */
router.get(
  '/vendors',
  authenticate,
  authorize('Purchase Management', 'Read'),
  shopController.getVendorsWithProductCount
);

/**
 * @route GET /api/v2/shop/admin/analytics/most-consumed
 * @desc Get most consumed products
 * @access Private (Purchase Manager)
 */
router.get(
  '/admin/analytics/most-consumed',
  authenticate,
  authorize('Purchase Management', 'Read'),
  shopController.getMostConsumed
);

module.exports = router;
