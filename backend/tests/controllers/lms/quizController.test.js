/**
 * Tests for backend/controllers/quizController.js
 * Story 12.4 (FIX-004) — Backend Test Coverage
 */
const mongoose = require('mongoose');

jest.mock('../../../models/Quiz');
jest.mock('../../../models/QuestionBank');
jest.mock('../../../models/course');

const Quiz = require('../../../models/Quiz');
const QuestionBank = require('../../../models/QuestionBank');
const Course = require('../../../models/course');

const quizController = require('../../../controllers/quizController');
const { mockRequest, mockResponse } = global.testUtils;

function buildMockQuiz(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    title: 'Test Quiz',
    description: 'A quiz',
    status: 'draft',
    course: new mongoose.Types.ObjectId(),
    module: new mongoose.Types.ObjectId(),
    chapter: new mongoose.Types.ObjectId(),
    questions: [
      {
        _id: new mongoose.Types.ObjectId(),
        questionText: 'Q1',
        type: 'mcq',
        options: [{ _id: new mongoose.Types.ObjectId(), text: 'A', isCorrect: true }],
        order: 0,
        questionBankId: null,
      },
    ],
    settings: { passingScore: 70 },
    tags: [],
    save: jest.fn().mockResolvedValue(true),
    populate: jest.fn().mockResolvedValue(true),
    publish: jest.fn().mockResolvedValue(true),
    unpublish: jest.fn().mockResolvedValue(true),
    duplicate: jest.fn(),
    deleteOne: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('QuizController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== getAllQuizzes ====================
  describe('getAllQuizzes', () => {
    it('should return quizzes with pagination', async () => {
      const quizzes = [{ title: 'Q1' }];
      Quiz.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              sort: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  skip: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(quizzes),
                  }),
                }),
              }),
            }),
          }),
        }),
      });
      Quiz.countDocuments.mockResolvedValue(1);

      const req = mockRequest({ query: {} });
      const res = mockResponse();
      await quizController.getAllQuizzes(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, quizzes })
      );
    });

    it('should handle errors with 500', async () => {
      Quiz.find.mockImplementation(() => { throw new Error('DB'); });

      const req = mockRequest({ query: {} });
      const res = mockResponse();
      await quizController.getAllQuizzes(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== getQuizById ====================
  describe('getQuizById', () => {
    it('should return 404 when quiz not found', async () => {
      Quiz.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(null),
          }),
        }),
      });

      const req = mockRequest({ params: { quizId: new mongoose.Types.ObjectId().toString() } });
      const res = mockResponse();
      await quizController.getQuizById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return quiz with 200', async () => {
      const quiz = buildMockQuiz();
      Quiz.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(quiz),
          }),
        }),
      });

      const req = mockRequest({ params: { quizId: quiz._id.toString() } });
      const res = mockResponse();
      await quizController.getQuizById(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, quiz })
      );
    });
  });

  // ==================== createQuiz ====================
  describe('createQuiz', () => {
    it('should return 400 if title too short', async () => {
      const req = mockRequest({
        body: { title: 'AB' },
        user: { _id: new mongoose.Types.ObjectId() },
      });
      const res = mockResponse();
      await quizController.createQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should create quiz and return 201', async () => {
      const saveMock = jest.fn().mockResolvedValue(true);
      const populateMock = jest.fn().mockResolvedValue(true);
      Quiz.mockImplementation(function (data) {
        Object.assign(this, data);
        this._id = new mongoose.Types.ObjectId();
        this.save = saveMock;
        this.populate = populateMock;
      });

      const req = mockRequest({
        body: {
          title: 'New Quiz',
          description: 'Desc',
          questions: [],
        },
        user: { _id: new mongoose.Types.ObjectId() },
      });
      const res = mockResponse();
      await quizController.createQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(saveMock).toHaveBeenCalled();
    });

    it('should handle errors with 500', async () => {
      Quiz.mockImplementation(function () {
        this.save = jest.fn().mockRejectedValue(new Error('Save failed'));
        this.populate = jest.fn();
      });

      const req = mockRequest({
        body: { title: 'New Quiz' },
        user: { _id: new mongoose.Types.ObjectId() },
      });
      const res = mockResponse();
      await quizController.createQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== updateQuiz ====================
  describe('updateQuiz', () => {
    it('should return 404 when quiz not found', async () => {
      Quiz.findById.mockResolvedValue(null);

      const req = mockRequest({
        params: { quizId: new mongoose.Types.ObjectId().toString() },
        body: { title: 'Updated' },
        user: { _id: new mongoose.Types.ObjectId() },
      });
      const res = mockResponse();
      await quizController.updateQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should update quiz and return 200', async () => {
      const quiz = buildMockQuiz();
      quiz.populate = jest.fn().mockResolvedValue(quiz);
      Quiz.findById.mockResolvedValue(quiz);

      const req = mockRequest({
        params: { quizId: quiz._id.toString() },
        body: { title: 'Updated Title' },
        user: { _id: new mongoose.Types.ObjectId() },
      });
      const res = mockResponse();
      await quizController.updateQuiz(req, res);

      expect(quiz.title).toBe('Updated Title');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  // ==================== deleteQuiz ====================
  describe('deleteQuiz', () => {
    it('should return 404 when quiz not found', async () => {
      Quiz.findById.mockResolvedValue(null);

      const req = mockRequest({ params: { quizId: new mongoose.Types.ObjectId().toString() } });
      const res = mockResponse();
      await quizController.deleteQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should delete quiz and return 200', async () => {
      const quiz = buildMockQuiz({ course: null, module: null, chapter: null });
      quiz.questions = [];
      Quiz.findById.mockResolvedValue(quiz);
      QuestionBank.updateMany.mockResolvedValue({});

      const req = mockRequest({ params: { quizId: quiz._id.toString() } });
      const res = mockResponse();
      await quizController.deleteQuiz(req, res);

      expect(quiz.deleteOne).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  // ==================== duplicateQuiz ====================
  describe('duplicateQuiz', () => {
    it('should return 404 when quiz not found', async () => {
      Quiz.findById.mockResolvedValue(null);

      const req = mockRequest({
        params: { quizId: new mongoose.Types.ObjectId().toString() },
        user: { _id: new mongoose.Types.ObjectId() },
      });
      const res = mockResponse();
      await quizController.duplicateQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should duplicate quiz and return 201', async () => {
      const dupQuiz = buildMockQuiz({ title: 'Dup Quiz (Copy)' });
      dupQuiz.populate = jest.fn().mockResolvedValue(dupQuiz);
      const origQuiz = buildMockQuiz();
      origQuiz.duplicate = jest.fn().mockReturnValue(dupQuiz);
      Quiz.findById.mockResolvedValue(origQuiz);

      const req = mockRequest({
        params: { quizId: origQuiz._id.toString() },
        user: { _id: new mongoose.Types.ObjectId() },
      });
      const res = mockResponse();
      await quizController.duplicateQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(dupQuiz.save).toHaveBeenCalled();
    });
  });

  // ==================== publishQuiz ====================
  describe('publishQuiz', () => {
    it('should return 404 when quiz not found', async () => {
      Quiz.findById.mockResolvedValue(null);

      const req = mockRequest({ params: { quizId: new mongoose.Types.ObjectId().toString() } });
      const res = mockResponse();
      await quizController.publishQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if quiz has no questions', async () => {
      const quiz = buildMockQuiz({ questions: [] });
      Quiz.findById.mockResolvedValue(quiz);

      const req = mockRequest({ params: { quizId: quiz._id.toString() } });
      const res = mockResponse();
      await quizController.publishQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if quiz has no chapter', async () => {
      const quiz = buildMockQuiz({ chapter: null });
      Quiz.findById.mockResolvedValue(quiz);

      const req = mockRequest({ params: { quizId: quiz._id.toString() } });
      const res = mockResponse();
      await quizController.publishQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should publish valid quiz and return 200', async () => {
      const quiz = buildMockQuiz();
      Quiz.findById.mockResolvedValue(quiz);

      const req = mockRequest({ params: { quizId: quiz._id.toString() } });
      const res = mockResponse();
      await quizController.publishQuiz(req, res);

      expect(quiz.publish).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  // ==================== unpublishQuiz ====================
  describe('unpublishQuiz', () => {
    it('should unpublish quiz and return 200', async () => {
      const quiz = buildMockQuiz({ status: 'published' });
      Quiz.findById.mockResolvedValue(quiz);

      const req = mockRequest({ params: { quizId: quiz._id.toString() } });
      const res = mockResponse();
      await quizController.unpublishQuiz(req, res);

      expect(quiz.unpublish).toHaveBeenCalled();
    });
  });

  // ==================== archiveQuiz ====================
  describe('archiveQuiz', () => {
    it('should archive quiz and return 200', async () => {
      const quiz = buildMockQuiz();
      Quiz.findById.mockResolvedValue(quiz);

      const req = mockRequest({
        params: { quizId: quiz._id.toString() },
        user: { _id: new mongoose.Types.ObjectId() },
      });
      const res = mockResponse();
      await quizController.archiveQuiz(req, res);

      expect(quiz.status).toBe('archived');
      expect(quiz.save).toHaveBeenCalled();
    });
  });

  // ==================== restoreQuiz ====================
  describe('restoreQuiz', () => {
    it('should restore quiz to draft', async () => {
      const quiz = buildMockQuiz({ status: 'archived' });
      Quiz.findById.mockResolvedValue(quiz);

      const req = mockRequest({
        params: { quizId: quiz._id.toString() },
        user: { _id: new mongoose.Types.ObjectId() },
      });
      const res = mockResponse();
      await quizController.restoreQuiz(req, res);

      expect(quiz.status).toBe('draft');
      expect(quiz.save).toHaveBeenCalled();
    });
  });

  // ==================== reorderQuestions ====================
  describe('reorderQuestions', () => {
    it('should return 404 when quiz not found', async () => {
      Quiz.findById.mockResolvedValue(null);

      const req = mockRequest({
        params: { quizId: new mongoose.Types.ObjectId().toString() },
        body: { questionIds: [] },
        user: { _id: new mongoose.Types.ObjectId() },
      });
      const res = mockResponse();
      await quizController.reorderQuestions(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should reorder questions and return 200', async () => {
      const q1Id = new mongoose.Types.ObjectId();
      const q2Id = new mongoose.Types.ObjectId();
      const quiz = buildMockQuiz();
      quiz.questions = [
        { _id: q1Id, order: 0 },
        { _id: q2Id, order: 1 },
      ];
      quiz.questions.id = jest.fn((id) =>
        quiz.questions.find((q) => q._id.toString() === id?.toString())
      );
      Quiz.findById.mockResolvedValue(quiz);

      const req = mockRequest({
        params: { quizId: quiz._id.toString() },
        body: { questionIds: [q2Id.toString(), q1Id.toString()] },
        user: { _id: new mongoose.Types.ObjectId() },
      });
      const res = mockResponse();
      await quizController.reorderQuestions(req, res);

      expect(quiz.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  // ==================== getQuizStats ====================
  describe('getQuizStats', () => {
    it('should return stats', async () => {
      Quiz.countDocuments
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(5)  // published
        .mockResolvedValueOnce(3); // draft
      Quiz.aggregate.mockResolvedValue([{ _id: 'mcq', count: 20 }]);

      const req = mockRequest({});
      const res = mockResponse();
      await quizController.getQuizStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          stats: expect.objectContaining({
            totalQuizzes: 10,
            publishedQuizzes: 5,
            draftQuizzes: 3,
          }),
        })
      );
    });
  });
});
