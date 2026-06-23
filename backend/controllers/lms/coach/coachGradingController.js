// backend/controllers/lms/coach/coachGradingController.js
const Submission = require("../../../models/Submission");
const User = require("../../../models/user");
const Course = require("../../../models/course");
const Notification = require("../../../models/notification");
const Coin = require("../../../models/coin");
const { errorLogger } = require('../../../config/pino-config');

/**
 * Quality-to-coin mapping for auto-calculating coin awards from rubric score.
 * Coaches can override by explicitly providing coinsAwarded in the request body.
 */
// Must match frontend GradingPanel.jsx auto-coin values (85, 65, 25).
// These are only used when the coach doesn't explicitly set coinsAwarded.
const QUALITY_COIN_MAP = {
  excellent: 85,
  good: 65,
  needs_improvement: 25,
};

/**
 * @route GET /api/v2/lms/coach/:coachId/submissions
 * @desc Get all submissions for grading with filters
 * @access Private (Coach only)
 */
exports.getSubmissions = async (req, res) => {
  try {
    const { coachId } = req.params;

    // H1 fix: verify coachId matches authenticated user (admin bypass for support)
    if (req.user.role !== 'admin' && coachId !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: "Cannot access another coach's submissions" });
    }

    const { courseType, status, balagruhaId, dateRange, sortBy, limit, offset } = req.query;

    // Build filters object
    const filters = {
      courseType: courseType || "all",
      status: status || "pending",
      balagruhaId: balagruhaId || "all",
      dateRange: dateRange || "all",
      sortBy: sortBy || "oldest_first",
      limit: parseInt(limit) || 20,
      offset: parseInt(offset) || 0,
    };

    // Get submissions using static method
    const submissions = await Submission.findByCoach(coachId, filters);

    // Get stats
    const stats = await Submission.getCoachStats(coachId);

    // Format submissions for response
    const formattedSubmissions = submissions.map((submission) => ({
      id: submission._id,
      studentId: submission.studentId._id,
      studentName: submission.studentId.name || "Unknown",
      studentEmail: submission.studentId.email || "",
      balagruhaIds: submission.studentId.balagruhaIds || [],
      balagruhaName: submission.studentId.balagruhaIds?.[0]?.name || "N/A",
      courseId: submission.courseId._id,
      courseTitle: submission.courseId.title,
      courseCategory: submission.courseId.category,
      taskId: submission.taskId,
      taskTitle: submission.taskTitle,
      submissionType: submission.submissionType,
      fileUrl: submission.fileUrl,
      thumbnailUrl: submission.thumbnailUrl,
      metadata: submission.metadata,
      submittedAt: submission.submittedAt,
      timeSpent: submission.timeSpent,
      status: submission.status,
      grade: submission.grade || null,
      draft: submission.draft || null,
    }));

    res.status(200).json({
      success: true,
      submissions: formattedSubmissions,
      totalSubmissions: formattedSubmissions.length,
      stats,
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error fetching submissions:");
    res.status(500).json({
      success: false,
      error: "Failed to fetch submissions",
    });
  }
};

/**
 * @route GET /api/v2/lms/coach/submissions/:submissionId
 * @desc Get single submission details
 * @access Private (Coach only)
 */
exports.getSubmissionById = async (req, res) => {
  try {
    const { submissionId } = req.params;

    const submission = await Submission.findById(submissionId)
      .populate("studentId", "name email balagruhaIds")
      .populate("courseId", "title category")
      .populate("grade.gradedBy", "name email");

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: "Submission not found",
      });
    }

    res.status(200).json({
      success: true,
      submission,
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error fetching submission:");
    res.status(500).json({
      success: false,
      error: "Failed to fetch submission",
    });
  }
};

/**
 * @route POST /api/v2/lms/coach/submissions/:submissionId/grade
 * @desc Submit grade for a submission
 * @access Private (Coach only)
 */
