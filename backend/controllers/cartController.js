const cartService = require('../services/cart');
const { errorLogger } = require('../config/pino-config');

/**
 * Cart Controller - Sprint5-Story-02
 * HTTP request handlers for shopping cart operations
 *
 * Routes:
 * - GET /api/v2/shop/cart - Get user's cart
 * - POST /api/v2/shop/cart - Add item to cart
 * - PUT /api/v2/shop/cart/:shopItemId - Update item quantity
 * - DELETE /api/v2/shop/cart/:shopItemId - Remove item
 * - DELETE /api/v2/shop/cart - Clear cart
 * - GET /api/v2/shop/cart/validate - Validate cart stock
 */

/**
 * @route   GET /api/v2/shop/cart
 * @desc    Get user's cart with populated items
 * @access  Private (requires authentication)
 */
const getCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const result = await cartService.getCart(userId);

    res.status(200).json(result);
  } catch (error) {
    errorLogger.error({ err: error }, 'Get cart error:');
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch cart'
    });
  }
};

/**
 * @route   POST /api/v2/shop/cart
 * @desc    Add item to cart
 * @access  Private (requires authentication)
 */
const addToCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, quantity } = req.body;

    const result = await cartService.addToCart(userId, productId, quantity);

    res.status(200).json(result);
  } catch (error) {
    errorLogger.error({ err: error }, 'Add to cart error:');

    // Determine appropriate status code
    let statusCode = 500;
    if (error.message.includes('not found')) statusCode = 404;
    if (error.message.includes('not available') || error.message.includes('out of stock')) statusCode = 400;
    if (error.message.includes('available in stock')) statusCode = 400;

    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to add item to cart'
    });
  }
};

/**
 * @route   PUT /api/v2/shop/cart/:shopItemId
 * @desc    Update item quantity in cart
 * @access  Private (requires authentication)
 */
const updateQuantity = async (req, res) => {
  try {
    const userId = req.user._id;
    const { shopItemId } = req.params;
    const { quantity } = req.body;

    const result = await cartService.updateQuantity(userId, shopItemId, quantity);

    res.status(200).json(result);
  } catch (error) {
    errorLogger.error({ err: error }, 'Update quantity error:');

    let statusCode = 500;
    if (error.message.includes('not found')) statusCode = 404;
    if (error.message.includes('must be between') || error.message.includes('available in stock')) statusCode = 400;

    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update quantity'
    });
  }
};

/**
 * @route   DELETE /api/v2/shop/cart/:shopItemId
 * @desc    Remove item from cart
 * @access  Private (requires authentication)
 */
const removeFromCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { shopItemId } = req.params;

    const result = await cartService.removeFromCart(userId, shopItemId);

    res.status(200).json(result);
  } catch (error) {
    errorLogger.error({ err: error }, 'Remove from cart error:');

    let statusCode = 500;
    if (error.message.includes('not found')) statusCode = 404;

    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to remove item from cart'
    });
  }
};

/**
 * @route   DELETE /api/v2/shop/cart
 * @desc    Clear all items from cart
 * @access  Private (requires authentication)
 */
const clearCart = async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await cartService.clearCart(userId);

    res.status(200).json(result);
  } catch (error) {
    errorLogger.error({ err: error }, 'Clear cart error:');

    let statusCode = 500;
    if (error.message.includes('not found')) statusCode = 404;

    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to clear cart'
    });
  }
};

/**
 * @route   GET /api/v2/shop/cart/validate
 * @desc    Validate stock availability for cart items
 * @access  Private (requires authentication)
 */
const validateStock = async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await cartService.validateCartStock(userId);

    res.status(200).json(result);
  } catch (error) {
    errorLogger.error({ err: error }, 'Validate stock error:');

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to validate cart'
    });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateQuantity,
  removeFromCart,
  clearCart,
  validateStock
};
