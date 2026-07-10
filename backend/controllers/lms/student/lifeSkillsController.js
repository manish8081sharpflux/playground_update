const Course = require('../../../models/course');
const StudentProgress = require('../../../models/StudentProgress');
const Submission = require('../../../models/Submission');
const mongoose = require('mongoose');
const { errorLogger } = require('../../../config/pino-config');
const s3Service = require('../../../services/aws/s3');
const { streamCourseContentFile } = require('../../../utils/lmsContentFile');
const fs = require('fs');

/**
 * Life Skills Controller - Epic 01 Story 05
 * Handles voice note submissions and MCQ quiz interactions
 *
 * Features:
 * - Voice note recording and submission
 * - MCQ quiz questions with audio enforcement
 * - Auto-grading (for quizzes) and coin rewards
 * - Offline sync support (queued submissions)
 */

// Helper to find life skills course (legacy â€” returns first published)
const getLifeSkillsCourse = async () => {
  return await Course.findOne({ category: 'Life Skills', status: 'published' })
    .populate('modules.chapters.contentItems.quizRef')
    .lean();
};

// Returns ALL published Life Skills courses
const getLifeSkillsCourses = async () => {
  return await Course.find({ category: 'Life Skills', status: 'published' })
    .populate('modules.chapters.contentItems.quizRef')
    .lean();
};

// Helper to update progress
const updateProgress = async (studentId, courseId, itemId, itemType, score = null) => {
  try {
    let progress = await StudentProgress.findOne({ student: studentId, course: courseId });

    if (!progress) {
      progress = new StudentProgress({
        student: studentId,
        course: courseId,
        startedAt: new Date(),
        status: 'in_progress',
        completedItems: []
      });
    }

    // Add new item (or replace existing)
    const newItem = {
      itemId: itemId,
      itemType: itemType,
      completedAt: new Date(),
      score: score
    };

    // Add to list
    progress.completedItems.push(newItem);

    // Deduplicate: Keep the LATEST entry for each itemId
    // Logic: Reverse array -> Map sets key (itemId) -> First encountered (latest) wins -> Values -> Reverse back (optional, but Map insertion order is by first set)
    // Simpler: Map key=itemId. Overwrites. Last one in array wins.
    const uniqueItemsMap = new Map();
    progress.completedItems.forEach(item => {
      uniqueItemsMap.set(item.itemId.toString(), item);
    });
    progress.completedItems = Array.from(uniqueItemsMap.values());

    progress.lastAccessedAt = new Date();
    await progress.save();

  } catch (err) {
    errorLogger.error({ err }, 'Error updating progress');
  }
};

/**
 * Get all Life Skills tasks (voice questions + quiz questions)
 * GET /api/v2/lms/student/:studentId/courses/life-skills
 */
exports.getLifeSkillsTasks = async (req, res) => {
  try {
    const { studentId } = req.params;

    const courses = await getLifeSkillsCourses();
    if (!courses || courses.length === 0) {
      return res.json({ success: true, courses: [], modules: [], completedTasks: 0, totalTasks: 0 });
    }

    // Fetch progress for all courses in one query
    const progressRecords = await StudentProgress.find({
      student: studentId,
      course: { $in: courses.map(c => c._id) }
    }).lean();
    const progressByCourse = new Map(progressRecords.map(p => [p.course.toString(), p]));

    const mapItem = (item, completedItems) => {
      let type = item.type;
      if (!type || type === 'task') {
        if (item.metadata && item.metadata.taskType) {
          type = item.metadata.taskType;
        } else {
          type = 'voice';
        }
      }
      return {
        id: item._id,
        type,
        title: item.title,
        description: item.description,
        fileUrl: item.fileUrl || item.externalUrl,
        externalUrl: item.externalUrl || item.fileUrl,
        textContent: item.textContent || '',
        totalQuestions: item.quizRef?.questions?.length || item.metadata?.questions?.length || 0,
        totalCoins: (item.quizRef?.questions?.length || item.metadata?.questions?.length || 0) * 12,
        bonusCoins: item.metadata?.bonusCoins || 24,
        difficulty: item.metadata?.difficulty || 'medium',
        coinsForSubmission: item.metadata?.coins || 20,
        instructions: item.textContent || item.description,
        category: item.metadata?.category || 'general',
        duration: item.metadata?.duration,
        isCompleted: completedItems.has(item._id.toString())
      };
    };

    let totalCompleted = 0;
    let totalItems = 0;

    const coursePayloads = courses.map(course => {
      const progress = progressByCourse.get(course._id.toString());
      const completedItems = new Set(progress?.completedItems?.map(i => i.itemId.toString()) || []);
      totalCompleted += completedItems.size;

      const modules = course.modules.map(m => ({
        id: m._id,
        title: m.title,
        chapters: m.chapters.map(c => {
          totalItems += c.contentItems.length;
          return {
            id: c._id,
            title: c.title,
            contentItems: c.contentItems.map(item => mapItem(item, completedItems))
          };
        })
      }));

      return {
        courseId: course._id,
        courseName: course.title,
        modules
      };
    });

    // Legacy fields point at first course so older clients keep working
    const first = coursePayloads[0];

    res.json({
      success: true,
      studentId,
      courses: coursePayloads,
      // Legacy fields (single-course shape)
      courseId: first?.courseId,
      courseName: first?.courseName,
      modules: first?.modules || [],
      completedTasks: totalCompleted,
      totalTasks: totalItems
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching Life Skills tasks');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Life Skills tasks'
    });
  }
};

