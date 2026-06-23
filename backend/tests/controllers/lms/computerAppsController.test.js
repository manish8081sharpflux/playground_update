/**
 * Tests for backend/controllers/lms/student/computerAppsController.js
 * Story 12.4 (FIX-004) — Backend Test Coverage
 */
const mongoose = require('mongoose');

jest.mock('../../../config/pino-config', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  errorLogger: { error: jest.fn(), info: jest.fn() },
}));

jest.mock('../../../models/course');
jest.mock('../../../models/StudentProgress');
jest.mock('../../../models/Submission');

const Course = require('../../../models/course');
const StudentProgress = require('../../../models/StudentProgress');
const computerAppsController = require('../../../controllers/lms/student/computerAppsController');
const { mockRequest, mockResponse } = global.testUtils;

describe('ComputerAppsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== getComputerApps ====================
  describe('getComputerApps', () => {
    it('should return apps list with progress', async () => {
      const studentId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId();

      Course.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              _id: courseId,
              title: 'Excel Basics',
              icon: '📊',
              modules: [
                {
                  chapters: [
                    { contentItems: [{ _id: 'item1' }, { _id: 'item2' }] },
                  ],
                },
              ],
            },
          ]),
        }),
      });

      StudentProgress.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            course: courseId,
            completedItems: [{ itemId: 'item1' }],
          },
        ]),
      });

      const req = mockRequest({ params: { studentId } });
      const res = mockResponse();
      await computerAppsController.getComputerApps(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          apps: expect.arrayContaining([
            expect.objectContaining({
              name: 'Excel Basics',
              totalTasks: 2,
              completedTasks: 1,
              status: 'in_progress',
              progressPercentage: 50,
            }),
          ]),
        })
      );
    });

    it('should return empty apps when no courses', async () => {
      Course.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      StudentProgress.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const req = mockRequest({ params: { studentId: new mongoose.Types.ObjectId().toString() } });
      const res = mockResponse();
      await computerAppsController.getComputerApps(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, apps: [] })
      );
    });

    it('should handle errors with 500', async () => {
      Course.find.mockImplementation(() => { throw new Error('DB'); });

      const req = mockRequest({ params: { studentId: 'sid' } });
      const res = mockResponse();
      await computerAppsController.getComputerApps(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== getCourseHierarchy ====================
  describe('getCourseHierarchy', () => {
    it('should return 400 for invalid courseId', async () => {
      const req = mockRequest({
        params: { studentId: 'sid', courseId: 'bad' },
      });
      const res = mockResponse();
      await computerAppsController.getCourseHierarchy(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when course not found', async () => {
      const courseId = new mongoose.Types.ObjectId().toString();
      Course.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      const req = mockRequest({
        params: { studentId: 'sid', courseId },
      });
      const res = mockResponse();
      await computerAppsController.getCourseHierarchy(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return hierarchy with progress', async () => {
      const courseId = new mongoose.Types.ObjectId().toString();
      const itemId = new mongoose.Types.ObjectId();

      Course.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: courseId,
            title: 'Excel',
            modules: [
              {
                _id: new mongoose.Types.ObjectId(),
                title: 'Module 1',
                chapters: [
                  {
                    _id: new mongoose.Types.ObjectId(),
                    title: 'Ch 1',
                    contentItems: [
                      {
                        _id: itemId,
                        title: 'Lesson 1',
                        type: 'video',
                        fileUrl: 'url',
                        description: 'd',
                        metadata: {},
                      },
                    ],
                  },
                ],
              },
            ],
          }),
        }),
      });

      StudentProgress.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          completedItems: [{ itemId: itemId }],
        }),
      });

      const req = mockRequest({
        params: { studentId: 'sid', courseId },
      });
      const res = mockResponse();
      await computerAppsController.getCourseHierarchy(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          courseTitle: 'Excel',
          modules: expect.any(Array),
        })
      );
    });
  });

  // ==================== getContentDetails ====================
  describe('getContentDetails', () => {
    it('should return 404 when content not found', async () => {
      // Register ContentLibrary model mock
      const ContentLibraryMock = {
        findById: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      };
      mongoose.model = jest.fn().mockReturnValue(ContentLibraryMock);

      const req = mockRequest({
        params: {
          studentId: 'sid',
          courseId: new mongoose.Types.ObjectId().toString(),
          contentId: new mongoose.Types.ObjectId().toString(),
        },
      });
      const res = mockResponse();
      await computerAppsController.getContentDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ==================== getQuiz ====================
  describe('getQuiz', () => {
    it('should return 404 when quiz not found', async () => {
      const QuizMock = {
        findById: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(null),
          }),
        }),
      };
      mongoose.model = jest.fn().mockReturnValue(QuizMock);

      const req = mockRequest({
        params: {
          studentId: 'sid',
          quizId: new mongoose.Types.ObjectId().toString(),
        },
      });
      const res = mockResponse();
      await computerAppsController.getQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return quiz without correct answers', async () => {
      const quizId = new mongoose.Types.ObjectId().toString();
      const quiz = {
        _id: quizId,
        title: 'Test Quiz',
        questions: [{ text: 'Q1' }],
        settings: { maxAttempts: 3, unlimitedAttempts: true },
      };
      const QuizMock = {
        findById: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(quiz),
          }),
        }),
      };
      mongoose.model = jest.fn().mockReturnValue(QuizMock);

      const req = mockRequest({
        params: { studentId: 'sid', quizId },
      });
      const res = mockResponse();
      await computerAppsController.getQuiz(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, quiz })
      );
    });
  });

  // ==================== markComplete ====================
  describe('markComplete', () => {
    it('should return 400 if itemId or courseId missing', async () => {
      const req = mockRequest({
        params: { studentId: new mongoose.Types.ObjectId().toString() },
        body: {},
      });
      const res = mockResponse();
      await computerAppsController.markComplete(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should create new progress if none exists', async () => {
      const studentId = new mongoose.Types.ObjectId().toString();
      const itemId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId().toString();

      StudentProgress.findOne.mockResolvedValue(null);

      const savedProgress = {
        _id: new mongoose.Types.ObjectId(),
        student: studentId,
        course: courseId,
        completedItems: [],
        save: jest.fn().mockResolvedValue(true),
      };
      StudentProgress.mockImplementation(function (data) {
        Object.assign(this, data);
        this._id = new mongoose.Types.ObjectId();
        this.save = jest.fn().mockResolvedValue(this);
        this.completedItems = [];
      });

      StudentProgress.findByIdAndUpdate.mockResolvedValue({
        _id: savedProgress._id,
        completedItems: [{ itemId }],
      });

      const req = mockRequest({
        params: { studentId },
        body: { itemId, courseId, itemType: 'video' },
      });
      const res = mockResponse();
      await computerAppsController.markComplete(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should skip duplicate items', async () => {
      const studentId = new mongoose.Types.ObjectId().toString();
      const itemId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId().toString();

      const existingProgress = {
        _id: new mongoose.Types.ObjectId(),
        completedItems: [{ itemId }],
      };
      StudentProgress.findOne.mockResolvedValue(existingProgress);

      const req = mockRequest({
        params: { studentId },
        body: { itemId, courseId, itemType: 'video' },
      });
      const res = mockResponse();
      await computerAppsController.markComplete(req, res);

      // Should still return success even if skipped
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });
});
