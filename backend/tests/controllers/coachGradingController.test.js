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

const Submission = require('../../models/Submission');
const User = require('../../models/user');
const Notification = require('../../models/notification');
const Coin = require('../../models/coin');
const coachGradingController = require('../../controllers/lms/coach/coachGradingController');
const { mockRequest, mockResponse } = global.testUtils;

describe('CoachGradingController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('submitGrade', () => {
    const coachId = new mongoose.Types.ObjectId().toString();
    const studentId = new mongoose.Types.ObjectId();
    const courseId = new mongoose.Types.ObjectId();
    const submissionId = new mongoose.Types.ObjectId();

    function buildReq(overrides = {}) {
      return mockRequest({
        params: { submissionId: submissionId.toString() },
        body: {
          quality: 'excellent',
          coinsAwarded: 15,
          feedback: 'Well done',
          evaluationCriteria: {},
          gradedBy: coachId,
          ...overrides,
        },
      });
    }

    function mockSubmissionObj() {
      return {
        _id: submissionId,
        studentId: { _id: studentId, firstName: 'John', lastName: 'Doe' },
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
        this.balance += 15;
        return Promise.resolve(this);
      });
      const coinRecord = { balance: 0, addCoins: mockAddCoins };
      Coin.findOrCreateForUser = jest.fn().mockResolvedValue(coinRecord);

      User.findById.mockResolvedValue({
        _id: coachId,
        firstName: 'Coach',
        lastName: 'Smith',
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
        15,
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
          studentCoinBalance: 15,
        })
      );
    });

    it('should NOT write to User.coins field (FIX-001 bug 3)', async () => {
      const sub = mockSubmissionObj();
      Submission.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(sub),
      });

      const mockAddCoins = jest.fn().mockResolvedValue(true);
      Coin.findOrCreateForUser = jest.fn().mockResolvedValue({ balance: 15, addCoins: mockAddCoins });

      User.findById.mockResolvedValue({
        _id: coachId,
        firstName: 'Coach',
        lastName: 'Smith',
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
        this.balance += 10;
        return Promise.resolve(this);
      });
      const coinRecord = { balance: 0, addCoins: mockAddCoins };
      Coin.findOrCreateForUser = jest.fn().mockResolvedValue(coinRecord);

      User.findById.mockResolvedValue({
        _id: coachId,
        firstName: 'Coach',
        lastName: 'Smith',
      });

      const mockNotifSave = jest.fn().mockResolvedValue(true);
      Notification.mockImplementation(() => ({ save: mockNotifSave }));

      // No coinsAwarded in body — should auto-calculate from quality='excellent' => 10
      const req = buildReq({ coinsAwarded: undefined });
      // Remove coinsAwarded from body entirely
      delete req.body.coinsAwarded;
      const res = mockResponse();

      await coachGradingController.submitGrade(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockAddCoins).toHaveBeenCalledWith(
        10, // excellent = 10 coins
        'earned',
        expect.stringContaining('Draw a Tree'),
        'grading',
        expect.objectContaining({ quality: 'excellent' })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, studentCoinBalance: 10 })
      );
    });

    it('should map each quality rating to the correct coin amount (FIX-012)', () => {
      const { QUALITY_COIN_MAP } = coachGradingController;
      expect(QUALITY_COIN_MAP).toEqual({
        excellent: 10,
        good: 7,
        needs_improvement: 2,
      });
    });

    it('should use coach override when coinsAwarded is explicitly provided (FIX-012)', async () => {
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
      });

      const mockNotifSave = jest.fn().mockResolvedValue(true);
      Notification.mockImplementation(() => ({ save: mockNotifSave }));

      // Coach explicitly overrides with 25 coins (quality='good' would auto-calc to 7)
      const req = buildReq({ quality: 'good', coinsAwarded: 25 });
      const res = mockResponse();

      await coachGradingController.submitGrade(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockAddCoins).toHaveBeenCalledWith(
        25, // coach override, not 7
        'earned',
        expect.stringContaining('Draw a Tree'),
        'grading',
        expect.objectContaining({ quality: 'good' })
      );
    });

    it('should auto-calculate coins for needs_improvement quality (FIX-012)', async () => {
      const sub = mockSubmissionObj();
      Submission.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(sub),
      });

      const mockAddCoins = jest.fn().mockImplementation(function () {
        this.balance += 2;
        return Promise.resolve(this);
      });
      const coinRecord = { balance: 0, addCoins: mockAddCoins };
      Coin.findOrCreateForUser = jest.fn().mockResolvedValue(coinRecord);

      User.findById.mockResolvedValue({
        _id: coachId,
        firstName: 'Coach',
        lastName: 'Smith',
      });

      const mockNotifSave = jest.fn().mockResolvedValue(true);
      Notification.mockImplementation(() => ({ save: mockNotifSave }));

      // No coinsAwarded — quality='needs_improvement' => 2
      const req = buildReq({ quality: 'needs_improvement' });
      delete req.body.coinsAwarded;
      const res = mockResponse();

      await coachGradingController.submitGrade(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockAddCoins).toHaveBeenCalledWith(
        2, // needs_improvement = 2 coins
        'earned',
        expect.stringContaining('Draw a Tree'),
        'grading',
        expect.objectContaining({ quality: 'needs_improvement' })
      );
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
      });

      const mockNotifSave = jest.fn().mockResolvedValue(true);
      Notification.mockImplementation(() => ({ save: mockNotifSave }));

      const req = buildReq({ coinsAwarded: 0 });
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

    function buildReq(submissionIds, overrides = {}) {
      return mockRequest({
        body: {
          submissionIds,
          quality: 'excellent',
          coinsAwarded: 10,
          feedback: 'Great work',
          gradedBy: coachId,
          ...overrides,
        },
      });
    }

    function mockSubmission(id) {
      return {
        _id: id,
        studentId: { _id: studentId },
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

    it('should return 400 if coinsAwarded is out of range', async () => {
      const req = buildReq(['id1'], { coinsAwarded: 150 });
      const res = mockResponse();

      await coachGradingController.bulkGrade(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'Coin amount must be between 0 and 100' })
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
      });

      // Mock Coin.findOrCreateForUser + addCoins pattern
      const mockAddCoins = jest.fn().mockResolvedValue(true);
      Coin.findOrCreateForUser = jest.fn().mockResolvedValue({ balance: 10, addCoins: mockAddCoins });

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
        10, 'earned', expect.stringContaining('Graded submission'), 'grading', expect.any(Object)
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
      });

      const mockAddCoins = jest.fn().mockResolvedValue(true);
      Coin.findOrCreateForUser = jest.fn().mockResolvedValue({ balance: 10, addCoins: mockAddCoins });

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
      });

      const mockAddCoins = jest.fn().mockResolvedValue(true);
      Coin.findOrCreateForUser = jest.fn().mockResolvedValue({ balance: 10, addCoins: mockAddCoins });

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
