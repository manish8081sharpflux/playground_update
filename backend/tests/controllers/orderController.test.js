const mongoose = require('mongoose');

// Mock pino logger before requiring controller
jest.mock('../../config/pino-config', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  errorLogger: { error: jest.fn(), info: jest.fn() },
}));

// Mock order service
jest.mock('../../services/order', () => ({
  createOrder: jest.fn(),
  getOrderByNumber: jest.fn(),
  getUserOrders: jest.fn(),
  getOrderById: jest.fn(),
  cancelOrder: jest.fn(),
  getAllOrders: jest.fn(),
}));

const orderController = require('../../controllers/orderController');
const orderService = require('../../services/order');
const { mockRequest, mockResponse } = global.testUtils;

describe('OrderController (Story 5.2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== createOrder ====================
  describe('createOrder', () => {
    it('should create an order successfully', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({ user: { id: userId } });
      const res = mockResponse();

      orderService.createOrder.mockResolvedValue({
        message: 'Order placed successfully',
        order: { orderNumber: 'ORD-20260316-00001', totalAmount: 50 },
        coinsSpent: 50,
        remainingBalance: 150,
      });

      await orderController.createOrder(req, res);

      expect(orderService.createOrder).toHaveBeenCalledWith(userId);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Order placed successfully',
        coinsSpent: 50,
        remainingBalance: 150,
      }));
    });

    it('should return 400 when cart is empty', async () => {
      const req = mockRequest({ user: { id: 'user1' } });
      const res = mockResponse();

      orderService.createOrder.mockRejectedValue(new Error('Cart is empty'));

      await orderController.createOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Cart is empty',
      }));
    });

    it('should return 400 when insufficient stock', async () => {
      const req = mockRequest({ user: { id: 'user1' } });
      const res = mockResponse();

      orderService.createOrder.mockRejectedValue(new Error('Insufficient stock for item X'));

      await orderController.createOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when insufficient coin balance', async () => {
      const req = mockRequest({ user: { id: 'user1' } });
      const res = mockResponse();

      orderService.createOrder.mockRejectedValue(new Error('Insufficient coin balance'));

      await orderController.createOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when item no longer available', async () => {
      const req = mockRequest({ user: { id: 'user1' } });
      const res = mockResponse();

      orderService.createOrder.mockRejectedValue(new Error('Product is no longer available'));

      await orderController.createOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 409 on concurrent modification', async () => {
      const req = mockRequest({ user: { id: 'user1' } });
      const res = mockResponse();

      orderService.createOrder.mockRejectedValue(new Error('concurrent modification detected'));

      await orderController.createOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('should return 500 on unexpected error', async () => {
      const req = mockRequest({ user: { id: 'user1' } });
      const res = mockResponse();

      orderService.createOrder.mockRejectedValue(new Error('DB connection failed'));

      await orderController.createOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Failed to create order',
      }));
    });
  });

  // ==================== getOrder ====================
  describe('getOrder', () => {
    it('should get order by order number successfully', async () => {
      const req = mockRequest({
        params: { orderNumber: 'ORD-20260316-00001' },
        user: { id: 'user1', role: 'student' },
      });
      const res = mockResponse();

      const mockOrder = { orderNumber: 'ORD-20260316-00001', totalAmount: 50 };
      orderService.getOrderByNumber.mockResolvedValue(mockOrder);

      await orderController.getOrder(req, res);

      expect(orderService.getOrderByNumber).toHaveBeenCalledWith('ORD-20260316-00001', 'user1', 'student');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        order: mockOrder,
      }));
    });

    it('should return 404 when order not found', async () => {
      const req = mockRequest({
        params: { orderNumber: 'ORD-20260316-99999' },
        user: { id: 'user1', role: 'student' },
      });
      const res = mockResponse();

      orderService.getOrderByNumber.mockRejectedValue(new Error('Order not found'));

      await orderController.getOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 when unauthorized', async () => {
      const req = mockRequest({
        params: { orderNumber: 'ORD-20260316-00001' },
        user: { id: 'user2', role: 'student' },
      });
      const res = mockResponse();

      orderService.getOrderByNumber.mockRejectedValue(new Error('Unauthorized access'));

      await orderController.getOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 500 on unexpected error', async () => {
      const req = mockRequest({
        params: { orderNumber: 'ORD-20260316-00001' },
        user: { id: 'user1', role: 'student' },
      });
      const res = mockResponse();

      orderService.getOrderByNumber.mockRejectedValue(new Error('DB error'));

      await orderController.getOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== getUserOrders ====================
  describe('getUserOrders', () => {
    it('should get user orders with default pagination', async () => {
      const req = mockRequest({
        user: { id: 'user1' },
        query: {},
      });
      const res = mockResponse();

      const mockResult = {
        orders: [{ orderNumber: 'ORD-20260316-00001' }],
        pagination: { page: 1, limit: 10, total: 1, pages: 1 },
      };
      orderService.getUserOrders.mockResolvedValue(mockResult);

      await orderController.getUserOrders(req, res);

      expect(orderService.getUserOrders).toHaveBeenCalledWith('user1', 1, 10, null);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        orders: mockResult.orders,
        pagination: mockResult.pagination,
      }));
    });

    it('should get user orders with query params', async () => {
      const req = mockRequest({
        user: { id: 'user1' },
        query: { page: '2', limit: '5', status: 'completed' },
      });
      const res = mockResponse();

      orderService.getUserOrders.mockResolvedValue({ orders: [], pagination: {} });

      await orderController.getUserOrders(req, res);

      expect(orderService.getUserOrders).toHaveBeenCalledWith('user1', 2, 5, 'completed');
    });

    it('should return 500 on error', async () => {
      const req = mockRequest({ user: { id: 'user1' }, query: {} });
      const res = mockResponse();

      orderService.getUserOrders.mockRejectedValue(new Error('DB error'));

      await orderController.getUserOrders(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== getOrderById ====================
  describe('getOrderById', () => {
    it('should get order by ID successfully', async () => {
      const orderId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({
        params: { orderId },
        user: { id: 'user1', role: 'student' },
      });
      const res = mockResponse();

      const mockOrder = { _id: orderId, totalAmount: 50 };
      orderService.getOrderById.mockResolvedValue(mockOrder);

      await orderController.getOrderById(req, res);

      expect(orderService.getOrderById).toHaveBeenCalledWith(orderId, 'user1', 'student');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 when order not found', async () => {
      const req = mockRequest({
        params: { orderId: 'invalid' },
        user: { id: 'user1', role: 'student' },
      });
      const res = mockResponse();

      orderService.getOrderById.mockRejectedValue(new Error('Order not found'));

      await orderController.getOrderById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 when unauthorized', async () => {
      const req = mockRequest({
        params: { orderId: 'some-id' },
        user: { id: 'user2', role: 'student' },
      });
      const res = mockResponse();

      orderService.getOrderById.mockRejectedValue(new Error('Unauthorized'));

      await orderController.getOrderById(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 500 on unexpected error', async () => {
      const req = mockRequest({
        params: { orderId: 'some-id' },
        user: { id: 'user1', role: 'student' },
      });
      const res = mockResponse();

      orderService.getOrderById.mockRejectedValue(new Error('Unexpected'));

      await orderController.getOrderById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== cancelOrder ====================
  describe('cancelOrder', () => {
    it('should cancel an order successfully', async () => {
      const req = mockRequest({
        params: { orderNumber: 'ORD-20260316-00001' },
        body: { reason: 'Changed my mind' },
        user: { id: 'user1' },
      });
      const res = mockResponse();

      orderService.cancelOrder.mockResolvedValue({
        message: 'Order cancelled',
        order: { orderNumber: 'ORD-20260316-00001', status: 'cancelled' },
        refundedAmount: 50,
        newBalance: 200,
      });

      await orderController.cancelOrder(req, res);

      expect(orderService.cancelOrder).toHaveBeenCalledWith('ORD-20260316-00001', 'user1', 'Changed my mind');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        refundedAmount: 50,
      }));
    });

    it('should return 404 when order not found for cancellation', async () => {
      const req = mockRequest({
        params: { orderNumber: 'ORD-20260316-99999' },
        body: {},
        user: { id: 'user1' },
      });
      const res = mockResponse();

      orderService.cancelOrder.mockRejectedValue(new Error('Order not found'));

      await orderController.cancelOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 when order cannot be cancelled', async () => {
      const req = mockRequest({
        params: { orderNumber: 'ORD-20260316-00001' },
        body: {},
        user: { id: 'user1' },
      });
      const res = mockResponse();

      orderService.cancelOrder.mockRejectedValue(new Error('Order cannot be cancelled'));

      await orderController.cancelOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 403 when unauthorized to cancel', async () => {
      const req = mockRequest({
        params: { orderNumber: 'ORD-20260316-00001' },
        body: {},
        user: { id: 'user2' },
      });
      const res = mockResponse();

      orderService.cancelOrder.mockRejectedValue(new Error('Unauthorized'));

      await orderController.cancelOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 500 on unexpected cancel error', async () => {
      const req = mockRequest({
        params: { orderNumber: 'ORD-20260316-00001' },
        body: {},
        user: { id: 'user1' },
      });
      const res = mockResponse();

      orderService.cancelOrder.mockRejectedValue(new Error('Unexpected'));

      await orderController.cancelOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== getAllOrders ====================
  describe('getAllOrders', () => {
    it('should get all orders for admin', async () => {
      const req = mockRequest({
        user: { id: 'admin1', role: 'admin' },
        query: { page: '1', limit: '10' },
      });
      const res = mockResponse();

      const mockResult = {
        orders: [{ orderNumber: 'ORD-20260316-00001' }],
        pagination: { page: 1, limit: 10, total: 1, pages: 1 },
      };
      orderService.getAllOrders.mockResolvedValue(mockResult);

      await orderController.getAllOrders(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        orders: mockResult.orders,
      }));
    });

    // Note: Non-admin access is now blocked by authorize('Shop Management', 'Manage')
    // middleware at the route level, not in the controller. Middleware-level RBAC
    // tests are covered in route/integration tests.

    it('should pass filter query params to service', async () => {
      const req = mockRequest({
        user: { id: 'admin1', role: 'admin' },
        query: {
          page: '2',
          limit: '20',
          status: 'completed',
          coachId: 'coach1',
          balagruhaId: 'bg1',
          studentId: 'student1',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
        },
      });
      const res = mockResponse();

      orderService.getAllOrders.mockResolvedValue({ orders: [], pagination: {} });

      await orderController.getAllOrders(req, res);

      expect(orderService.getAllOrders).toHaveBeenCalledWith(
        2, 20, 'completed', 'coach1', 'bg1', 'student1', '2026-01-01', '2026-12-31'
      );
    });

    it('should return 500 on service error', async () => {
      const req = mockRequest({
        user: { id: 'admin1', role: 'admin' },
        query: {},
      });
      const res = mockResponse();

      orderService.getAllOrders.mockRejectedValue(new Error('DB error'));

      await orderController.getAllOrders(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
