const mongoose = require('mongoose');
const ShopItem = require('../../models/shopItem');
const InventoryTransaction = require('../../models/inventoryTransaction');
const inventoryController = require('../../controllers/inventoryController');

const { mockRequest, mockResponse, generateObjectId } = global.testUtils;

// Import Order model (real model, has required fields)
const Order = require('../../models/order');

// Helper: create a ShopItem for tests
async function createProduct(overrides = {}) {
  return ShopItem.create({
    name: 'Inventory Product',
    description: 'A test product for inventory',
    category: 'ISF Shop',
    price: 100,
    stock: 50,
    lowStockThreshold: 10,
    sku: `INV-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    isActive: true,
    ...overrides,
  });
}

describe('Inventory Controller', () => {

  // ─── adjustStock ──────────────────────────────────────────────
  describe('adjustStock', () => {
    it('should increase stock with positive adjustment', async () => {
      const product = await createProduct({ stock: 50 });

      const req = mockRequest({
        params: { productId: product._id.toString() },
        body: { adjustment: 10, reason: 'Purchase / Restock', notes: 'Restocked' },
        user: { _id: generateObjectId(), role: 'admin' },
      });
      const res = mockResponse();

      await inventoryController.adjustStock(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.product.previousStock).toBe(50);
      expect(jsonArg.product.newStock).toBe(60);
      expect(jsonArg.product.adjustment).toBe(10);

      // Verify DB
      const updated = await ShopItem.findById(product._id);
      expect(updated.stock).toBe(60);
    });

    it('should decrease stock with negative adjustment', async () => {
      const product = await createProduct({ stock: 50 });

      const req = mockRequest({
        params: { productId: product._id.toString() },
        body: { adjustment: -5, reason: 'Damaged Items' },
        user: { _id: generateObjectId(), role: 'admin' },
      });
      const res = mockResponse();

      await inventoryController.adjustStock(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.product.newStock).toBe(45);
    });

    it('should set stock directly with newStock parameter', async () => {
      const product = await createProduct({ stock: 50 });

      const req = mockRequest({
        params: { productId: product._id.toString() },
        body: { newStock: 75, reason: 'Stock Correction' },
        user: { _id: generateObjectId(), role: 'admin' },
      });
      const res = mockResponse();

      await inventoryController.adjustStock(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.product.newStock).toBe(75);
    });

    it('should reject negative resulting stock', async () => {
      const product = await createProduct({ stock: 5 });

      const req = mockRequest({
        params: { productId: product._id.toString() },
        body: { adjustment: -10, reason: 'Damaged Items' },
        user: { _id: generateObjectId(), role: 'admin' },
      });
      const res = mockResponse();

      await inventoryController.adjustStock(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Stock cannot be negative',
      }));

      // Verify stock unchanged
      const unchanged = await ShopItem.findById(product._id);
      expect(unchanged.stock).toBe(5);
    });

    it('should reject negative newStock value', async () => {
      const product = await createProduct({ stock: 50 });

      const req = mockRequest({
        params: { productId: product._id.toString() },
        body: { newStock: -5, reason: 'Stock Correction' },
        user: { _id: generateObjectId(), role: 'admin' },
      });
      const res = mockResponse();

      await inventoryController.adjustStock(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Stock cannot be negative',
      }));
    });

    it('should reject zero adjustment', async () => {
      const product = await createProduct({ stock: 50 });

      const req = mockRequest({
        params: { productId: product._id.toString() },
        body: { adjustment: 0, reason: 'Inventory Adjustment' },
        user: { _id: generateObjectId(), role: 'admin' },
      });
      const res = mockResponse();

      await inventoryController.adjustStock(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'No stock change detected',
      }));
    });

    it('should reject non-numeric adjustment', async () => {
      const product = await createProduct({ stock: 50 });

      const req = mockRequest({
        params: { productId: product._id.toString() },
        body: { adjustment: 'abc', reason: 'Inventory Adjustment' },
        user: { _id: generateObjectId(), role: 'admin' },
      });
      const res = mockResponse();

      await inventoryController.adjustStock(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Adjustment must be a number',
      }));
    });

    it('should return 404 for non-existent product', async () => {
      const req = mockRequest({
        params: { productId: generateObjectId().toString() },
        body: { adjustment: 10, reason: 'Inventory Adjustment' },
        user: { _id: generateObjectId(), role: 'admin' },
      });
      const res = mockResponse();

      await inventoryController.adjustStock(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should create audit trail transaction', async () => {
      const userId = generateObjectId();
      const product = await createProduct({ stock: 20 });

      const req = mockRequest({
        params: { productId: product._id.toString() },
        body: { adjustment: 5, reason: 'Purchase / Restock', notes: 'Test restock' },
        user: { _id: userId, role: 'admin' },
      });
      const res = mockResponse();

      await inventoryController.adjustStock(req, res);

      expect(res.status).toHaveBeenCalledWith(200);

      const txn = await InventoryTransaction.findOne({ productId: product._id });
      expect(txn).toBeTruthy();
      expect(txn.transactionType).toBe('purchase');
      expect(txn.quantity).toBe(5);
      expect(txn.previousStock).toBe(20);
      expect(txn.newStock).toBe(25);
    });

    it('should reject newStock same as current stock', async () => {
      const product = await createProduct({ stock: 50 });

      const req = mockRequest({
        params: { productId: product._id.toString() },
        body: { newStock: 50, reason: 'Stock Correction' },
        user: { _id: generateObjectId(), role: 'admin' },
      });
      const res = mockResponse();

      await inventoryController.adjustStock(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'No stock change detected',
      }));
    });
  });

  // ─── bulkUpdateStock ──────────────────────────────────────────
  describe('bulkUpdateStock', () => {
    it('should reject non-array csvData', async () => {
      const req = mockRequest({
        body: { csvData: 'not-an-array' },
        user: { _id: generateObjectId(), role: 'admin' },
      });
      const res = mockResponse();

      await inventoryController.bulkUpdateStock(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should reject missing csvData', async () => {
      const req = mockRequest({
        body: {},
        user: { _id: generateObjectId(), role: 'admin' },
      });
      const res = mockResponse();

      await inventoryController.bulkUpdateStock(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── getLowStockProducts ──────────────────────────────────────
  describe('getLowStockProducts', () => {
    it('should return products at or below low stock threshold', async () => {
      await createProduct({ name: 'Low', stock: 5, lowStockThreshold: 10, isActive: true });
      await createProduct({ name: 'OK', stock: 50, lowStockThreshold: 10, isActive: true });
      await createProduct({ name: 'AtThreshold', stock: 10, lowStockThreshold: 10, isActive: true });

      const req = mockRequest();
      const res = mockResponse();

      await inventoryController.getLowStockProducts(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.count).toBe(2); // 'Low' (5<=10) and 'AtThreshold' (10<=10)
      const names = jsonArg.products.map(p => p.name);
      expect(names).toContain('Low');
      expect(names).toContain('AtThreshold');
      expect(names).not.toContain('OK');
    });

    it('should not include out-of-stock products (stock=0)', async () => {
      await createProduct({ name: 'Empty', stock: 0, lowStockThreshold: 10, isActive: true });

      const req = mockRequest();
      const res = mockResponse();

      await inventoryController.getLowStockProducts(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const jsonArg = res.json.mock.calls[0][0];
      const names = jsonArg.products.map(p => p.name);
      expect(names).not.toContain('Empty');
    });

    it('should not include inactive products', async () => {
      await createProduct({ name: 'Inactive Low', stock: 3, lowStockThreshold: 10, isActive: false });

      const req = mockRequest();
      const res = mockResponse();

      await inventoryController.getLowStockProducts(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const jsonArg = res.json.mock.calls[0][0];
      const names = jsonArg.products.map(p => p.name);
      expect(names).not.toContain('Inactive Low');
    });
  });

  // ─── getOutOfStockProducts ────────────────────────────────────
  describe('getOutOfStockProducts', () => {
    it('should return products with stock=0', async () => {
      await createProduct({ name: 'Empty', stock: 0, isActive: true });
      await createProduct({ name: 'HasStock', stock: 10, isActive: true });

      const req = mockRequest();
      const res = mockResponse();

      await inventoryController.getOutOfStockProducts(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.count).toBe(1);
      expect(jsonArg.products[0].name).toBe('Empty');
    });
  });

  // ─── getStockAlerts ───────────────────────────────────────────
  describe('getStockAlerts', () => {
    it('should return combined alert counts', async () => {
      await createProduct({ stock: 0, lowStockThreshold: 10, isActive: true });      // out of stock
      await createProduct({ stock: 3, lowStockThreshold: 10, isActive: true });      // low stock
      await createProduct({ stock: 50, lowStockThreshold: 10, isActive: true });     // normal

      const req = mockRequest();
      const res = mockResponse();

      await inventoryController.getStockAlerts(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.lowStock).toBe(1);
      expect(jsonArg.outOfStock).toBe(1);
      expect(jsonArg.total).toBe(2);
    });
  });

  // ─── getQuickStats ────────────────────────────────────────────
  describe('getQuickStats', () => {
    it('should return product and order counts', async () => {
      await createProduct({ isActive: true });
      await createProduct({ isActive: true });
      await createProduct({ isActive: false });
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
      await Order.create({
        status: 'completed',
        userId: generateObjectId(),
        orderNumber: `ORD-${dateStr}-00001`,
        items: [{ shopItemId: generateObjectId(), name: 'Test', quantity: 1, price: 10, subtotal: 10 }],
        totalAmount: 10,
        subtotal: 10,
      });

      const req = mockRequest();
      const res = mockResponse();

      await inventoryController.getQuickStats(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.totalProducts).toBe(2);
      expect(jsonArg.totalOrders).toBe(1);
    });
  });

  // ─── getAuditTrail ────────────────────────────────────────────
  describe('getAuditTrail', () => {
    it('should return audit trail for a product', async () => {
      const product = await createProduct();
      const userId = generateObjectId();

      await InventoryTransaction.create({
        productId: product._id,
        transactionType: 'adjustment',
        quantity: 5,
        previousStock: 50,
        newStock: 55,
        reference: { type: 'manual' },
        reason: 'Test adjustment',
        performedBy: userId,
      });

      const req = mockRequest({
        params: { productId: product._id.toString() },
        query: {},
      });
      const res = mockResponse();

      await inventoryController.getAuditTrail(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.transactions.length).toBe(1);
      expect(jsonArg.transactions[0].quantity).toBe(5);
    });
  });
});
