const express = require('express');
const router = express.Router();
const cartController = require('../../controllers/cartController');
const { body, param } = require('express-validator');
const { validate } = require('../../middleware/validator');
const { authenticate } = require('../../middleware/auth');

/**
 * Cart Routes - Sprint5-Story-02
 * API endpoints for shopping cart management
 *
 * All routes require authentication
 */

// Validation middleware
const validateAddToCart = [
  body('productId')
    .notEmpty()
    .withMessage('Product ID is required')
    .isMongoId()
    .withMessage('Invalid product ID format'),
  body('quantity')
    .optional()
    .isInt({ min: 1, max: 99 })
    .withMessage('Quantity must be between 1 and 99'),
  validate
];

const validateUpdateQuantity = [
  param('shopItemId')
    .isMongoId()
    .withMessage('Invalid shop item ID format'),
  body('quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isInt({ min: 1, max: 99 })
    .withMessage('Quantity must be between 1 and 99'),
  validate
];

const validateRemoveItem = [
  param('shopItemId')
    .isMongoId()
    .withMessage('Invalid shop item ID format'),
  validate
];

/**
 * @route   GET /api/v2/shop/cart
 * @desc    Get user's cart with populated items
 * @access  Private
 */
router.get('/', authenticate, cartController.getCart);

/**
 * @route   GET /api/v2/shop/cart/validate
 * @desc    Validate stock availability for all cart items
 * @access  Private
 */
router.get('/validate', authenticate, cartController.validateStock);

/**
 * @route   POST /api/v2/shop/cart
 * @desc    Add item to cart
 * @access  Private
 * @body    { productId: ObjectId, quantity?: Number }
 */
router.post('/', authenticate, validateAddToCart, cartController.addToCart);

/**
 * @route   PUT /api/v2/shop/cart/:shopItemId
 * @desc    Update item quantity in cart
 * @access  Private
 * @params  shopItemId - Shop item ID
 * @body    { quantity: Number }
 */
router.put('/:shopItemId', authenticate, validateUpdateQuantity, cartController.updateQuantity);

/**
 * @route   DELETE /api/v2/shop/cart/:shopItemId
 * @desc    Remove specific item from cart
 * @access  Private
 * @params  shopItemId - Shop item ID
 */
router.delete('/:shopItemId', authenticate, validateRemoveItem, cartController.removeFromCart);

/**
 * @route   DELETE /api/v2/shop/cart
 * @desc    Clear all items from cart
 * @access  Private
 */
router.delete('/', authenticate, cartController.clearCart);

module.exports = router;
