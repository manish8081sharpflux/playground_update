const Course = require('../../../models/course');
const StudentProgress = require('../../../models/StudentProgress');
const mongoose = require('mongoose');
const { errorLogger } = require('../../../config/pino-config');

// ==================== GET APPS LIST ====================

/**
 * @desc Get all Computer Apps applications (Modules/Courses) with progress
 * @route GET /api/v2/lms/student/:studentId/courses/computer-apps
 * @access Private
 */
exports.getComputerApps = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Strategy: Find all courses with category "Computer Apps"
    const appCourses = await Course.find({ category: 'Computer Apps', status: 'published' }).sort({ title: 1 }).lean();

    // Fetch Progress
    const progressRecords = await StudentProgress.find({
      student: studentId,
      course: { $in: appCourses.map(c => c._id) }
    }).lean();

    const progressMap = new Map(progressRecords.map(p => [p.course.toString(), p]));

    // Map to response format
    const apps = appCourses.map(course => {
      const progress = progressMap.get(course._id.toString());

      // Calculate tasks count recursively
      let totalTasks = 0;
      course.modules?.forEach(m => {
        m.chapters?.forEach(c => {
          totalTasks += c.contentItems?.length || 0;
        });
      });

      const completedTasks = progress?.completedItems?.length || 0;
      const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Determine status from progress or default
      let status = 'not_started';
      if (progressPercent === 100) status = 'completed';
      else if (progressPercent > 0) status = 'in_progress';

      return {
        id: course._id, // This is the "App ID"
        name: course.title,
        icon: course.icon || 'Ã°Å¸â€™Â»',
        totalTasks,
        completedTasks,
        status,
        progressPercentage: progressPercent
      };
    });

    res.json({
      success: true,
      apps
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Get Computer Apps Error');
    res.status(500).json({
      success: false,
      message: 'Server error while fetching Computer Apps',
      error: error.message
    });
  }
};

// ==================== GET COURSE HIERARCHY ====================

/**
 * @desc Get full course hierarchy (Modules -> Chapters -> Items) with progress
 * @route GET /api/v2/lms/student/:studentId/courses/computer-apps/:courseId/hierarchy
 * @access Private
 */
exports.getCourseHierarchy = async (req, res) => {
  try {
    const { studentId, courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: 'Invalid Course ID' });
    }

    const course = await Course.findOne({ _id: courseId, status: 'published' })
      .populate('modules.chapters.contentItems.quizRef') // contentItems are embedded; populate only the quizRef refs
      .lean();

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const progress = await StudentProgress.findOne({ student: studentId, course: courseId }).lean();
    const completedItems = new Set(progress?.completedItems?.map(i => i.itemId.toString()) || []);

    // Map Hierarchy
    const modules = course.modules.map(module => ({
      id: module._id,
      title: module.title,
      chapters: module.chapters.map(chapter => ({
        id: chapter._id,
        title: chapter.title,
        contentItems: chapter.contentItems.map(item => {
          // Check if Item ID OR Quiz Ref is in completed items
          const isCompleted = completedItems.has(item._id.toString()) ||
            (item.quizRef && completedItems.has(item.quizRef.toString())) ||
            (item.metadata?.quizId && completedItems.has(item.metadata.quizId.toString()));

          return {
            id: item._id,
            title: item.title,
            type: item.type || 'text',
            fileUrl: item.fileUrl,
            description: item.description,
            isCompleted: isCompleted,
            difficulty: item.metadata?.difficulty || 'beginner',
            quizId: item.quizRef?._id?.toString() || item.quizRef?.toString() || null // Add Quiz Reference (extract ID string only)
          };
        })
      }))
    }));

    res.json({
      success: true,
      courseId,
      courseTitle: course.title,
      modules
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Get Course Hierarchy Error');
    res.status(500).json({
      success: false,
      message: 'Server error while fetching course hierarchy',
      error: error.message
    });
  }
};

// ==================== GET CONTENT DETAILS ====================

/**
 * @desc Get specific content item details
 * @route GET /api/v2/lms/student/:studentId/courses/computer-apps/:courseId/content/:contentId
 * @access Private
 */
