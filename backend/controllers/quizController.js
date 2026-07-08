const Quiz = require('../models/Quiz');
const QuestionBank = require('../models/QuestionBank');
const Course = require('../models/course');
const { errorLogger } = require('../config/pino-config');

const QUIZ_ENABLED_COURSE_CATEGORIES = ['Computer Apps', 'Life Skills'];

const getQuizCourseValidationError = async (courseId) => {
  if (!courseId) {
    return 'Quiz must be associated with a course';
  }

  const course = await Course.findById(courseId).select('title category').lean();
  if (!course) {
    return 'Associated course was not found';
  }

  const courseType = course.category || course.title;
  if (!QUIZ_ENABLED_COURSE_CATEGORIES.includes(courseType)) {
    return `Quizzes can be published only for ${QUIZ_ENABLED_COURSE_CATEGORIES.join(' or ')} courses`;
  }

  return null;
};

/**
 * Quiz Controller - Sprint 2 Epic 02 Story 03
 * Handles quiz CRUD operations and publishing workflow
 */

/**
 * GET /api/v2/lms/admin/quizzes
 * Get all quizzes with filtering, search, and pagination
 */
exports.getAllQuizzes = async (req, res) => {
  try {
    const {
      status,
      search,
      course,
      chapter,
      sort = 'newest',
      limit = 100,
      offset = 0
    } = req.query;

    // Build query
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (course) {
      query.course = course;
    }

    if (chapter) {
      query.chapter = chapter;
    }

    // Full-text search
    if (search) {
      query.$text = { $search: search };
    }

    // Sort options
    let sortOption = {};
    switch (sort) {
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      case 'title_az':
        sortOption = { title: 1 };
        break;
      case 'title_za':
        sortOption = { title: -1 };
        break;
      case 'most_questions':
        // Will handle after fetching
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    // Execute query
    const quizzes = await Quiz.find(query)
      .populate('course', 'title')
      // Note: module and chapter are subdocuments within Course, cannot populate
      .populate('createdBy', 'name email')
      .populate('lastEditedBy', 'name email')
      .sort(sortOption)
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();

    // Sort by question count if requested
    if (sort === 'most_questions') {
      quizzes.sort((a, b) => b.questions.length - a.questions.length);
    }

    // Get total count for pagination
    const total = await Quiz.countDocuments(query);

    res.json({
      success: true,
      quizzes,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + quizzes.length) < total
      }
    });

  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching quizzes:');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quizzes',
      error: error.message
    });
  }
};

/**
 * GET /api/v2/lms/admin/quizzes/:quizId
 * Get single quiz by ID
 */
exports.getQuizById = async (req, res) => {
  try {
    const { quizId } = req.params;

    const quiz = await Quiz.findById(quizId)
      .populate('course', 'title')
      // Note: module and chapter are subdocuments within Course, cannot populate
      .populate('createdBy', 'name email')
      .populate('lastEditedBy', 'name email');

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    res.json({
      success: true,
      quiz
    });

  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching quiz:');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quiz',
      error: error.message
    });
  }
};

/**
 * POST /api/v2/lms/admin/quizzes
 * Create new quiz
 */
