const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const Role = require('../../models/role');
const User = require('../../models/user');
const ShopItem = require('../../models/shopItem');
const InventoryTransaction = require('../../models/inventoryTransaction');
const inventoryRoutes = require('../../routes/v2/inventory');

const app = express();
app.use(express.json());
app.use('/api/v2/shop/admin/inventory', inventoryRoutes);

describe('Stock Reconciliation (Story 4.1)', () => {
  let pmToken;
  let studentToken;
  let pmUser;
  let studentUser;

  beforeEach(async () => {
    await Role.create({
      roleName: 'purchase-manager',
      permissions: [{ module: 'Shop Management', actions: ['Manage'] }]
    });

    await Role.create({
      roleName: 'student',
      permissions: []
    });

    pmUser = await User.create({
      name: 'Purchase Manager',
      email: 'pm.stock-recon@test.com',
      role: 'purchase-manager',
      status: 'active'
    });

    studentUser = await User.create({
      name: 'Student',
      email: 'student.stock-recon@test.com',
      role: 'student',
      status: 'active'
    });

    pmToken = jwt.sign({ id: pmUser._id }, process.env.JWT_SECRET);
    studentToken = jwt.sign({ id: studentUser._id }, process.env.JWT_SECRET);
  });

  describe('PATCH /api/v2/shop/admin/inventory/:productId/adjust', () => {
    it('allows Purchase Manager to adjust stock and creates InventoryTransaction (delta mode)', async () => {
      const product = await ShopItem.create({
        sku: `SR-DELTA-${Date.now()}`,
        name: 'Delta Product',
        description: 'Delta Product',
        category: 'ISF Shop',
        price: 10,
        stock: 10
      });

      const res = await request(app)
        .patch(`/api/v2/shop/admin/inventory/${product._id}/adjust`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          adjustment: -3,
          reason: 'Inventory Adjustment',
          notes: 'Physical count lower'
        });

      expect(res.status).toBe(200);

      const updated = await ShopItem.findById(product._id);
      expect(updated.stock).toBe(7);

      const tx = await InventoryTransaction.findOne({ productId: product._id });
      expect(tx).toBeTruthy();
      expect(tx.transactionType).toBe('adjustment');
      expect(tx.previousStock).toBe(10);
      expect(tx.newStock).toBe(7);
      expect(tx.quantity).toBe(-3);
      expect(tx.reason).toBe('Inventory Adjustment');
      expect(tx.notes).toBe('Physical count lower');
      expect(tx.performedBy.toString()).toBe(pmUser._id.toString());
    });

    it('allows Purchase Manager to set new physical count (newStock mode)', async () => {
      const product = await ShopItem.create({
        sku: `SR-PHYS-${Date.now()}`,
        name: 'Physical Count Product',
        description: 'Physical Count Product',
        category: 'Consumables',
        price: 20,
        stock: 5
      });

      const res = await request(app)
        .patch(`/api/v2/shop/admin/inventory/${product._id}/adjust`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          newStock: 12,
          reason: 'Stock Correction'
        });

      expect(res.status).toBe(200);

      const updated = await ShopItem.findById(product._id);
      expect(updated.stock).toBe(12);

      const tx = await InventoryTransaction.findOne({ productId: product._id });
      expect(tx).toBeTruthy();
      expect(tx.transactionType).toBe('correction');
      expect(tx.previousStock).toBe(5);
      expect(tx.newStock).toBe(12);
      expect(tx.quantity).toBe(7);
      expect(tx.reason).toBe('Stock Correction');
    });

    it('rejects adjustments that would result in negative stock', async () => {
      const product = await ShopItem.create({
        sku: `SR-NEG-${Date.now()}`,
        name: 'Negative Product',
        description: 'Negative Product',
        category: 'Others',
        price: 5,
        stock: 2
      });

      const res = await request(app)
        .patch(`/api/v2/shop/admin/inventory/${product._id}/adjust`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          adjustment: -99,
          reason: 'Inventory Adjustment'
        });

      expect(res.status).toBe(400);

      const updated = await ShopItem.findById(product._id);
      expect(updated.stock).toBe(2);

      const txCount = await InventoryTransaction.countDocuments({ productId: product._id });
      expect(txCount).toBe(0);
    });

    it('requires a reason code', async () => {
      const product = await ShopItem.create({
        sku: `SR-REASON-${Date.now()}`,
        name: 'Reason Product',
        description: 'Reason Product',
        category: 'Medicines',
        price: 15,
        stock: 3
      });

      const res = await request(app)
        .patch(`/api/v2/shop/admin/inventory/${product._id}/adjust`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          adjustment: 1
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('denies unauthorized roles', async () => {
      const product = await ShopItem.create({
        sku: `SR-403-${Date.now()}`,
        name: 'Unauthorized Product',
        description: 'Unauthorized Product',
        category: 'ISF Shop',
        price: 10,
        stock: 10
      });

      const res = await request(app)
        .patch(`/api/v2/shop/admin/inventory/${product._id}/adjust`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          adjustment: 1,
          reason: 'Inventory Adjustment'
        });

      expect(res.status).toBe(403);
    });
  });
});
