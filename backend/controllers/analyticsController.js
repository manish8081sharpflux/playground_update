// Sprint5-Story-11: Analytics Controller
// HTTP handlers for shop analytics endpoints

const AnalyticsService = require('../services/analytics');
const { errorLogger } = require('../config/pino-config');

/**
 * Get shop analytics for a date range
 * GET /api/v2/shop/admin/analytics
 * Query params: startDate (ISO), endDate (ISO)
 */
exports.getShopAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Parse dates if provided
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    // Validate dates
    if (start && isNaN(start.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid startDate format. Use ISO 8601 format (YYYY-MM-DD)'
      });
    }

    if (end && isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid endDate format. Use ISO 8601 format (YYYY-MM-DD)'
      });
    }

    // Get analytics data
    const analytics = await AnalyticsService.getShopAnalytics(start, end);

    res.status(200).json({
      success: true,
      data: analytics,
      dateRange: {
        startDate: start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: end || new Date()
      }
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching shop analytics:');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shop analytics',
      error: error.message
    });
  }
};

/**
 * Get student participation details
 * GET /api/v2/shop/admin/analytics/participation
 * Returns list of students who never purchased
 */
exports.getStudentParticipationDetails = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const User = require('../models/user');
    const Order = require('../models/order');

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Get students who never purchased
    const studentsNeverPurchased = await User.aggregate([
      { $match: { role: 'student' } },
      {
        $lookup: {
          from: 'orders',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$userId', '$$userId'] },
                placedAt: { $gte: start, $lte: end },
                status: 'completed'
              }
            }
          ],
          as: 'orders'
        }
      },
      { $match: { orders: { $size: 0 } } },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          userId: 1
        }
      },
      { $sort: { name: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: studentsNeverPurchased.length,
        students: studentsNeverPurchased
      }
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching student participation details:');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student participation details',
      error: error.message
    });
  }
};

/**
 * Get coin earning velocity analytics
 * GET /api/v2/shop/admin/analytics/coin-velocity
 * Query params: startDate (ISO), endDate (ISO), granularity ('daily'|'weekly'|'monthly')
 */
exports.getCoinEarningVelocity = async (req, res) => {
  try {
    const { startDate, endDate, granularity } = req.query;

    // Validate dates if provided
    if (startDate) {
      const parsed = new Date(startDate);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid startDate format. Use ISO 8601 format (YYYY-MM-DD)'
        });
      }
    }

    if (endDate) {
      const parsed = new Date(endDate);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid endDate format. Use ISO 8601 format (YYYY-MM-DD)'
        });
      }
    }

    // Validate granularity
    const validGranularities = ['daily', 'weekly', 'monthly'];
    if (granularity && !validGranularities.includes(granularity)) {
      return res.status(400).json({
        success: false,
        message: `Invalid granularity. Must be one of: ${validGranularities.join(', ')}`
      });
    }

    const velocityData = await AnalyticsService.getCoinEarningVelocity({
      startDate,
      endDate,
      granularity
    });

    res.status(200).json({
      success: true,
      data: velocityData
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching coin earning velocity:');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coin earning velocity analytics',
      error: error.message
    });
  }
};
