const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const Role = require('../../models/role');
const User = require('../../models/user');
const orderRoutes = require('../../routes/v2/orders');

// Mock pino logger
jest.mock('../../config/pino-config', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  errorLogger: { error: jest.fn(), info: jest.fn() },
}));

// Mock order service to avoid DB dependency for order operations
jest.mock('../../services/order');
const orderService = require('../../services/order');

const app = express();
app.use(express.json());
app.use('/api/v2/shop/orders', orderRoutes);

describe('Order Routes RBAC (Story 13.3 / FIX-009)', () => {
  let adminToken;
  let studentToken;
  let adminUser;
  let studentUser;

  beforeEach(async () => {
    // Re-set mock implementations after jest.clearAllMocks() in global setup
    orderService.createOrder.mockResolvedValue({
      message: 'Order placed',
      order: { orderNumber: 'ORD-20260317-00001' },
      coinsSpent: 10,
      remainingBalance: 90,
    });
    orderService.getUserOrders.mockResolvedValue({ orders: [], pagination: {} });
    orderService.getAllOrders.mockResolvedValue({ orders: [], pagination: {} });

    await Role.create({
      roleName: 'admin',
      permissions: [{ module: 'Shop Management', actions: ['Manage'], scope: 'all' }],
    });

    await Role.create({
      roleName: 'student',
      permissions: [
        { module: 'WTF Interaction', actions: ['Create', 'Read'] },
      ],
    });

    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin.order-rbac@test.com',
      role: 'admin',
      status: 'active',
    });

    studentUser = await User.create({
      name: 'Student User',
      email: 'student.order-rbac@test.com',
      role: 'student',
      status: 'active',
    });

    adminToken = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET);
    studentToken = jwt.sign({ id: studentUser._id }, process.env.JWT_SECRET);
  });

  describe('GET /api/v2/shop/orders/all (admin-only)', () => {
    it('should allow admin with Shop Management permission', async () => {
      const res = await request(app)
        .get('/api/v2/shop/orders/all')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ success: true });
    });

    it('should deny student without Shop Management permission', async () => {
      const res = await request(app)
        .get('/api/v2/shop/orders/all')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    it('should deny unauthenticated requests', async () => {
      const res = await request(app)
        .get('/api/v2/shop/orders/all');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v2/shop/orders (student order history)', () => {
    it('should allow authenticated student to view own orders', async () => {
      const res = await request(app)
        .get('/api/v2/shop/orders')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ success: true });
    });

    it('should deny unauthenticated requests', async () => {
      const res = await request(app)
        .get('/api/v2/shop/orders');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v2/shop/orders (create order)', () => {
    it('should allow authenticated student to create order', async () => {
      const res = await request(app)
        .post('/api/v2/shop/orders')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ success: true });
    });
  });
});