exports.createQuiz = async (req, res) => {
  try {
    const {
      title,
      description,
      course,
      module,
      chapter,
      questions = [],
      settings = {},
      tags = []
    } = req.body;

    // Validation
    if (!title || title.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Quiz title must be at least 3 characters'
      });
    }

    // Helper to safely extract updated ID or undefined
    const safeId = (val) => {
      if (!val) return undefined;
      // If it's an object with _id (populated), use that
      if (typeof val === 'object' && val._id) return val._id.toString();
      // If it's a string, trim it
      if (typeof val === 'string') {
        const trimmed = val.trim();
        return trimmed.length > 0 ? trimmed : undefined;
      }
      // If it's something else (e.g. toString-able), try stringify
      return val.toString();
    };

    const cleanedCourse = safeId(course);
    const cleanedModule = safeId(module);
    const cleanedChapter = safeId(chapter);

    // Create quiz
    const quiz = new Quiz({
      title: title.trim(),
      description: description?.trim(),
      course: cleanedCourse,
      module: cleanedModule,
      chapter: cleanedChapter,
      questions,
      settings: {
        ...settings,
        passingScore: settings.passingScore || 70
      },
      tags,
      status: 'draft',
      createdBy: req.user?._id || req.user?.id
    });

    await quiz.save();

    // Link to Course Structure
    if (cleanedCourse && cleanedModule && cleanedChapter) {
      try {
        const courseDoc = await Course.findById(cleanedCourse);
        if (courseDoc) {
          const moduleDoc = courseDoc.modules.id(cleanedModule);
          if (moduleDoc) {
            const chapterDoc = moduleDoc.chapters.id(cleanedChapter);
            if (chapterDoc) {
              // Add new Content Item
              chapterDoc.contentItems.push({
                type: 'quiz',
                title: quiz.title,
                quizRef: quiz._id,
                order: chapterDoc.contentItems.length // Append to end
              });
              await courseDoc.save();
              // Quiz linked to course successfully
            }
          }
        }
      } catch (linkError) {
        errorLogger.error({ err: linkError }, 'Failed to link quiz to course:');
        // Don't fail the request, just log it
      }
    }

    // Populate references for response
    await quiz.populate([
      { path: 'course', select: 'title' },
      { path: 'createdBy', select: 'name email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Quiz created successfully',
      quiz
    });

  } catch (error) {
    errorLogger.error({ err: error }, 'Error creating quiz:');
    res.status(500).json({
      success: false,
      message: 'Failed to create quiz',
      error: error.message,
      details: error.errors ? Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      })) : undefined
    });
  }
};

/**
 * PUT /api/v2/lms/admin/quizzes/:quizId
 * Update quiz
 */
exports.updateQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const updates = req.body;

    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Update fields
    const allowedUpdates = [
      'title',
      'description',
      'course',
      'module',
      'chapter',
      'questions',
      'settings',
      'tags'
    ];

    // Helper to safely extract ID or undefined
    const safeId = (val) => {
      if (val === undefined) return undefined; // Don't update
      if (val === null || val === '') return undefined; // Clear value
      // If it's an object with _id (populated), use that
      if (typeof val === 'object' && val._id) return val._id.toString();
      if (typeof val === 'string') {
        const trimmed = val.trim();
        return trimmed.length > 0 ? trimmed : undefined;
      }
      return val.toString();
    };

    // Sanitize optional ObjectId fields
    if (updates.course !== undefined) updates.course = safeId(updates.course);
    if (updates.module !== undefined) updates.module = safeId(updates.module);
    if (updates.chapter !== undefined) updates.chapter = safeId(updates.chapter);

    // Check if location changed
    const oldCourseId = quiz.course?.toString();
    const oldModuleId = quiz.module?.toString();
    const oldChapterId = quiz.chapter?.toString();

    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        quiz[field] = updates[field];
      }
    });

    quiz.lastEditedBy = req.user?._id || req.user?.id;

    await quiz.save();

    // Sync with Course Structure if location changed
    const newCourseId = quiz.course?.toString();
    const newModuleId = quiz.module?.toString();
    const newChapterId = quiz.chapter?.toString();

    const locationChanged =
      (oldCourseId !== newCourseId) ||
      (oldModuleId !== newModuleId) ||
      (oldChapterId !== newChapterId);

    if (locationChanged || updates.title) {
      try {
        // 1. Remove from old location if it existed
        if (oldCourseId && oldModuleId && oldChapterId) {
          const oldCourseDoc = await Course.findById(oldCourseId);
          if (oldCourseDoc) {
            const oldModuleDoc = oldCourseDoc.modules.id(oldModuleId);
            if (oldModuleDoc) {
              const oldChapterDoc = oldModuleDoc.chapters.id(oldChapterId);
              if (oldChapterDoc) {
                // Remove content item with matching quizRef
                oldChapterDoc.contentItems = oldChapterDoc.contentItems.filter(
                  item => item.quizRef?.toString() !== quizId
                );
                await oldCourseDoc.save();
                // Quiz removed from old location
              }
            }
          }
        }

        // 2. Add to new location (if fully defined)
        // If location didn't change but Title did, we removed it above and now re-add it with new title
        // Wait, if ONLY title changed and location didn't, we shouldn't remove/add?
        // Actually, easiest way to update title in ContentItem is to Find and Update. 
        // But Remove/Add works too and handles reordering (appends to end though).
        // Let's optimize: If location SAME, update title. If location CHANGED, Remove/Add.

        if (!locationChanged && updates.title && newCourseId && newModuleId && newChapterId) {
          const courseDoc = await Course.findById(newCourseId);
          if (courseDoc) {
            const modDoc = courseDoc.modules.id(newModuleId);
            if (modDoc) {
              const chapDoc = modDoc.chapters.id(newChapterId);
              if (chapDoc) {
                const item = chapDoc.contentItems.find(i => i.quizRef?.toString() === quizId);
                if (item) {
                  item.title = updates.title;
                  await courseDoc.save();
                  // Quiz title updated in course content item
                }
              }
            }
          }
        } else if (locationChanged && newCourseId && newModuleId && newChapterId) {
          // Add to new location
          const newCourseDoc = await Course.findById(newCourseId);
          if (newCourseDoc) {
            const newModuleDoc = newCourseDoc.modules.id(newModuleId);
            if (newModuleDoc) {
              const newChapterDoc = newModuleDoc.chapters.id(newChapterId);
              if (newChapterDoc) {
                newChapterDoc.contentItems.push({
                  type: 'quiz',
                  title: quiz.title,
                  quizRef: quiz._id,
                  order: newChapterDoc.contentItems.length
                });
                await newCourseDoc.save();
                // Quiz added to new location
              }
            }
          }
        }

      } catch (syncError) {
        errorLogger.error({ err: syncError }, 'Failed to sync quiz with course:');
      }
    }

    // Populate references (only models, not subdocuments)
    await quiz.populate([
      { path: 'course', select: 'title' },
      { path: 'createdBy', select: 'name email' },
      { path: 'lastEditedBy', select: 'name email' }
    ]);

    res.json({
      success: true,
      message: 'Quiz updated successfully',
      quiz
    });

  } catch (error) {
    errorLogger.error({ err: error }, 'Error updating quiz:');
    res.status(500).json({
      success: false,
      message: 'Failed to update quiz',
      error: error.message
    });
  }
};

