const mongoose = require('mongoose');
const PurchaseRequest = require('../models/purchaseRequest');
const ShopItem = require('../models/shopItem');
const InventoryTransaction = require('../models/inventoryTransaction');
const User = require('../models/user');
const purchaseRequestController = require('../controllers/purchaseRequestController');
const { mockRequest, mockResponse } = global.testUtils || {
  mockRequest: (data) => ({ ...data, body: data.body || {}, params: data.params || {}, query: data.query || {}, user: data.user || {} }),
  mockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  }
};

describe('FIX-007: Unify Purchase Request Inventory Update with State Machine', () => {
  let pmUser, coachUser, adminUser, product;

  beforeAll(async () => {
    pmUser = new User({ _id: new mongoose.Types.ObjectId(), role: 'purchase-manager', name: 'PM', email: 'pm-fix007@test.com' });
    coachUser = new User({ _id: new mongoose.Types.ObjectId(), role: 'coach', name: 'Coach', email: 'coach-fix007@test.com' });
    adminUser = new User({ _id: new mongoose.Types.ObjectId(), role: 'admin', name: 'Admin', email: 'admin-fix007@test.com' });
  });

  beforeEach(async () => {
    product = new ShopItem({
      _id: new mongoose.Types.ObjectId(),
      name: 'Fix007 Test Product',
      stock: 10,
      price: 100,
      sku: `FIX007-SKU-${Date.now()}`,
      category: 'ISF Shop',
      description: 'Test product for FIX-007'
    });
    await product.save();
  });

  afterEach(async () => {
    await PurchaseRequest.deleteMany({});
    await ShopItem.deleteMany({});
    await InventoryTransaction.deleteMany({});
  });

  describe('delivered_store transition triggers inventory stock increase', () => {
    it('should create InventoryTransaction with type "received" and increase stock', async () => {
      // Setup: Create PR and move to ordered
      const pr = await PurchaseRequest.create({
        requestedBy: coachUser._id,
        balagruhaId: 'STOCK',
        category: 'Others',
        reason: 'Test FIX-007',
        status: 'ordered',
        items: [{
          productId: product._id,
          productName: product.name,
          productSKU: product.sku,
          requestedQuantity: 5,
          currentStock: 10,
          lowStockThreshold: 5,
          estimatedUnitCost: 100,
          estimatedTotalCost: 500
        }]
      });

      const req = mockRequest({
        params: { id: pr._id },
        body: { status: 'delivered_store', notes: 'Arrived at store' },
        user: pmUser
      });
      const res = mockResponse();

      await purchaseRequestController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);

      // Verify stock increased
      const updatedProduct = await ShopItem.findById(product._id);
      expect(updatedProduct.stock).toBe(15); // 10 + 5

      // Verify InventoryTransaction created with type 'received'
      const txns = await InventoryTransaction.find({ productId: product._id });
      expect(txns).toHaveLength(1);
      expect(txns[0].transactionType).toBe('received');
      expect(txns[0].quantity).toBe(5);
      expect(txns[0].previousStock).toBe(10);
      expect(txns[0].newStock).toBe(15);
      expect(txns[0].reference.type).toBe('purchase_request');
      expect(txns[0].reference.id.toString()).toBe(pr._id.toString());
      expect(txns[0].performedBy.toString()).toBe(pmUser._id.toString());

      // Verify transaction IDs stored on request
      const updatedPr = await PurchaseRequest.findById(pr._id);
      expect(updatedPr.inventoryTransactionIds).toHaveLength(1);
      expect(updatedPr.inventoryTransactionIds[0].toString()).toBe(txns[0]._id.toString());
    });

    it('should handle multi-item purchase requests at delivered_store', async () => {
      const product2 = await ShopItem.create({
        _id: new mongoose.Types.ObjectId(),
        name: 'Fix007 Product 2',
        stock: 20,
        price: 50,
        sku: `FIX007-SKU2-${Date.now()}`,
        category: 'ISF Shop',
        description: 'Second test product'
      });

      const pr = await PurchaseRequest.create({
        requestedBy: coachUser._id,
        balagruhaId: 'STOCK',
        category: 'Others',
        reason: 'Multi-item test',
        status: 'ordered',
        items: [
          {
            productId: product._id,
            productName: product.name,
            productSKU: product.sku,
            requestedQuantity: 3,
            currentStock: 10,
            lowStockThreshold: 5,
            estimatedUnitCost: 100,
            estimatedTotalCost: 300
          },
          {
            productId: product2._id,
            productName: product2.name,
            productSKU: product2.sku,
            requestedQuantity: 7,
            currentStock: 20,
            lowStockThreshold: 5,
            estimatedUnitCost: 50,
            estimatedTotalCost: 350
          }
        ]
      });

      const req = mockRequest({
        params: { id: pr._id },
        body: { status: 'delivered_store' },
        user: pmUser
      });
      const res = mockResponse();

      await purchaseRequestController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);

      // Verify both products' stock increased
      const p1 = await ShopItem.findById(product._id);
      const p2 = await ShopItem.findById(product2._id);
      expect(p1.stock).toBe(13); // 10 + 3
      expect(p2.stock).toBe(27); // 20 + 7

      // Verify two InventoryTransactions created
      const txns = await InventoryTransaction.find({ reference: { type: 'purchase_request', id: pr._id } });
      expect(txns).toHaveLength(2);
      expect(txns.every(t => t.transactionType === 'received')).toBe(true);

      // Verify request has both transaction IDs
      const updatedPr = await PurchaseRequest.findById(pr._id);
      expect(updatedPr.inventoryTransactionIds).toHaveLength(2);
    });
  });

  describe('delivered_balagruha transition triggers deployed tracking', () => {
    it('should create InventoryTransaction with type "deployed"', async () => {
      // Setup: PR at delivered_store (stock already increased)
      const pr = await PurchaseRequest.create({
        requestedBy: coachUser._id,
        balagruhaId: 'STOCK',
        category: 'Others',
        reason: 'Test FIX-007 deploy',
        status: 'delivered_store',
        items: [{
          productId: product._id,
          productName: product.name,
          productSKU: product.sku,
          requestedQuantity: 5,
          currentStock: 10,
          lowStockThreshold: 5,
          estimatedUnitCost: 100,
          estimatedTotalCost: 500
        }]
      });

      const req = mockRequest({
        params: { id: pr._id },
        body: { status: 'delivered_balagruha', notes: 'Delivered to balagruha' },
        user: coachUser // Requester confirms delivery
      });
      const res = mockResponse();

      await purchaseRequestController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);

      // Verify InventoryTransaction created with type 'deployed'
      const txns = await InventoryTransaction.find({ productId: product._id, transactionType: 'deployed' });
      expect(txns).toHaveLength(1);
      expect(txns[0].transactionType).toBe('deployed');
      expect(txns[0].quantity).toBe(-5); // Negative for deployment tracking
      expect(txns[0].reference.type).toBe('purchase_request');
      expect(txns[0].reference.id.toString()).toBe(pr._id.toString());
      expect(txns[0].performedBy.toString()).toBe(coachUser._id.toString());

      // Stock should remain unchanged (deployed tracking only)
      const updatedProduct = await ShopItem.findById(product._id);
      expect(updatedProduct.stock).toBe(10); // Unchanged
    });
  });

  describe('Full 4-step workflow integration', () => {
    it('should create InventoryTransaction records through the complete lifecycle', async () => {
      // Step 0: Create PR in pending state
      const pr = await PurchaseRequest.create({
        requestedBy: coachUser._id,
        balagruhaId: 'STOCK',
        category: 'Others',
        reason: 'Full lifecycle test',
        status: 'pending',
        items: [{
          productId: product._id,
          productName: product.name,
          productSKU: product.sku,
          requestedQuantity: 5,
          currentStock: 10,
          lowStockThreshold: 5,
          estimatedUnitCost: 100,
          estimatedTotalCost: 500
        }]
      });

      // Step 1: pending -> ordered (no inventory change)
      const req1 = mockRequest({
        params: { id: pr._id },
        body: { status: 'ordered', notes: 'Order placed' },
        user: pmUser
      });
      const res1 = mockResponse();
      await purchaseRequestController.updateStatus(req1, res1);
      expect(res1.status).toHaveBeenCalledWith(200);

      // Verify no inventory transactions yet
      let txns = await InventoryTransaction.find({ reference: { type: 'purchase_request', id: pr._id } });
      expect(txns).toHaveLength(0);

      // Verify stock unchanged
      let prod = await ShopItem.findById(product._id);
      expect(prod.stock).toBe(10);

      // Step 2: ordered -> delivered_store (stock increase + 'received' transaction)
      const req2 = mockRequest({
        params: { id: pr._id },
        body: { status: 'delivered_store', notes: 'Arrived at store' },
        user: pmUser
      });
      const res2 = mockResponse();
      await purchaseRequestController.updateStatus(req2, res2);
      expect(res2.status).toHaveBeenCalledWith(200);

      // Verify stock increased
      prod = await ShopItem.findById(product._id);
      expect(prod.stock).toBe(15); // 10 + 5

      // Verify 'received' transaction created
      txns = await InventoryTransaction.find({ reference: { type: 'purchase_request', id: pr._id } });
      expect(txns).toHaveLength(1);
      expect(txns[0].transactionType).toBe('received');
      expect(txns[0].quantity).toBe(5);

      // Step 3: delivered_store -> delivered_balagruha (deployed tracking)
      const req3 = mockRequest({
        params: { id: pr._id },
        body: { status: 'delivered_balagruha', notes: 'Delivered to balagruha' },
        user: coachUser
      });
      const res3 = mockResponse();
      await purchaseRequestController.updateStatus(req3, res3);
      expect(res3.status).toHaveBeenCalledWith(200);

      // Verify stock unchanged after deployment
      prod = await ShopItem.findById(product._id);
      expect(prod.stock).toBe(15); // Unchanged

      // Verify 'deployed' transaction created
      txns = await InventoryTransaction.find({ reference: { type: 'purchase_request', id: pr._id } });
      expect(txns).toHaveLength(2);

      const receivedTxn = txns.find(t => t.transactionType === 'received');
      const deployedTxn = txns.find(t => t.transactionType === 'deployed');

      expect(receivedTxn).toBeDefined();
      expect(receivedTxn.quantity).toBe(5);
      expect(receivedTxn.previousStock).toBe(10);
      expect(receivedTxn.newStock).toBe(15);

      expect(deployedTxn).toBeDefined();
      expect(deployedTxn.quantity).toBe(-5);
      expect(deployedTxn.performedBy.toString()).toBe(coachUser._id.toString());

      // Verify PR has both transaction IDs
      const finalPr = await PurchaseRequest.findById(pr._id);
      expect(finalPr.status).toBe('delivered_balagruha');
      expect(finalPr.inventoryTransactionIds).toHaveLength(2);
    });
  });

  describe('Non-inventory transitions remain unaffected', () => {
    it('pending -> ordered should NOT create InventoryTransaction', async () => {
      const pr = await PurchaseRequest.create({
        requestedBy: coachUser._id,
        balagruhaId: 'STOCK',
        category: 'Others',
        reason: 'No inventory change test',
        status: 'pending',
        items: [{
          productId: product._id,
          productName: product.name,
          productSKU: product.sku,
          requestedQuantity: 5,
          currentStock: 10,
          lowStockThreshold: 5,
          estimatedUnitCost: 100,
          estimatedTotalCost: 500
        }]
      });

      const req = mockRequest({
        params: { id: pr._id },
        body: { status: 'ordered' },
        user: pmUser
      });
      const res = mockResponse();

      await purchaseRequestController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);

      const txns = await InventoryTransaction.find({});
      expect(txns).toHaveLength(0);

      const updatedProduct = await ShopItem.findById(product._id);
      expect(updatedProduct.stock).toBe(10); // Unchanged
    });

    it('pending -> rejected should NOT create InventoryTransaction', async () => {
      const pr = await PurchaseRequest.create({
        requestedBy: coachUser._id,
        balagruhaId: 'STOCK',
        category: 'Others',
        reason: 'Rejection test',
        status: 'pending',
        items: [{
          productId: product._id,
          productName: product.name,
          productSKU: product.sku,
          requestedQuantity: 5,
          currentStock: 10,
          lowStockThreshold: 5,
          estimatedUnitCost: 100,
          estimatedTotalCost: 500
        }]
      });

      const req = mockRequest({
        params: { id: pr._id },
        body: { status: 'rejected', notes: 'Not needed' },
        user: pmUser
      });
      const res = mockResponse();

      await purchaseRequestController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);

      const txns = await InventoryTransaction.find({});
      expect(txns).toHaveLength(0);
    });
  });
});
