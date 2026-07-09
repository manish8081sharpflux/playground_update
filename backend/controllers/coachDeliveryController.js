/**
 * Coach Delivery Controller - Sprint5-Story-13
 * Handles coach delivery management functionality
 *
 * Features:
 * - Get pending deliveries for coach's Balagruha(s)
 * - Mark orders as delivered with authorization check
 * - Get delivery statistics
 * - On-demand confirmation of orders (after 5-minute window)
 */

const Order = require('../models/order');
const User = require('../models/user');
const Balagruha = require('../models/balagruha');
const Notification = require('../models/notification');
const { errorLogger } = require('../config/pino-config');

/**
 * Get pending deliveries for coach (with on-demand confirmation)
 * GET /api/v2/shop/coach/deliveries
 *
 * Query params:
 * - balagruhaId: Filter by specific Balagruha (optional)
 * - status: Filter by delivery status (default: 'pending_delivery')
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 */
exports.getCoachDeliveries = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    const { balagruhaId, coachId, status, startDate, endDate, page = 1, limit = 20 } = req.query;

    // 1. Check and confirm any orders ready for delivery
    await Order.checkAndConfirmOrders();

    // 2. Determine balagruhaIds based on role
    let balagruhaIds = [];
    let targetStudentIds = [];

    if (userRole === 'admin') {
      // Admin can see all deliveries or filter by balagruha/coach
      if (balagruhaId) {
        balagruhaIds = [balagruhaId];
      } else if (coachId) {
        // Get coach's balagruhas
        const coach = await User.findById(coachId).select('balagruhaIds');
        if (coach && coach.balagruhaIds && coach.balagruhaIds.length > 0) {
          balagruhaIds = coach.balagruhaIds;
        }
      }
      // If no filters, balagruhaIds stays empty and we'll get all students
    } else {
      // Coach - get their assigned balagruhas
      const coach = await User.findById(userId).select('balagruhaIds name');
      if (!coach || !coach.balagruhaIds || coach.balagruhaIds.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No Balagruhas assigned to this coach'
        });
      }
      balagruhaIds = balagruhaId ? [balagruhaId] : coach.balagruhaIds;
    }

    // 3. Find students
    const studentQuery = { role: 'student' };
    if (balagruhaIds.length > 0) {
      studentQuery.balagruhaIds = { $in: balagruhaIds };
    }

    const students = await User.find(studentQuery).select('_id name balagruhaIds');

    const studentIds = students.map(s => s._id);

    if (studentIds.length === 0) {
      return res.json({
        success: true,
        orders: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0
        }
      });
    }

    // 5. Build query based on status filter
    const orderQuery = {
      userId: { $in: studentIds },
      status: 'completed'
    };

    // Handle special status filter values
    const statusFilter = status || 'pending_delivery';

    switch (statusFilter) {
      case 'pending_delivery':
        orderQuery.deliveryStatus = 'pending_delivery';
        break;

      case 'delivered_today':
        orderQuery.deliveryStatus = 'delivered';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        orderQuery.deliveredAt = { $gte: today };
        break;

      case 'delivered_last_7_days':
        orderQuery.deliveryStatus = 'delivered';
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        orderQuery.deliveredAt = { $gte: sevenDaysAgo };
        break;

      case 'all_delivered':
        orderQuery.deliveryStatus = 'delivered';
        break;

      default:
        // Fallback to exact match for backward compatibility
        orderQuery.deliveryStatus = statusFilter;
    }

    // Add custom date range filters if provided
    if (startDate || endDate) {
      // Only apply date filters for delivered orders
      if (orderQuery.deliveryStatus === 'delivered') {
        const dateFilter = {};

        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          dateFilter.$gte = start;
        }

        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          dateFilter.$lte = end;
        }

        // Override or merge with existing deliveredAt filter
        if (Object.keys(dateFilter).length > 0) {
          orderQuery.deliveredAt = dateFilter;
        }
      }
    }

    // 6. Get orders with pagination
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      Order.find(orderQuery)
        .populate('userId', 'name userId balagruhaIds')
        .populate('items.shopItemId', 'name sku imageUrl')
        .populate('deliveredBy', 'name')
        .sort({ placedAt: 1 })  // Oldest first
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Order.countDocuments(orderQuery)
    ]);

    // 7. Enrich with Balagruha names
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const student = students.find(s => s._id.toString() === order.userId._id.toString());
        if (!student) {
          return { ...order, balagruhaNames: '' };
        }

        const balagruhas = await Balagruha.find({
          _id: { $in: student.balagruhaIds }
        }).select('name');

        return {
          ...order,
          balagruhaNames: balagruhas.map(b => b.name).join(', ')
        };
      })
    );

    res.json({
      success: true,
      orders: enrichedOrders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching coach deliveries:');
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Mark order as delivered
 * PATCH /api/v2/shop/coach/deliveries/:orderId/deliver
 *
 * Body:
 * - deliveryNotes: Optional notes about delivery (max 500 chars)
 */
exports.markOrderDelivered = async (req, res) => {
  try {
    const { orderId } = req.params;
    const coachId = req.user._id;
    const { deliveryNotes } = req.body;

    // Validate deliveryNotes length
    if (deliveryNotes && deliveryNotes.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Delivery notes must be 500 characters or less'
      });
    }

    // 1. Find order
    const order = await Order.findById(orderId).populate('userId', 'name balagruhaIds');
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // 2. Validate status
    if (order.deliveryStatus !== 'pending_delivery') {
      return res.status(400).json({
        success: false,
        error: 'Order is not pending delivery',
        currentStatus: order.deliveryStatus
      });
    }

    // 3. Verify coach authorization (must be assigned to student's Balagruha)
    const coach = await User.findById(coachId).select('balagruhaIds name');
    if (!coach) {
      return res.status(404).json({
        success: false,
        error: 'Coach not found'
      });
    }

    const studentBalagruhas = order.userId.balagruhaIds.map(id => id.toString());
    const coachBalagruhas = coach.balagruhaIds.map(id => id.toString());

    const hasAccess = studentBalagruhas.some(sb => coachBalagruhas.includes(sb));

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to deliver orders for this student\'s Balagruha'
      });
    }

    // 4. Update order
    order.deliveryStatus = 'delivered';
    order.deliveredAt = new Date();
    order.deliveredBy = coachId;
    order.deliveryNotes = deliveryNotes || '';

    await order.save();

    // 5. Notify student (async, don't block response)
    Notification.createPersonal(
      order.userId._id,
      'Order Delivered',
      `Your order ${order.orderNumber} has been delivered by Coach ${coach.name}!`,
      'ISF_SHOP_UPDATE',
      {
        orderId: order._id,
        orderNumber: order.orderNumber,
        actionUrl: `/shop/orders/${order._id}`
      }
    ).catch(err => {
      errorLogger.error({ err: err }, `Failed to notify student about delivery:`);
    });

    res.json({
      success: true,
      message: 'Order marked as delivered successfully',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        deliveryStatus: order.deliveryStatus,
        deliveredAt: order.deliveredAt,
        deliveredBy: coach.name,
        deliveryNotes: order.deliveryNotes
      }
    });

  } catch (error) {
    errorLogger.error({ err: error }, 'Error marking order as delivered:');
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get delivery statistics for coach
 * GET /api/v2/shop/coach/deliveries/stats
 *
 * Query params:
 * - balagruhaId: Filter by specific Balagruha (optional, admin only)
 * - coachId: Filter by specific coach (optional, admin only)
 *
 * Returns:
 * - pendingCount: Number of pending deliveries
 * - deliveredToday: Number delivered today (by coach if coach role, or total if admin)
 * - deliveredThisWeek: Number delivered this week (by coach if coach role, or total if admin)
 * - totalDelivered: Total delivered all-time (by coach if coach role, or total if admin)
 */
exports.getCoachDeliveryStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    const { balagruhaId, coachId } = req.query;

    // Check and confirm orders first (updates pending counts)
    await Order.checkAndConfirmOrders();

    // Determine balagruhaIds based on role
    let balagruhaIds = [];

    if (userRole === 'admin') {
      // Admin can filter stats by balagruha or coach
      if (balagruhaId) {
        balagruhaIds = [balagruhaId];
      } else if (coachId) {
        // Get coach's balagruhas
        const coach = await User.findById(coachId).select('balagruhaIds');
        if (coach && coach.balagruhaIds && coach.balagruhaIds.length > 0) {
          balagruhaIds = coach.balagruhaIds;
        }
      }
      // If no filters, balagruhaIds stays empty and we'll get all students
    } else {
      // Coach - get their assigned balagruhas
      const coach = await User.findById(userId).select('balagruhaIds');
      if (!coach || !coach.balagruhaIds || coach.balagruhaIds.length === 0) {
        return res.json({
          success: true,
          pendingCount: 0,
          deliveredToday: 0,
          deliveredThisWeek: 0,
          totalDelivered: 0
        });
      }
      balagruhaIds = coach.balagruhaIds;
    }

    // Find students
    const studentQuery = { role: 'student' };
    if (balagruhaIds.length > 0) {
      studentQuery.balagruhaIds = { $in: balagruhaIds };
    }

    const students = await User.find(studentQuery).select('_id');

    const studentIds = students.map(s => s._id);

    if (studentIds.length === 0) {
      return res.json({
        success: true,
        pendingCount: 0,
        deliveredToday: 0,
        deliveredThisWeek: 0,
        totalDelivered: 0
      });
    }

    // Calculate date ranges
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)

    // Build query filters based on role
    const deliveredTodayQuery = {
      userId: { $in: studentIds },
      deliveryStatus: 'delivered',
      deliveredAt: { $gte: today }
    };

    const deliveredWeekQuery = {
      userId: { $in: studentIds },
      deliveryStatus: 'delivered',
      deliveredAt: { $gte: weekStart }
    };

    const totalDeliveredQuery = {
      userId: { $in: studentIds },
      deliveryStatus: 'delivered'
    };

    // For coaches, filter by deliveredBy
    if (userRole !== 'admin') {
      deliveredTodayQuery.deliveredBy = userId;
      deliveredWeekQuery.deliveredBy = userId;
      totalDeliveredQuery.deliveredBy = userId;
    }

    // Get stats in parallel
    const [pendingCount, deliveredToday, deliveredThisWeek, totalDelivered] = await Promise.all([
      // Pending deliveries
      Order.countDocuments({
        userId: { $in: studentIds },
        status: 'completed',
        deliveryStatus: 'pending_delivery'
      }),
      // Delivered today
      Order.countDocuments(deliveredTodayQuery),
      // Delivered this week
      Order.countDocuments(deliveredWeekQuery),
      // Total delivered (all-time)
      Order.countDocuments(totalDeliveredQuery)
    ]);

    res.json({
      success: true,
      pendingCount,
      deliveredToday,
      deliveredThisWeek,
      totalDelivered
    });

  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching delivery stats:');
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = exports;