exports.getContentItemFile = async (req, res) => {
  return streamCourseContentFile(req, res, { category: 'Life Skills' });
};

/**
 * Get a specific voice question task (Refactored to find ContentItem)
 * GET /api/v2/lms/student/:studentId/courses/life-skills/voice/:taskId
 */
exports.getVoiceTask = async (req, res) => {
  try {
    const { studentId, taskId } = req.params;

    // taskId is contentItem._id
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ success: false, error: 'Invalid Task ID' });
    }

    const course = await Course.findOne(
      { "modules.chapters.contentItems._id": taskId },
      { "modules.chapters.contentItems.$": 1 }
    ).lean();

    if (!course) {
      // Fallback search (manually) if positional operator fails deep nesting
      // Assuming we rely on finding it
      return res.status(404).json({ success: false, error: 'Voice task not found' });
    }

    // Extract item (manual find to be safe)
    let taskItem = null;
    // We need complete course to traverse, if query above returned partial. 
    // Actually the projection returns the chapter array with 1 item.
    // Let's refine:

    // Safer: find the item
    const fullCourse = await Course.findOne({ "modules.chapters.contentItems._id": taskId }).lean();
    if (!fullCourse) return res.status(404).json({ success: false, error: 'Voice task not found' });

    fullCourse.modules.forEach(m => {
      m.chapters.forEach(c => {
        const i = c.contentItems.find(it => it._id.toString() === taskId);
        if (i) taskItem = i;
      });
    });

    if (!taskItem) {
      return res.status(404).json({
        success: false,
        error: 'Voice task not found'
      });
    }

    // Check submission status
    const submission = await Submission.findOne({ studentId, taskId }).sort({ submittedAt: -1 }).lean();

    res.json({
      success: true,
      studentId,
      task: {
        id: taskItem._id,
        taskType: 'voice',
        title: taskItem.title,
        audioUrl: taskItem.fileUrl,
        question: taskItem.description, // Mapped description to question
        duration: taskItem.metadata?.audioDuration || 15,
        maxRecordingDuration: taskItem.metadata?.maxDuration || 60,
        coinsForSubmission: taskItem.metadata?.coins || 20,
        instructions: taskItem.textContent || '',
        category: taskItem.metadata?.category,
        difficulty: taskItem.metadata?.difficulty,
        submittedAt: submission ? submission.submittedAt : null,
        grade: submission ? submission.grade : null
      }
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching voice task');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch voice task'
    });
  }
};

/**
 * Submit voice recording
 * POST /api/v2/lms/student/:studentId/courses/life-skills/voice/submit
 */
