// Sprint5-Story-16: Student Profile Controller
// HTTP handlers for student profile data aggregation

const User = require('../models/user');
const Coin = require('../models/coin');
const Order = require('../models/order');
const { errorLogger, logger } = require('../config/pino-config');
const { HTTP_STATUS_CODE } = require('../constants/general');
const mongoose = require('mongoose');

/**
 * Check if requesting user has access to view target user's profile
 * @param {Object} requestingUser - The user making the request (from req.user)
 * @param {String} targetUserId - The ID of the user whose profile is being accessed
 * @returns {Promise<Boolean>} - Whether access is granted
 */
const checkProfileAccess = async (requestingUser, targetUserId) => {
  try {
    // Students can only view their own profile
    if (requestingUser.role === 'student') {
      return requestingUser._id.toString() === targetUserId.toString();
    }

    // Admins can view any profile
    if (requestingUser.role === 'admin') {
      return true;
    }

    // Coaches can view students from their assigned Balagruhas, or their own profile
    if (requestingUser.role === 'coach') {
      // Allow coach to view their own profile
      if (requestingUser._id.toString() === targetUserId.toString()) {
        return true;
      }

      const targetUser = await User.findById(targetUserId);
      if (!targetUser) {
        return false;
      }

      // Check if target user is a student
      if (targetUser.role !== 'student') {
        return false;
      }

      // Check if coach's Balagruhas overlap with student's Balagruhas
      const coachBalagruhas = requestingUser.balagruhaIds.map(id => id.toString());
      const studentBalagruhas = targetUser.balagruhaIds.map(id => id.toString());
      return coachBalagruhas.some(id => studentBalagruhas.includes(id));
    }

    return false;
  } catch (error) {
    errorLogger.error({ error: error.message }, 'Error checking profile access');
    return false;
  }
};

/**
 * Fetch user basic information
 * @param {String} userId - User ID
 * @returns {Promise<Object>} - User data
 */
