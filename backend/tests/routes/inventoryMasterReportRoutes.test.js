const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const Role = require('../../models/role');
const User = require('../../models/user');
const ShopItem = require('../../models/shopItem');
const Order = require('../../models/order');
const Balagruha = require('../../models/balagruha');
const inventoryRoutes = require('../../routes/v2/inventory');

const app = express();
app.use(express.json());
app.use('/api/v2/shop/admin/inventory', inventoryRoutes);

describe('Inventory Master Report Routes Integration - Story 3.3', () => {
  let adminToken;
  let studentToken;
  let adminUser;
  let studentUser;

  beforeEach(async () => {
    // Roles required for authorize('Shop Management', 'Manage')
    await Role.create({
      roleName: 'admin',
      permissions: [{ module: 'Shop Management', actions: ['Manage'] }]
    });

    await Role.create({
      roleName: 'student',
      permissions: []
    });

    adminUser = await User.create({
      name: 'Admin',
      email: 'admin.master-report@test.com',
      role: 'admin',
      status: 'active'
    });

    studentUser = await User.create({
      name: 'Student',
      email: 'student.master-report@test.com',
      role: 'student',
      status: 'active'
    });

    adminToken = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET);
    studentToken = jwt.sign({ id: studentUser._id }, process.env.JWT_SECRET);
  });

  describe('GET /api/v2/shop/admin/inventory/master-report', () => {
    it('returns deployed aggregation per product for admin', async () => {
      const item1 = await ShopItem.create({
        sku: `MR-ITEM1-${Date.now()}`,
        name: 'Master Report Item 1',
        description: 'Item 1',
        category: 'ISF Shop',
        price: 10,
        stock: 5
      });

      const item2 = await ShopItem.create({
        sku: `MR-ITEM2-${Date.now()}`,
        name: 'Master Report Item 2',
        description: 'Item 2',
        category: 'Consumables',
        price: 20,
        stock: 10
      });

      const item3 = await ShopItem.create({
        sku: `MR-ITEM3-${Date.now()}`,
        name: 'Master Report Item 3',
        description: 'Item 3',
        category: 'Others',
        price: 30,
        stock: 0
      });

      await Order.create({
        orderNumber: 'ORD-20251224-00001',
        userId: studentUser._id,
        items: [
          {
            shopItemId: item1._id,
            name: item1.name,
            sku: item1.sku,
            price: item1.price,
            quantity: 2,
            subtotal: 2 * item1.price
          },
          {
            shopItemId: item2._id,
            name: item2.name,
            sku: item2.sku,
            price: item2.price,
            quantity: 1,
            subtotal: 1 * item2.price
          }
        ],
        subtotal: 2 * item1.price + 1 * item2.price,
        discount: 0,
        totalAmount: 2 * item1.price + 1 * item2.price,
        status: 'completed',
        deliveryStatus: 'delivered',
        placedAt: new Date('2025-12-24T10:00:00.000Z'),
        completedAt: new Date('2025-12-24T10:05:00.000Z'),
        deliveredAt: new Date('2025-12-24T12:00:00.000Z')
      });

      await Order.create({
        orderNumber: 'ORD-20251224-00002',
        userId: studentUser._id,
        items: [
          {
            shopItemId: item1._id,
            name: item1.name,
            sku: item1.sku,
            price: item1.price,
            quantity: 3,
            subtotal: 3 * item1.price
          }
        ],
        subtotal: 3 * item1.price,
        discount: 0,
        totalAmount: 3 * item1.price,
        status: 'completed',
        deliveryStatus: 'delivered',
        placedAt: new Date('2025-12-24T11:00:00.000Z'),
        completedAt: new Date('2025-12-24T11:05:00.000Z'),
        deliveredAt: new Date('2025-12-24T12:30:00.000Z')
      });

      // Should NOT be counted
      await Order.create({
        orderNumber: 'ORD-20251224-00003',
        userId: studentUser._id,
        items: [
          {
            shopItemId: item2._id,
            name: item2.name,
            sku: item2.sku,
            price: item2.price,
            quantity: 99,
            subtotal: 99 * item2.price
          }
        ],
        subtotal: 99 * item2.price,
        discount: 0,
        totalAmount: 99 * item2.price,
        status: 'completed',
        deliveryStatus: 'pending_delivery',
        placedAt: new Date('2025-12-24T11:30:00.000Z'),
        completedAt: new Date('2025-12-24T11:35:00.000Z')
      });

      const res = await request(app)
        .get('/api/v2/shop/admin/inventory/master-report')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('products');
      expect(Array.isArray(res.body.products)).toBe(true);

      const rows = res.body.products;
      expect(rows).toHaveLength(3);

      const row1 = rows.find(r => r.sku === item1.sku);
      const row2 = rows.find(r => r.sku === item2.sku);
      const row3 = rows.find(r => r.sku === item3.sku);

      expect(row1).toEqual(expect.objectContaining({
        sku: item1.sku,
        name: item1.name,
        category: item1.category,
        stock: 5,
        deployed: 5
      }));

      expect(row2).toEqual(expect.objectContaining({
        sku: item2.sku,
        name: item2.name,
        category: item2.category,
        stock: 10,
        deployed: 1
      }));

      expect(row3).toEqual(expect.objectContaining({
        sku: item3.sku,
        name: item3.name,
        category: item3.category,
        stock: 0,
        deployed: 0
      }));
    });

    it('denies non-admin', async () => {
      const res = await request(app)
        .get('/api/v2/shop/admin/inventory/master-report')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    it('includes balagruhaBreakdown array in response', async () => {
      const res = await request(app)
        .get('/api/v2/shop/admin/inventory/master-report')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('balagruhaBreakdown');
      expect(Array.isArray(res.body.balagruhaBreakdown)).toBe(true);
    });

    it('returns per-balagruha deployed quantities', async () => {
      // Create two Balagruhas
      const bg1 = await Balagruha.create({ name: 'BG Alpha', location: 'Block A' });
      const bg2 = await Balagruha.create({ name: 'BG Beta', location: 'Block B' });

      // Create students in different Balagruhas
      const studentA = await User.create({
        name: 'Student A',
        email: 'student-a-bg@test.com',
        role: 'student',
        status: 'active',
        balagruhaIds: [bg1._id]
      });

      const studentB = await User.create({
        name: 'Student B',
        email: 'student-b-bg@test.com',
        role: 'student',
        status: 'active',
        balagruhaIds: [bg2._id]
      });

      const item = await ShopItem.create({
        sku: `MR-BG-ITEM-${Date.now()}`,
        name: 'BG Test Item',
        description: 'Item for BG test',
        category: 'ISF Shop',
        price: 10,
        stock: 20
      });

      // Student A (BG Alpha) orders 3
      await Order.create({
        orderNumber: `ORD-20251225-${String(Date.now()).slice(-5)}`,
        userId: studentA._id,
        items: [{
          shopItemId: item._id,
          name: item.name,
          sku: item.sku,
          price: item.price,
          quantity: 3,
          subtotal: 30
        }],
        subtotal: 30,
        discount: 0,
        totalAmount: 30,
        status: 'completed',
        deliveryStatus: 'delivered',
        placedAt: new Date('2025-12-25T10:00:00.000Z'),
        completedAt: new Date('2025-12-25T10:05:00.000Z'),
        deliveredAt: new Date('2025-12-25T12:00:00.000Z')
      });

      // Student B (BG Beta) orders 7
      await Order.create({
        orderNumber: `ORD-20251225-${String(Date.now() + 1).slice(-5)}`,
        userId: studentB._id,
        items: [{
          shopItemId: item._id,
          name: item.name,
          sku: item.sku,
          price: item.price,
          quantity: 7,
          subtotal: 70
        }],
        subtotal: 70,
        discount: 0,
        totalAmount: 70,
        status: 'completed',
        deliveryStatus: 'delivered',
        placedAt: new Date('2025-12-25T11:00:00.000Z'),
        completedAt: new Date('2025-12-25T11:05:00.000Z'),
        deliveredAt: new Date('2025-12-25T12:30:00.000Z')
      });

      const res = await request(app)
        .get('/api/v2/shop/admin/inventory/master-report')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.balagruhaBreakdown).toBeDefined();
      expect(res.body.balagruhaBreakdown.length).toBeGreaterThanOrEqual(2);

      const bgAlpha = res.body.balagruhaBreakdown.find(b => b.balagruhaName === 'BG Alpha');
      const bgBeta = res.body.balagruhaBreakdown.find(b => b.balagruhaName === 'BG Beta');

      expect(bgAlpha).toBeDefined();
      expect(bgBeta).toBeDefined();

      // Check BG Alpha totals
      const alphaItem = bgAlpha.items.find(i => i.sku === item.sku);
      expect(alphaItem).toBeDefined();
      expect(alphaItem.deployed).toBe(3);
      expect(alphaItem.inStore).toBe(20);
      expect(alphaItem.total).toBe(23);

      // Check BG Beta totals
      const betaItem = bgBeta.items.find(i => i.sku === item.sku);
      expect(betaItem).toBeDefined();
      expect(betaItem.deployed).toBe(7);
      expect(betaItem.inStore).toBe(20);
      expect(betaItem.total).toBe(27);

      // Check aggregated totals
      expect(bgAlpha.totalDeployed).toBe(3);
      expect(bgBeta.totalDeployed).toBe(7);
    });

    it('returns zero deployed for balagruha with no orders', async () => {
      const bgEmpty = await Balagruha.create({ name: 'BG Empty', location: 'Block Z' });

      const item = await ShopItem.create({
        sku: `MR-EMPTY-${Date.now()}`,
        name: 'Empty BG Item',
        description: 'Item for empty BG test',
        category: 'ISF Shop',
        price: 5,
        stock: 15
      });

      const res = await request(app)
        .get('/api/v2/shop/admin/inventory/master-report')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      const bgRow = res.body.balagruhaBreakdown.find(b => b.balagruhaName === 'BG Empty');
      expect(bgRow).toBeDefined();
      expect(bgRow.totalDeployed).toBe(0);

      const itemRow = bgRow.items.find(i => i.sku === item.sku);
      expect(itemRow).toBeDefined();
      expect(itemRow.deployed).toBe(0);
      expect(itemRow.inStore).toBe(15);
      expect(itemRow.total).toBe(15);
    });
  });
});
