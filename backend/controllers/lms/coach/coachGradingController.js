// backend/controllers/lms/coach/coachGradingController.js
const Submission = require("../../../models/Submission");
const User = require("../../../models/user");
const Course = require("../../../models/course");
const StudentProgress = require("../../../models/StudentProgress");
const Notification = require("../../../models/notification");
const Coin = require("../../../models/coin");
const s3Service = require("../../../services/aws/s3");
const mongoose = require("mongoose");
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

const normalizeAnswerPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") return Object.values(payload);
  return [];
};

const getSubmissionAnswers = (submission) => {
  const metadata = submission?.metadata || {};
  const answerPayload =
    metadata.breakdown ||
    metadata.answers ||
    metadata.quizAnswers ||
    metadata.studentAnswers ||
    metadata.responses ||
    metadata.result?.breakdown ||
    metadata.results?.breakdown ||
    [];

  return normalizeAnswerPayload(answerPayload);
};

const collectSubmissionFileReferences = (submission, rawSubmission = {}) => {
  const refs = [];
  const add = (value) => {
    if (typeof value === "string" && value.trim()) {
      refs.push(value.trim());
    }
  };
  const addFromAttachment = (attachment) => {
    if (!attachment || typeof attachment !== "object") return;
    add(attachment.s3Key);
    add(attachment.key);
    add(attachment.fileUrl);
    add(attachment.url);
    add(attachment.filePath);
    add(attachment.path);
  };

  [
    submission.s3Key,
    rawSubmission.s3Key,
    submission.fileUrl,
    rawSubmission.fileUrl,
    rawSubmission.filePath,
    rawSubmission.artworkUrl,
    rawSubmission.submissionUrl,
    rawSubmission.image,
    rawSubmission.metadata?.s3Key,
    rawSubmission.metadata?.fileUrl,
    rawSubmission.metadata?.filePath,
    rawSubmission.metadata?.artworkUrl,
    rawSubmission.metadata?.submissionUrl,
  ].forEach(add);

  const attachments = rawSubmission.attachments || submission.attachments;
  if (Array.isArray(attachments)) {
    attachments.forEach(addFromAttachment);
  } else {
    addFromAttachment(attachments);
  }

  return Array.from(new Set(refs));
};

const getViewableFileUrl = async (submission) => {
  if (!submission.fileUrl) {
    return submission.fileUrl;
  }

  if (submission.fileUrl.startsWith('/uploads/')) {
    return `http://localhost:${process.env.PORT || 5001}${submission.fileUrl}`;
  }

  if (submission.fileUrl.includes('/uploads/')) {
    return submission.fileUrl;
  }

  const downloadableTypes = new Set(["art", "video", "audio"]);
  if (!downloadableTypes.has(submission.submissionType)) {
    return submission.fileUrl;
  }

  const s3Key = submission.s3Key || s3Service.extractS3KeyFromUrl(submission.fileUrl);
  if (!s3Key) {
    return submission.fileUrl;
  }

  const result = await s3Service.generateLMSContentDownloadUrl(s3Key, 60 * 60);
  return result.success ? result.downloadUrl : submission.fileUrl;
};

const formatSubmissionForGrading = async (submission) => ({
  id: submission._id,
  studentId: submission.studentId?._id || null,
  studentName: submission.studentId?.name || "Unknown",
  studentEmail: submission.studentId?.email || "",
  balagruhaIds: submission.studentId?.balagruhaIds || [],
  balagruhaName: submission.studentId?.balagruhaIds?.[0]?.name || "N/A",
  courseId: submission.courseId?._id || null,
  courseTitle: submission.courseId?.title || "Unknown Course",
  courseCategory: submission.courseId?.category || "",
  taskId: submission.taskId,
  taskTitle: submission.taskTitle,
  submissionType: submission.submissionType,
  fileUrl: await getViewableFileUrl(submission),
  originalFileUrl: submission.fileUrl,
  thumbnailUrl: submission.thumbnailUrl,
  metadata: submission.metadata,
  answers: getSubmissionAnswers(submission),
  submittedAt: submission.submittedAt,
  timeSpent: submission.timeSpent,
  status: submission.status,
  grade: submission.grade || null,
  draft: submission.draft || null,
});

const courseHasTask = (course, taskObjectId) => {
  const taskId = taskObjectId.toString();
  return (course?.modules || []).some(module =>
    (module.chapters || []).some(chapter =>
      (chapter.contentItems || []).some(item =>
        item?.type === "task" && item._id?.toString() === taskId
      )
    )
  );
};

