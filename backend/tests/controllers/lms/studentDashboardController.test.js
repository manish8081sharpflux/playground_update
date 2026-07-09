/**
 * Tests for backend/controllers/lms/student/studentDashboardController.js
 * Story 12.4 (FIX-004) — Backend Test Coverage
 */
const mongoose = require('mongoose');

jest.mock('../../../config/pino-config', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  errorLogger: { error: jest.fn(), info: jest.fn() },
}));

jest.mock('../../../models/user');
jest.mock('../../../models/coin');
jest.mock('../../../models/notification');
jest.mock('../../../models/EmotionTracking');
jest.mock('../../../models/course');
jest.mock('../../../models/StudentProgress');
jest.mock('../../../models/CourseAssignment');

const User = require('../../../models/user');
const Coin = require('../../../models/coin');
const Notification = require('../../../models/notification');
const EmotionTracking = require('../../../models/EmotionTracking');
const Course = require('../../../models/course');
const StudentProgress = require('../../../models/StudentProgress');
const CourseAssignment = require('../../../models/CourseAssignment');

const dashboardController = require('../../../controllers/lms/student/studentDashboardController');
const { mockRequest, mockResponse } = global.testUtils;

describe('StudentDashboardController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== getDashboard ====================
  describe('getDashboard', () => {
    it('should return 404 if student not found', async () => {
      User.findById.mockResolvedValue(null);

      const req = mockRequest({
        params: { studentId: new mongoose.Types.ObjectId().toString() },
      });
      const res = mockResponse();
      await dashboardController.getDashboard(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return dashboard data with courses and stats', async () => {
      const studentId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId();

      User.findById.mockResolvedValue({
        _id: studentId,
        name: 'Test Student',
        streak: 3,
      });

      Course.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            _id: courseId,
            title: 'Excel',
            category: 'Computer Apps',
            thumbnail: 'thumb.jpg',
            modules: [
              {
                chapters: [
                  { contentItems: [{ _id: 'i1' }, { _id: 'i2' }] },
                ],
              },
            ],
          },
        ]),
      });

      StudentProgress.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            course: courseId,
            status: 'in_progress',
            completedItems: [{ itemId: 'i1' }],
            lastAccessedAt: new Date(),
            completionPercentage: 50,
          },
        ]),
      });

      const req = mockRequest({ params: { studentId } });
      const res = mockResponse();
      await dashboardController.getDashboard(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            studentName: 'Test Student',
            courses: expect.any(Array),
            stats: expect.objectContaining({
              totalTasksCompleted: 1,
              currentStreak: 3,
            }),
          }),
        })
      );
    });

    it('should handle errors with 500', async () => {
      User.findById.mockRejectedValue(new Error('DB'));

      const req = mockRequest({ params: { studentId: 'sid' } });
      const res = mockResponse();
      await dashboardController.getDashboard(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== getCoinBalance ====================
  describe('getCoinBalance', () => {
    it('should return 404 if student not found', async () => {
      User.findById.mockResolvedValue(null);

      const req = mockRequest({
        params: { studentId: new mongoose.Types.ObjectId().toString() },
      });
      const res = mockResponse();
      await dashboardController.getCoinBalance(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return coin balance', async () => {
      User.findById.mockResolvedValue({ _id: 'sid' });
      Coin.findOne.mockResolvedValue({ balance: 150 });

      const req = mockRequest({ params: { studentId: 'sid' } });
      const res = mockResponse();
      await dashboardController.getCoinBalance(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, balance: 150 })
      );
    });

    it('should return 0 balance when no coin record', async () => {
      User.findById.mockResolvedValue({ _id: 'sid' });
      Coin.findOne.mockResolvedValue(null);

      const req = mockRequest({ params: { studentId: 'sid' } });
      const res = mockResponse();
      await dashboardController.getCoinBalance(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, balance: 0 })
      );
    });
  });

  // ==================== getNotificationCount ====================
  describe('getNotificationCount', () => {
    it('should return 404 if student not found', async () => {
      User.findById.mockResolvedValue(null);

      const req = mockRequest({
        params: { studentId: new mongoose.Types.ObjectId().toString() },
      });
      const res = mockResponse();
      await dashboardController.getNotificationCount(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return unread notification count', async () => {
      User.findById.mockResolvedValue({ _id: 'sid' });
      Notification.countDocuments.mockResolvedValue(5);

      const req = mockRequest({ params: { studentId: 'sid' } });
      const res = mockResponse();
      await dashboardController.getNotificationCount(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, unreadCount: 5 })
      );
    });
  });

  // ==================== getPendingHomeworkCount ====================
  describe('getPendingHomeworkCount', () => {
    it('should return 404 if student not found', async () => {
      User.findById.mockResolvedValue(null);

      const req = mockRequest({
        params: { studentId: new mongoose.Types.ObjectId().toString() },
      });
      const res = mockResponse();
      await dashboardController.getPendingHomeworkCount(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return homework count', async () => {
      const studentId = new mongoose.Types.ObjectId().toString();
      const courseId1 = new mongoose.Types.ObjectId();
      const courseId2 = new mongoose.Types.ObjectId();

      User.findById.mockResolvedValue({ _id: studentId, balagruhaIds: [] });

      CourseAssignment.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { courseId: courseId1 },
            { courseId: courseId2 },
          ]),
        }),
      });

      StudentProgress.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { course: courseId1, status: 'completed' },
          ]),
        }),
      });

      const req = mockRequest({ params: { studentId } });
      const res = mockResponse();
      await dashboardController.getPendingHomeworkCount(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, count: 1 })
      );
    });
  });

  // ==================== saveEmotion ====================
  describe('saveEmotion', () => {
    it('should return 400 for invalid emotion', async () => {
      const req = mockRequest({
        params: { studentId: 'sid' },
        body: { emotion: 'confused' },
      });
      const res = mockResponse();
      await dashboardController.saveEmotion(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if student not found', async () => {
      User.findById.mockResolvedValue(null);

      const req = mockRequest({
        params: { studentId: new mongoose.Types.ObjectId().toString() },
        body: { emotion: 'happy' },
      });
      const res = mockResponse();
      await dashboardController.saveEmotion(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should save emotion successfully', async () => {
      const studentId = new mongoose.Types.ObjectId().toString();
      User.findById.mockResolvedValue({ _id: studentId });

      const saveMock = jest.fn().mockResolvedValue(true);
      EmotionTracking.mockImplementation(function (data) {
        Object.assign(this, data);
        this._id = new mongoose.Types.ObjectId();
        this.timestamp = data.timestamp || new Date();
        this.save = saveMock;
      });

      const req = mockRequest({
        params: { studentId },
        body: { emotion: 'happy' },
      });
      const res = mockResponse();
      await dashboardController.saveEmotion(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
      expect(saveMock).toHaveBeenCalled();
    });
  });

  // ==================== batchSaveEmotions ====================
  describe('batchSaveEmotions', () => {
    it('should return 400 if emotions is not array', async () => {
      const req = mockRequest({
        params: { studentId: 'sid' },
        body: { emotions: 'not-array' },
      });
      const res = mockResponse();
      await dashboardController.batchSaveEmotions(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if emotions is empty', async () => {
      const req = mockRequest({
        params: { studentId: 'sid' },
        body: { emotions: [] },
      });
      const res = mockResponse();
      await dashboardController.batchSaveEmotions(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if student not found', async () => {
      User.findById.mockResolvedValue(null);

      const req = mockRequest({
        params: { studentId: new mongoose.Types.ObjectId().toString() },
        body: { emotions: [{ emotion: 'happy' }] },
      });
      const res = mockResponse();
      await dashboardController.batchSaveEmotions(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should batch save valid emotions', async () => {
      const studentId = new mongoose.Types.ObjectId().toString();
      User.findById.mockResolvedValue({ _id: studentId });

      EmotionTracking.insertMany.mockResolvedValue([
        { _id: 'e1', emotion: 'happy' },
        { _id: 'e2', emotion: 'sad' },
      ]);

      const req = mockRequest({
        params: { studentId },
        body: {
          emotions: [
            { emotion: 'happy' },
            { emotion: 'sad' },
            { emotion: 'invalid' }, // Should be filtered out
          ],
        },
      });
      const res = mockResponse();
      await dashboardController.batchSaveEmotions(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ syncedCount: 2 }),
        })
      );
    });

    it('should return 400 when no valid emotions after filter', async () => {
      const studentId = new mongoose.Types.ObjectId().toString();
      User.findById.mockResolvedValue({ _id: studentId });

      const req = mockRequest({
        params: { studentId },
        body: {
          emotions: [{ emotion: 'confused' }, { emotion: 'bored' }],
        },
      });
      const res = mockResponse();
      await dashboardController.batchSaveEmotions(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
