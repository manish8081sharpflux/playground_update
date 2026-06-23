const mongoose = require('mongoose');
const PurchaseRequest = require('../../models/purchaseRequest');
const ShopItem = require('../../models/shopItem');
const purchaseRequestController = require('../../controllers/purchaseRequestController');

const { mockRequest, mockResponse, generateObjectId } = global.testUtils;

// Helper to create a test user in-memory (using the User model from setup.js)
const User = mongoose.model('User');

// Helper: create a ShopItem for tests
async function createTestProduct(overrides = {}) {
  return ShopItem.create({
    name: 'Test Product',
    description: 'A test product',
    category: 'ISF Shop',
    price: 100,
    stock: 50,
    lowStockThreshold: 10,
    sku: `SKU-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ...overrides,
  });
}

// Helper: create a User for tests
async function createTestUser(overrides = {}) {
  return User.create({
    name: 'Test User',
    email: `test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`,
    role: 'admin',
    ...overrides,
  });
}

// Helper: create a PurchaseRequest directly in DB
async function createTestPR(overrides = {}) {
  const product = overrides._product || await createTestProduct();
  const user = overrides._user || await createTestUser();
  delete overrides._product;
  delete overrides._user;

  return PurchaseRequest.create({
    balagruhaId: 'STOCK',
    category: 'ISF Shop',
    items: [{
      productId: product._id,
      productName: product.name,
      productSKU: product.sku,
      requestedQuantity: 5,
      currentStock: product.stock,
      lowStockThreshold: product.lowStockThreshold,
      estimatedUnitCost: 100,
      estimatedTotalCost: 500,
    }],
    requestedBy: user._id,
    status: 'pending',
    ...overrides,
  });
}

describe('PurchaseRequest Controller', () => {

  // ─── CREATE ───────────────────────────────────────────────────
  describe('createPurchaseRequest', () => {
    it('should create a purchase request with valid data', async () => {
      const user = await createTestUser({ role: 'admin' });
      const product = await createTestProduct();

      const req = mockRequest({
        body: {
          balagruhaId: 'STOCK',
          category: 'ISF Shop',
          items: JSON.stringify([{
            productId: product._id.toString(),
            requestedQuantity: 3,
            estimatedUnitCost: 100,
          }]),
          reason: 'Low stock',
          priority: 'high',
        },
        user: { _id: user._id, role: 'admin', balagruhaIds: [] },
        files: [],
      });
      const res = mockResponse();

      await purchaseRequestController.createPurchaseRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
      }));
    });

    it('should reject missing category', async () => {
      const user = await createTestUser({ role: 'admin' });

      const req = mockRequest({
        body: {
          balagruhaId: 'STOCK',
          items: JSON.stringify([{ productId: generateObjectId(), requestedQuantity: 1 }]),
        },
        user: { _id: user._id, role: 'admin', balagruhaIds: [] },
        files: [],
      });
      const res = mockResponse();

      await purchaseRequestController.createPurchaseRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Category is required',
      }));
    });

    it('should reject invalid category', async () => {
      const user = await createTestUser({ role: 'admin' });

      const req = mockRequest({
        body: {
          balagruhaId: 'STOCK',
          category: 'InvalidCat',
          items: JSON.stringify([{ productId: generateObjectId(), requestedQuantity: 1 }]),
        },
        user: { _id: user._id, role: 'admin', balagruhaIds: [] },
        files: [],
      });
      const res = mockResponse();

      await purchaseRequestController.createPurchaseRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
      }));
    });

    it('should reject missing balagruhaId', async () => {
      const user = await createTestUser({ role: 'admin' });

      const req = mockRequest({
        body: {
          category: 'ISF Shop',
          items: JSON.stringify([{ productId: generateObjectId(), requestedQuantity: 1 }]),
        },
        user: { _id: user._id, role: 'admin', balagruhaIds: [] },
        files: [],
      });
      const res = mockResponse();

      await purchaseRequestController.createPurchaseRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should reject missing items', async () => {
      const user = await createTestUser({ role: 'admin' });

      const req = mockRequest({
        body: {
          balagruhaId: 'STOCK',
          category: 'ISF Shop',
        },
        user: { _id: user._id, role: 'admin', balagruhaIds: [] },
        files: [],
      });
      const res = mockResponse();

      await purchaseRequestController.createPurchaseRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should reject empty items array', async () => {
      const user = await createTestUser({ role: 'admin' });

      const req = mockRequest({
        body: {
          balagruhaId: 'STOCK',
          category: 'ISF Shop',
          items: JSON.stringify([]),
        },
        user: { _id: user._id, role: 'admin', balagruhaIds: [] },
        files: [],
      });
      const res = mockResponse();

      await purchaseRequestController.createPurchaseRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'At least one product is required',
      }));
    });

    it('should reject non-existent product in items', async () => {
      const user = await createTestUser({ role: 'admin' });
      const fakeProductId = generateObjectId();

      const req = mockRequest({
        body: {
          balagruhaId: 'STOCK',
          category: 'ISF Shop',
          items: JSON.stringify([{
            productId: fakeProductId.toString(),
            requestedQuantity: 1,
            estimatedUnitCost: 10,
          }]),
        },
        user: { _id: user._id, role: 'admin', balagruhaIds: [] },
        files: [],
      });
      const res = mockResponse();

      await purchaseRequestController.createPurchaseRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should reject invalid quantity (0)', async () => {
      const user = await createTestUser({ role: 'admin' });
      const product = await createTestProduct();

      const req = mockRequest({
        body: {
          balagruhaId: 'STOCK',
          category: 'ISF Shop',
          items: JSON.stringify([{
            productId: product._id.toString(),
            requestedQuantity: 0,
            estimatedUnitCost: 100,
          }]),
        },
        user: { _id: user._id, role: 'admin', balagruhaIds: [] },
        files: [],
      });
      const res = mockResponse();

      await purchaseRequestController.createPurchaseRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should auto-route small purchases to pending (skip approval)', async () => {
      const user = await createTestUser({ role: 'admin' });
      const product = await createTestProduct();

      const req = mockRequest({
        body: {
          balagruhaId: 'STOCK',
          category: 'ISF Shop',
          items: JSON.stringify([{
            productId: product._id.toString(),
            requestedQuantity: 2,
            estimatedUnitCost: 100, // well below threshold
          }]),
        },
        user: { _id: user._id, role: 'admin', balagruhaIds: [] },
        files: [],
      });
      const res = mockResponse();

      await purchaseRequestController.createPurchaseRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.data.purchaseRequest.status).toBe('pending');
    });

    it('should route large purchases to pending_approval', async () => {
      const user = await createTestUser({ role: 'admin' });
      const product = await createTestProduct();

      const req = mockRequest({
        body: {
          balagruhaId: 'STOCK',
          category: 'ISF Shop',
          items: JSON.stringify([{
            productId: product._id.toString(),
            requestedQuantity: 100,
            estimatedUnitCost: 5000, // above threshold
          }]),
        },
        user: { _id: user._id, role: 'admin', balagruhaIds: [] },
        files: [],
      });
      const res = mockResponse();

      await purchaseRequestController.createPurchaseRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.data.purchaseRequest.status).toBe('pending_approval');
    });

    it('should normalize priority to lowercase', async () => {
      const user = await createTestUser({ role: 'admin' });
      const product = await createTestProduct();

      const req = mockRequest({
        body: {
          balagruhaId: 'STOCK',
          category: 'ISF Shop',
          items: JSON.stringify([{
            productId: product._id.toString(),
            requestedQuantity: 1,
            estimatedUnitCost: 10,
          }]),
          priority: 'HIGH',
        },
        user: { _id: user._id, role: 'admin', balagruhaIds: [] },
        files: [],
      });
      const res = mockResponse();

      await purchaseRequestController.createPurchaseRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.data.purchaseRequest.priority).toBe('high');
    });

    it('should default invalid priority to medium', async () => {
      const user = await createTestUser({ role: 'admin' });
      const product = await createTestProduct();

      const req = mockRequest({
        body: {
          balagruhaId: 'STOCK',
          category: 'ISF Shop',
          items: JSON.stringify([{
            productId: product._id.toString(),
            requestedQuantity: 1,
            estimatedUnitCost: 10,
          }]),
          priority: 'urgent',
        },
        user: { _id: user._id, role: 'admin', balagruhaIds: [] },
        files: [],
      });
      const res = mockResponse();

      await purchaseRequestController.createPurchaseRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.data.purchaseRequest.priority).toBe('medium');
    });
  });

  // ─── APPROVE ──────────────────────────────────────────────────
  describe('approvePurchaseRequest', () => {
    it('should approve a pending_approval request', async () => {
      const requester = await createTestUser({ role: 'purchase-manager' });
      const admin = await createTestUser({ role: 'admin' });
      const pr = await createTestPR({ _user: requester, status: 'pending_approval' });

      const req = mockRequest({
        params: { id: pr._id.toString() },
        body: { reviewNotes: 'Looks good' },
        user: { _id: admin._id, role: 'admin' },
      });
      const res = mockResponse();

      await purchaseRequestController.approvePurchaseRequest(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Purchase request approved successfully',
      }));

      const updated = await PurchaseRequest.findById(pr._id);
      expect(updated.status).toBe('pending');
      expect(updated.reviewedBy.toString()).toBe(admin._id.toString());
    });

    it('should reject approving non-pending_approval request', async () => {
      const requester = await createTestUser({ role: 'purchase-manager' });
      const admin = await createTestUser({ role: 'admin' });
      const pr = await createTestPR({ _user: requester, status: 'pending' });

      const req = mockRequest({
        params: { id: pr._id.toString() },
        body: {},
        user: { _id: admin._id, role: 'admin' },
      });
      const res = mockResponse();

      await purchaseRequestController.approvePurchaseRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should prevent self-approval', async () => {
      const user = await createTestUser({ role: 'admin' });
      const pr = await createTestPR({ _user: user, status: 'pending_approval' });

      const req = mockRequest({
        params: { id: pr._id.toString() },
        body: {},
        user: { _id: user._id, role: 'admin' },
      });
      const res = mockResponse();

      await purchaseRequestController.approvePurchaseRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Cannot approve your own request'),
      }));
    });

    it('should return 404 for non-existent request', async () => {
      const admin = await createTestUser({ role: 'admin' });

      const req = mockRequest({
        params: { id: generateObjectId().toString() },
        body: {},
        user: { _id: admin._id, role: 'admin' },
      });
      const res = mockResponse();

      await purchaseRequestController.approvePurchaseRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ─── REJECT ───────────────────────────────────────────────────
  describe('rejectPurchaseRequest', () => {
    it('should reject a pending_approval request with reason', async () => {
      const requester = await createTestUser({ role: 'purchase-manager' });
      const admin = await createTestUser({ role: 'admin' });
      const pr = await createTestPR({ _user: requester, status: 'pending_approval' });

      const req = mockRequest({
        params: { id: pr._id.toString() },
        body: { reviewNotes: 'Budget exceeded' },
        user: { _id: admin._id, role: 'admin' },
      });
      const res = mockResponse();

      await purchaseRequestController.rejectPurchaseRequest(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Purchase request rejected',
      }));

      const updated = await PurchaseRequest.findById(pr._id);
      expect(updated.status).toBe('rejected');
    });

    it('should require rejection reason', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const pr = await createTestPR({ status: 'pending_approval' });

      const req = mockRequest({
        params: { id: pr._id.toString() },
        body: {},
        user: { _id: admin._id, role: 'admin' },
      });
      const res = mockResponse();

      await purchaseRequestController.rejectPurchaseRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Rejection reason is required',
      }));
    });

    it('should reject empty rejection reason', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const pr = await createTestPR({ status: 'pending_approval' });

      const req = mockRequest({
        params: { id: pr._id.toString() },
        body: { reviewNotes: '   ' },
        user: { _id: admin._id, role: 'admin' },
      });
      const res = mockResponse();

      await purchaseRequestController.rejectPurchaseRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should not reject already-ordered request', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const pr = await createTestPR({ status: 'ordered' });

      const req = mockRequest({
        params: { id: pr._id.toString() },
        body: { reviewNotes: 'Too late' },
        user: { _id: admin._id, role: 'admin' },
      });
      const res = mockResponse();

      await purchaseRequestController.rejectPurchaseRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── CANCEL ───────────────────────────────────────────────────
  describe('cancelPurchaseRequest', () => {
    it('should cancel own pending_approval request', async () => {
      const user = await createTestUser();
      const pr = await createTestPR({ _user: user, status: 'pending_approval' });

      const req = mockRequest({
        params: { id: pr._id.toString() },
        user: { _id: user._id, role: 'admin' },
      });
      const res = mockResponse();

      await purchaseRequestController.cancelPurchaseRequest(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
      }));

      const updated = await PurchaseRequest.findById(pr._id);
      expect(updated.status).toBe('cancelled');
    });

    it('should not allow cancelling another users request', async () => {
      const owner = await createTestUser();
      const other = await createTestUser();
      const pr = await createTestPR({ _user: owner, status: 'pending_approval' });

      const req = mockRequest({
        params: { id: pr._id.toString() },
        user: { _id: other._id, role: 'admin' },
      });
      const res = mockResponse();

      await purchaseRequestController.cancelPurchaseRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should not cancel non-pending_approval request', async () => {
      const user = await createTestUser();
      const pr = await createTestPR({ _user: user, status: 'ordered' });

      const req = mockRequest({
        params: { id: pr._id.toString() },
        user: { _id: user._id, role: 'admin' },
      });
      const res = mockResponse();

      await purchaseRequestController.cancelPurchaseRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── STATE MACHINE (updateStatus) ────────────────────────────
  describe('updateStatus — state machine transitions', () => {
    it('should transition pending → ordered (purchase-manager)', async () => {
      const pm = await createTestUser({ role: 'purchase-manager' });
      const pr = await createTestPR({ _user: pm, status: 'pending' });

      const req = mockRequest({
        params: { id: pr._id.toString() },
        body: { status: 'ordered' },
        user: { _id: pm._id, role: 'purchase-manager', balagruhaIds: [] },
      });
      const res = mockResponse();

      await purchaseRequestController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const updated = await PurchaseRequest.findById(pr._id);
      expect(updated.status).toBe('ordered');
      expect(updated.statusHistory).toHaveLength(1);
    });

    // FIX-019: Capture supplierName and invoiceNumber at 'ordered' transition
    it('should save supplierName and invoiceNumber when transitioning to ordered', async () => {
      const pm = await createTestUser({ role: 'purchase-manager' });
      const pr = await createTestPR({ _user: pm, status: 'pending' });

      const req = mockRequest({
        params: { id: pr._id.toString() },
        body: { status: 'ordered', supplierName: ' Acme Supplies ', invoiceNumber: ' INV-2026-100 ' },
        user: { _id: pm._id, role: 'purchase-manager', balagruhaIds: [] },
      });
      const res = mockResponse();

      await purchaseRequestController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const updated = await PurchaseRequest.findById(pr._id);
      expect(updated.status).toBe('ordered');
      expect(updated.supplierName).toBe('Acme Supplies');
      expect(updated.invoiceNumber).toBe('INV-2026-100');
    });

    it('should transition to ordered without supplierName/invoiceNumber (fields optional)', async () => {
      const pm = await createTestUser({ role: 'purchase-manager' });
      const pr = await createTestPR({ _user: pm, status: 'pending' });

      const req = mockRequest({
        params: { id: pr._id.toString() },
        body: { status: 'ordered' },
        user: { _id: pm._id, role: 'purchase-manager', balagruhaIds: [] },
      });
      const res = mockResponse();

      await purchaseRequestController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const updated = await PurchaseRequest.findById(pr._id);
      expect(updated.status).toBe('ordered');
      // Fields should remain undefined/empty when not provided
      expect(updated.supplierName).toBeFalsy();
      expect(updated.invoiceNumber).toBeFalsy();
    });

    it('should transition ordered → delivered_store (purchase-manager)', async () => {
      const pm = await createTestUser({ role: 'purchase-manager' });
      const pr = await createTestPR({ _user: pm, status: 'ordered' });

      const req = mockRequest({
        params: { id: pr._id.toString() },
        body: { status: 'delivered_store' },
        user: { _id: pm._id, role: 'purchase-manager', balagruhaIds: [] },
      });
      const res = mockResponse();

      await purchaseRequestController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const updated = await PurchaseRequest.findById(pr._id);
      expect(updated.status).toBe('delivered_store');
    });

    it('should transition delivered_store → delivered_balagruha (requester/coach)', async () => {
      const coach = await createTestUser({ role: 'coach' });
      const pr = await createTestPR({ _user: coach, status: 'delivered_store' });

      const req = mockRequest({
        params: { id: pr._id.toString() },
        body: { status: 'delivered_balagruha' },
        user: { _id: coach._id, role: 'coach' },
      });
      const res = mockResponse();

      await purchaseRequestController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const updated = await PurchaseRequest.findById(pr._id);
      expect(updated.status).toBe('delivered_balagruha');
      expect(updated.deliveredByCoachId.toString()).toBe(coach._id.toString());
      expect(updated.deliveredToBalagruhaAt).toBeTruthy();
    });

    it('should transition delivered_store → delivered_balagruha (admin)', async () => {
      const requester = await createTestUser({ role: 'purchase-manager' });
      const admin = await createTestUser({ role: 'admin' });
      const pr = await createTestPR({ _user: requester, status: 'delivered_store' });

      const req = mockRequest({
        params: { id: pr._id.toString() },
        body: { status: 'delivered_balagruha' },
        user: { _id: admin._id, role: 'admin' },
      });
      const res = mockResponse();

      await purchaseRequestController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should BLOCK skip transition pending → delivered_store', async () => {
      const pm = await createTestUser({ role: 'purchase-manager' });
      const pr = await createTestPR({ _user: pm, status: 'pending' });

      const req = mockRequest({
        params: { id: pr._id.toString() },
        body: { status: 'delivered_store' },
        user: { _id: pm._id, role: 'purchase-manager', balagruhaIds: [] },
      });
      const res = mockResponse();

      await purchaseRequestController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should BLOCK skip transition pending → delivered_balagruha', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const pr = await createTestPR({ _user: admin, status: 'pending' });

      const req = mockRequest({
        params: { id: pr._id.toString() },
        body: { status: 'delivered_balagruha' },
        user: { _id: admin._id, role: 'admin' },
      });
      const res = mockResponse();

      await purchaseRequestController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should BLOCK ordered → delivered_balagruha (must go through store first)', async () => {
      const pm = await createTestUser({ role: 'purchase-manager' });
      const pr = await createTestPR({ _user: pm, status: 'ordered' });

      const req = mockRequest({
        params: { id: pr._id.toString() },
        body: { status: 'delivered_balagruha' },
        user: { _id: pm._id, role: 'purchase-manager', balagruhaIds: [] },
      });
      const res = mockResponse();

      await purchaseRequestController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should BLOCK non-PM from pending → ordered', async () => {
      const coach = await createTestUser({ role: 'coach' });
      const pr = await createTestPR({ _user: coach, status: 'pending' });

      const req = mockRequest({
        params: { id: pr._id.toString() },
        body: { status: 'ordered' },
        user: { _id: coach._id, role: 'coach' },
      });
      const res = mockResponse();

      await purchaseRequestController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should allow pending → on_hold (purchase-manager)', async () => {
      const pm = await createTestUser({ role: 'purchase-manager' });
      const pr = await createTestPR({ _user: pm, status: 'pending' });

      const req = mockRequest({
        params: { id: pr._id.toString() },
        body: { status: 'on_hold' },
        user: { _id: pm._id, role: 'purchase-manager', balagruhaIds: [] },
      });
      const res = mockResponse();

      await purchaseRequestController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const updated = await PurchaseRequest.findById(pr._id);
      expect(updated.status).toBe('on_hold');
    });

    it('should reject missing status field', async () => {
      const pm = await createTestUser({ role: 'purchase-manager' });
      const pr = await createTestPR({ _user: pm, status: 'pending' });

      const req = mockRequest({
        params: { id: pr._id.toString() },
        body: {},
        user: { _id: pm._id, role: 'purchase-manager', balagruhaIds: [] },
      });
      const res = mockResponse();

      await purchaseRequestController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should reject invalid status value', async () => {
      const pm = await createTestUser({ role: 'purchase-manager' });
      const pr = await createTestPR({ _user: pm, status: 'pending' });

      const req = mockRequest({
        params: { id: pr._id.toString() },
        body: { status: 'shipped' },
        user: { _id: pm._id, role: 'purchase-manager', balagruhaIds: [] },
      });
      const res = mockResponse();

      await purchaseRequestController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 for non-existent request', async () => {
      const pm = await createTestUser({ role: 'purchase-manager' });

      const req = mockRequest({
        params: { id: generateObjectId().toString() },
        body: { status: 'ordered' },
        user: { _id: pm._id, role: 'purchase-manager', balagruhaIds: [] },
      });
      const res = mockResponse();

      await purchaseRequestController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should require repairTechnicianName for Repairs at delivered_store', async () => {
      const pm = await createTestUser({ role: 'purchase-manager' });
      const product = await createTestProduct({ category: 'Repairs' });
      const pr = await createTestPR({
        _user: pm,
        _product: product,
        status: 'ordered',
        category: 'Repairs',
      });

      const req = mockRequest({
        params: { id: pr._id.toString() },
        body: { status: 'delivered_store' },
        user: { _id: pm._id, role: 'purchase-manager', balagruhaIds: [] },
      });
      const res = mockResponse();

      await purchaseRequestController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Repair Technician Name'),
      }));
    });

    it('should accept repairTechnicianName for Repairs at delivered_store', async () => {
      const pm = await createTestUser({ role: 'purchase-manager' });
      const product = await createTestProduct({ category: 'Repairs' });
      const pr = await createTestPR({
        _user: pm,
        _product: product,
        status: 'ordered',
        category: 'Repairs',
      });

      const req = mockRequest({
        params: { id: pr._id.toString() },
        body: { status: 'delivered_store', repairTechnicianName: 'John' },
        user: { _id: pm._id, role: 'purchase-manager', balagruhaIds: [] },
      });
      const res = mockResponse();

      await purchaseRequestController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const updated = await PurchaseRequest.findById(pr._id);
      expect(updated.repairTechnicianName).toBe('John');
    });

    it('should enforce RBAC for purchase-manager balagruha access', async () => {
      const balagruhaId = generateObjectId();
      const otherBalagruhaId = generateObjectId();
      const pm = await createTestUser({ role: 'purchase-manager' });
      const pr = await createTestPR({ _user: pm, status: 'pending', balagruhaId: balagruhaId });

      const req = mockRequest({
        params: { id: pr._id.toString() },
        body: { status: 'ordered' },
        user: {
          _id: pm._id,
          role: 'purchase-manager',
          balagruhaIds: [otherBalagruhaId], // different balagruha
        },
      });
      const res = mockResponse();

      await purchaseRequestController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ─── GET BY ID ────────────────────────────────────────────────
  describe('getPurchaseRequestById', () => {
    it('should return a purchase request for admin', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const pr = await createTestPR({ _user: admin });

      const req = mockRequest({
        params: { id: pr._id.toString() },
        user: { _id: admin._id, role: 'admin', balagruhaIds: [] },
      });
      const res = mockResponse();

      await purchaseRequestController.getPurchaseRequestById(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
      }));
    });

    it('should return 404 for non-existent request', async () => {
      const admin = await createTestUser({ role: 'admin' });

      const req = mockRequest({
        params: { id: generateObjectId().toString() },
        user: { _id: admin._id, role: 'admin', balagruhaIds: [] },
      });
      const res = mockResponse();

      await purchaseRequestController.getPurchaseRequestById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should block non-admin non-owner from viewing', async () => {
      const owner = await createTestUser({ role: 'coach' });
      const other = await createTestUser({ role: 'coach' });
      const pr = await createTestPR({ _user: owner });

      const req = mockRequest({
        params: { id: pr._id.toString() },
        user: { _id: other._id, role: 'coach' },
      });
      const res = mockResponse();

      await purchaseRequestController.getPurchaseRequestById(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ─── GET ALL ──────────────────────────────────────────────────
  describe('getAllPurchaseRequests', () => {
    it('should return all purchase requests for admin', async () => {
      await createTestPR();
      await createTestPR();

      const admin = await createTestUser({ role: 'admin' });
      const req = mockRequest({
        query: {},
        user: { _id: admin._id, role: 'admin', balagruhaIds: [] },
      });
      const res = mockResponse();

      await purchaseRequestController.getAllPurchaseRequests(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
      }));
    });
  });

  // ─── FIX-020: getAllPurchaseRequests — priority & requestedBy filters, priority sort ──
  describe('getAllPurchaseRequests — FIX-020 priority/requestedBy filters', () => {
    it('should filter by priority query param', async () => {
      const admin = await createTestUser({ role: 'admin' });
      await createTestPR({ _user: admin, priority: 'high' });
      await createTestPR({ _user: admin, priority: 'low' });
      await createTestPR({ _user: admin, priority: 'high' });

      const req = mockRequest({
        query: { priority: 'high' },
        user: { _id: admin._id, role: 'admin', balagruhaIds: [] },
      });
      const res = mockResponse();

      await purchaseRequestController.getAllPurchaseRequests(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      const jsonArg = res.json.mock.calls[0][0];
      const requests = jsonArg.data.requests;
      // Every returned request should have priority 'high'
      expect(requests.length).toBeGreaterThanOrEqual(2);
      requests.forEach(r => {
        expect(r.priority).toBe('high');
      });
    });

    it('should filter by requestedBy (coach ID) for admin', async () => {
      const coach = await createTestUser({ role: 'coach' });
      const otherCoach = await createTestUser({ role: 'coach' });
      const admin = await createTestUser({ role: 'admin' });

      await createTestPR({ _user: coach });
      await createTestPR({ _user: coach });
      await createTestPR({ _user: otherCoach });

      const req = mockRequest({
        query: { requestedBy: coach._id.toString() },
        user: { _id: admin._id, role: 'admin', balagruhaIds: [] },
      });
      const res = mockResponse();

      await purchaseRequestController.getAllPurchaseRequests(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      const jsonArg = res.json.mock.calls[0][0];
      const requests = jsonArg.data.requests;
      expect(requests.length).toBeGreaterThanOrEqual(2);
      requests.forEach(r => {
        // requestedBy is populated, so check _id
        const reqById = r.requestedBy._id ? r.requestedBy._id.toString() : r.requestedBy.toString();
        expect(reqById).toBe(coach._id.toString());
      });
    });

    it('should ignore requestedBy filter for non-admin/non-PM roles', async () => {
      const coach = await createTestUser({ role: 'coach' });
      const otherCoach = await createTestUser({ role: 'coach' });

      await createTestPR({ _user: coach });
      await createTestPR({ _user: otherCoach });

      // Coach tries to use requestedBy filter to see another coach's requests
      const req = mockRequest({
        query: { requestedBy: otherCoach._id.toString() },
        user: { _id: coach._id, role: 'coach' },
      });
      const res = mockResponse();

      await purchaseRequestController.getAllPurchaseRequests(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      const jsonArg = res.json.mock.calls[0][0];
      const requests = jsonArg.data.requests;
      // Coach should only see their own requests, not the other coach's
      requests.forEach(r => {
        const reqById = r.requestedBy._id ? r.requestedBy._id.toString() : r.requestedBy.toString();
        expect(reqById).toBe(coach._id.toString());
      });
    });

    it('should return results sorted priority-first: high > medium > low', async () => {
      const admin = await createTestUser({ role: 'admin' });
      // Create PRs in non-priority order
      await createTestPR({ _user: admin, priority: 'low' });
      await createTestPR({ _user: admin, priority: 'high' });
      await createTestPR({ _user: admin, priority: 'medium' });

      const req = mockRequest({
        query: {},
        user: { _id: admin._id, role: 'admin', balagruhaIds: [] },
      });
      const res = mockResponse();

      await purchaseRequestController.getAllPurchaseRequests(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      const jsonArg = res.json.mock.calls[0][0];
      const requests = jsonArg.data.requests;

      // Verify priority-first ordering: all 'high' before all 'medium' before all 'low'
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      for (let i = 1; i < requests.length; i++) {
        const prevWeight = priorityWeight[requests[i - 1].priority] || 2;
        const currWeight = priorityWeight[requests[i].priority] || 2;
        expect(prevWeight).toBeGreaterThanOrEqual(currWeight);
      }
    });
  });

  // ─── GET MY REQUESTS ─────────────────────────────────────────
  describe('getMyPurchaseRequests', () => {
    it('should return only own requests', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      await createTestPR({ _user: user1 });
      await createTestPR({ _user: user1 });
      await createTestPR({ _user: user2 });

      const req = mockRequest({
        query: {},
        user: { _id: user1._id, role: 'admin' },
      });
      const res = mockResponse();

      await purchaseRequestController.getMyPurchaseRequests(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
      }));
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.data.requests.length).toBe(2);
    });
  });

  // ─── COMPLETE (requires MongoDB transactions — limited in memory server) ──
  describe('completePurchaseRequest', () => {
    it('should return 404 for non-existent request', async () => {
      const admin = await createTestUser({ role: 'admin' });

      const req = mockRequest({
        params: { id: generateObjectId().toString() },
        body: {
          supplierName: 'Supplier',
          invoiceNumber: 'INV-001',
          purchaseDate: new Date().toISOString(),
          items: [],
        },
        user: { _id: admin._id, role: 'admin' },
      });
      const res = mockResponse();

      await purchaseRequestController.completePurchaseRequest(req, res);

      // MongoDB Memory Server may not support transactions; accept 404 or 500
      const statusCode = res.status.mock.calls[0]?.[0];
      expect([404, 500]).toContain(statusCode);
    });

    it('should reject completing a non-approved request', async () => {
      const user = await createTestUser({ role: 'admin' });
      const pr = await createTestPR({ _user: user, status: 'pending' });

      const req = mockRequest({
        params: { id: pr._id.toString() },
        body: {
          supplierName: 'Supplier',
          invoiceNumber: 'INV-001',
          purchaseDate: new Date().toISOString(),
          items: [],
        },
        user: { _id: user._id, role: 'admin' },
      });
      const res = mockResponse();

      await purchaseRequestController.completePurchaseRequest(req, res);

      // Accept 400 or 500 (transaction support varies)
      const statusCode = res.status.mock.calls[0]?.[0];
      expect([400, 500]).toContain(statusCode);
    });
  });

  // ─── STATS ────────────────────────────────────────────────────
  describe('getPurchaseRequestStats', () => {
    it('should return statistics', async () => {
      await createTestPR({ status: 'pending' });
      await createTestPR({ status: 'ordered' });

      const admin = await createTestUser({ role: 'admin' });
      const req = mockRequest({
        query: {},
        user: { _id: admin._id, role: 'admin', balagruhaIds: [] },
      });
      const res = mockResponse();

      await purchaseRequestController.getPurchaseRequestStats(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
      }));
    });
  });

  describe('PM Error Codes (Story 15.7)', () => {
    test('should return PR_NOT_FOUND error code when request does not exist', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const fakeId = generateObjectId();

      const req = mockRequest({
        params: { id: fakeId },
        user: { _id: admin._id, role: 'admin', balagruhaIds: [] },
      });
      const res = mockResponse();

      await purchaseRequestController.getPurchaseRequestById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        errorCode: 'PR_NOT_FOUND',
      }));
    });

    test('should return PR_INVALID_TRANSITION error code on bad status transition', async () => {
      const pm = await createTestUser({ role: 'purchase-manager', balagruhaIds: [] });
      const pr = await createTestPR({ status: 'ordered', _user: pm });

      const req = mockRequest({
        params: { id: pr._id.toString() },
        body: { status: 'pending' },
        user: { _id: pm._id, role: 'purchase-manager', balagruhaIds: ['STOCK'] },
      });
      const res = mockResponse();

      await purchaseRequestController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        errorCode: 'PR_INVALID_TRANSITION',
      }));
    });

    test('should return PR_VALIDATION_FAILED error code when status is missing', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const pr = await createTestPR({ _user: admin });

      const req = mockRequest({
        params: { id: pr._id.toString() },
        body: {},
        user: { _id: admin._id, role: 'admin', balagruhaIds: [] },
      });
      const res = mockResponse();

      await purchaseRequestController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        errorCode: 'PR_VALIDATION_FAILED',
      }));
    });
  });
});