exports.getContentDetails = async (req, res) => {
  try {
    const { studentId, courseId, contentId } = req.params;

    // Use mongoose.model to avoid require path guessing if not sure.
    const ContentLibrary = mongoose.model('ContentLibrary');
    const content = await ContentLibrary.findById(contentId).lean();

    if (!content) {
      return res.status(404).json({ success: false, message: 'Content not found' });
    }

    // Check completion status
    const progress = await StudentProgress.findOne({ student: studentId, course: courseId }).lean();
    const completedSet = new Set(progress?.completedItems?.map(i => i.itemId.toString()) || []);

    const isCompleted = completedSet.has(contentId) ||
      (content.quizRef && completedSet.has(content.quizRef.toString())) ||
      (content.metadata?.quizId && completedSet.has(content.metadata.quizId.toString()));

    let details = { ...content, isCompleted };

    // Populate Quiz metadata if needed
    if (content.type === 'quiz' && content.quizRef) {
      // Use require for Model to be safe
      const Quiz = require('../../../models/Quiz');
      const quiz = await Quiz.findById(content.quizRef).select('-questions.correctOption').lean();
      if (quiz) {
        details.quizData = quiz;
      }
    }

    res.json({
      success: true,
      content: details
    });

  } catch (error) {
    errorLogger.error({ err: error }, 'Get Content Details Error');
    res.status(500).json({
      success: false,
      message: 'Server error while fetching content details',
      error: error.message
    });
  }
};