exports.submitVoiceRecording = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { taskId, duration, fileSize } = req.body;
    const audioFile = req.file;

    // Validate existence
    const course = await Course.findOne({ "modules.chapters.contentItems._id": taskId });
    if (!course) return res.status(404).json({ success: false, error: 'Task not found' });

    if (!audioFile) {
      return res.status(400).json({ success: false, error: 'Audio file is required' });
    }

    // Upload voice recording to S3
    const uploadResult = await s3Service.uploadLMSContent(
      audioFile.path,
      audioFile.originalname,
      'audio',
      audioFile.mimetype
    );

    // Clean up temp file
    if (fs.existsSync(audioFile.path)) {
      fs.unlinkSync(audioFile.path);
    }

    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to upload voice recording to storage'
      });
    }

    const s3Url = uploadResult.url;

    // Look up task title from course
    let taskTitle = "Voice Task";
    course.modules.forEach(m => {
      m.chapters.forEach(c => {
        const item = c.contentItems.find(i => i._id.toString() === taskId);
        if (item) taskTitle = item.title;
      });
    });

    // Save submission
    const priorSubmission = await Submission.exists({
      studentId,
      courseId: course._id,
      taskId
    });
    const submission = new Submission({
      studentId,
      courseId: course._id,
      taskId,
      taskTitle,
      submissionType: "audio",
      fileUrl: s3Url,
      metadata: { duration, fileSize },
      isFirstAttempt: !priorSubmission,
      status: "pending",
      submittedAt: new Date()
    });

    await submission.save();
    if (!priorSubmission) {
      await updateProgress(studentId, course._id, taskId, 'audio');
    }

    res.status(201).json({
      success: true,
      submissionId: submission._id,
      fileUrl: s3Url,
      status: 'pending', // pending | graded | rejected
      coinsEarned: 0, // Coins usually awarded after grading
      message: 'Great work! Your answer has been submitted. Coach will review it soon.'
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error submitting voice recording');
    res.status(500).json({
      success: false,
      error: 'Failed to submit voice recording'
    });
  }
};

/**
 * Get quiz questions
 * GET /api/v2/lms/student/:studentId/courses/life-skills/quiz/:quizId
 */
exports.getQuiz = async (req, res) => {
  try {
    const { studentId, quizId } = req.params;

    // Use Quiz model (Already implemented in Epic 02)
    // quizId here implies ContentItem ID which LINKS to a Quiz, or the Quiz ID itself?
    // Let's assume contentItem.metadata.quizId holds the reference to the QuestionBank or Quiz model.
    // Or we treat the ContentItem AS the quiz container (embedded questions).

    // For Epic 1 simplicity and alignment with Admin Controller which uses `Quiz` model:
    // We should fetch the `Quiz` document.
    const Quiz = require('../../../models/Quiz');
    const Course = require('../../../models/course');

    // Attempt to find by direct Quiz ID first
    let quiz = null;
    // Check if it's a valid ObjectId to avoid CastError if looking up strict model
    if (mongoose.Types.ObjectId.isValid(quizId)) {
      try {
        quiz = await Quiz.findById(quizId).populate('questions');
      } catch (err) {
        // Ignore cast errors or similar, proceed to ContentItem lookup
        // Not a direct Quiz ID or not found, proceed to ContentItem lookup
      }
    }

    // If not found, it might be a ContentItem ID (from Course structure)
    if (!quiz) {
      // Find the Course containing this content item
      // We don't use projection $ because deep nesting is tricky. catch the whole course (or specific fields if optimization needed)
      const course = await Course.findOne(
        { "modules.chapters.contentItems._id": quizId }
      ).lean();

      if (course) {
        // Manually find the item in the nested arrays
        let contentItem = null;
        for (const m of course.modules) {
          for (const c of m.chapters) {
            const found = c.contentItems.find(i => i._id.toString() === quizId);
            if (found) {
              contentItem = found;
              break;
            }
          }
          if (contentItem) break;
        }

        if (contentItem) {
          if (contentItem.quizRef) {
            quiz = await Quiz.findById(contentItem.quizRef).populate('questions');
          } else if (contentItem.metadata?.quizId) {
            quiz = await Quiz.findById(contentItem.metadata.quizId).populate('questions');
          }
        }
      }
    }

    if (!quiz) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }

    // Format for student (hide answers)
    const questions = quiz.questions.map(q => ({
      id: q._id,
      type: q.type,
      title: q.questionText, // "title" in UI
      audioUrl: q.audioUrl,
      question: q.questionText,
      options: (q.options || []).map(o => ({
        id: o._id || o.id || o.text,
        text: o.text
      })),
      acceptedAnswers: [],
      explanation: q.explanation || '',
      coinsForCorrect: q.points || 10
    }));

    res.json({
      success: true,
      studentId,
      quiz: {
        id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        totalQuestions: questions.length,
        passingScore: quiz.minScore || 60,
        questions
      }
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching quiz');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quiz'
    });
  }
};

/**
 * Submit quiz answers and calculate score
 * POST /api/v2/lms/student/:studentId/courses/life-skills/quiz/submit
 */