const fetchUserData = async (userId) => {
  try {
    const user = await User.findById(userId)
      .populate('balagruhaIds', 'name') // Populate Balagruha names
      .select('-password -passwordResetToken -passwordResetExpires -facialData')
      .lean();

    if (!user) {
      return null;
    }

    // Format Balagruha data
    const balagruhas = user.balagruhaIds ? user.balagruhaIds.map(b => b.name || 'Unknown').join(', ') : 'N/A';

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      userId: user.userId,
      role: user.role,
      status: user.status,
      lastLogin: user.lastLogin,
      age: user.age,
      gender: user.gender,
      balagruha: balagruhas,
      parentalStatus: user.parentalStatus,
      guardianName1: user.guardianName1,
      guardianName2: user.guardianName2,
      guardianContact1: user.guardianContact1,
      guardianContact2: user.guardianContact2,
      assignedMachines: user.assignedMachines || [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  } catch (error) {
    errorLogger.error({ userId, error: error.message }, 'Error fetching user data');
    return null;
  }
};

/**
 * Fetch coin wallet data
 * @param {String} userId - User ID
 * @returns {Promise<Object>} - Coin data
 */
const fetchCoinData = async (userId) => {
  try {
    const coinData = await Coin.findOne({ userId }).lean();

    if (!coinData) {
      return {
        balance: 0,
        weeklyStats: { coinsEarned: 0, coinsSpent: 0 },
        monthlyStats: { coinsEarned: 0, coinsSpent: 0 },
        wtfStats: {
          pinsCreated: 0,
          submissionsApproved: 0,
          interactionsMade: 0,
          totalWtfCoinsEarned: 0
        },
        totalEarned: 0,
        totalSpent: 0
      };
    }

    // Calculate total earned and spent
    const totalEarned = coinData.transactions
      .filter(t => ['earned', 'bonus', 'wtf_pin_creation', 'wtf_submission_approval', 'wtf_interaction'].includes(t.type))
      .reduce((sum, t) => sum + t.amount, 0);

    const totalSpent = coinData.transactions
      .filter(t => t.type === 'spent')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return {
      balance: coinData.balance,
      weeklyStats: coinData.weeklyStats || { coinsEarned: 0, coinsSpent: 0 },
      monthlyStats: coinData.monthlyStats || { coinsEarned: 0, coinsSpent: 0 },
      wtfStats: coinData.wtfStats || {
        pinsCreated: 0,
        submissionsApproved: 0,
        interactionsMade: 0,
        totalWtfCoinsEarned: 0
      },
      totalEarned,
      totalSpent
    };
  } catch (error) {
    errorLogger.error({ userId, error: error.message }, 'Error fetching coin data');
    return {
      balance: 0,
      weeklyStats: { coinsEarned: 0, coinsSpent: 0 },
      monthlyStats: { coinsEarned: 0, coinsSpent: 0 },
      wtfStats: {
        pinsCreated: 0,
        submissionsApproved: 0,
        interactionsMade: 0,
        totalWtfCoinsEarned: 0
      },
      totalEarned: 0,
      totalSpent: 0
    };
  }
};

/**
 * Fetch shop order data
 * @param {String} userId - User ID
 * @returns {Promise<Object>} - Shop data
 */
const fetchShopData = async (userId) => {
  try {
    const orders = await Order.find({ userId })
      .sort({ placedAt: -1 })
      .limit(5)
      .lean();

    const totalOrders = await Order.countDocuments({ userId });
    const totalSpent = await Order.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId), status: { $in: ['completed', 'pending'] } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    const pendingDeliveries = await Order.countDocuments({
      userId,
      status: 'pending'
    });

    return {
      totalOrders,
      totalSpent: totalSpent.length > 0 ? totalSpent[0].total : 0,
      pendingDeliveries,
      recentOrders: orders.map(order => ({
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        itemCount: order.items.length,
        status: order.status,
        placedAt: order.placedAt
      }))
    };
  } catch (error) {
    errorLogger.error({ userId, error: error.message }, 'Error fetching shop data');
    return {
      totalOrders: 0,
      totalSpent: 0,
      pendingDeliveries: 0,
      recentOrders: []
    };
  }
};

/**
 * Fetch WTF activity data
 * @param {String} userId - User ID
 * @returns {Promise<Object>} - WTF data
 */
const fetchWTFData = async (userId) => {
  try {
    // Check if WTF models are available
    let wtfData = {
      featuredContent: [],
      pendingSubmissions: 0,
      totalInteractions: 0,
      totalWtfEarnings: 0
    };

    // Try to fetch WTF pin data if model exists
    try {
      const WTFPin = mongoose.model('wtf_pin');
      const pins = await WTFPin.find({ createdBy: userId })
        .sort({ createdAt: -1 })
        .limit(3)
        .lean();

      wtfData.featuredContent = pins.map(pin => ({
        title: pin.title,
        type: pin.contentType,
        createdAt: pin.createdAt
      }));
    } catch (e) {
      // WTF pin model doesn't exist or error fetching
    }

    // Try to fetch WTF submission data if model exists
    try {
      const WTFSubmission = mongoose.model('wtf_submission');
      wtfData.pendingSubmissions = await WTFSubmission.countDocuments({
        userId,
        status: 'pending'
      });
    } catch (e) {
      // WTF submission model doesn't exist or error fetching
    }

    // Try to fetch WTF interaction data if model exists
    try {
      const WTFInteraction = mongoose.model('wtf_student_interaction');
      wtfData.totalInteractions = await WTFInteraction.countDocuments({ userId });
    } catch (e) {
      // WTF interaction model doesn't exist or error fetching
    }

    // Get WTF earnings from coin data
    const coinData = await Coin.findOne({ userId }).lean();
    if (coinData && coinData.wtfStats) {
      wtfData.totalWtfEarnings = coinData.wtfStats.totalWtfCoinsEarned || 0;
    }

    return wtfData;
  } catch (error) {
    errorLogger.error({ userId, error: error.message }, 'Error fetching WTF data');
    return {
      featuredContent: [],
      pendingSubmissions: 0,
      totalInteractions: 0,
      totalWtfEarnings: 0
    };
  }
};