exports.getQuiz = async (req, res) => {
  try {
    const { studentId, quizId } = req.params;
    const Quiz = mongoose.model('Quiz');

    // Fetch quiz without correct answers
    const quiz = await Quiz.findById(quizId).select('-questions.correctOption').lean();

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    res.json({
      success: true,
      quiz
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Get Quiz Error');
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.submitQuiz = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { quizId, answers, courseId: bodyCourseId } = req.body;

    const Quiz = require('../../../models/Quiz');
    const Course = require('../../../models/course');
    const StudentProgress = require('../../../models/StudentProgress');
    const Submission = require('../../../models/Submission');
    const Coin = require('../../../models/coin');
    const User = require('../../../models/user');

    const quiz = await Quiz.findById(quizId).lean();
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    // Course ID Resolution
    let courseId = bodyCourseId || quiz.course;
    if (!courseId) {
      const fallback = await Course.findOne({
        $or: [{ slug: 'computer-applications' }, { _id: '696d309b3da5d316feca6b11' }]
      }).select('_id');
      if (fallback) courseId = fallback._id;
    }

    if (!answers || !Array.isArray(answers)) {
      throw new Error('Invalid answers format');
    }

    // Grading Logic
    let correctAnswers = 0;
    let baseCoins = 0;
    const breakdown = quiz.questions.map((q, idx) => {
      try {
        const qId = q._id.toString();
        const ans = answers.find(a => a.questionId === qId);

        let isCorrect = false;
        let studentAnsText = 'No Answer';
        let correctAnsText = 'Unknown';
        const points = q.points || 5;

        // True/False
        if (q.type === 'true_false') {
          const userValStr = ans?.selectedOptionId;
          const dbValBool = q.correctAnswer;

          let userBool = null;
          if (typeof userValStr === 'string') {
            if (userValStr.toLowerCase() === 'true') userBool = true;
            if (userValStr.toLowerCase() === 'false') userBool = false;
          }

          isCorrect = userBool !== null && userBool === dbValBool;
          studentAnsText = userValStr || 'No Answer';
          correctAnsText = dbValBool ? 'True' : 'False';

        } else if (q.type === 'fill_blank') {

          const normalize = (value) => {
            let text = (value || '').toString();

            if (q.ignoreExtraSpaces !== false) {
              text = text.trim().replace(/\s+/g, ' ');
            } else {
              text = text.trim();
            }

            if (q.caseInsensitive !== false) {
              text = text.toLowerCase();
            }

            return text;
          };

          const studentText = ans?.answerText || '';

          const acceptedAnswers = q.acceptedAnswers || [];

          isCorrect = acceptedAnswers
            .map(normalize)
            .includes(normalize(studentText));

          studentAnsText = studentText || 'No Answer';

          correctAnsText =
            acceptedAnswers.length > 0
              ? acceptedAnswers.join(', ')
              : 'Unknown';

        } else {

          const selectedOpt = q.options?.find(
            o => o._id.toString() === ans?.selectedOptionId
          );

          const correctOpt = q.options?.find(o => o.isCorrect);

          isCorrect = !!selectedOpt?.isCorrect;

          studentAnsText = selectedOpt
            ? selectedOpt.text
            : 'No Answer';

          correctAnsText = correctOpt
            ? correctOpt.text
            : 'Unknown';
        }

        if (isCorrect) {
          correctAnswers++;
          baseCoins += points;
        }

        return {
          questionId: q._id,
          question: q.questionText,
          isCorrect,
          studentAnswer: studentAnsText,
          correctAnswer: correctAnsText,
          explanation: q.explanation
        };
      } catch (err) {
        throw err;
      }
    });

    const totalQuestions = quiz.questions.length;
    const score = Math.round((correctAnswers / totalQuestions) * 100);
    const passed = score >= (quiz.minScore || 60);

    // Save Submission, award coins, and update progress atomically.
    // The "already rewarded" check is performed INSIDE the transaction
    // against the Coin document's own transactions[] array Ã¢â‚¬â€ this is the
    // authoritative anti-duplicate check and is race-safe because concurrent
    // submissions serialize on the Coin document write.
    const session = await mongoose.startSession();
    let coinsAwarded = 0;
    let alreadyPassed = false;

    try {
      await session.withTransaction(async () => {
        // Fresh read inside the txn Ã¢â‚¬â€ load the coin record and scan for a
        // prior quiz_pass reward for THIS quiz.
        const coinRecord = await Coin.findOrCreateForUser(studentId, { session });
        const quizIdStr = quiz._id.toString();
        alreadyPassed = coinRecord.transactions.some(t =>
          t.source === 'quiz_pass' &&
          t.metadata &&
          t.metadata.quizId &&
          t.metadata.quizId.toString() === quizIdStr
        );

        // Save Submission
        const submission = new Submission({
          studentId,
          courseId: courseId || quizId,
          taskId: quizId,
          taskTitle: quiz.title,
          submissionType: 'quiz',
          fileUrl: 'quiz-submission',
          status: 'graded',
          grade: { score, points: (passed && !alreadyPassed) ? baseCoins : 0 },
          metadata: { breakdown, answers: breakdown },
          submittedAt: new Date()
        });
        if (courseId) await submission.save({ session });

        // Award coins
        if (passed && !alreadyPassed && baseCoins > 0) {
          const meta = { quizId: quiz._id, courseId: courseId };
          await coinRecord.addCoins(baseCoins, 'earned', `Quiz Completed: ${quiz.title}`, 'quiz_pass', meta, { session });
          await User.findByIdAndUpdate(studentId, { $inc: { coins: baseCoins } }, { session });
          coinsAwarded = baseCoins;
        }

        // Update Progress
        if (passed && courseId && !alreadyPassed) {
          await StudentProgress.findOneAndUpdate(
            { student: studentId, course: courseId },
            {
              $push: {
                completedItems: {
                  itemId: quizId,
                  itemType: 'quiz',
                  completedAt: new Date(),
                  quizId: quizId,
                  score: score
                }
              },
              $set: { lastAccessedAt: new Date() }
            },
            { upsert: true, new: true, session }
          );
        }
      });
    } finally {
      await session.endSession();
    }

    res.json({
      success: true,
      results: {
        score,
        correctAnswers,
        totalQuestions,
        passed,
        coinsEarned: coinsAwarded,
        alreadyEarned: alreadyPassed,
        baseCoinsAvailable: baseCoins,
        breakdown
      }
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Submit Quiz Error');
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== MARK CONTENT COMPLETE ====================

/**
 * @desc Put/mark content item as complete
 * @route POST /api/v2/lms/student/:studentId/courses/computer-apps/mark-complete
 * @access Private
 */
exports.markComplete = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { itemId, itemType, courseId, quizId } = req.body;

    if (!itemId || !courseId) {
      return res.status(400).json({ success: false, message: 'Missing itemId or courseId' });
    }

    // Explicitly cast to ObjectId
    const studentObjectId = new mongoose.Types.ObjectId(studentId);
    const courseObjectId = new mongoose.Types.ObjectId(courseId);

    // Find existing progress
    let progress = await StudentProgress.findOne({
      student: studentObjectId,
      course: courseObjectId
    });

    // Create if missing
    if (!progress) {
      progress = new StudentProgress({
        student: studentObjectId, // Use casted ID
        course: courseObjectId,   // Use casted ID
        completedItems: [],
        status: 'in_progress',
        startedAt: new Date(),
        lastAccessedAt: new Date()
      });
      // CRITICAL: Save it so it has an ID in DB
      await progress.save();
    } else {
      // Existing progress record found
    }

    // Check if item exists (avoid duplicates)
    // Note: completedItems might be missing if schema issue, so safe checks
    const currentItems = progress.completedItems || [];
    const itemExists = currentItems.some(i => String(i.itemId) === String(itemId));

    if (!itemExists) {
      const newItem = {
        itemId: new mongoose.Types.ObjectId(itemId),
        itemType: itemType || 'unknown',
        completedAt: new Date(),
        quizId: quizId ? new mongoose.Types.ObjectId(quizId) : null
      };

      // Atomic Update
      progress = await StudentProgress.findByIdAndUpdate(
        progress._id,
        {
          $push: { completedItems: newItem },
          $set: { lastAccessedAt: new Date() }
        },
        { new: true } // Return UPDATED doc
      );
    } else {
      // Item already completed, skip
    }

    res.json({
      success: true,
      message: 'Content marked as complete',
      progress: progress
    });

  } catch (error) {
    errorLogger.error({ err: error }, 'Mark Complete Error');
    res.status(500).json({
      success: false,
      message: 'Server error marking content complete',
      error: error.message
    });
  }
};

