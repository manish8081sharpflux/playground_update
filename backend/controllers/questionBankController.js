const QuestionBank = require('../models/QuestionBank');
const { errorLogger } = require('../config/pino-config');

/**
 * Question Bank Controller - Sprint 2 Epic 02 Story 03
 * Manages reusable question library
 */

/**
 * GET /api/v2/lms/admin/question-bank
 * Get all questions from question bank with filtering and search
 */
exports.getAllQuestions = async (req, res) => {
  try {
    const {
      type,
      tag,
      search,
      difficulty,
      category,
      sort = 'most_used',
      limit = 50,
      offset = 0
    } = req.query;

    // Build query
    const query = { isActive: true };

    if (type && type !== 'all') {
      query.type = type;
    }

    if (tag) {
      query.tags = tag;
    }

    if (difficulty) {
      query.difficulty = difficulty;
    }

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$text = { $search: search };
    }

    // Sort options
    let sortOption = {};
    switch (sort) {
      case 'most_used':
        sortOption = { usageCount: -1, createdAt: -1 };
        break;
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      default:
        sortOption = { usageCount: -1 };
    }

    // Execute query
    const questions = await QuestionBank.find(query)
      .populate('createdBy', 'name email')
      .populate('lastEditedBy', 'name email')
      .populate('usedInQuizzes.quizId', 'title status')
      .sort(sortOption)
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();

    // Get total count
    const total = await QuestionBank.countDocuments(query);

    res.json({
      success: true,
      questions,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + questions.length) < total
      }
    });

  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching question bank:');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch question bank',
      error: error.message
    });
  }
};

/**
 * GET /api/v2/lms/admin/question-bank/:questionId
 * Get single question from bank
 */
exports.getQuestionById = async (req, res) => {
  try {
    const { questionId } = req.params;

    const question = await QuestionBank.findById(questionId)
      .populate('createdBy', 'name email')
      .populate('lastEditedBy', 'name email')
      .populate('usedInQuizzes.quizId', 'title status');

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    res.json({
      success: true,
      question
    });

  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching question:');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch question',
      error: error.message
    });
  }
};

/**
 * POST /api/v2/lms/admin/question-bank
 * Save question to question bank
 */
exports.createQuestion = async (req, res) => {
  try {
    const {
      type,
      questionText,
      points,
      explanation,
      options,
      correctAnswer,
      acceptedAnswers,
      caseInsensitive,
      ignoreExtraSpaces,
      partialCredit,
      tags,
      category,
      difficulty
    } = req.body;

    // Validation
    if (!type || !questionText) {
      return res.status(400).json({
        success: false,
        message: 'Question type and text are required'
      });
    }

    // Create question
    const question = new QuestionBank({
      type,
      questionText: questionText.trim(),
      points: points || 5,
      explanation: explanation?.trim(),
      options,
      correctAnswer,
      acceptedAnswers,
      caseInsensitive: caseInsensitive !== undefined ? caseInsensitive : true,
      ignoreExtraSpaces: ignoreExtraSpaces !== undefined ? ignoreExtraSpaces : true,
      partialCredit: partialCredit || false,
      tags: tags || [],
      category,
      difficulty: difficulty || 'medium',
      createdBy: req.user._id
    });

    await question.save();

    // Populate references
    await question.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Question saved to bank successfully',
      question
    });

  } catch (error) {
    errorLogger.error({ err: error }, 'Error creating question:');
    res.status(500).json({
      success: false,
      message: 'Failed to save question to bank',
      error: error.message
    });
  }
};

/**
 * PUT /api/v2/lms/admin/question-bank/:questionId
 * Update question in bank
 */
exports.updateQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const updates = req.body;

    const question = await QuestionBank.findById(questionId);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Update fields
    const allowedUpdates = [
      'questionText',
      'points',
      'explanation',
      'options',
      'correctAnswer',
      'acceptedAnswers',
      'caseInsensitive',
      'ignoreExtraSpaces',
      'partialCredit',
      'tags',
      'category',
      'difficulty'
    ];

    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        question[field] = updates[field];
      }
    });

    question.lastEditedBy = req.user._id;

    await question.save();

    // Populate references
    await question.populate([
      { path: 'createdBy', select: 'name email' },
      { path: 'lastEditedBy', select: 'name email' },
      { path: 'usedInQuizzes.quizId', select: 'title status' }
    ]);

    res.json({
      success: true,
      message: 'Question updated successfully',
      question,
      warning: question.usageCount > 0 ? `This question is used in ${question.usageCount} quizzes. Changes will affect all quizzes.` : null
    });

  } catch (error) {
    errorLogger.error({ err: error }, 'Error updating question:');
    res.status(500).json({
      success: false,
      message: 'Failed to update question',
      error: error.message
    });
  }
};

/**
 * DELETE /api/v2/lms/admin/question-bank/:questionId
 * Delete question from bank (soft delete)
 */
exports.deleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { force } = req.query; // Hard delete if force=true

    const question = await QuestionBank.findById(questionId);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Check if question is in use
    if (question.usageCount > 0 && force !== 'true') {
      return res.status(400).json({
        success: false,
        message: `Cannot delete question: Currently used in ${question.usageCount} quizzes. Use force=true to override.`,
        usageCount: question.usageCount,
        usedInQuizzes: question.usedInQuizzes
      });
    }

    if (force === 'true') {
      // Hard delete
      await question.deleteOne();
    } else {
      // Soft delete
      question.isActive = false;
      await question.save();
    }

    res.json({
      success: true,
      message: force === 'true' ? 'Question permanently deleted' : 'Question deactivated successfully'
    });

  } catch (error) {
    errorLogger.error({ err: error }, 'Error deleting question:');
    res.status(500).json({
      success: false,
      message: 'Failed to delete question',
      error: error.message
    });
  }
};

/**
 * GET /api/v2/lms/admin/question-bank/tags
 * Get all unique tags from question bank
 */
exports.getAllTags = async (req, res) => {
  try {
    const tags = await QuestionBank.distinct('tags', { isActive: true });

    res.json({
      success: true,
      tags: tags.sort()
    });

  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching tags:');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tags',
      error: error.message
    });
  }
};

/**
 * GET /api/v2/lms/admin/question-bank/most-used
 * Get most used questions
 */
exports.getMostUsedQuestions = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const questions = await QuestionBank.getMostUsed(parseInt(limit));

    res.json({
      success: true,
      questions
    });

  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching most used questions:');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch most used questions',
      error: error.message
    });
  }
};

/**
 * GET /api/v2/lms/admin/question-bank/stats
 * Get question bank statistics
 */
exports.getQuestionBankStats = async (req, res) => {
  try {
    const totalQuestions = await QuestionBank.countDocuments({ isActive: true });

    const byType = await QuestionBank.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    const byDifficulty = await QuestionBank.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$difficulty',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        totalQuestions,
        byType,
        byDifficulty
      }
    });

  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching question bank stats:');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch question bank statistics',
      error: error.message
    });
  }
};