/**
 * POST /api/v2/lms/admin/quizzes/:quizId/duplicate
 * Duplicate quiz
 */
exports.duplicateQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;

    const originalQuiz = await Quiz.findById(quizId);

    if (!originalQuiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Create duplicate
    const duplicateQuiz = originalQuiz.duplicate(req.user._id);
    await duplicateQuiz.save();

    // Populate references (only models, not subdocuments)
    await duplicateQuiz.populate([
      { path: 'course', select: 'title' },
      // Note: module and chapter are subdocuments within Course, cannot populate
      { path: 'createdBy', select: 'name email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Quiz duplicated successfully',
      quiz: duplicateQuiz
    });

  } catch (error) {
    errorLogger.error({ err: error }, 'Error duplicating quiz:');
    res.status(500).json({
      success: false,
      message: 'Failed to duplicate quiz',
      error: error.message
    });
  }
};

/**
 * DELETE /api/v2/lms/admin/quizzes/:quizId
 * Delete quiz
 */
exports.deleteQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;

    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Remove usage tracking from question bank if questions are from bank
    const questionBankIds = quiz.questions
      .filter(q => q.questionBankId)
      .map(q => q.questionBankId);

    if (questionBankIds.length > 0) {
      await QuestionBank.updateMany(
        { _id: { $in: questionBankIds } },
        { $pull: { usedInQuizzes: { quizId: quizId } }, $inc: { usageCount: -1 } }
      );
    }

    // Remove from Course Structure
    if (quiz.course && quiz.module && quiz.chapter) {
      try {
        const courseDoc = await Course.findById(quiz.course);
        if (courseDoc) {
          const moduleDoc = courseDoc.modules.id(quiz.module);
          if (moduleDoc) {
            const chapterDoc = moduleDoc.chapters.id(quiz.chapter);
            if (chapterDoc) {
              chapterDoc.contentItems = chapterDoc.contentItems.filter(
                item => item.quizRef?.toString() !== quizId
              );
              await courseDoc.save();
              // Quiz removed from course
            }
          }
        }
      } catch (linkError) {
        errorLogger.error({ err: linkError }, 'Failed to remove quiz from course:');
      }
    }

    await quiz.deleteOne();

    res.json({
      success: true,
      message: 'Quiz deleted successfully'
    });

  } catch (error) {
    errorLogger.error({ err: error }, 'Error deleting quiz:');
    res.status(500).json({
      success: false,
      message: 'Failed to delete quiz',
      error: error.message
    });
  }
};