const getReferenceId = (doc, path) => {
  const value = doc?.[path];
  if (value?._id) return value._id;
  if (value) return value;

  const populatedValue = typeof doc?.populated === "function" ? doc.populated(path) : null;
  if (Array.isArray(populatedValue)) return populatedValue[0] || null;
  return populatedValue || null;
};

const markArtTaskCompletedForSubmission = async (submission) => {
  if (
    submission.submissionType !== "art" ||
    !submission.studentId?._id ||
    !submission.courseId?._id ||
    !mongoose.Types.ObjectId.isValid(submission.taskId)
  ) {
    return false;
  }

  const taskObjectId = new mongoose.Types.ObjectId(submission.taskId);
  const course = submission.courseId.modules
    ? submission.courseId
    : await Course.findById(submission.courseId._id).lean();

  if (!courseHasTask(course, taskObjectId)) {
    return false;
  }

  const existingProgress = await StudentProgress.findOne({
    student: submission.studentId._id,
    course: submission.courseId._id,
  }).select("completedItems");

  const alreadyCompleted = existingProgress?.completedItems?.some(
    item => item.itemId?.toString() === taskObjectId.toString()
  );
  if (alreadyCompleted) {
    return false;
  }

  await StudentProgress.findOneAndUpdate(
    { student: submission.studentId._id, course: submission.courseId._id },
    {
      $push: {
        completedItems: {
          itemId: taskObjectId,
          itemType: "task",
          completedAt: new Date(),
        },
      },
      $set: { lastAccessedAt: new Date(), status: "in_progress" },
      $setOnInsert: { startedAt: new Date() },
    },
    { upsert: true, new: true }
  );

  return true;
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
      status: status || "all",
      balagruhaId: balagruhaId || "all",
      dateRange: dateRange || "all",
      sortBy: sortBy || "newest_first",
      limit: parseInt(limit) || 20,
      offset: parseInt(offset) || 0,
    };

    // Get submissions using static method
    const submissions = await Submission.findByCoach(coachId, filters);

    // Get stats
    const stats = await Submission.getCoachStats(coachId);

    // Format submissions for response
    const formattedSubmissions = await Promise.all(
      submissions.map(formatSubmissionForGrading)
    );

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
      submission: await formatSubmissionForGrading(submission),
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
 * @route GET /api/v2/lms/coach/grading/submissions/:submissionId/file
 * @desc Stream a submitted file through the authenticated backend API
 * @access Private (Coach/Admin)
 */