exports.submitGrade = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { quality, coinsAwarded: coinsOverride, feedback, evaluationCriteria, gradedBy } = req.body;

    // Validation
    if (!quality) {
      return res.status(400).json({
        success: false,
        error: "Quality rating is required",
      });
    }

    // Auto-calculate coins from quality rating; allow coach override
    const hasCoinsOverride = coinsOverride !== undefined && coinsOverride !== null;
    const coinsAwarded = hasCoinsOverride
      ? coinsOverride
      : (QUALITY_COIN_MAP[quality] !== undefined ? QUALITY_COIN_MAP[quality] : 0);

    if (coinsAwarded < 0 || coinsAwarded > 100) {
      return res.status(400).json({
        success: false,
        error: "Coin amount must be between 0 and 100",
      });
    }

    if (feedback && feedback.length > 500) {
      return res.status(400).json({
        success: false,
        error: "Feedback must not exceed 500 characters",
      });
    }

    // Find submission
    const submission = await Submission.findById(submissionId).populate("studentId courseId");

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: "Submission not found",
      });
    }

    if (submission.status === "graded") {
      return res.status(400).json({
        success: false,
        error: "Submission already graded",
      });
    }

    // Grade data
    const gradeData = {
      quality,
      coinsAwarded,
      feedback: feedback || null,
      evaluationCriteria: evaluationCriteria || {},
      gradedBy,
    };

    // Mark as graded
    await submission.markAsGraded(gradeData);

    // Award coins to student using Coin model's findOrCreateForUser + addCoins pattern
    let coinBalance = 0;
    if (coinsAwarded > 0) {
      const coinRecord = await Coin.findOrCreateForUser(submission.studentId._id);
      await coinRecord.addCoins(
        coinsAwarded,
        "earned",
        `Graded submission for "${submission.taskTitle}"`,
        "grading",
        {
          submissionId: submission._id,
          courseId: submission.courseId._id,
          quality,
        }
      );
      coinBalance = coinRecord.balance;
    } else {
      const existingBalance = await Coin.getUserBalance(submission.studentId._id);
      coinBalance = existingBalance;
    }

    // Send notification to student
    const coach = await User.findById(gradedBy);
    const notificationMessage = `Coach ${coach.name} graded your "${submission.taskTitle}" submission! ${
      coinsAwarded > 0 ? `+${coinsAwarded} coins` : ""
    }`;

    try {
      await Notification.createPersonal(
        submission.studentId._id,
        'Submission Graded',
        notificationMessage,
        'COACH_MESSAGE',
        {
          submissionId: submission._id,
          courseId: submission.courseId._id,
          coinsAwarded,
          quality,
          feedback: feedback || null,
        }
      );
    } catch (notifErr) {
      // Don't fail the whole grade submission if notification fails
      errorLogger.error({ err: notifErr }, "Failed to send grading notification (non-fatal)");
    }

    res.status(200).json({
      success: true,
      submissionId: submission._id,
      studentId: submission.studentId._id,
      studentCoinBalance: coinBalance,
      message: `Grade submitted successfully! ${submission.studentId.name} has been notified and earned ${coinsAwarded} ISF Coins.`,
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error submitting grade:");
    res.status(500).json({
      success: false,
      error: "Failed to submit grade",
    });
  }
};

/**
 * @route POST /api/v2/lms/coach/submissions/bulk-grade
 * @desc Bulk grade multiple submissions
 * @access Private (Coach only)
 */
