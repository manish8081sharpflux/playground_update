const mongoose = require('mongoose');

// Mock pino logger before requiring controller
jest.mock('../../config/pino-config', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  errorLogger: { error: jest.fn(), info: jest.fn() },
}));

// Mock all models used by the controller
jest.mock('../../models/user');
jest.mock('../../models/StudentProgress');
jest.mock('../../models/coin');
jest.mock('../../models/CourseAssignment');

const User = require('../../models/user');
const StudentProgress = require('../../models/StudentProgress');
const Coin = require('../../models/coin');
const CourseAssignment = require('../../models/CourseAssignment');
const coachReportsController = require('../../controllers/lms/coach/coachReportsController');
const { mockRequest, mockResponse } = global.testUtils;

describe('CoachReportsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const coachId = new mongoose.Types.ObjectId();
  const balagruhaId1 = new mongoose.Types.ObjectId();
  const balagruhaId2 = new mongoose.Types.ObjectId();
  const studentId1 = new mongoose.Types.ObjectId();
  const studentId2 = new mongoose.Types.ObjectId();
  const studentId3 = new mongoose.Types.ObjectId();
  const courseId1 = new mongoose.Types.ObjectId();
  const courseId2 = new mongoose.Types.ObjectId();

  function buildReq(overrides = {}) {
    return mockRequest({
      user: {
        _id: coachId,
        balagruhaIds: [balagruhaId1, balagruhaId2],
        ...overrides.user,
      },
      query: overrides.query || {},
      params: overrides.params || {},
    });
  }

  // =====================================================
  // getOverviewStats
  // =====================================================
  describe('getOverviewStats', () => {
    it('should scope students to coach balagruha and return stats', async () => {
      const req = buildReq();
      const res = mockResponse();

      // Mock User.find for balagruha students
      User.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([
          { _id: studentId1 },
          { _id: studentId2 },
        ])
      });

      // Mock Coin.aggregate for coins distributed
      Coin.aggregate.mockResolvedValue([{ total: 150 }]);

      // Mock CourseAssignment.countDocuments
      CourseAssignment.countDocuments.mockResolvedValue(3);

      // Mock StudentProgress.aggregate for completions
      StudentProgress.aggregate.mockResolvedValue([{ totalCompletions: 42 }]);

      await coachReportsController.getOverviewStats(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        stats: {
          totalStudents: 2,
          totalCoinsAwarded: 150,
          activeAssignments: 3,
          totalActivitiesCompleted: 42
        }
      });

      // Verify balagruha scoping on User.find
      expect(User.find).toHaveBeenCalledWith({
        role: 'student',
        balagruhaIds: { $in: [balagruhaId1, balagruhaId2] }
      });

      // Verify StudentProgress.aggregate is scoped to student IDs
      const spAggCall = StudentProgress.aggregate.mock.calls[0][0];
      expect(spAggCall[0].$match.student.$in).toEqual([studentId1, studentId2]);
    });

    it('should return zero students when coach has no balagruhaIds', async () => {
      const req = buildReq({ user: { balagruhaIds: [] } });
      const res = mockResponse();

      User.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([])
      });
      Coin.aggregate.mockResolvedValue([]);
      CourseAssignment.countDocuments.mockResolvedValue(0);
      StudentProgress.aggregate.mockResolvedValue([]);

      await coachReportsController.getOverviewStats(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        stats: {
          totalStudents: 0,
          totalCoinsAwarded: 0,
          activeAssignments: 0,
          totalActivitiesCompleted: 0
        }
      });
    });

    it('should handle undefined balagruhaIds gracefully', async () => {
      const req = buildReq({ user: { balagruhaIds: undefined } });
      const res = mockResponse();

      User.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([])
      });
      Coin.aggregate.mockResolvedValue([]);
      CourseAssignment.countDocuments.mockResolvedValue(0);
      StudentProgress.aggregate.mockResolvedValue([]);

      await coachReportsController.getOverviewStats(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      const req = buildReq();
      const res = mockResponse();

      User.find.mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('DB error'))
      });

      await coachReportsController.getOverviewStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Server error fetching stats'
      }));
    });
  });

  // =====================================================
  // getLeaderboard
  // =====================================================
  describe('getLeaderboard', () => {
    it('should return scoped leaderboard for coach balagruha students', async () => {
      const req = buildReq({ query: { limit: '5', period: 'weekly' } });
      const res = mockResponse();

      User.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([
          { _id: studentId1 },
          { _id: studentId2 },
        ])
      });

      Coin.aggregate.mockResolvedValue([
        { _id: studentId1, totalCoins: 100, firstName: 'Alice', lastName: 'A' },
        { _id: studentId2, totalCoins: 50, firstName: 'Bob', lastName: 'B' },
      ]);

      await coachReportsController.getLeaderboard(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        period: 'weekly',
        leaderboard: expect.any(Array)
      });

      // Verify Coin.aggregate was called (scoped pipeline)
      expect(Coin.aggregate).toHaveBeenCalled();
    });

    it('should return empty leaderboard when no students', async () => {
      const req = buildReq({ user: { balagruhaIds: [] } });
      const res = mockResponse();

      User.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([])
      });

      await coachReportsController.getLeaderboard(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        period: 'weekly',
        leaderboard: []
      });
      // Coin.aggregate should NOT be called if no students
      expect(Coin.aggregate).not.toHaveBeenCalled();
    });

    it('should handle monthly period', async () => {
      const req = buildReq({ query: { period: 'monthly' } });
      const res = mockResponse();

      User.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([{ _id: studentId1 }])
      });
      Coin.aggregate.mockResolvedValue([]);

      await coachReportsController.getLeaderboard(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        period: 'monthly'
      }));
    });

    it('should return 500 on error', async () => {
      const req = buildReq();
      const res = mockResponse();

      User.find.mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('DB error'))
      });

      await coachReportsController.getLeaderboard(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // =====================================================
  // getCourseCompletionRates
  // =====================================================
  describe('getCourseCompletionRates', () => {
    it('should return per-course completion rates scoped to balagruha', async () => {
      const req = buildReq();
      const res = mockResponse();

      User.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([
          { _id: studentId1 },
          { _id: studentId2 },
          { _id: studentId3 },
        ])
      });

      // Mock CourseAssignment.find with populate chain
      const mockAssignments = [
        { courseId: { _id: courseId1, title: 'Math 101', category: 'math', thumbnail: null } },
        { courseId: { _id: courseId2, title: 'Art 201', category: 'art', thumbnail: null } },
      ];
      CourseAssignment.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockAssignments)
      });

      // Mock StudentProgress.find
      StudentProgress.find.mockResolvedValue([
        { course: courseId1, student: studentId1, status: 'completed', completionPercentage: 100 },
        { course: courseId1, student: studentId2, status: 'in_progress', completionPercentage: 50 },
        { course: courseId2, student: studentId1, status: 'completed', completionPercentage: 100 },
      ]);

      await coachReportsController.getCourseCompletionRates(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        courseCompletionRates: expect.arrayContaining([
          expect.objectContaining({
            courseId: courseId1.toString(),
            courseTitle: 'Math 101',
            totalStudents: 3,
            studentsCompleted: 1,
            studentsStarted: 2,
            completionRate: 33 // 1/3 = 33%
          }),
          expect.objectContaining({
            courseId: courseId2.toString(),
            courseTitle: 'Art 201',
            totalStudents: 3,
            studentsCompleted: 1,
            studentsStarted: 1,
            completionRate: 33 // 1/3 = 33%
          })
        ])
      });
    });

    it('should return empty array when no assignments', async () => {
      const req = buildReq();
      const res = mockResponse();

      User.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([{ _id: studentId1 }])
      });

      CourseAssignment.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([])
      });

      await coachReportsController.getCourseCompletionRates(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        courseCompletionRates: []
      });
    });

    it('should return empty array when no students in balagruha', async () => {
      const req = buildReq({ user: { balagruhaIds: [] } });
      const res = mockResponse();

      User.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([])
      });

      CourseAssignment.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([
          { courseId: { _id: courseId1, title: 'Math 101' } }
        ])
      });

      await coachReportsController.getCourseCompletionRates(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        courseCompletionRates: []
      });
    });

    it('should return 500 on error', async () => {
      const req = buildReq();
      const res = mockResponse();

      User.find.mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('DB error'))
      });

      await coachReportsController.getCourseCompletionRates(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Server error fetching course completion rates'
      }));
    });
  });

  // =====================================================
  // getSlowLearners
  // =====================================================
  describe('getSlowLearners', () => {
    it('should identify students below average progress', async () => {
      const req = buildReq();
      const res = mockResponse();

      User.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([
          { _id: studentId1 },
          { _id: studentId2 },
          { _id: studentId3 },
        ])
      });

      // Mock StudentProgress.find with populate chain
      const mockProgress = [
        {
          student: { _id: studentId1, firstName: 'Alice', lastName: 'A', name: 'Alice A' },
          course: { _id: courseId1, title: 'Math 101', category: 'math' },
          completionPercentage: 90,
          status: 'completed'
        },
        {
          student: { _id: studentId2, firstName: 'Bob', lastName: 'B', name: 'Bob B' },
          course: { _id: courseId1, title: 'Math 101', category: 'math' },
          completionPercentage: 20,
          status: 'in_progress'
        },
        {
          student: { _id: studentId3, firstName: 'Carol', lastName: 'C', name: 'Carol C' },
          course: { _id: courseId1, title: 'Math 101', category: 'math' },
          completionPercentage: 40,
          status: 'in_progress'
        },
      ];
      StudentProgress.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockProgress)
        })
      });

      await coachReportsController.getSlowLearners(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result.success).toBe(true);
      // Average: (90+20+40)/3 = 50
      expect(result.averageCompletion).toBe(50);
      expect(result.threshold).toBe(50);
      // Bob (20) and Carol (40) are below 50
      expect(result.slowLearners).toHaveLength(2);
      expect(result.slowLearners[0].averageCompletion).toBe(20); // Bob first (lowest)
      expect(result.slowLearners[1].averageCompletion).toBe(40); // Carol second
    });

    it('should use explicit threshold when provided', async () => {
      const req = buildReq({ query: { threshold: '30' } });
      const res = mockResponse();

      User.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([
          { _id: studentId1 },
          { _id: studentId2 },
        ])
      });

      const mockProgress = [
        {
          student: { _id: studentId1, firstName: 'Alice', lastName: 'A', name: 'Alice A' },
          course: { _id: courseId1, title: 'Math 101', category: 'math' },
          completionPercentage: 80,
          status: 'completed'
        },
        {
          student: { _id: studentId2, firstName: 'Bob', lastName: 'B', name: 'Bob B' },
          course: { _id: courseId1, title: 'Math 101', category: 'math' },
          completionPercentage: 20,
          status: 'in_progress'
        },
      ];
      StudentProgress.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockProgress)
        })
      });

      await coachReportsController.getSlowLearners(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result.threshold).toBe(30);
      // Only Bob (20) is below threshold 30
      expect(result.slowLearners).toHaveLength(1);
      expect(result.slowLearners[0].studentId).toBe(studentId2.toString());
    });

    it('should return empty array when no students in balagruha', async () => {
      const req = buildReq({ user: { balagruhaIds: [] } });
      const res = mockResponse();

      User.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([])
      });

      await coachReportsController.getSlowLearners(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        averageCompletion: 0,
        threshold: 0,
        slowLearners: []
      });
    });

    it('should return 500 on error', async () => {
      const req = buildReq();
      const res = mockResponse();

      User.find.mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('DB error'))
      });

      await coachReportsController.getSlowLearners(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Server error identifying slow learners'
      }));
    });
  });

  // =====================================================
  // getCourseDetail (FR21)
  // =====================================================
  describe('getCourseDetail', () => {
    it('should return per-course stats scoped to balagruha', async () => {
      const req = buildReq({ params: { courseId: courseId1.toString() } });
      const res = mockResponse();

      // Mock balagruha student lookup
      User.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([
          { _id: studentId1 },
          { _id: studentId2 },
        ])
      });

      // Mock StudentProgress.find with populate chain
      StudentProgress.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([
          {
            student: { _id: studentId1, name: 'Student A' },
            course: courseId1,
            completionPercentage: 80,
            status: 'completed',
            quizScore: 90,
            updatedAt: new Date()
          },
          {
            student: { _id: studentId2, name: 'Student B' },
            course: courseId1,
            completionPercentage: 40,
            status: 'in_progress',
            quizScore: 60,
            updatedAt: new Date()
          }
        ])
      });

      await coachReportsController.getCourseDetail(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        courseId: courseId1.toString(),
        stats: expect.objectContaining({
          totalStudents: 2,
          studentsStarted: 2,
          studentsCompleted: 1,
          completionRate: 50,
          avgScore: 75,
        })
      }));
    });

    it('should return empty stats when no students in balagruha', async () => {
      const req = buildReq({ params: { courseId: courseId1.toString() } });
      const res = mockResponse();

      User.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([])
      });

      await coachReportsController.getCourseDetail(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        stats: expect.objectContaining({
          totalStudents: 0,
          completionRate: 0,
        })
      }));
    });

    it('should return 500 on error', async () => {
      const req = buildReq({ params: { courseId: courseId1.toString() } });
      const res = mockResponse();

      User.find.mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('DB error'))
      });

      await coachReportsController.getCourseDetail(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