/**
 * PUT /api/v2/lms/admin/quizzes/:quizId/publish
 * Publish quiz
 */
exports.publishQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;

    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Validation before publishing
    const errors = [];

    if (!quiz.title || quiz.title.trim().length < 3) {
      errors.push('Quiz title is required (min 3 characters)');
    }

    if (quiz.questions.length === 0) {
      errors.push('Quiz must have at least one question');
    }

    if (!quiz.chapter) {
      errors.push('Quiz must be associated with a chapter');
    }

    const courseError = await getQuizCourseValidationError(quiz.course);
    if (courseError) {
      errors.push(courseError);
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot publish quiz',
        errors
      });
    }

    // Publish
    await quiz.publish();

    res.json({
      success: true,
      message: 'Quiz published successfully',
      quiz
    });

  } catch (error) {
    errorLogger.error({ err: error }, 'Error publishing quiz:');
    res.status(500).json({
      success: false,
      message: 'Failed to publish quiz',
      error: error.message
    });
  }
};

/**
 * PUT /api/v2/lms/admin/quizzes/:quizId/unpublish
 * Unpublish quiz
 */
exports.unpublishQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;

    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    await quiz.unpublish();

    res.json({
      success: true,
      message: 'Quiz unpublished successfully',
      quiz
    });

  } catch (error) {
    errorLogger.error({ err: error }, 'Error unpublishing quiz:');
    res.status(500).json({
      success: false,
      message: 'Failed to unpublish quiz',
      error: error.message
    });
  }
};

/**
 * PUT /api/v2/lms/admin/quizzes/:quizId/questions/reorder
 * Reorder questions
 */
exports.reorderQuestions = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { questionIds } = req.body; // Array of question _ids in new order

    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Reorder questions based on questionIds array
    const reorderedQuestions = [];
    questionIds.forEach((questionId, index) => {
      const question = quiz.questions.id(questionId);
      if (question) {
        question.order = index;
        reorderedQuestions.push(question);
      }
    });

    quiz.questions = reorderedQuestions;
    quiz.lastEditedBy = req.user._id;

    await quiz.save();

    res.json({
      success: true,
      message: 'Questions reordered successfully',
      quiz
    });

  } catch (error) {
    errorLogger.error({ err: error }, 'Error reordering questions:');
    res.status(500).json({
      success: false,
      message: 'Failed to reorder questions',
      error: error.message
    });
  }
};

/**
 * PUT /api/v2/lms/admin/quizzes/:quizId/archive
 * Archive quiz (soft delete)
 */
exports.archiveQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;

    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    quiz.status = 'archived';
    quiz.lastEditedBy = req.user._id;
    await quiz.save();

    res.json({
      success: true,
      message: 'Quiz archived successfully',
      quiz
    });

  } catch (error) {
    errorLogger.error({ err: error }, 'Error archiving quiz:');
    res.status(500).json({
      success: false,
      message: 'Failed to archive quiz',
      error: error.message
    });
  }
};

/**
 * PUT /api/v2/lms/admin/quizzes/:quizId/restore
 * Restore archived quiz to draft
 */
exports.restoreQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;

    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Restore to draft
    quiz.status = 'draft';
    quiz.lastEditedBy = req.user._id;
    await quiz.save();

    res.json({
      success: true,
      message: 'Quiz restored to draft',
      quiz
    });

  } catch (error) {
    errorLogger.error({ err: error }, 'Error restoring quiz:');
    res.status(500).json({
      success: false,
      message: 'Failed to restore quiz',
      error: error.message
    });
  }
};

/**
 * GET /api/v2/lms/admin/quizzes/stats
 * Get quiz statistics
 */
exports.getQuizStats = async (req, res) => {
  try {
    const totalQuizzes = await Quiz.countDocuments();
    const publishedQuizzes = await Quiz.countDocuments({ status: 'published' });
    const draftQuizzes = await Quiz.countDocuments({ status: 'draft' });

    const byType = await Quiz.aggregate([
      {
        $unwind: '$questions'
      },
      {
        $group: {
          _id: '$questions.type',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        totalQuizzes,
        publishedQuizzes,
        draftQuizzes,
        questionsByType: byType
      }
    });

  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching quiz stats:');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quiz statistics',
      error: error.message
    });
  }
};