exports.streamSubmissionFile = async (req, res) => {
  try {
    const { submissionId } = req.params;

    const submission = await Submission.findById(submissionId)
      .populate("studentId", "balagruhaIds");

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: "Submission not found",
      });
    }

    const rawSubmission = await Submission.collection.findOne({ _id: submission._id });

    if (req.user.role !== "admin") {
      const coach = await User.findById(req.user._id).select("balagruhaIds");
      const coachBalagruhaIds = (coach?.balagruhaIds || []).map(id => id.toString());
      const studentBalagruhaIds = (submission.studentId?.balagruhaIds || []).map(id => id.toString());
      const hasSharedBalagruha = studentBalagruhaIds.some(id => coachBalagruhaIds.includes(id));

      if (!hasSharedBalagruha) {
        return res.status(403).json({
          success: false,
          error: "Cannot access this submission file",
        });
      }
    }

    const fileReferences = collectSubmissionFileReferences(submission, rawSubmission || {});
    let fileObject = null;
    for (const fileReference of fileReferences) {
      const result = await s3Service.getLMSContentObject(fileReference);
      if (result.success && result.stream) {
        fileObject = result;
        break;
      }
    }

    if (!fileObject || !fileObject.success || !fileObject.stream) {
      return res.status(404).json({
        success: false,
        error: "Submission file not found",
      });
    }

    res.setHeader("Content-Type", fileObject.contentType || submission.metadata?.mimeType || "application/octet-stream");
    if (fileObject.contentLength) {
      res.setHeader("Content-Length", fileObject.contentLength);
    }
    res.setHeader("Cache-Control", "private, max-age=300");

    fileObject.stream.on("error", (error) => {
      errorLogger.error({ err: error }, "Error streaming submission file:");
      if (!res.headersSent) {
        res.status(500).end();
      } else {
        res.destroy(error);
      }
    });

    fileObject.stream.pipe(res);
  } catch (error) {
    errorLogger.error({ err: error }, "Error fetching submission file:");
    res.status(500).json({
      success: false,
      error: "Failed to fetch submission file",
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
    const calculatedCoins = hasCoinsOverride
      ? coinsOverride
      : (QUALITY_COIN_MAP[quality] !== undefined ? QUALITY_COIN_MAP[quality] : 0);

    if (calculatedCoins < 0 || calculatedCoins > 100) {
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

    const coach = await User.findById(gradedBy);
    const coachName = coach?.name || coach?.firstName || coach?.email || "Coach";
    const coinsAwarded = submission.isFirstAttempt === false ? 0 : calculatedCoins;
    const studentId = getReferenceId(submission, "studentId");
    const courseId = getReferenceId(submission, "courseId");

    if (!studentId) {
      return res.status(400).json({
        success: false,
        error: "Submission student not found",
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

    // Award coins before marking the submission as graded. If coin assignment fails,
    // the coach can retry instead of getting stuck with a half-graded submission.
    let coinBalance = 0;
    if (coinsAwarded > 0) {
      const coinRecord = await Coin.findOrCreateForUser(studentId);
      await coinRecord.addCoins(
        coinsAwarded,
        "earned",
        `Graded submission for "${submission.taskTitle}"`,
        "grading",
        {
          submissionId: submission._id,
          courseId,
          taskId: submission.taskId,
          quality,
        }
      );
      coinBalance = coinRecord.balance;
    } else {
      const existingBalance = await Coin.getUserBalance(studentId);
      coinBalance = existingBalance;
    }

    await submission.markAsGraded(gradeData);

    try {
      await markArtTaskCompletedForSubmission(submission);
    } catch (progressErr) {
      errorLogger.error({ err: progressErr }, "Failed to mark graded art task completed (non-fatal)");
    }

    // Send notification to student
    const notificationMessage = `Coach ${coachName} graded your "${submission.taskTitle}" submission! ${coinsAwarded > 0 ? `+${coinsAwarded} coins` : ""
      }`;

    try {
      await Notification.createPersonal(
        studentId,
        'Submission Graded',
        notificationMessage,
        'COACH_MESSAGE',
        {
          submissionId: submission._id,
          courseId,
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
      studentId,
      studentCoinBalance: coinBalance,
      message: `Grade submitted successfully! ${submission.studentId?.name || "Student"} has been notified and earned ${coinsAwarded} ISF Coins.`,
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

    // H2 fix: verify gradedBy matches authenticated user
    const authenticatedUserId = req.user?._id?.toString() || req.user?.id?.toString();
    if (req.user?.role !== 'admin' && gradedBy !== authenticatedUserId) {
      return res.status(403).json({ success: false, error: "Cannot grade on behalf of another coach" });
    }

    let gradedCount = 0;
    const failedSubmissions = [];

    // Get coach info
    const coach = await User.findById(gradedBy);
    const coachName = coach?.name || coach?.firstName || coach?.email || "Coach";

    // Grade each submission
    for (const submissionId of submissionIds) {
      try {
        const submission = await Submission.findById(submissionId).populate("studentId courseId");

        if (!submission || submission.status === "graded") {
          failedSubmissions.push(submissionId);
          continue;
        }

        // Grade data
        const submissionCoinsAwarded =
          submission.isFirstAttempt === false ? 0 : coinsAwarded;
        const studentId = getReferenceId(submission, "studentId");
        const courseId = getReferenceId(submission, "courseId");

        if (!studentId) {
          failedSubmissions.push(submissionId);
          continue;
        }

        const gradeData = {
          quality,
          coinsAwarded: submissionCoinsAwarded,
          feedback: feedback || null,
          evaluationCriteria: {},
          gradedBy,
        };

        // Award coins before marking graded so failures remain retryable.
        if (submissionCoinsAwarded > 0) {
          const coinRecord = await Coin.findOrCreateForUser(studentId);
          await coinRecord.addCoins(
            submissionCoinsAwarded,
            "earned",
            `Graded submission for "${submission.taskTitle}"`,
            "grading",
            {
              submissionId: submission._id,
              courseId,
              taskId: submission.taskId,
              quality,
            }
          );
        }

        await submission.markAsGraded(gradeData);

        try {
          await markArtTaskCompletedForSubmission(submission);
        } catch (progressErr) {
          errorLogger.error({ err: progressErr }, "Failed to mark bulk-graded art task completed (non-fatal)");
        }

        // Send notification
        const notificationMessage = `Coach ${coachName} graded your "${submission.taskTitle}" submission! ${submissionCoinsAwarded > 0 ? `+${submissionCoinsAwarded} coins` : ""
          }`;

        try {
          await Notification.createPersonal(
            studentId,
            'Submission Graded',
            notificationMessage,
            'COACH_MESSAGE',
            { submissionId: submission._id, courseId, coinsAwarded: submissionCoinsAwarded, quality }
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