exports.submitQuiz = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { quizId, answers, startedAt, completedAt } = req.body;

    // Load Quiz with answers
    const Quiz = require('../../../models/Quiz');
    const Course = require('../../../models/course');

    let quiz = null;
    let courseRef = null;
    if (mongoose.Types.ObjectId.isValid(quizId)) {
      quiz = await Quiz.findById(quizId).populate('questions');
    }

    if (!quiz) {
      const course = await Course.findOne({ "modules.chapters.contentItems._id": quizId }).lean();
      if (course) {
        courseRef = course._id;
        let contentItem = null;
        for (const m of course.modules) {
          for (const c of m.chapters) {
            const found = c.contentItems.find(i => i._id.toString() === quizId);
            if (found) { contentItem = found; break; }
          }
          if (contentItem) break;
        }
        if (contentItem) {
          if (contentItem.quizRef) quiz = await Quiz.findById(contentItem.quizRef).populate('questions');
          else if (contentItem.metadata?.quizId) quiz = await Quiz.findById(contentItem.metadata.quizId).populate('questions');
        }
      }
    }

    if (!quiz) return res.status(404).json({ success: false, error: 'Quiz not found' });

    let correctAnswers = 0;
    let baseCoins = 0;
    const canonicalTaskId = quizId;

    // Always compute breakdown + baseCoins. The duplicate-reward check is
    // performed inside the transaction below using the Coin document's
    // transactions[] array â€” race-safe and authoritative.
    const breakdown = quiz.questions.map((question, index) => {
      const userAnswer = answers.find(a => a.questionId === question._id.toString());
      let isCorrect = false;
      let studentAnswerText = 'No Answer';
      let correctAnswerText = 'Unknown';
      let correctAnswerId = null;

      // True/False questions have empty options[] and store correctAnswer as a boolean
      if (question.type === 'true_false') {
        const userValStr = userAnswer?.selectedOptionId;
        const dbValBool = question.correctAnswer;

        let userBool = null;
        if (typeof userValStr === 'string') {
          if (userValStr.toLowerCase() === 'true') userBool = true;
          if (userValStr.toLowerCase() === 'false') userBool = false;
        }

        isCorrect = userBool !== null && userBool === dbValBool;
        studentAnswerText = userValStr || 'No Answer';
        correctAnswerText = dbValBool === true ? 'True' : 'False';

      } else if (question.type === 'fill_blank') {
        const normalizeAnswer = (value, q) => {
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

        const studentText = userAnswer?.answerText || '';
        const acceptedAnswers = question.acceptedAnswers || [];

        const normalizedStudentAnswer = normalizeAnswer(studentText, question);
        const normalizedAcceptedAnswers = acceptedAnswers.map(ans =>
          normalizeAnswer(ans, question)
        );

        isCorrect =
          normalizedStudentAnswer !== '' &&
          normalizedAcceptedAnswers.includes(normalizedStudentAnswer);

        studentAnswerText = studentText || 'No Answer';
        correctAnswerText = acceptedAnswers.length > 0
          ? acceptedAnswers.join(', ')
          : 'No accepted answer added';

      } else {
        const correctOpt = question.options?.find(o => o.isCorrect);
        const selectedOption = question.options?.find(
          o => o._id.toString() === userAnswer?.selectedOptionId
        );

        isCorrect = !!(
          userAnswer &&
          correctOpt &&
          userAnswer.selectedOptionId === correctOpt._id.toString()
        );

        studentAnswerText = selectedOption ? selectedOption.text : 'No Answer';
        correctAnswerText = correctOpt ? correctOpt.text : 'Unknown';
        correctAnswerId = correctOpt?._id || null;
      }

      if (isCorrect) {
        correctAnswers++;
        baseCoins += (question.points || 10);
      }

      return {
        questionId: question._id,
        question: question.text || question.questionText, // Return Question Text
        correct: isCorrect,
        isCorrect: isCorrect, // MATCH FRONTEND PROPERTY
        points: question.points || 10, // Pass points
        studentAnswer: studentAnswerText,
        correctAnswer: correctAnswerText,
        correctAnswerId,
        explanation: question.explanation
      };
    });

    // Score
    const totalQuestions = quiz.questions.length;
    const score = Math.round((correctAnswers / totalQuestions) * 100);
    const passed = score >= (quiz.minScore || 60);

    // Save Submission, award coins, and update progress atomically.
    // The "already rewarded" check runs INSIDE the transaction against the
    // Coin document's transactions[] array.
    const session = await mongoose.startSession();
    let alreadyAttempted = false;
    let alreadyRewarded = false;
    let coinsAwarded = 0;
    const assignedCourseId = quiz.course || courseRef;

    try {
      await session.withTransaction(async () => {
        const Coin = require('../../../models/coin');
        const User = require('../../../models/user');

        // Fresh read inside the txn â€” scan for a prior quiz_pass for THIS quiz.
        alreadyAttempted = Boolean(await Submission.exists({
          studentId,
          courseId: assignedCourseId,
          taskId: canonicalTaskId,
          submissionType: 'quiz'
        }).session(session));

        const coinRecord = await Coin.findOrCreateForUser(studentId, { session });
        alreadyRewarded = coinRecord.transactions.some(t =>
          t.source === 'quiz_pass' &&
          t.metadata?.contentItemId?.toString() === canonicalTaskId.toString() &&
          t.metadata?.courseId?.toString() === assignedCourseId?.toString()
        );

        // Save Submission
        const submission = new Submission({
          studentId,
          courseId: assignedCourseId,
          taskId: canonicalTaskId,
          taskTitle: quiz.title || 'Quiz Submission',
          submissionType: 'quiz',
          fileUrl: 'quiz-submission',
          status: 'graded',
          grade: {
            score,
            points: (!alreadyAttempted && !alreadyRewarded) ? baseCoins : 0
          },
          metadata: { breakdown, answers: breakdown },
          isFirstAttempt: !alreadyAttempted,
          submittedAt: new Date()
        });
        await submission.save({ session });

        // Award Coins
        if (!alreadyAttempted && !alreadyRewarded && baseCoins > 0) {
          const cId = assignedCourseId;

          await coinRecord.addCoins(
            baseCoins,
            'earned',
            `Quiz Completed: ${quiz.title}`,
            'quiz_pass',
            { quizId: quiz._id, courseId: cId, contentItemId: canonicalTaskId },
            { session }
          );

          // Update User Balance Legacy
          await User.findByIdAndUpdate(studentId, { $inc: { coins: baseCoins } }, { session });
          coinsAwarded = baseCoins;
        }

        // Update Progress
        if (!alreadyAttempted) {
          const courseIdToUse = assignedCourseId;
          await updateProgress(studentId, courseIdToUse, quizId, 'quiz', score);
        }
      });
    } finally {
      await session.endSession();
    }

    res.json({
      success: true,
      quizId,
      results: {
        score,
        correctAnswers,
        totalQuestions,
        passed,
        coinsEarned: coinsAwarded,
        // Honest signal so the UI can avoid lying with "you earned bonus coins!"
        // when alreadyPassed dedup withheld the reward on a repeat attempt.
        alreadyEarned: alreadyAttempted || alreadyRewarded,
        alreadySubmitted: alreadyAttempted,
        baseCoinsAvailable: baseCoins,
        breakdown
      }
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error submitting quiz');
    res.status(500).json({
      success: false,
      error: 'Failed to submit quiz'
    });
  }
};

/**
 * Get student's submission history for Life Skills
 * GET /api/v2/lms/student/:studentId/courses/life-skills/submissions
 */
exports.getSubmissionHistory = async (req, res) => {
  try {
    const { studentId } = req.params;

    const submissions = await Submission.find({ studentId }).populate('courseId').lean();
    // Filter for Life Skills course... or rely on client to filter or use query param.
    // Assuming ALL submissions for now as this is a specific controller endpoint

    res.json({
      success: true,
      studentId,
      submissions: submissions.map(s => ({
        id: s._id,
        type: s.type,
        status: s.status,
        score: s.grade?.score,
        coinsEarned: s.grade?.points,
        submittedAt: s.submittedAt
      }))
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching submission history');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch submission history'
    });
  }
};

/**
 * Mark content item as complete (Video/PDF)
 * POST /api/v2/lms/student/:studentId/courses/life-skills/mark-complete
 */
exports.markItemComplete = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { itemId, itemType, courseId } = req.body;

    if (!itemId || !courseId) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    await updateProgress(studentId, courseId, itemId, itemType || 'content');

    res.json({ success: true });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error marking completion');
    res.status(500).json({ success: false, error: 'Failed' });
  }
};
