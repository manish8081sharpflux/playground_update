const User = require('../../../models/user');
const Coin = require('../../../models/coin');
const Notification = require('../../../models/notification');
const EmotionTracking = require('../../../models/EmotionTracking');
const Course = require('../../../models/course');
const StudentProgress = require('../../../models/StudentProgress');
const CourseAssignment = require('../../../models/CourseAssignment');
const mongoose = require('mongoose');
const { errorLogger } = require('../../../config/pino-config');

/**
 * Student Dashboard Controller - Epic 01 Story 01
 * Handles all student dashboard-related operations:
 * - Dashboard data (courses, progress, last activity, stats)
 * - Coin balance
 * - Notification count
 * - Homework count
 * - Emotion tracking
 */

// ==================== DASHBOARD ====================

/**
 * @desc Get student dashboard data
 * @route GET /api/v2/lms/student/:studentId/dashboard
 * @access Private
 */
exports.getDashboard = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Verify student exists
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get all published courses
    const allCourses = await Course.find({ status: 'published' }).lean();

    // Get student progress for these courses
    const progressRecords = await StudentProgress.find({
      student: studentId,
      course: { $in: allCourses.map(c => c._id) }
    }).lean();

    // build course map for easy lookup
    const progressMap = new Map(progressRecords.map(p => [p.course.toString(), p]));

    // aggregated courses data
    const courses = allCourses.map(course => {
      const progress = progressMap.get(course._id.toString());

      // Calculate total tasks (content items)
      let totalTasks = 0;
      course.modules?.forEach(m => {
        m.chapters?.forEach(c => {
          totalTasks += c.contentItems?.length || 0;
        });
      });

      const completedTasks = progress?.completedItems?.length || 0;

      return {
        courseId: course._id,
        courseTitle: course.title,
        courseType: course.category, // Mapped to 'courseType' in UI
        thumbnail: course.thumbnail,
        totalTasks,
        completedTasks,
        status: progress?.status || 'not_started',
        progressPercentage: progress ? Math.round((completedTasks / (totalTasks || 1)) * 100) : 0
      };
    });

    // Determine last activity
    let lastActivity = null;
    const sortedProgress = progressRecords.sort((a, b) => new Date(b.lastAccessedAt) - new Date(a.lastAccessedAt));

    if (sortedProgress.length > 0) {
      const lastProg = sortedProgress[0];
      const lastCourse = allCourses.find(c => c._id.toString() === lastProg.course.toString());
      if (lastCourse) {
        // Resolve taskId from the most recently completed item in StudentProgress
        let taskId = null;
        if (lastProg.completedItems && lastProg.completedItems.length > 0) {
          // Sort by completedAt descending to get the most recent item
          const sortedItems = [...lastProg.completedItems].sort(
            (a, b) => new Date(b.completedAt) - new Date(a.completedAt)
          );
          taskId = sortedItems[0].itemId ? sortedItems[0].itemId.toString() : null;
        }

        lastActivity = {
          courseId: lastCourse._id,
          courseTitle: lastCourse.title,
          courseType: lastCourse.category,
          progress: lastProg.completionPercentage || 0,
          taskId
        };
      }
    }

    // Stats calculations
    const stats = {
      totalTasksCompleted: progressRecords.reduce((acc, p) => acc + (p.completedItems?.length || 0), 0),
      currentStreak: student.streak || 0, // Assuming streak is on User model
      coinsEarnedToday: 0 // Placeholder, requires Transaction log query if strictly 'today'
    };

    res.json({
      success: true,
      data: {
        studentName: student.name || ((student.firstName || '') + ' ' + (student.lastName || '')).trim() || 'Student',
        courses,
        lastActivity,
        stats
      }
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Get Dashboard Error:');
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard data',
      error: error.message
    });
  }
};

// ==================== COIN BALANCE ====================

/**
 * @desc Get student's current coin balance
 * @route GET /api/v2/lms/student/:studentId/coins
 * @access Private
 */
exports.getCoinBalance = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Verify student exists
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get total coin balance
    const coinRecord = await Coin.findOne({ userId: studentId });
    const balance = coinRecord ? coinRecord.balance : 0;

    res.json({
      success: true,
      balance
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Get Coin Balance Error:');
    res.status(500).json({
      success: false,
      message: 'Server error while fetching coin balance',
      error: error.message
    });
  }
};

// ==================== NOTIFICATION COUNT ====================

/**
 * @desc Get unread notification count for student
 * @route GET /api/v2/lms/student/:studentId/notifications/count
 * @access Private
 */