/**
 * Fetch learning progress data
 * @param {String} userId - User ID
 * @returns {Promise<Object>} - Learning data
 */
const fetchLearningData = async (userId) => {
  try {
    // This is a placeholder - implement based on actual learning system
    // For now, return basic data based on assigned machines
    const user = await User.findById(userId).populate('assignedMachines', 'machineName').lean();

    return {
      sessionTimeToday: 0, // Placeholder
      sessionTimeWeek: 0, // Placeholder
      activeModules: user?.assignedMachines?.length || 0,
      assignedMachine: user?.assignedMachines?.[0]?.machineName || 'None'
    };
  } catch (error) {
    errorLogger.error({ userId, error: error.message }, 'Error fetching learning data');
    return {
      sessionTimeToday: 0,
      sessionTimeWeek: 0,
      activeModules: 0,
      assignedMachine: 'None'
    };
  }
};

/**
 * Fetch wellness data (mood tracking)
 * @param {String} userId - User ID
 * @returns {Promise<Object>} - Wellness data
 */
const fetchWellnessData = async (userId) => {
  try {
    const StudentMoodTracker = mongoose.model('StudentMoodTracker');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayMood = await StudentMoodTracker.findOne({
      userId,
      date: { $gte: today }
    }).lean();

    // Get last 7 days mood history
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weekMoodHistory = await StudentMoodTracker.find({
      userId,
      date: { $gte: weekAgo }
    })
      .sort({ date: -1 })
      .limit(7)
      .lean();

    return {
      todayMood: todayMood?.mood || 'Not recorded',
      weekMoodHistory: weekMoodHistory.map(m => ({
        date: m.date,
        mood: m.mood,
        notes: m.notes
      }))
    };
  } catch (error) {
    errorLogger.error({ userId, error: error.message }, 'Error fetching wellness data');
    return {
      todayMood: 'Not recorded',
      weekMoodHistory: []
    };
  }
};

/**
 * Get student profile with aggregated data
 * GET /api/v1/users/:userId/profile
 */
exports.getStudentProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUser = req.user;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        requestingUserId: requestingUser.id,
        targetUserId: userId
      },
      'Request received to fetch student profile'
    );

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Check access permissions
    const hasAccess = await checkProfileAccess(requestingUser, userId);
    if (!hasAccess) {
      errorLogger.error(
        {
          requestingUserId: requestingUser.id,
          requestingUserRole: requestingUser.role,
          targetUserId: userId
        },
        'Unauthorized access to student profile'
      );
      return res.status(HTTP_STATUS_CODE.FORBIDDEN).json({
        success: false,
        message: 'You do not have permission to view this profile'
      });
    }

    // Fetch all profile data in parallel
    const [user, coins, shop, wtf, learning, wellness] = await Promise.all([
      fetchUserData(userId),
      fetchCoinData(userId),
      fetchShopData(userId),
      fetchWTFData(userId),
      fetchLearningData(userId),
      fetchWellnessData(userId)
    ]);

    if (!user) {
      return res.status(HTTP_STATUS_CODE.NOT_FOUND).json({
        success: false,
        message: 'User not found'
      });
    }

    const profileData = {
      user,
      coins,
      shop,
      wtf,
      learning,
      wellness
    };

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        requestingUserId: requestingUser.id,
        targetUserId: userId
      },
      'Successfully fetched student profile'
    );

    res.status(HTTP_STATUS_CODE.OK).json({
      success: true,
      data: profileData
    });
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        requestingUserId: req.user?.id,
        targetUserId: req.params.userId,
        error: error.message,
        stack: error.stack
      },
      'Error occurred while fetching student profile'
    );
    res.status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch student profile',
      error: error.message
    });
  }
};