exports.bulkGrade = async (req, res) => {
  try {
    const { submissionIds, quality, coinsAwarded: coinsOverride, feedback, gradedBy } = req.body;

    // H2 fix: verify gradedBy matches authenticated user
    if (req.user.role !== 'admin' && gradedBy !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: "Cannot grade on behalf of another coach" });
    }

    // Validation
    if (!submissionIds || !Array.isArray(submissionIds) || submissionIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one submission ID is required",
      });
    }

    if (!quality) {
      return res.status(400).json({
        success: false,
        error: "Quality rating is required",
      });
    }

    // Auto-calculate coins from quality rating; allow coach override
    const hasCoinsOverride = coinsOverride !== undefined && coinsOverride !== null;
    const coinsAwarded = hasCoinsOverride
      ? coinsOverride
      : (QUALITY_COIN_MAP[quality] !== undefined ? QUALITY_COIN_MAP[quality] : 0);

    if (coinsAwarded < 0 || coinsAwarded > 100) {
      return res.status(400).json({
        success: false,
        error: "Coin amount must be between 0 and 100",
      });
    }

    let gradedCount = 0;
    const failedSubmissions = [];

    // Get coach info
    const coach = await User.findById(gradedBy);

    // Grade each submission
    for (const submissionId of submissionIds) {
      try {
        const submission = await Submission.findById(submissionId).populate("studentId courseId");

        if (!submission || submission.status === "graded") {
          failedSubmissions.push(submissionId);
          continue;
        }

        // Grade data
        const gradeData = {
          quality,
          coinsAwarded,
          feedback: feedback || null,
          evaluationCriteria: {},
          gradedBy,
        };

        // Mark as graded
        await submission.markAsGraded(gradeData);

        // Award coins to student using Coin model's findOrCreateForUser + addCoins pattern
        if (coinsAwarded > 0) {
          const coinRecord = await Coin.findOrCreateForUser(submission.studentId._id);
          await coinRecord.addCoins(
            coinsAwarded,
            "earned",
            `Graded submission for "${submission.taskTitle}"`,
            "grading",
            {
              submissionId: submission._id,
              courseId: submission.courseId._id,
              quality,
            }
          );
        }

        // Send notification
        const notificationMessage = `Coach ${coach.name} graded your "${submission.taskTitle}" submission! ${
          coinsAwarded > 0 ? `+${coinsAwarded} coins` : ""
        }`;

        try {
          await Notification.createPersonal(
            submission.studentId._id,
            'Submission Graded',
            notificationMessage,
            'COACH_MESSAGE',
            { submissionId: submission._id, courseId: submission.courseId._id, coinsAwarded, quality }
          );
        } catch (notifErr) {
          errorLogger.error({ err: notifErr }, "Failed to send bulk grading notification (non-fatal)");
        }

        gradedCount++;
      } catch (error) {
        errorLogger.error({ err: error }, `Error grading submission ${submissionId}:`);
        failedSubmissions.push(submissionId);
      }
    }

    res.status(200).json({
      success: true,
      gradedCount,
      failedSubmissions,
      message: `${gradedCount} submissions graded successfully! Students notified.`,
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error bulk grading submissions:");
    res.status(500).json({
      success: false,
      error: "Failed to bulk grade submissions",
    });
  }
};

/**
 * @route PUT /api/v2/lms/coach/submissions/:submissionId/draft
 * @desc Save grading draft (auto-save)
 * @access Private (Coach only)
 */
exports.saveDraft = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { quality, coinsAwarded, feedback } = req.body;

    const submission = await Submission.findById(submissionId);

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: "Submission not found",
      });
    }

    // Save draft
    const draftData = {
      quality: quality || null,
      coinsAwarded: coinsAwarded || null,
      feedback: feedback || null,
    };

    await submission.saveDraft(draftData);

    res.status(200).json({
      success: true,
      message: "Draft saved",
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error saving draft:");
    res.status(500).json({
      success: false,
      error: "Failed to save draft",
    });
  }
};

/**
 * @route PUT /api/v2/lms/coach/submissions/:submissionId/flag
 * @desc Flag submission for admin review
 * @access Private (Coach only)
 */
exports.flagSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { reason, flaggedBy } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: "Reason is required to flag submission",
      });
    }

    const submission = await Submission.findById(submissionId);

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: "Submission not found",
      });
    }

    // Flag submission
    await submission.flagSubmission(reason, flaggedBy);

    // Send notification to admin
    const admins = await User.find({ role: "admin" });
    const coach = await User.findById(flaggedBy);
    const coachName = coach?.name || 'Unknown Coach';

    for (const admin of admins) {
      try {
        await Notification.createPersonal(
          admin._id,
          'Submission Flagged',
          `Coach ${coachName} flagged a submission for review: ${reason}`,
          'COACH_MESSAGE',
          { submissionId: submission._id, reason, flaggedBy }
        );
      } catch (notifErr) {
        errorLogger.error({ err: notifErr }, "Failed to send flag notification (non-fatal)");
      }
    }

    res.status(200).json({
      success: true,
      submissionId: submission._id,
      status: "flagged",
      message: "Submission flagged for admin review",
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error flagging submission:");
    res.status(500).json({
      success: false,
      error: "Failed to flag submission",
    });
  }
};

/**
 * @route PUT /api/v2/lms/coach/submissions/:submissionId/skip
 * @desc Skip submission for later review
 * @access Private (Coach only)
 */
exports.skipSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;

    const submission = await Submission.findById(submissionId);

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: "Submission not found",
      });
    }

    // Mark as skipped
    await submission.markAsSkipped();

    res.status(200).json({
      success: true,
      submissionId: submission._id,
      message: "Submission marked for later review",
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error skipping submission:");
    res.status(500).json({
      success: false,
      error: "Failed to skip submission",
    });
  }
};

// Export mapping for testing
exports.QUALITY_COIN_MAP = QUALITY_COIN_MAP;
