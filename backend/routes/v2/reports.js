// Sprint5-Story-12: Transaction Reports Routes
// Admin-only routes for transaction reports and leaderboards

const express = require('express');
const router = express.Router();
const reportsController = require('../../controllers/reportsController');
const { authenticate, authorize } = require('../../middleware/auth');

// All reports routes require authentication and Shop Management permission
router.use(authenticate);
router.use(authorize('Shop Management', 'Manage'));

// GET /api/v2/shop/admin/reports/transactions - Get transaction log with filters
router.get('/transactions', reportsController.getTransactionLog);

// GET /api/v2/shop/admin/reports/leaderboard - Get student leaderboard
router.get('/leaderboard', reportsController.getStudentLeaderboard);

// GET /api/v2/shop/admin/reports/zero-purchases - Get students with zero purchases
router.get('/zero-purchases', reportsController.getZeroPurchaseStudents);

// POST /api/v2/shop/admin/reports/send-zero-purchase-reminder - Send reminder to student
router.post('/send-zero-purchase-reminder', reportsController.sendZeroPurchaseReminder);

// GET /api/v2/shop/admin/reports/coin-economy - Get coin economy health metrics
router.get('/coin-economy', reportsController.getCoinEconomyHealth);

// GET /api/v2/shop/admin/reports/participation-details - Get student participation details
router.get('/participation-details', reportsController.getParticipationDetails);

// GET /api/v2/shop/admin/reports/export - Export report as CSV
router.get('/export', reportsController.exportReport);

module.exports = router;
