const express = require('express');
const router = express.Router();
const quizController = require('../../../../controllers/quizController');
const questionBankController = require('../../../../controllers/questionBankController');
const { authenticate, authorize } = require('../../../../middleware/auth');

/**
 * Quiz Routes - Sprint 2 Epic 02 Story 03
 * All routes require authentication and "LMS Management" > "Manage" permission
 */

// Apply authentication and authorization to all routes
router.use(authenticate);
router.use(authorize('LMS Management', 'Manage'));

// ============================================
// QUIZ ROUTES
// ============================================

/**
 * GET /api/v2/lms/admin/quizzes/stats
 * Get quiz statistics
 */
router.get('/quizzes/stats', quizController.getQuizStats);

/**
 * GET /api/v2/lms/admin/quizzes
 * Get all quizzes with filtering, search, and pagination
 * Query params: status, search, course, chapter, sort, limit, offset
 */
router.get('/quizzes', quizController.getAllQuizzes);

/**
 * POST /api/v2/lms/admin/quizzes
 * Create new quiz
 * Body: { title, description, course, module, chapter, questions, settings, tags }
 */
router.post('/quizzes', quizController.createQuiz);

/**
 * GET /api/v2/lms/admin/quizzes/:quizId
 * Get single quiz by ID
 */
router.get('/quizzes/:quizId', quizController.getQuizById);

/**
 * PUT /api/v2/lms/admin/quizzes/:quizId
 * Update quiz
 * Body: Any quiz fields to update
 */
router.put('/quizzes/:quizId', quizController.updateQuiz);

/**
 * POST /api/v2/lms/admin/quizzes/:quizId/duplicate
 * Duplicate quiz (creates copy with " - Copy" suffix)
 */
router.post('/quizzes/:quizId/duplicate', quizController.duplicateQuiz);

/**
 * DELETE /api/v2/lms/admin/quizzes/:quizId
 * Delete quiz
 */
router.delete('/quizzes/:quizId', quizController.deleteQuiz);

/**
 * PUT /api/v2/lms/admin/quizzes/:quizId/publish
 * Publish quiz (validates required fields)
 */
router.put('/quizzes/:quizId/publish', quizController.publishQuiz);

/**
 * PUT /api/v2/lms/admin/quizzes/:quizId/unpublish
 * Unpublish quiz (changes status back to draft)
 */
router.put('/quizzes/:quizId/unpublish', quizController.unpublishQuiz);

/**
 * PUT /api/v2/lms/admin/quizzes/:quizId/archive
 * Archive quiz
 */
router.put('/quizzes/:quizId/archive', quizController.archiveQuiz);

/**
 * PUT /api/v2/lms/admin/quizzes/:quizId/restore
 * Restore archived quiz
 */
router.put('/quizzes/:quizId/restore', quizController.restoreQuiz);

/**
 * PUT /api/v2/lms/admin/quizzes/:quizId/questions/reorder
 * Reorder questions within quiz
 * Body: { questionIds: [array of question _ids in new order] }
 */
router.put('/quizzes/:quizId/questions/reorder', quizController.reorderQuestions);

// ============================================
// QUESTION BANK ROUTES
// ============================================

/**
 * GET /api/v2/lms/admin/question-bank/stats
 * Get question bank statistics
 */
router.get('/question-bank/stats', questionBankController.getQuestionBankStats);

/**
 * GET /api/v2/lms/admin/question-bank/tags
 * Get all unique tags from question bank
 */
router.get('/question-bank/tags', questionBankController.getAllTags);

/**
 * GET /api/v2/lms/admin/question-bank/most-used
 * Get most used questions
 * Query params: limit (default 10)
 */
router.get('/question-bank/most-used', questionBankController.getMostUsedQuestions);

/**
 * GET /api/v2/lms/admin/question-bank
 * Get all questions from question bank with filtering and search
 * Query params: type, tag, search, difficulty, category, sort, limit, offset
 */
router.get('/question-bank', questionBankController.getAllQuestions);

/**
 * POST /api/v2/lms/admin/question-bank
 * Save question to question bank
 * Body: Question data (type, questionText, points, options, etc.)
 */
router.post('/question-bank', questionBankController.createQuestion);

/**
 * GET /api/v2/lms/admin/question-bank/:questionId
 * Get single question from bank
 */
router.get('/question-bank/:questionId', questionBankController.getQuestionById);

/**
 * PUT /api/v2/lms/admin/question-bank/:questionId
 * Update question in bank
 * Body: Question fields to update
 */
router.put('/question-bank/:questionId', questionBankController.updateQuestion);

/**
 * DELETE /api/v2/lms/admin/question-bank/:questionId
 * Delete question from bank (soft delete unless force=true)
 * Query params: force (true for hard delete)
 */
router.delete('/question-bank/:questionId', questionBankController.deleteQuestion);

module.exports = router;
