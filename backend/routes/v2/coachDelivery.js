/**
 * Coach Delivery Routes - Sprint5-Story-13
 * Routes for coach delivery management
 */

const express = require('express');
const router = express.Router();
const coachDeliveryController = require('../../controllers/coachDeliveryController');
const { authenticate, authorize } = require('../../middleware/auth');

// ─────────────────────────────────────────────────────────
// COACH DELIVERY ROUTES - All require authentication and coach role
// ─────────────────────────────────────────────────────────

// Apply authentication to all coach delivery routes
router.use(authenticate);

// Role-based authorization middleware for coaches and admins
const coachOrAdmin = (req, res, next) => {
  if (req.user.role !== 'coach' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Coach or Admin role required.'
    });
  }
  next();
};

router.use(coachOrAdmin);

/**
 * GET /api/v2/shop/coach/deliveries/stats
 * Get delivery statistics for coach
 * Query params: none
 */
router.get('/stats', coachDeliveryController.getCoachDeliveryStats);

/**
 * GET /api/v2/shop/coach/deliveries
 * Get pending deliveries for coach's Balagruha(s)
 * Query params: balagruhaId (optional), status (optional), page, limit
 */
router.get('/', coachDeliveryController.getCoachDeliveries);

/**
 * PATCH /api/v2/shop/coach/deliveries/:orderId/deliver
 * Mark order as delivered
 * Body: { deliveryNotes?: string }
 */
router.patch('/:orderId/deliver', coachDeliveryController.markOrderDelivered);

module.exports = router;
