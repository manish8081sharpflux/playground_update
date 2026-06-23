const mongoose = require('mongoose');

// Mock pino logger before requiring controller
jest.mock('../../config/pino-config', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  errorLogger: { error: jest.fn(), info: jest.fn() },
}));

// Mock schedule service
jest.mock('../../services/schedule', () => ({
  createScheduleNew: jest.fn(),
  getScheduleById: jest.fn(),
  getSchedules: jest.fn(),
  updateSchedule: jest.fn(),
  deleteSchedule: jest.fn(),
  getSchedulesByUser: jest.fn(),
  getSchedulesForAdmin: jest.fn(),
  getSchedulesForCoach: jest.fn(),
  updateScheduleStatus: jest.fn(),
}));

// Mock dateHelper
jest.mock('../../utils/dateHelper', () => ({
  isValidDate: jest.fn(),
}));

const scheduleController = require('../../controllers/scheduleController');
const Schedule = require('../../services/schedule');
const { isValidDate } = require('../../utils/dateHelper');
const { mockRequest, mockResponse } = global.testUtils;

describe('ScheduleController (Story 5.2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== createSchedule ====================
  describe('createSchedule', () => {
    it('should create schedule successfully', async () => {
      const req = mockRequest({
        user: { id: 'user1', role: 'admin' },
        body: { title: 'Morning Session', balagruhaId: 'bg1' },
      });
      const res = mockResponse();

      Schedule.createScheduleNew.mockResolvedValue({
        success: true,
        data: { title: 'Morning Session' },
        message: 'Schedule created',
      });

      await scheduleController.createSchedule(req, res);

      expect(Schedule.createScheduleNew).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Morning Session',
        createdBy: 'user1',
        userRole: 'admin',
      }));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
      }));
    });

    it('should return 400 when service returns failure', async () => {
      const req = mockRequest({
        user: { id: 'user1', role: 'admin' },
        body: {},
      });
      const res = mockResponse();

      Schedule.createScheduleNew.mockResolvedValue({
        success: false,
        message: 'Missing required fields',
      });

      await scheduleController.createSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 on exception', async () => {
      const req = mockRequest({
        user: { id: 'user1', role: 'admin' },
        body: {},
      });
      const res = mockResponse();

      Schedule.createScheduleNew.mockRejectedValue(new Error('DB error'));

      await scheduleController.createSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Internal server error',
      }));
    });
  });

  // ==================== getScheduleById ====================
  describe('getScheduleById', () => {
    it('should get schedule by ID successfully', async () => {
      const scheduleId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({ params: { scheduleId } });
      const res = mockResponse();

      Schedule.getScheduleById.mockResolvedValue({
        success: true,
        data: { _id: scheduleId, title: 'Test Schedule' },
        message: 'Schedule found',
      });

      await scheduleController.getScheduleById(req, res);

      expect(Schedule.getScheduleById).toHaveBeenCalledWith(scheduleId);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when schedule not found', async () => {
      const req = mockRequest({ params: { scheduleId: 'invalid' } });
      const res = mockResponse();

      Schedule.getScheduleById.mockResolvedValue({
        success: false,
        message: 'Schedule not found',
      });

      await scheduleController.getScheduleById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 on exception', async () => {
      const req = mockRequest({ params: { scheduleId: 'id1' } });
      const res = mockResponse();

      Schedule.getScheduleById.mockRejectedValue(new Error('DB error'));

      await scheduleController.getScheduleById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ==================== getSchedules ====================
  describe('getSchedules', () => {
    it('should get schedules with filters successfully', async () => {
      const req = mockRequest({
        query: { status: 'pending' },
        scopeFilter: {},
      });
      const res = mockResponse();

      Schedule.getSchedules.mockResolvedValue({
        success: true,
        data: [{ title: 'Schedule 1' }],
        message: 'Schedules retrieved',
      });

      await scheduleController.getSchedules(req, res);

      expect(Schedule.getSchedules).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending' }));
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should merge scope filter with query', async () => {
      const balagruhaId = new mongoose.Types.ObjectId();
      const req = mockRequest({
        query: { status: 'pending' },
        scopeFilter: { balagruhaId },
      });
      const res = mockResponse();

      Schedule.getSchedules.mockResolvedValue({ success: true, data: [], message: 'OK' });

      await scheduleController.getSchedules(req, res);

      expect(Schedule.getSchedules).toHaveBeenCalledWith(expect.objectContaining({
        status: 'pending',
        balagruhaId,
      }));
    });

    it('should return 400 on service failure', async () => {
      const req = mockRequest({ query: {} });
      const res = mockResponse();

      Schedule.getSchedules.mockResolvedValue({ success: false, message: 'Failed' });

      await scheduleController.getSchedules(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 on exception', async () => {
      const req = mockRequest({ query: {} });
      const res = mockResponse();

      Schedule.getSchedules.mockRejectedValue(new Error('DB error'));

      await scheduleController.getSchedules(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ==================== updateSchedule ====================
  describe('updateSchedule', () => {
    it('should update schedule successfully', async () => {
      const scheduleId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({
        params: { scheduleId },
        body: { title: 'Updated Schedule' },
      });
      const res = mockResponse();

      Schedule.updateSchedule.mockResolvedValue({
        success: true,
        data: { title: 'Updated Schedule' },
        message: 'Updated',
      });

      await scheduleController.updateSchedule(req, res);

      expect(Schedule.updateSchedule).toHaveBeenCalledWith(scheduleId, { title: 'Updated Schedule' });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 on service failure', async () => {
      const req = mockRequest({
        params: { scheduleId: 'id1' },
        body: { title: 'Updated' },
      });
      const res = mockResponse();

      Schedule.updateSchedule.mockResolvedValue({ success: false, message: 'Not found' });

      await scheduleController.updateSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 on exception', async () => {
      const req = mockRequest({
        params: { scheduleId: 'id1' },
        body: {},
      });
      const res = mockResponse();

      Schedule.updateSchedule.mockRejectedValue(new Error('DB error'));

      await scheduleController.updateSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ==================== deleteSchedule ====================
  describe('deleteSchedule', () => {
    it('should delete schedule successfully', async () => {
      const scheduleId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({ params: { scheduleId } });
      const res = mockResponse();

      Schedule.deleteSchedule.mockResolvedValue({
        success: true,
        data: {},
        message: 'Deleted',
      });

      await scheduleController.deleteSchedule(req, res);

      expect(Schedule.deleteSchedule).toHaveBeenCalledWith(scheduleId);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 on service failure', async () => {
      const req = mockRequest({ params: { scheduleId: 'id1' } });
      const res = mockResponse();

      Schedule.deleteSchedule.mockResolvedValue({ success: false, message: 'Not found' });

      await scheduleController.deleteSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 on exception', async () => {
      const req = mockRequest({ params: { scheduleId: 'id1' } });
      const res = mockResponse();

      Schedule.deleteSchedule.mockRejectedValue(new Error('DB error'));

      await scheduleController.deleteSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ==================== getSchedulesByUser ====================
  describe('getSchedulesByUser', () => {
    it('should get schedules by user successfully', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({ params: { userId } });
      const res = mockResponse();

      Schedule.getSchedulesByUser.mockResolvedValue({
        success: true,
        data: [{ title: 'User Schedule' }],
        message: 'Schedules found',
      });

      await scheduleController.getSchedulesByUser(req, res);

      expect(Schedule.getSchedulesByUser).toHaveBeenCalledWith(userId);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 on service failure', async () => {
      const req = mockRequest({ params: { userId: 'user1' } });
      const res = mockResponse();

      Schedule.getSchedulesByUser.mockResolvedValue({ success: false, message: 'No schedules found' });

      await scheduleController.getSchedulesByUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 on exception', async () => {
      const req = mockRequest({ params: { userId: 'user1' } });
      const res = mockResponse();

      Schedule.getSchedulesByUser.mockRejectedValue(new Error('DB error'));

      await scheduleController.getSchedulesByUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ==================== getSchedulesForAdmin ====================
  describe('getSchedulesForAdmin', () => {
    it('should get schedules for admin with valid dates', async () => {
      const req = mockRequest({
        body: {
          balagruhaIds: ['bg1', 'bg2'],
          assignedTo: 'coach1',
          startDate: '2026-03-01',
          endDate: '2026-03-31',
          status: 'pending',
        },
      });
      const res = mockResponse();

      isValidDate.mockReturnValue(true);
      Schedule.getSchedulesForAdmin.mockResolvedValue({
        success: true,
        data: [{ title: 'Admin Schedule' }],
        message: 'OK',
      });

      await scheduleController.getSchedulesForAdmin(req, res);

      expect(isValidDate).toHaveBeenCalledWith('2026-03-01');
      expect(isValidDate).toHaveBeenCalledWith('2026-03-31');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when dates are invalid', async () => {
      const req = mockRequest({
        body: { startDate: 'invalid', endDate: 'invalid' },
      });
      const res = mockResponse();

      isValidDate.mockReturnValue(false);

      await scheduleController.getSchedulesForAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Invalid startDate / endDate format',
      }));
    });

    it('should restrict balagruhaIds when scopeFilter is present', async () => {
      const allowedBg = new mongoose.Types.ObjectId();
      const req = mockRequest({
        body: {
          balagruhaIds: [allowedBg.toString(), 'other-bg'],
          startDate: '2026-03-01',
          endDate: '2026-03-31',
        },
        scopeFilter: { balagruhaId: { $in: [allowedBg] } },
      });
      const res = mockResponse();

      isValidDate.mockReturnValue(true);
      Schedule.getSchedulesForAdmin.mockResolvedValue({ success: true, data: [], message: 'OK' });

      await scheduleController.getSchedulesForAdmin(req, res);

      // Only the allowed balagruhaId should be passed
      expect(Schedule.getSchedulesForAdmin).toHaveBeenCalledWith(
        [allowedBg.toString()],
        undefined,
        '2026-03-01',
        '2026-03-31',
        undefined
      );
    });

    it('should return 400 on service failure', async () => {
      const req = mockRequest({
        body: { startDate: '2026-03-01', endDate: '2026-03-31' },
      });
      const res = mockResponse();

      isValidDate.mockReturnValue(true);
      Schedule.getSchedulesForAdmin.mockResolvedValue({ success: false, message: 'Failed' });

      await scheduleController.getSchedulesForAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 on exception', async () => {
      const req = mockRequest({
        body: { startDate: '2026-03-01', endDate: '2026-03-31' },
      });
      const res = mockResponse();

      isValidDate.mockReturnValue(true);
      Schedule.getSchedulesForAdmin.mockRejectedValue(new Error('DB error'));

      await scheduleController.getSchedulesForAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ==================== getSchedulesForCoach ====================
  describe('getSchedulesForCoach', () => {
    it('should get schedules for coach successfully', async () => {
      const req = mockRequest({
        body: {
          balagruhaIds: ['bg1'],
          assignedTo: 'coach1',
          startDate: '2026-03-01',
          endDate: '2026-03-31',
          status: 'pending',
        },
      });
      const res = mockResponse();

      Schedule.getSchedulesForCoach.mockResolvedValue({
        success: true,
        data: [{ title: 'Coach Schedule' }],
        message: 'OK',
      });

      await scheduleController.getSchedulesForCoach(req, res);

      expect(Schedule.getSchedulesForCoach).toHaveBeenCalledWith(
        ['bg1'], 'coach1', '2026-03-01', '2026-03-31', 'pending'
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should restrict balagruhaIds with scopeFilter', async () => {
      const allowedBg = new mongoose.Types.ObjectId();
      const req = mockRequest({
        body: {
          balagruhaIds: [allowedBg.toString(), 'other-bg'],
          startDate: '2026-03-01',
          endDate: '2026-03-31',
        },
        scopeFilter: { balagruhaId: { $in: [allowedBg] } },
      });
      const res = mockResponse();

      Schedule.getSchedulesForCoach.mockResolvedValue({ success: true, data: [], message: 'OK' });

      await scheduleController.getSchedulesForCoach(req, res);

      expect(Schedule.getSchedulesForCoach).toHaveBeenCalledWith(
        [allowedBg.toString()],
        undefined,
        '2026-03-01',
        '2026-03-31',
        undefined
      );
    });

    it('should return 400 on service failure', async () => {
      const req = mockRequest({ body: {} });
      const res = mockResponse();

      Schedule.getSchedulesForCoach.mockResolvedValue({ success: false, message: 'Failed' });

      await scheduleController.getSchedulesForCoach(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 on exception', async () => {
      const req = mockRequest({ body: {} });
      const res = mockResponse();

      Schedule.getSchedulesForCoach.mockRejectedValue(new Error('DB error'));

      await scheduleController.getSchedulesForCoach(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ==================== updateScheduleStatus ====================
  describe('updateScheduleStatus', () => {
    it('should update schedule status successfully', async () => {
      const scheduleId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({
        params: { scheduleId },
        body: { status: 'completed' },
      });
      const res = mockResponse();

      Schedule.updateScheduleStatus.mockResolvedValue({
        success: true,
        data: { status: 'completed' },
        message: 'Status updated',
      });

      await scheduleController.updateScheduleStatus(req, res);

      expect(Schedule.updateScheduleStatus).toHaveBeenCalledWith(scheduleId, 'completed');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 on service failure', async () => {
      const req = mockRequest({
        params: { scheduleId: 'id1' },
        body: { status: 'invalid' },
      });
      const res = mockResponse();

      Schedule.updateScheduleStatus.mockResolvedValue({ success: false, message: 'Invalid status' });

      await scheduleController.updateScheduleStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 on exception', async () => {
      const req = mockRequest({
        params: { scheduleId: 'id1' },
        body: { status: 'completed' },
      });
      const res = mockResponse();

      Schedule.updateScheduleStatus.mockRejectedValue(new Error('DB error'));

      await scheduleController.updateScheduleStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
