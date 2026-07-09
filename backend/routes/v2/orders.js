const express = require('express');
const router = express.Router();
const orderController = require('../../controllers/orderController');
const { param, query } = require('express-validator');
const { validate } = require('../../middleware/validator');
const { authenticate, authorize } = require('../../middleware/auth');

/**
 * Order Routes - Sprint5-Story-03
 * API endpoints for checkout and order management
 *
 * All routes require authentication
 */

// Validation middleware
const validateOrderNumber = [
  param('orderNumber')
    .notEmpty()
    .withMessage('Order number is required')
    .matches(/^ORD-\d{8}-\d{5}$/)
    .withMessage('Invalid order number format (must be ORD-YYYYMMDD-XXXXX)'),
  validate
];

const validateOrderId = [
  param('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID format'),
  validate
];

const validateOrderQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['pending', 'completed', 'cancelled', 'refunded'])
    .withMessage('Invalid status filter'),
  validate
];

/**
 * @route   POST /api/v2/shop/orders
 * @desc    Create order from cart (checkout)
 * @access  Private
 */
router.post('/', authenticate, orderController.createOrder);

/**
 * @route   GET /api/v2/shop/orders/all
 * @desc    Get all orders (Admin only) with filters
 * @access  Private (Admin)
 * @query   page, limit, status, coachId, balagruhaId (optional)
 */
router.get('/all', authenticate, authorize('Shop Management', 'Manage'), orderController.getAllOrders);

/**
 * @route   GET /api/v2/shop/orders
 * @desc    Get user's order history with pagination
 * @access  Private
 * @query   page, limit, status (optional)
 */
router.get('/', authenticate, validateOrderQuery, orderController.getUserOrders);

/**
 * @route   GET /api/v2/shop/orders/:orderNumber
 * @desc    Get order by order number
 * @access  Private
 * @params  orderNumber - Order number (ORD-YYYYMMDD-XXXXX)
 */
router.get('/:orderNumber', authenticate, validateOrderNumber, orderController.getOrder);

/**
 * @route   GET /api/v2/shop/orders/id/:orderId
 * @desc    Get order by MongoDB ID
 * @access  Private
 * @params  orderId - MongoDB ObjectId
 */
router.get('/id/:orderId', authenticate, validateOrderId, orderController.getOrderById);

/**
 * @route   POST /api/v2/shop/orders/:orderNumber/cancel
 * @desc    Cancel order (within 5 minutes of placement)
 * @access  Private
 * @params  orderNumber - Order number (ORD-YYYYMMDD-XXXXX)
 */
router.post('/:orderNumber/cancel', authenticate, validateOrderNumber, orderController.cancelOrder);

module.exports = router;
