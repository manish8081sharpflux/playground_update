const mongoose = require('mongoose');

// Mock pino logger before requiring controller
jest.mock('../../config/pino-config', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  errorLogger: { error: jest.fn(), info: jest.fn() },
}));

// Mock notification service
jest.mock('../../services/notification', () => ({
  getUserNotificationsSmart: jest.fn(),
  getSmartUnreadCount: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  updateUserLastViewed: jest.fn(),
  deleteNotification: jest.fn(),
  createSystemAnnouncement: jest.fn(),
  createShopUpdateNotification: jest.fn(),
  createPersonalNotification: jest.fn(),
  getNotificationStats: jest.fn(),
  cleanupExpiredNotifications: jest.fn(),
  notifyCoachMessage: jest.fn(),
}));

const notificationController = require('../../controllers/notificationController');
const NotificationService = require('../../services/notification');
const { mockRequest, mockResponse } = global.testUtils;

describe('NotificationController (Story 5.2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== getUserNotifications ====================
  describe('getUserNotifications', () => {
    it('should get user notifications successfully', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({
        user: { id: userId },
        query: { limit: '20', skip: '0' },
      });
      const res = mockResponse();

      const mockResult = {
        success: true,
        data: [{ title: 'Test Notification' }],
      };
      NotificationService.getUserNotificationsSmart.mockResolvedValue(mockResult);

      await notificationController.getUserNotifications(req, res);

      expect(NotificationService.getUserNotificationsSmart).toHaveBeenCalledWith(userId, 20, 0);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it('should use default limit and skip', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({
        user: { id: userId },
        query: {},
      });
      const res = mockResponse();

      NotificationService.getUserNotificationsSmart.mockResolvedValue({ success: true, data: [] });

      await notificationController.getUserNotifications(req, res);

      expect(NotificationService.getUserNotificationsSmart).toHaveBeenCalledWith(userId, 50, 0);
    });

    it('should return 400 when service returns failure', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({ user: { id: userId }, query: {} });
      const res = mockResponse();

      NotificationService.getUserNotificationsSmart.mockResolvedValue({
        success: false,
        message: 'Failed to retrieve',
      });

      await notificationController.getUserNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on exception', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({ user: { id: userId }, query: {} });
      const res = mockResponse();

      NotificationService.getUserNotificationsSmart.mockRejectedValue(new Error('DB error'));

      await notificationController.getUserNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== getUnreadCount ====================
  describe('getUnreadCount', () => {
    it('should get unread count successfully', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({ user: { id: userId } });
      const res = mockResponse();

      NotificationService.getSmartUnreadCount.mockResolvedValue({
        success: true,
        data: { count: 5 },
      });

      await notificationController.getUnreadCount(req, res);

      expect(NotificationService.getSmartUnreadCount).toHaveBeenCalledWith(userId);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 on service failure', async () => {
      const req = mockRequest({ user: { id: 'user1' } });
      const res = mockResponse();

      NotificationService.getSmartUnreadCount.mockResolvedValue({
        success: false,
        message: 'Failed',
      });

      await notificationController.getUnreadCount(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on exception', async () => {
      const req = mockRequest({ user: { id: 'user1' } });
      const res = mockResponse();

      NotificationService.getSmartUnreadCount.mockRejectedValue(new Error('DB error'));

      await notificationController.getUnreadCount(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== markAsRead ====================
  describe('markAsRead', () => {
    it('should mark notification as read successfully', async () => {
      const userId = 'user1';
      const notificationId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({
        user: { id: userId },
        params: { notificationId },
      });
      const res = mockResponse();

      NotificationService.markAsRead.mockResolvedValue({ success: true });

      await notificationController.markAsRead(req, res);

      expect(NotificationService.markAsRead).toHaveBeenCalledWith(notificationId, userId);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 on service failure', async () => {
      const req = mockRequest({
        user: { id: 'user1' },
        params: { notificationId: 'invalid' },
      });
      const res = mockResponse();

      NotificationService.markAsRead.mockResolvedValue({
        success: false,
        message: 'Notification not found',
      });

      await notificationController.markAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on exception', async () => {
      const req = mockRequest({
        user: { id: 'user1' },
        params: { notificationId: 'nid' },
      });
      const res = mockResponse();

      NotificationService.markAsRead.mockRejectedValue(new Error('DB error'));

      await notificationController.markAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== markAllAsRead ====================
  describe('markAllAsRead', () => {
    it('should mark all notifications as read successfully', async () => {
      const req = mockRequest({ user: { id: 'user1' } });
      const res = mockResponse();

      NotificationService.markAllAsRead.mockResolvedValue({ success: true });

      await notificationController.markAllAsRead(req, res);

      expect(NotificationService.markAllAsRead).toHaveBeenCalledWith('user1');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 on service failure', async () => {
      const req = mockRequest({ user: { id: 'user1' } });
      const res = mockResponse();

      NotificationService.markAllAsRead.mockResolvedValue({ success: false, message: 'Failed' });

      await notificationController.markAllAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on exception', async () => {
      const req = mockRequest({ user: { id: 'user1' } });
      const res = mockResponse();

      NotificationService.markAllAsRead.mockRejectedValue(new Error('DB error'));

      await notificationController.markAllAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== updateLastViewed ====================
  describe('updateLastViewed', () => {
    it('should update last viewed successfully', async () => {
      const req = mockRequest({ user: { id: 'user1' } });
      const res = mockResponse();

      NotificationService.updateUserLastViewed.mockResolvedValue({ success: true });

      await notificationController.updateLastViewed(req, res);

      expect(NotificationService.updateUserLastViewed).toHaveBeenCalledWith('user1');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 on service failure', async () => {
      const req = mockRequest({ user: { id: 'user1' } });
      const res = mockResponse();

      NotificationService.updateUserLastViewed.mockResolvedValue({ success: false, message: 'Failed' });

      await notificationController.updateLastViewed(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on exception', async () => {
      const req = mockRequest({ user: { id: 'user1' } });
      const res = mockResponse();

      NotificationService.updateUserLastViewed.mockRejectedValue(new Error('DB error'));

      await notificationController.updateLastViewed(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== deleteNotification ====================
  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      const notificationId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({
        user: { id: 'user1' },
        params: { notificationId },
      });
      const res = mockResponse();

      NotificationService.deleteNotification.mockResolvedValue({ success: true });

      await notificationController.deleteNotification(req, res);

      expect(NotificationService.deleteNotification).toHaveBeenCalledWith(notificationId, 'user1');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 on service failure', async () => {
      const req = mockRequest({
        user: { id: 'user1' },
        params: { notificationId: 'nid' },
      });
      const res = mockResponse();

      NotificationService.deleteNotification.mockResolvedValue({ success: false, message: 'Not found' });

      await notificationController.deleteNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on exception', async () => {
      const req = mockRequest({
        user: { id: 'user1' },
        params: { notificationId: 'nid' },
      });
      const res = mockResponse();

      NotificationService.deleteNotification.mockRejectedValue(new Error('DB error'));

      await notificationController.deleteNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== createSystemAnnouncement ====================
  describe('createSystemAnnouncement', () => {
    it('should create system announcement successfully', async () => {
      const req = mockRequest({
        user: { id: 'admin1' },
        body: { title: 'System Update', message: 'New features available', priority: 'HIGH' },
      });
      const res = mockResponse();

      NotificationService.createSystemAnnouncement.mockResolvedValue({ success: true });

      await notificationController.createSystemAnnouncement(req, res);

      expect(NotificationService.createSystemAnnouncement).toHaveBeenCalledWith(
        'System Update', 'New features available', 'HIGH', {}
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 when title is missing', async () => {
      const req = mockRequest({
        user: { id: 'admin1' },
        body: { message: 'Content only' },
      });
      const res = mockResponse();

      await notificationController.createSystemAnnouncement(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Title and message are required',
      }));
    });

    it('should return 400 when message is missing', async () => {
      const req = mockRequest({
        user: { id: 'admin1' },
        body: { title: 'Title only' },
      });
      const res = mockResponse();

      await notificationController.createSystemAnnouncement(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 on service failure', async () => {
      const req = mockRequest({
        user: { id: 'admin1' },
        body: { title: 'Test', message: 'Test msg' },
      });
      const res = mockResponse();

      NotificationService.createSystemAnnouncement.mockResolvedValue({ success: false, message: 'Failed' });

      await notificationController.createSystemAnnouncement(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on exception', async () => {
      const req = mockRequest({
        user: { id: 'admin1' },
        body: { title: 'Test', message: 'Test msg' },
      });
      const res = mockResponse();

      NotificationService.createSystemAnnouncement.mockRejectedValue(new Error('DB error'));

      await notificationController.createSystemAnnouncement(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== createShopUpdateNotification ====================
  describe('createShopUpdateNotification', () => {
    it('should create shop update notification successfully', async () => {
      const req = mockRequest({
        user: { id: 'admin1' },
        body: { title: 'New Items', message: 'Check out new products' },
      });
      const res = mockResponse();

      NotificationService.createShopUpdateNotification.mockResolvedValue({ success: true });

      await notificationController.createShopUpdateNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 when title/message missing', async () => {
      const req = mockRequest({
        user: { id: 'admin1' },
        body: {},
      });
      const res = mockResponse();

      await notificationController.createShopUpdateNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on exception', async () => {
      const req = mockRequest({
        user: { id: 'admin1' },
        body: { title: 'Test', message: 'Test' },
      });
      const res = mockResponse();

      NotificationService.createShopUpdateNotification.mockRejectedValue(new Error('DB error'));

      await notificationController.createShopUpdateNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== sendAdminPersonalNotification ====================
  describe('sendAdminPersonalNotification', () => {
    it('should send personal notification successfully', async () => {
      const studentId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({
        user: { id: 'admin1' },
        body: { studentId, title: 'Great job', message: 'Keep it up', category: 'GENERAL' },
      });
      const res = mockResponse();

      NotificationService.createPersonalNotification.mockResolvedValue({ success: true });

      await notificationController.sendAdminPersonalNotification(req, res);

      expect(NotificationService.createPersonalNotification).toHaveBeenCalledWith(
        studentId, 'Great job', 'Keep it up', 'GENERAL', expect.objectContaining({ adminId: 'admin1' })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 when required fields missing', async () => {
      const req = mockRequest({
        user: { id: 'admin1' },
        body: { title: 'Test' },
      });
      const res = mockResponse();

      await notificationController.sendAdminPersonalNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Student ID, title, and message are required',
      }));
    });

    it('should return 500 on exception', async () => {
      const req = mockRequest({
        user: { id: 'admin1' },
        body: { studentId: 's1', title: 'T', message: 'M' },
      });
      const res = mockResponse();

      NotificationService.createPersonalNotification.mockRejectedValue(new Error('DB error'));

      await notificationController.sendAdminPersonalNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== getNotificationStats ====================
  describe('getNotificationStats', () => {
    it('should get stats successfully', async () => {
      const req = mockRequest({ user: { id: 'admin1' } });
      const res = mockResponse();

      NotificationService.getNotificationStats.mockResolvedValue({
        success: true,
        data: { total: 100, unread: 20 },
      });

      await notificationController.getNotificationStats(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 on service failure', async () => {
      const req = mockRequest({ user: { id: 'admin1' } });
      const res = mockResponse();

      NotificationService.getNotificationStats.mockResolvedValue({ success: false, message: 'Failed' });

      await notificationController.getNotificationStats(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on exception', async () => {
      const req = mockRequest({ user: { id: 'admin1' } });
      const res = mockResponse();

      NotificationService.getNotificationStats.mockRejectedValue(new Error('DB error'));

      await notificationController.getNotificationStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== cleanupExpiredNotifications ====================
  describe('cleanupExpiredNotifications', () => {
    it('should cleanup expired notifications successfully', async () => {
      const req = mockRequest({ user: { id: 'admin1' } });
      const res = mockResponse();

      NotificationService.cleanupExpiredNotifications.mockResolvedValue({
        success: true,
        data: { deletedCount: 10 },
      });

      await notificationController.cleanupExpiredNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 on service failure', async () => {
      const req = mockRequest({ user: { id: 'admin1' } });
      const res = mockResponse();

      NotificationService.cleanupExpiredNotifications.mockResolvedValue({ success: false, message: 'Failed' });

      await notificationController.cleanupExpiredNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on exception', async () => {
      const req = mockRequest({ user: { id: 'admin1' } });
      const res = mockResponse();

      NotificationService.cleanupExpiredNotifications.mockRejectedValue(new Error('DB error'));

      await notificationController.cleanupExpiredNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== sendCoachMessage ====================
  describe('sendCoachMessage', () => {
    it('should send coach message successfully', async () => {
      const studentId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({
        user: { id: 'coach1', name: 'Coach Test' },
        body: { studentId, message: 'Well done' },
      });
      const res = mockResponse();

      NotificationService.notifyCoachMessage.mockResolvedValue({ success: true });

      await notificationController.sendCoachMessage(req, res);

      expect(NotificationService.notifyCoachMessage).toHaveBeenCalledWith(
        studentId, 'Coach Test', 'Well done', expect.objectContaining({ coachId: 'coach1' })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should use default coach name when name is not set', async () => {
      const studentId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({
        user: { id: 'coach1' },
        body: { studentId, message: 'Well done' },
      });
      const res = mockResponse();

      NotificationService.notifyCoachMessage.mockResolvedValue({ success: true });

      await notificationController.sendCoachMessage(req, res);

      expect(NotificationService.notifyCoachMessage).toHaveBeenCalledWith(
        studentId, 'Your Coach', 'Well done', expect.any(Object)
      );
    });

    it('should return 400 when studentId is missing', async () => {
      const req = mockRequest({
        user: { id: 'coach1', name: 'Coach' },
        body: { message: 'Hello' },
      });
      const res = mockResponse();

      await notificationController.sendCoachMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Student ID and message are required',
      }));
    });

    it('should return 400 when message is missing', async () => {
      const req = mockRequest({
        user: { id: 'coach1', name: 'Coach' },
        body: { studentId: 's1' },
      });
      const res = mockResponse();

      await notificationController.sendCoachMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on exception', async () => {
      const req = mockRequest({
        user: { id: 'coach1', name: 'Coach' },
        body: { studentId: 's1', message: 'Hello' },
      });
      const res = mockResponse();

      NotificationService.notifyCoachMessage.mockRejectedValue(new Error('DB error'));

      await notificationController.sendCoachMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
