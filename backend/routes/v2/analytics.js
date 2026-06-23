// Sprint5-Story-11: Analytics Routes
// Admin-only routes for shop analytics

const express = require('express');
const router = express.Router();
const analyticsController = require('../../controllers/analyticsController');
const { authenticate, authorize } = require('../../middleware/auth');

// All analytics routes require authentication and Shop Management permission
router.use(authenticate);
router.use(authorize('Shop Management', 'Manage'));

// GET /api/v2/shop/admin/analytics - Get shop analytics
router.get('/', analyticsController.getShopAnalytics);

// GET /api/v2/shop/admin/analytics/participation - Get student participation details
router.get('/participation', analyticsController.getStudentParticipationDetails);

// GET /api/v2/shop/admin/analytics/coin-velocity - Get coin earning velocity metrics (FR35)
router.get('/coin-velocity', analyticsController.getCoinEarningVelocity);

module.exports = router;