exports.getNotificationCount = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Verify student exists
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Count unread notifications
    const unreadCount = await Notification.countDocuments({
      recipientId: studentId,
      isRead: false
    });

    res.json({
      success: true,
      unreadCount
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Get Notification Count Error:');
    res.status(500).json({
      success: false,
      message: 'Server error while fetching notification count',
      error: error.message
    });
  }
};

// ==================== HOMEWORK COUNT ====================

/**
 * @desc Get count of pending homework tasks
 * @route GET /api/v2/lms/student/:studentId/homework/pending
 * @access Private
 */
exports.getPendingHomeworkCount = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Verify student exists
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Query actual pending assignments for this student
    // 1. Find active course assignments targeting this student (directly or via balagruha)
    const assignments = await CourseAssignment.find({
      status: 'active',
      $or: [
        { 'assignedTo.studentIds': studentId },
        { 'assignedTo.balagruhaIds': { $in: student.balagruhaIds || [] } },
        { 'assignedTo.balagruhaId': { $in: student.balagruhaIds || [] } }
      ]
    }).select('courseId').lean();

    const assignedCourseIds = assignments.map(a => a.courseId);

    // 2. Find progress records for those courses
    const progressRecords = await StudentProgress.find({
      student: studentId,
      course: { $in: assignedCourseIds }
    }).select('course status').lean();

    const completedCourseIds = new Set(
      progressRecords
        .filter(p => p.status === 'completed')
        .map(p => p.course.toString())
    );

    // 3. Count assigned courses not yet completed
    const count = assignedCourseIds.filter(
      cId => !completedCourseIds.has(cId.toString())
    ).length;

    res.json({
      success: true,
      count
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Get Homework Count Error:');
    res.status(500).json({
      success: false,
      message: 'Server error while fetching homework count',
      error: error.message
    });
  }
};

// ==================== EMOTION TRACKING ====================

/**
 * @desc Save single emotion tracking entry
 * @route POST /api/v2/lms/student/:studentId/emotion
 * @access Private
 */
exports.saveEmotion = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { emotion, timestamp, context } = req.body;

    // Validate emotion — canonical 5-mood schema (legacy 'angry' kept for back-compat).
    const VALID_EMOTIONS = ['happy', 'excited', 'neutral', 'sad', 'very_sad', 'angry'];
    if (!emotion || !VALID_EMOTIONS.includes(emotion)) {
      return res.status(400).json({
        success: false,
        message: `Invalid emotion. Must be one of: ${VALID_EMOTIONS.join(', ')}`
      });
    }

    // Verify student exists
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Create emotion tracking entry
    const emotionEntry = new EmotionTracking({
      studentId,
      emotion,
      timestamp: timestamp || new Date(),
      synced: true,
      context: context || {}
    });

    await emotionEntry.save();

    res.json({
      success: true,
      message: 'Emotion saved successfully',
      data: {
        emotionId: emotionEntry._id,
        emotion,
        timestamp: emotionEntry.timestamp
      }
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Save Emotion Error:');
    res.status(500).json({
      success: false,
      message: 'Server error while saving emotion',
      error: error.message
    });
  }
};

/**
 * @desc Batch save emotion tracking entries (for offline sync)
 * @route POST /api/v2/lms/student/:studentId/emotions/batch
 * @access Private
 */
exports.batchSaveEmotions = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { emotions } = req.body;

    // Validate emotions array
    if (!Array.isArray(emotions) || emotions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Emotions must be a non-empty array'
      });
    }

    // Verify student exists
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Validate each emotion entry — canonical 5-mood schema.
    const validEmotions = ['happy', 'excited', 'neutral', 'sad', 'very_sad', 'angry'];
    const emotionEntries = emotions
      .filter(e => e.emotion && validEmotions.includes(e.emotion))
      .map(e => ({
        studentId,
        emotion: e.emotion,
        timestamp: e.timestamp || new Date(),
        synced: false, // Mark as synced from offline
        context: e.context || {}
      }));

    if (emotionEntries.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid emotions to save'
      });
    }

    // Bulk insert
    const result = await EmotionTracking.insertMany(emotionEntries);

    res.json({
      success: true,
      message: `${result.length} emotions synced successfully`,
      data: {
        syncedCount: result.length,
        skippedCount: emotions.length - result.length
      }
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Batch Save Emotions Error:');
    res.status(500).json({
      success: false,
      message: 'Server error while batch saving emotions',
      error: error.message
    });
  }
};
