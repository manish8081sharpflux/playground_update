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
jest.mock('../../../models/Submission');

const User = require('../../../models/user');
const Coin = require('../../../models/coin');
const Notification = require('../../../models/notification');
const EmotionTracking = require('../../../models/EmotionTracking');
const Course = require('../../../models/course');
const StudentProgress = require('../../../models/StudentProgress');
const CourseAssignment = require('../../../models/CourseAssignment');
const Submission = require('../../../models/Submission');

const dashboardController = require('../../../controllers/lms/student/studentDashboardController');
const { mockRequest, mockResponse } = global.testUtils;

describe('StudentDashboardController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    CourseAssignment.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    });
    Submission.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    });
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
      const moduleId = new mongoose.Types.ObjectId();

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
                _id: moduleId,
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
            completedItems: [{ itemId: 'i1' }, { itemId: 'i2' }],
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

    it('should ignore stale completed items that are not in the course content', async () => {
      const studentId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId();
      const module1 = new mongoose.Types.ObjectId();
      const module2 = new mongoose.Types.ObjectId();
      const module3 = new mongoose.Types.ObjectId();
      const module1Items = Array.from({ length: 5 }, () => ({ _id: new mongoose.Types.ObjectId() }));
      const module2Items = Array.from({ length: 5 }, () => ({ _id: new mongoose.Types.ObjectId() }));
      const module3Items = Array.from({ length: 5 }, () => ({ _id: new mongoose.Types.ObjectId() }));

      User.findById.mockResolvedValue({
        _id: studentId,
        name: 'Test Student',
        streak: 0,
      });

      Course.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            _id: courseId,
            title: 'Computer Apps',
            category: 'Computer Apps',
            modules: [
              {
                _id: module1,
                chapters: [
                  { contentItems: module1Items },
                ],
              },
              {
                _id: module2,
                chapters: [
                  { contentItems: module2Items },
                ],
              },
              {
                _id: module3,
                chapters: [
                  { contentItems: module3Items },
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
            completedItems: [
              ...module1Items.map(item => ({ itemId: item._id })),
              ...module2Items.slice(0, 4).map(item => ({ itemId: item._id })),
              ...Array.from({ length: 5 }, () => ({ itemId: new mongoose.Types.ObjectId() })),
            ],
            lastAccessedAt: new Date(),
            completionPercentage: 100,
          },
        ]),
      });

      const req = mockRequest({ params: { studentId } });
      const res = mockResponse();
      await dashboardController.getDashboard(req, res);

      expect(res.json.mock.calls[0][0].data.courses[0]).toEqual(
        expect.objectContaining({
          totalTasks: 3,
          completedTasks: 1,
          progressPercentage: 33,
        })
      );
    });

    it('should not complete a module from completedModules when visible tasks are incomplete', async () => {
      const studentId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId();
      const moduleId = new mongoose.Types.ObjectId();
      const completedTaskId = new mongoose.Types.ObjectId();
      const availableTaskId = new mongoose.Types.ObjectId();

      User.findById.mockResolvedValue({
        _id: studentId,
        name: 'Test Student',
        streak: 0,
      });

      Course.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            _id: courseId,
            title: 'Spoken English',
            category: 'Spoken English',
            modules: [
              {
                _id: moduleId,
                chapters: [
                  {
                    contentItems: [
                      { _id: completedTaskId },
                      { _id: availableTaskId },
                    ],
                  },
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
            status: 'completed',
            completedModules: [moduleId],
            completedItems: [{ itemId: completedTaskId }],
            lastAccessedAt: new Date(),
            completionPercentage: 100,
          },
        ]),
      });

      const req = mockRequest({ params: { studentId } });
      const res = mockResponse();
      await dashboardController.getDashboard(req, res);

      expect(res.json.mock.calls[0][0].data.courses[0]).toEqual(
        expect.objectContaining({
          totalTasks: 1,
          completedTasks: 0,
          progressPercentage: 0,
          status: 'in_progress',
        })
      );
    });

    it('should include published category courses even when assignments exist', async () => {
      const studentId = new mongoose.Types.ObjectId().toString();
      const assignedCourseId = new mongoose.Types.ObjectId();
      const publishedCourseId = new mongoose.Types.ObjectId();
      const assignedTaskId = new mongoose.Types.ObjectId();
      const availableTaskId = new mongoose.Types.ObjectId();

      User.findById.mockResolvedValue({
        _id: studentId,
        name: 'Test Student',
        streak: 0,
        balagruhaIds: [],
      });

      CourseAssignment.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            courseId: assignedCourseId,
            status: 'active',
            assignedTo: { studentIds: [studentId] },
          },
        ]),
      });

      Course.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            _id: assignedCourseId,
            title: 'Assigned Spoken English',
            category: 'Spoken English',
            modules: [
              {
                chapters: [
                  { contentItems: [{ _id: assignedTaskId }] },
                ],
              },
            ],
          },
          {
            _id: publishedCourseId,
            title: 'Published Spoken English',
            category: 'Spoken English',
            modules: [
              {
                chapters: [
                  { contentItems: [{ _id: availableTaskId }] },
                ],
              },
            ],
          },
        ]),
      });

      StudentProgress.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            course: assignedCourseId,
            status: 'completed',
            completedItems: [{ itemId: assignedTaskId }],
            lastAccessedAt: new Date(),
            completionPercentage: 100,
          },
        ]),
      });

      const req = mockRequest({ params: { studentId } });
      const res = mockResponse();
      await dashboardController.getDashboard(req, res);

      const spokenCourses = res.json.mock.calls[0][0].data.courses.filter(
        course => course.courseType === 'Spoken English'
      );

      expect(spokenCourses).toHaveLength(2);
      expect(spokenCourses.reduce((sum, course) => sum + course.totalTasks, 0)).toBe(2);
      expect(spokenCourses.reduce((sum, course) => sum + course.completedTasks, 0)).toBe(1);
    });

    it('should count completed quiz refs against their visible content item', async () => {
      const studentId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId();
      const moduleId = new mongoose.Types.ObjectId();
      const contentItemId = new mongoose.Types.ObjectId();
      const quizId = new mongoose.Types.ObjectId();

      User.findById.mockResolvedValue({
        _id: studentId,
        name: 'Test Student',
        streak: 0,
      });

      Course.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            _id: courseId,
            title: 'Computer Apps',
            category: 'Computer Apps',
            modules: [
              {
                _id: moduleId,
                chapters: [
                  {
                    contentItems: [
                      { _id: contentItemId, quizRef: { _id: quizId } },
                    ],
                  },
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
            completedItems: [{ itemId: quizId }],
            lastAccessedAt: new Date(),
            completionPercentage: 100,
          },
        ]),
      });

      const req = mockRequest({ params: { studentId } });
      const res = mockResponse();
      await dashboardController.getDashboard(req, res);

      expect(res.json.mock.calls[0][0].data.courses[0]).toEqual(
        expect.objectContaining({
          totalTasks: 1,
          completedTasks: 1,
          progressPercentage: 100,
        })
      );
    });

    it('should count graded submissions against their visible content item', async () => {
      const studentId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId();
      const completedModuleId = new mongoose.Types.ObjectId();
      const incompleteModuleId = new mongoose.Types.ObjectId();
      const taskId = new mongoose.Types.ObjectId();

      User.findById.mockResolvedValue({
        _id: studentId,
        name: 'Test Student',
        streak: 0,
      });

      Course.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            _id: courseId,
            title: 'Spoken English',
            category: 'Spoken English',
            modules: [
              {
                _id: completedModuleId,
                chapters: [
                  {
                    contentItems: [
                      { _id: taskId },
                    ],
                  },
                ],
              },
              {
                _id: incompleteModuleId,
                chapters: [
                  {
                    contentItems: [
                      { _id: new mongoose.Types.ObjectId() },
                    ],
                  },
                ],
              },
            ],
          },
        ]),
      });

      StudentProgress.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      Submission.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              courseId,
              taskId: taskId.toString(),
            },
          ]),
        }),
      });

      const req = mockRequest({ params: { studentId } });
      const res = mockResponse();
      await dashboardController.getDashboard(req, res);

      expect(res.json.mock.calls[0][0].data.courses[0]).toEqual(
        expect.objectContaining({
          totalTasks: 2,
          completedTasks: 1,
          progressPercentage: 50,
          status: 'in_progress',
        })
      );
      expect(res.json.mock.calls[0][0].data.stats.totalTasksCompleted).toBe(1);
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
      Notification.getUnreadCount.mockResolvedValue(5);

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
