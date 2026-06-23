const orderService = require('../services/order');
const { errorLogger } = require('../config/pino-config');

/**
 * Order Controller - Sprint5-Story-03
 * HTTP handlers for order/checkout operations
 *
 * All routes require authentication
 */

/**
 * Create order from cart
 * POST /api/v2/shop/orders
 * @access Private
 */
async function createOrder(req, res) {
  try {
    const userId = req.user.id;

    const result = await orderService.createOrder(userId);

    res.status(201).json({
      success: true,
      message: result.message,
      order: result.order,
      coinsSpent: result.coinsSpent,
      remainingBalance: result.remainingBalance
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Create order error:');

    // Send appropriate error status
    if (error.message.includes('Cart is empty')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('Insufficient stock')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('Insufficient coin balance')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('no longer available')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('concurrent modification')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
}

/**
 * Get order by order number
 * GET /api/v2/shop/orders/:orderNumber
 * @access Private
 */
async function getOrder(req, res) {
  try {
    const { orderNumber } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const order = await orderService.getOrderByNumber(orderNumber, userId, userRole);

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Get order error:');

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve order',
      error: error.message
    });
  }
}

/**
 * Get user's order history
 * GET /api/v2/shop/orders
 * Query params: page, limit, status
 * @access Private
 */
async function getUserOrders(req, res) {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status || null;

    const result = await orderService.getUserOrders(userId, page, limit, status);

    res.status(200).json({
      success: true,
      orders: result.orders,
      pagination: result.pagination
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Get user orders error:');

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve orders',
      error: error.message
    });
  }
}

/**
 * Get order by ID
 * GET /api/v2/shop/orders/id/:orderId
 * @access Private
 */
async function getOrderById(req, res) {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const order = await orderService.getOrderById(orderId, userId, userRole);

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Get order by ID error:');

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve order',
      error: error.message
    });
  }
}

/**
 * Cancel order (within 5 minutes)
 * POST /api/v2/shop/orders/:orderNumber/cancel
 * @access Private
 * @body reason (optional) - Reason for cancellation
 */
async function cancelOrder(req, res) {
  try {
    const { orderNumber } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const result = await orderService.cancelOrder(orderNumber, userId, reason);

    res.status(200).json({
      success: true,
      message: result.message,
      order: result.order,
      refundedAmount: result.refundedAmount,
      newBalance: result.newBalance
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Cancel order error:');

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('cannot be cancelled')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
      error: error.message
    });
  }
}

/**
 * Get all orders (Admin view) with filters
 * GET /api/v2/shop/orders/all
 * Query params: page, limit, status, coachId, balagruhaId, studentId, startDate, endDate
 * @access Private (Admin only)
 */
async function getAllOrders(req, res) {
  try {
    // RBAC: authorize('Shop Management', 'Manage') middleware enforces admin-only access
    // Non-admin users without proper authorization are blocked at the middleware level

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status || null;
    const coachId = req.query.coachId || null;
    const balagruhaId = req.query.balagruhaId || null;
    const studentId = req.query.studentId || null;
    const startDate = req.query.startDate || null;
    const endDate = req.query.endDate || null;

    const result = await orderService.getAllOrders(page, limit, status, coachId, balagruhaId, studentId, startDate, endDate);

    res.status(200).json({
      success: true,
      orders: result.orders,
      pagination: result.pagination
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Get all orders error:');

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve orders',
      error: error.message
    });
  }
}

module.exports = {
  createOrder,
  getOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  getAllOrders
};
