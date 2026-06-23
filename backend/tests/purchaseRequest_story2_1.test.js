const mongoose = require('mongoose');
const PurchaseRequest = require('../models/purchaseRequest');
const ShopItem = require('../models/shopItem');
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

describe('Story 2.1: Purchase Request State Machine', () => {
  let adminUser, pmUser, coachUser, product;

  beforeAll(async () => {
    // Create users for roles
    adminUser = new User({ _id: new mongoose.Types.ObjectId(), role: 'admin', name: 'Admin', email: 'admin@test.com' });
    pmUser = new User({ _id: new mongoose.Types.ObjectId(), role: 'purchase-manager', name: 'PM', email: 'pm@test.com' });
    coachUser = new User({ _id: new mongoose.Types.ObjectId(), role: 'coach', name: 'Coach', email: 'coach@test.com' });
  });

  beforeEach(async () => {
    // Create a product for each test to ensure isolation
    product = new ShopItem({
      _id: new mongoose.Types.ObjectId(),
      name: 'Test Product',
      stock: 10,
      price: 100,
      sku: `TEST-SKU-${Date.now()}`,
      category: 'ISF Shop', 
      description: 'Test Description' 
    });
    await product.save();
  });

  afterEach(async () => {
    await PurchaseRequest.deleteMany({});
    await ShopItem.deleteMany({});
  });

  describe('Model Schema', () => {
    it('should support new status enum and history', async () => {
      const pr = new PurchaseRequest({
        requestedBy: coachUser._id,
        balagruhaId: 'STOCK',
        category: 'Others',
        reason: 'Test',
        items: [{
          productId: product._id,
          productName: product.name,
          productSKU: product.sku,
          requestedQuantity: 1,
          currentStock: 10,
          lowStockThreshold: 5,
          estimatedUnitCost: 10,
          estimatedTotalCost: 10
        }],
        deadline: new Date(),
        status: 'pending' // New status
      });

      const savedPr = await pr.save();
      expect(savedPr.status).toBe('pending');
      // Check if statusHistory exists in schema (even if empty initially)
      expect(savedPr.statusHistory).toBeDefined();
    });
  });

  describe('Controller: updateStatus', () => {
    let prId;

    beforeEach(async () => {
      const pr = await PurchaseRequest.create({
        requestedBy: coachUser._id,
        balagruhaId: 'STOCK',
        category: 'Others',
        reason: 'Test',
        status: 'pending',
        items: [{
          productId: product._id,
          productName: product.name,
          productSKU: product.sku,
          requestedQuantity: 5,
          currentStock: 10,
          lowStockThreshold: 5,
          estimatedUnitCost: 10,
          estimatedTotalCost: 50
        }],
        deadline: new Date()
      });
      prId = pr._id;
    });

    it('should allow PM to move pending -> ordered', async () => {
      const req = mockRequest({
        params: { id: prId },
        body: { status: 'ordered', notes: 'Ordering now' },
        user: pmUser
      });
      const res = mockResponse();

      await purchaseRequestController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const updatedPr = await PurchaseRequest.findById(prId);
      expect(updatedPr.status).toBe('ordered');
      expect(updatedPr.statusHistory).toHaveLength(1);
      expect(updatedPr.statusHistory[0].status).toBe('ordered');
      expect(updatedPr.statusHistory[0].changedBy.toString()).toBe(pmUser._id.toString());
    });

    it('should DENY Coach from moving pending -> ordered', async () => {
      const req = mockRequest({
        params: { id: prId },
        body: { status: 'ordered' },
        user: coachUser
      });
      const res = mockResponse();

      await purchaseRequestController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should DENY Admin from moving pending -> ordered (PM only)', async () => {
      const req = mockRequest({
        params: { id: prId },
        body: { status: 'ordered' },
        user: adminUser
      });
      const res = mockResponse();

      await purchaseRequestController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should allow PM to move ordered -> delivered_store', async () => {
      // Setup: move to ordered first
      await PurchaseRequest.findByIdAndUpdate(prId, { status: 'ordered' });

      const req = mockRequest({
        params: { id: prId },
        body: { status: 'delivered_store' },
        user: pmUser
      });
      const res = mockResponse();

      await purchaseRequestController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const updatedPr = await PurchaseRequest.findById(prId);
      expect(updatedPr.status).toBe('delivered_store');
    });

    it('should allow Coach (Requester) to move delivered_store -> delivered_balagruha', async () => {
      await PurchaseRequest.findByIdAndUpdate(prId, { status: 'delivered_store' });

      const req = mockRequest({
        params: { id: prId },
        body: { status: 'delivered_balagruha' },
        user: coachUser // Requester
      });
      const res = mockResponse();

      await purchaseRequestController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const updatedPr = await PurchaseRequest.findById(prId);
      expect(updatedPr.status).toBe('delivered_balagruha');
    });

    it('should DENY non-requester from moving delivered_store -> delivered_balagruha', async () => {
      await PurchaseRequest.findByIdAndUpdate(prId, { status: 'delivered_store' });

      const req = mockRequest({
        params: { id: prId },
        body: { status: 'delivered_balagruha' },
        user: pmUser
      });
      const res = mockResponse();

      await purchaseRequestController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should allow Admin to move delivered_store -> delivered_balagruha', async () => {
      await PurchaseRequest.findByIdAndUpdate(prId, { status: 'delivered_store' });

      const req = mockRequest({
        params: { id: prId },
        body: { status: 'delivered_balagruha' },
        user: adminUser
      });
      const res = mockResponse();

      await purchaseRequestController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const updatedPr = await PurchaseRequest.findById(prId);
      expect(updatedPr.status).toBe('delivered_balagruha');
    });

    it('should return 400 for invalid status value', async () => {
      const req = mockRequest({
        params: { id: prId },
        body: { status: 'not_a_real_status' },
        user: pmUser
      });
      const res = mockResponse();

      await purchaseRequestController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: expect.stringContaining('Invalid status')
      }));
    });

    it('should DENY PM from updating status when request is in an unassigned balagruha', async () => {
      const unassignedBalagruhaId = new mongoose.Types.ObjectId();
      const assignedBalagruhaId = new mongoose.Types.ObjectId();

      const pr = await PurchaseRequest.create({
        requestedBy: coachUser._id,
        balagruhaId: unassignedBalagruhaId,
        category: 'Others',
        reason: 'Test',
        status: 'pending',
        items: [{
          productId: product._id,
          productName: product.name,
          productSKU: product.sku,
          requestedQuantity: 5,
          currentStock: 10,
          lowStockThreshold: 5,
          estimatedUnitCost: 10,
          estimatedTotalCost: 50
        }],
        deadline: new Date()
      });

      const req = mockRequest({
        params: { id: pr._id },
        body: { status: 'ordered' },
        user: {
          _id: pmUser._id,
          role: 'purchase-manager',
          balagruhaIds: [assignedBalagruhaId]
        }
      });
      const res = mockResponse();

      await purchaseRequestController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should ALLOW PM to update status when request is in an assigned balagruha', async () => {
      const assignedBalagruhaId = new mongoose.Types.ObjectId();

      const pr = await PurchaseRequest.create({
        requestedBy: coachUser._id,
        balagruhaId: assignedBalagruhaId,
        category: 'Others',
        reason: 'Test',
        status: 'pending',
        items: [{
          productId: product._id,
          productName: product.name,
          productSKU: product.sku,
          requestedQuantity: 5,
          currentStock: 10,
          lowStockThreshold: 5,
          estimatedUnitCost: 10,
          estimatedTotalCost: 50
        }]
      });

      const req = mockRequest({
        params: { id: pr._id },
        body: { status: 'ordered' },
        user: {
          _id: pmUser._id,
          role: 'purchase-manager',
          balagruhaIds: [assignedBalagruhaId]
        }
      });
      const res = mockResponse();

      await purchaseRequestController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const updatedPr = await PurchaseRequest.findById(pr._id);
      expect(updatedPr.status).toBe('ordered');
    });
  });

  describe('Controller: getPurchaseRequestById (access control)', () => {
    it('should DENY non-admin non-PM from viewing someone else\'s request', async () => {
      const requester = await User.create({
        _id: new mongoose.Types.ObjectId(),
        role: 'coach',
        name: 'Requester',
        email: 'requester@test.com'
      });

      const otherUser = await User.create({
        _id: new mongoose.Types.ObjectId(),
        role: 'coach',
        name: 'Other',
        email: 'other@test.com'
      });

      const pr = await PurchaseRequest.create({
        requestedBy: requester._id,
        balagruhaId: 'STOCK',
        category: 'Others',
        reason: 'Test',
        status: 'pending',
        items: [{
          productId: product._id,
          productName: product.name,
          productSKU: product.sku,
          requestedQuantity: 1,
          currentStock: 10,
          lowStockThreshold: 5,
          estimatedUnitCost: 10,
          estimatedTotalCost: 10
        }]
      });

      const req = mockRequest({
        params: { id: pr._id },
        user: { _id: otherUser._id, role: 'coach' }
      });
      const res = mockResponse();

      await purchaseRequestController.getPurchaseRequestById(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should ALLOW Purchase Manager to view STOCK requests', async () => {
      const requester = await User.create({
        _id: new mongoose.Types.ObjectId(),
        role: 'coach',
        name: 'Requester',
        email: 'requester2@test.com'
      });

      const pr = await PurchaseRequest.create({
        requestedBy: requester._id,
        balagruhaId: 'STOCK',
        category: 'Others',
        reason: 'Test',
        status: 'pending',
        items: [{
          productId: product._id,
          productName: product.name,
          productSKU: product.sku,
          requestedQuantity: 1,
          currentStock: 10,
          lowStockThreshold: 5,
          estimatedUnitCost: 10,
          estimatedTotalCost: 10
        }]
      });

      const req = mockRequest({
        params: { id: pr._id },
        user: { _id: pmUser._id, role: 'purchase-manager', balagruhaIds: [] }
      });
      const res = mockResponse();

      await purchaseRequestController.getPurchaseRequestById(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });

    it('should DENY Purchase Manager from viewing requests outside assigned balagruhas', async () => {
      const requester = await User.create({
        _id: new mongoose.Types.ObjectId(),
        role: 'coach',
        name: 'Requester',
        email: 'requester3@test.com'
      });

      const pr = await PurchaseRequest.create({
        requestedBy: requester._id,
        balagruhaId: new mongoose.Types.ObjectId(),
        category: 'Others',
        reason: 'Test',
        status: 'pending',
        items: [{
          productId: product._id,
          productName: product.name,
          productSKU: product.sku,
          requestedQuantity: 1,
          currentStock: 10,
          lowStockThreshold: 5,
          estimatedUnitCost: 10,
          estimatedTotalCost: 10
        }]
      });

      const req = mockRequest({
        params: { id: pr._id },
        user: { _id: pmUser._id, role: 'purchase-manager', balagruhaIds: [] }
      });
      const res = mockResponse();

      await purchaseRequestController.getPurchaseRequestById(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('Controller: assignFromStock (Shortcut)', () => {
    let prId;

    beforeEach(async () => {
      // Ensure product has enough stock
      await ShopItem.findByIdAndUpdate(product._id, { stock: 20 });

      const pr = await PurchaseRequest.create({
        requestedBy: coachUser._id,
        balagruhaId: 'STOCK',
        category: 'Others',
        reason: 'Urgent',
        status: 'pending',
        items: [{
          productId: product._id,
          productName: product.name,
          productSKU: product.sku,
          requestedQuantity: 5,
          currentStock: 20,
          lowStockThreshold: 5,
          estimatedUnitCost: 10,
          estimatedTotalCost: 50
        }]
      });
      prId = pr._id;
    });

    it('should allow PM to shortcut to delivered_store and decrement stock', async () => {
      const req = mockRequest({
        params: { id: prId },
        user: pmUser
      });
      const res = mockResponse();

      await purchaseRequestController.assignFromStock(req, res);

      expect(res.status).toHaveBeenCalledWith(200);

      // Verify PR status
      const updatedPr = await PurchaseRequest.findById(prId);
      expect(updatedPr.status).toBe('delivered_store');
      expect(updatedPr.statusHistory[0].notes).toContain('Assigned from stock');

      // Verify Stock Decrement
      const updatedProduct = await ShopItem.findById(product._id);
      expect(updatedProduct.stock).toBe(15); // 20 - 5
    });

    it('should fail if insufficient stock', async () => {
       await ShopItem.findByIdAndUpdate(product._id, { stock: 2 }); // Less than 5

       const req = mockRequest({
        params: { id: prId },
        user: pmUser
      });
      const res = mockResponse();

      await purchaseRequestController.assignFromStock(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Insufficient stock')
      }));
    });
  });

  describe('Story 2.5: Category filter validation (list endpoints)', () => {
    it('should return 400 for invalid category filter in getAllPurchaseRequests', async () => {
      const req = mockRequest({
        query: { category: 'Not A Real Category' },
        user: adminUser
      });
      const res = mockResponse();

      await purchaseRequestController.getAllPurchaseRequests(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Invalid category value')
        })
      );
    });

    it('should return 400 for invalid category filter in getMyPurchaseRequests', async () => {
      const req = mockRequest({
        query: { category: 'Not A Real Category' },
        user: coachUser
      });
      const res = mockResponse();

      await purchaseRequestController.getMyPurchaseRequests(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Invalid category value')
        })
      );
    });
  });
});
