const mongoose = require('mongoose');

// Mock pino logger before requiring controller
jest.mock('../../config/pino-config', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  errorLogger: { error: jest.fn(), info: jest.fn() },
}));

// Mock all models used by the controller
jest.mock('../../models/Submission');
jest.mock('../../models/user');
jest.mock('../../models/course');
jest.mock('../../models/notification');
jest.mock('../../models/coin');
jest.mock('../../services/lmsCoinLimitSettings', () => ({
  getSettings: jest.fn(),
  getRangeForSubmission: jest.fn(),
}));

const Submission = require('../../models/Submission');
const User = require('../../models/user');
const Notification = require('../../models/notification');
const Coin = require('../../models/coin');
const LmsCoinLimitSettingsService = require('../../services/lmsCoinLimitSettings');
const coachGradingController = require('../../controllers/lms/coach/coachGradingController');
const { mockRequest, mockResponse } = global.testUtils;

describe('CoachGradingController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    LmsCoinLimitSettingsService.getSettings.mockResolvedValue({
      taskTypes: {
        story: {
          label: 'Stories',
          keywords: ['story', 'stories'],
          excellent: { min: 80, max: 100, default: 85 },
          good: { min: 50, max: 79, default: 65 },
          needs_improvement: { min: 0, max: 49, default: 25 },
        },
      },
    });
    LmsCoinLimitSettingsService.getRangeForSubmission.mockImplementation((_submission, quality) => {
      const ranges = {
        excellent: { min: 80, max: 100, default: 85 },
        good: { min: 50, max: 79, default: 65 },
        needs_improvement: { min: 0, max: 49, default: 25 },
      };
      return Promise.resolve({
        taskTypeKey: 'story',
        taskTypeLabel: 'Stories',
        range: ranges[quality],
      });
    });
  });

  describe('submitGrade', () => {
    const coachId = new mongoose.Types.ObjectId().toString();
    const studentId = new mongoose.Types.ObjectId();
    const courseId = new mongoose.Types.ObjectId();
    const submissionId = new mongoose.Types.ObjectId();
    const balagruhaId = new mongoose.Types.ObjectId();

    function buildReq(overrides = {}) {
      return mockRequest({
        params: { submissionId: submissionId.toString() },
        body: {
          quality: 'excellent',
          coinsAwarded: 85,
          feedback: 'Well done',
          evaluationCriteria: {},
          gradedBy: coachId,
          ...overrides,
        },
        user: { _id: coachId, id: coachId },
      });
    }

    function mockSubmissionObj() {
      return {
        _id: submissionId,
        studentId: { _id: studentId, firstName: 'John', lastName: 'Doe', balagruhaIds: [balagruhaId] },
        courseId: { _id: courseId },
        taskTitle: 'Draw a Tree',
        status: 'submitted',
        markAsGraded: jest.fn().mockResolvedValue(true),
      };
    }

    it('should award coins using Coin.findOrCreateForUser + addCoins (FIX-001)', async () => {
      const sub = mockSubmissionObj();
      Submission.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({ populate: jest.fn ? undefined : undefined }),
      });
      // Chain .populate("studentId courseId")
      Submission.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(sub),
      });

      const mockAddCoins = jest.fn().mockImplementation(function () {
        this.balance += 85;
        return Promise.resolve(this);
      });
      const coinRecord = { balance: 0, addCoins: mockAddCoins };
      Coin.findOrCreateForUser = jest.fn().mockResolvedValue(coinRecord);

      User.findById.mockResolvedValue({
        _id: coachId,
        firstName: 'Coach',
        lastName: 'Smith',
        balagruhaIds: [balagruhaId],
      });

      const mockNotifSave = jest.fn().mockResolvedValue(true);
      Notification.mockImplementation(() => ({ save: mockNotifSave }));

      const req = buildReq();
      const res = mockResponse();

      await coachGradingController.submitGrade(req, res);

      expect(res.status).toHaveBeenCalledWith(200);

      // Verify findOrCreateForUser was called with student ID
      expect(Coin.findOrCreateForUser).toHaveBeenCalledWith(studentId);

      // Verify addCoins was called with correct args: source must be 'task' (not 'submission_grade')
      expect(mockAddCoins).toHaveBeenCalledWith(
        85,
        'earned',
        expect.stringContaining('Draw a Tree'),
        'grading',
        expect.objectContaining({
          submissionId: submissionId,
          courseId: courseId,
          quality: 'excellent',
        })
      );

      // Verify response includes coin balance from Coin model (not User.coins)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          studentCoinBalance: 85,
        })
      );
    });

    it('should NOT write to User.coins field (FIX-001 bug 3)', async () => {
      const sub = mockSubmissionObj();
      Submission.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(sub),
      });

      const mockAddCoins = jest.fn().mockResolvedValue(true);
      Coin.findOrCreateForUser = jest.fn().mockResolvedValue({ balance: 85, addCoins: mockAddCoins });

      User.findById.mockResolvedValue({
        _id: coachId,
        firstName: 'Coach',
        lastName: 'Smith',
        balagruhaIds: [balagruhaId],
      });
      User.findByIdAndUpdate = jest.fn();

      const mockNotifSave = jest.fn().mockResolvedValue(true);
      Notification.mockImplementation(() => ({ save: mockNotifSave }));

      const req = buildReq();
      const res = mockResponse();

      await coachGradingController.submitGrade(req, res);

      // User.findByIdAndUpdate must NOT be called to $inc coins
      expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should auto-calculate coins from quality rating when coinsAwarded not provided (FIX-012)', async () => {
      const sub = mockSubmissionObj();
      Submission.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(sub),
      });

      const mockAddCoins = jest.fn().mockImplementation(function () {
        this.balance += 85;
        return Promise.resolve(this);
      });
      const coinRecord = { balance: 0, addCoins: mockAddCoins };
      Coin.findOrCreateForUser = jest.fn().mockResolvedValue(coinRecord);

      User.findById.mockResolvedValue({
        _id: coachId,
        firstName: 'Coach',
        lastName: 'Smith',
        balagruhaIds: [balagruhaId],
      });

      const mockNotifSave = jest.fn().mockResolvedValue(true);
      Notification.mockImplementation(() => ({ save: mockNotifSave }));

      // No coinsAwarded in body — should auto-calculate from quality='excellent' => 85
      const req = buildReq({ coinsAwarded: undefined });
      // Remove coinsAwarded from body entirely
      delete req.body.coinsAwarded;
      const res = mockResponse();

      await coachGradingController.submitGrade(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockAddCoins).toHaveBeenCalledWith(
        85,
        'earned',
        expect.stringContaining('Draw a Tree'),
        'grading',
        expect.objectContaining({ quality: 'excellent' })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, studentCoinBalance: 85 })
      );
    });

    it('should map each quality rating to the correct coin range (FIX-012)', () => {
      const { QUALITY_COIN_RANGES } = coachGradingController;
      expect(QUALITY_COIN_RANGES).toEqual({
        excellent: { min: 80, max: 100, default: 85 },
        good: { min: 50, max: 79, default: 65 },
        needs_improvement: { min: 0, max: 49, default: 25 },
      });
    });

    it('should allow a coinsAwarded value outside the suggested quality range', async () => {
      const sub = mockSubmissionObj();
      Submission.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(sub),
      });

      const mockAddCoins = jest.fn().mockImplementation(function () {
        this.balance += 25;
        return Promise.resolve(this);
      });
      const coinRecord = { balance: 0, addCoins: mockAddCoins };
      Coin.findOrCreateForUser = jest.fn().mockResolvedValue(coinRecord);

      User.findById.mockResolvedValue({
        _id: coachId,
        firstName: 'Coach',
        lastName: 'Smith',
        balagruhaIds: [balagruhaId],
      });

      const req = buildReq({ quality: 'good', coinsAwarded: 25 });
      const res = mockResponse();

      await coachGradingController.submitGrade(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockAddCoins).toHaveBeenCalledWith(
        25,
        'earned',
        expect.stringContaining('Draw a Tree'),
        'grading',
        expect.objectContaining({ quality: 'good' })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          studentCoinBalance: 25,
        })
      );
    });

    it('should auto-calculate coins for needs_improvement quality (FIX-012)', async () => {
      const sub = mockSubmissionObj();
      Submission.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(sub),
      });

      const mockAddCoins = jest.fn().mockImplementation(function () {
        this.balance += 25;
        return Promise.resolve(this);
      });
      const coinRecord = { balance: 0, addCoins: mockAddCoins };
      Coin.findOrCreateForUser = jest.fn().mockResolvedValue(coinRecord);

      User.findById.mockResolvedValue({
        _id: coachId,
        firstName: 'Coach',
        lastName: 'Smith',
        balagruhaIds: [balagruhaId],
      });

      const mockNotifSave = jest.fn().mockResolvedValue(true);
      Notification.mockImplementation(() => ({ save: mockNotifSave }));

      // No coinsAwarded — quality='needs_improvement' => 25
      const req = buildReq({ quality: 'needs_improvement' });
      delete req.body.coinsAwarded;
      const res = mockResponse();

      await coachGradingController.submitGrade(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockAddCoins).toHaveBeenCalledWith(
        25,
        'earned',
        expect.stringContaining('Draw a Tree'),
        'grading',
        expect.objectContaining({ quality: 'needs_improvement' })
      );
    });

    it('should not mark the submission graded when coin assignment fails', async () => {
      const sub = mockSubmissionObj();
      Submission.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(sub),
      });

      const coinRecord = {
        balance: 0,
        addCoins: jest.fn().mockRejectedValue(new Error('Coin assignment failed')),
      };
      Coin.findOrCreateForUser = jest.fn().mockResolvedValue(coinRecord);

      User.findById.mockResolvedValue({
        _id: coachId,
        firstName: 'Coach',
        lastName: 'Smith',
      });

      const req = buildReq({ coinsAwarded: 90 });
      const res = mockResponse();

      await coachGradingController.submitGrade(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'Failed to submit grade' })
      );
      expect(sub.markAsGraded).not.toHaveBeenCalled();
    });


    it('should submit a grade when populated course document is missing but the course reference exists', async () => {
      const sub = {
        ...mockSubmissionObj(),
        courseId: null,
        populated: jest.fn((path) => (path === 'courseId' ? courseId : undefined)),
      };
      Submission.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(sub),
      });

      const mockAddCoins = jest.fn().mockImplementation(function () {
        this.balance += 90;
        return Promise.resolve(this);
      });
      const coinRecord = { balance: 0, addCoins: mockAddCoins };
      Coin.findOrCreateForUser = jest.fn().mockResolvedValue(coinRecord);

      User.findById.mockResolvedValue({
        _id: coachId,
        firstName: 'Coach',
        lastName: 'Smith',
      });

      const req = buildReq({ coinsAwarded: 90 });
      const res = mockResponse();

      await coachGradingController.submitGrade(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockAddCoins).toHaveBeenCalledWith(
        90,
        'earned',
        expect.stringContaining('Draw a Tree'),
        'grading',
        expect.objectContaining({ courseId })
      );
      expect(sub.markAsGraded).toHaveBeenCalled();
    });

    it('should return existing balance when coinsAwarded is 0', async () => {
      const sub = mockSubmissionObj();
      Submission.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(sub),
      });

      Coin.getUserBalance = jest.fn().mockResolvedValue(50);

      User.findById.mockResolvedValue({
        _id: coachId,
        firstName: 'Coach',
        lastName: 'Smith',
        balagruhaIds: [balagruhaId],
      });

      const mockNotifSave = jest.fn().mockResolvedValue(true);
      Notification.mockImplementation(() => ({ save: mockNotifSave }));

      sub.isFirstAttempt = false;
      const req = buildReq({ coinsAwarded: 85 });
      const res = mockResponse();

      await coachGradingController.submitGrade(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(Coin.findOrCreateForUser).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ studentCoinBalance: 50 })
      );
    });
  });

  describe('bulkGrade', () => {
    const coachId = new mongoose.Types.ObjectId().toString();
    const studentId = new mongoose.Types.ObjectId();
    const courseId = new mongoose.Types.ObjectId();
    const balagruhaId = new mongoose.Types.ObjectId();

    function buildReq(submissionIds, overrides = {}) {
      return mockRequest({
        user: { id: coachId, _id: coachId, role: 'coach' },
        body: {
          submissionIds,
          quality: 'excellent',
          coinsAwarded: 85,
          feedback: 'Great work',
          gradedBy: coachId,
          ...overrides,
        },
        user: { _id: coachId, id: coachId },
      });
    }

    function mockSubmission(id) {
      return {
        _id: id,
        studentId: { _id: studentId, balagruhaIds: [balagruhaId] },
        courseId: { _id: courseId },
        taskTitle: 'Test Task',
        status: 'submitted',
        markAsGraded: jest.fn().mockResolvedValue(true),
      };
    }

    it('should return 400 if submissionIds is missing', async () => {
      const req = mockRequest({ body: { quality: 'good', coinsAwarded: 5, gradedBy: coachId } });
      const res = mockResponse();

      await coachGradingController.bulkGrade(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'At least one submission ID is required' })
      );
    });

    it('should return 400 if quality is missing', async () => {
      const req = mockRequest({
        body: { submissionIds: ['id1'], coinsAwarded: 5, gradedBy: coachId },
      });
      const res = mockResponse();

      await coachGradingController.bulkGrade(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'Quality rating is required' })
      );
    });

    it('should allow bulk coinsAwarded outside the suggested quality range', async () => {
      const req = buildReq(['id1'], { coinsAwarded: 150 });
      const res = mockResponse();

      const sub = mockSubmission('id1');
      Submission.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(sub),
      });

      User.findById.mockResolvedValue({
        _id: coachId,
        firstName: 'Coach',
        lastName: 'Smith',
        balagruhaIds: [balagruhaId],
      });

      const mockAddCoins = jest.fn().mockResolvedValue(true);
      Coin.findOrCreateForUser = jest.fn().mockResolvedValue({ balance: 150, addCoins: mockAddCoins });

      await coachGradingController.bulkGrade(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockAddCoins).toHaveBeenCalledWith(
        150,
        'earned',
        expect.stringContaining('Graded submission'),
        'grading',
        expect.any(Object)
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, gradedCount: 1, failedSubmissions: [] })
      );
    });

    it('should successfully bulk grade multiple submissions and increment counter (FIX-022)', async () => {
      const subId1 = new mongoose.Types.ObjectId();
      const subId2 = new mongoose.Types.ObjectId();
      const subId3 = new mongoose.Types.ObjectId();

      const sub1 = mockSubmission(subId1);
      const sub2 = mockSubmission(subId2);
      const sub3 = mockSubmission(subId3);

      // Submission.findById returns a chainable object with .populate()
      Submission.findById.mockImplementation((id) => {
        const map = {
          [subId1.toString()]: sub1,
          [subId2.toString()]: sub2,
          [subId3.toString()]: sub3,
        };
        return { populate: jest.fn().mockResolvedValue(map[id.toString()] || null) };
      });

      User.findById.mockResolvedValue({
        _id: coachId,
        firstName: 'Coach',
        lastName: 'Smith',
        balagruhaIds: [balagruhaId],
      });

      // Mock Coin.findOrCreateForUser + addCoins pattern
      const mockAddCoins = jest.fn().mockResolvedValue(true);
      Coin.findOrCreateForUser = jest.fn().mockResolvedValue({ balance: 85, addCoins: mockAddCoins });

      // Mock Notification constructor and save
      const mockNotifSave = jest.fn().mockResolvedValue(true);
      Notification.mockImplementation(() => ({ save: mockNotifSave }));

      const req = buildReq([subId1, subId2, subId3]);
      const res = mockResponse();

      await coachGradingController.bulkGrade(req, res);

      // This is the critical assertion: gradedCount must be 3, not 0.
      // Before the fix (const gradedCount = 0), gradedCount++ would throw TypeError.
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          gradedCount: 3,
          failedSubmissions: [],
          message: '3 submissions graded successfully! Students notified.',
        })
      );

      // Verify each submission was graded
      expect(sub1.markAsGraded).toHaveBeenCalledTimes(1);
      expect(sub2.markAsGraded).toHaveBeenCalledTimes(1);
      expect(sub3.markAsGraded).toHaveBeenCalledTimes(1);

      // Verify coins were awarded using correct pattern (not Coin constructor)
      expect(Coin.findOrCreateForUser).toHaveBeenCalledTimes(3);
      expect(mockAddCoins).toHaveBeenCalledTimes(3);
      expect(mockAddCoins).toHaveBeenCalledWith(
        85, 'earned', expect.stringContaining('Graded submission'), 'grading', expect.any(Object)
      );
    });

    it('should count failed submissions separately from graded ones', async () => {
      const subId1 = new mongoose.Types.ObjectId();
      const subId2 = new mongoose.Types.ObjectId();

      const sub1 = mockSubmission(subId1);

      // subId2 returns null (not found)
      Submission.findById.mockImplementation((id) => {
        if (id.toString() === subId1.toString()) {
          return { populate: jest.fn().mockResolvedValue(sub1) };
        }
        return { populate: jest.fn().mockResolvedValue(null) };
      });

      User.findById.mockResolvedValue({
        _id: coachId,
        firstName: 'Coach',
        lastName: 'Smith',
        balagruhaIds: [balagruhaId],
      });

      const mockAddCoins = jest.fn().mockResolvedValue(true);
      Coin.findOrCreateForUser = jest.fn().mockResolvedValue({ balance: 85, addCoins: mockAddCoins });

      const mockNotifSave = jest.fn().mockResolvedValue(true);
      Notification.mockImplementation(() => ({ save: mockNotifSave }));

      const req = buildReq([subId1, subId2]);
      const res = mockResponse();

      await coachGradingController.bulkGrade(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          gradedCount: 1,
          failedSubmissions: [subId2],
        })
      );
    });

    it('should handle a single submission and increment counter to 1', async () => {
      const subId = new mongoose.Types.ObjectId();
      const sub = mockSubmission(subId);

      Submission.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(sub),
      });

      User.findById.mockResolvedValue({
        _id: coachId,
        firstName: 'Coach',
        lastName: 'Smith',
        balagruhaIds: [balagruhaId],
      });

      const mockAddCoins = jest.fn().mockResolvedValue(true);
      Coin.findOrCreateForUser = jest.fn().mockResolvedValue({ balance: 85, addCoins: mockAddCoins });

      const mockNotifSave = jest.fn().mockResolvedValue(true);
      Notification.mockImplementation(() => ({ save: mockNotifSave }));

      const req = buildReq([subId]);
      const res = mockResponse();

      await coachGradingController.bulkGrade(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          gradedCount: 1,
        })
      );
    });
  });
});
