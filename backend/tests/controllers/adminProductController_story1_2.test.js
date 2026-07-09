const mongoose = require('mongoose');
const adminProductController = require('../../controllers/adminProductController');
const ShopItem = require('../../models/shopItem');
const Vendor = require('../../models/vendor');
const { mockRequest, mockResponse } = global.testUtils;

describe('Admin Product Controller - Story 1.2', () => {
  let vendor;

  beforeEach(async () => {
    vendor = await Vendor.create({ name: 'Valid Vendor', phone: '9876543210', address: 'A' });
    await ShopItem.deleteMany({});
  });

  describe('createProduct', () => {
    it('should create product with valid constraints', async () => {
      const req = mockRequest({
        body: {
          sku: 'VALID-001',
          name: 'Valid Item',
          description: 'Desc',
          category: 'ISF Shop',
          price: 100,
          sellingPrice: 100,
          maxPrice: 50,
          approvedVendors: [{ vendorId: vendor._id }],
          stock: 10
        }
      });
      const res = mockResponse();

      await adminProductController.createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should fail if maxPrice is missing', async () => {
      const req = mockRequest({
        body: {
          sku: 'INVALID-001',
          name: 'Invalid Item',
          description: 'Desc',
          category: 'ISF Shop',
          price: 100,
          approvedVendors: [{ vendorId: vendor._id }]
          // Missing maxPrice
        }
      });
      const res = mockResponse();

      await adminProductController.createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Max Price (Rupees) is required for new items'
      }));
    });

    it('should fail if approvedVendors is missing', async () => {
      const req = mockRequest({
        body: {
          sku: 'INVALID-002',
          name: 'Invalid Item',
          description: 'Desc',
          category: 'ISF Shop',
          price: 100,
          maxPrice: 50
          // Missing approvedVendors
        }
      });
      const res = mockResponse();

      await adminProductController.createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'At least one Approved Vendor is required'
      }));
    });

    it('should fail if vendor ID is invalid', async () => {
      const req = mockRequest({
        body: {
          sku: 'INVALID-003',
          name: 'Invalid Vendor Item',
          description: 'Desc',
          category: 'ISF Shop',
          price: 100,
          maxPrice: 50,
          approvedVendors: [{ vendorId: new mongoose.Types.ObjectId() }] // Random ID
        }
      });
      const res = mockResponse();

      await adminProductController.createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'One or more Vendor IDs are invalid'
      }));
    });

    it('should fail if duplicate vendor IDs are provided', async () => {
      const req = mockRequest({
        body: {
          sku: 'INVALID-DUP-001',
          name: 'Duplicate Vendor Item',
          description: 'Desc',
          category: 'ISF Shop',
          maxPrice: 50,
          sellingPrice: 10,
          approvedVendors: [
            { vendorId: vendor._id, rank: 1 },
            { vendorId: vendor._id, rank: 2 } // Same ID
          ]
        }
      });
      const res = mockResponse();

      await adminProductController.createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Duplicate Vendor IDs found in approved vendors list'
      }));
    });
  });

  describe('createPendingProduct', () => {
    it('should allow admin to create pending product', async () => {
      const req = mockRequest({
        user: { _id: new mongoose.Types.ObjectId(), role: 'admin' },
        body: {
          name: 'Pending Item',
          category: 'ISF Shop',
          unit: 'units',
          maxPrice: 50,
          sellingPrice: 10,
          approvedVendors: [{ vendorId: vendor._id }]
        }
      });
      const res = mockResponse();

      await adminProductController.createPendingProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should deny non-admin', async () => {
      const req = mockRequest({
        user: { _id: new mongoose.Types.ObjectId(), role: 'coach' }, // Coach role
        body: {
          name: 'Pending Item',
          category: 'ISF Shop',
          unit: 'units'
        }
      });
      const res = mockResponse();

      await adminProductController.createPendingProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Access denied')
      }));
    });
  });

  describe('updateProduct', () => {
    it('should validate maxPrice during update', async () => {
      const product = await ShopItem.create({
        sku: 'UPDATE-001',
        name: 'Update Item',
        description: 'Desc',
        category: 'ISF Shop',
        price: 100,
        stock: 10
      });

      const req = mockRequest({
        params: { productId: product._id },
        body: { maxPrice: -10 }
      });
      const res = mockResponse();

      await adminProductController.updateProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Max Price cannot be negative'
      }));
    });

    it('should validate approvedVendors during update', async () => {
      const product = await ShopItem.create({
        sku: 'UPDATE-002',
        name: 'Update Item',
        description: 'Desc',
        category: 'ISF Shop',
        price: 100,
        stock: 10
      });

      const req = mockRequest({
        params: { productId: product._id },
        body: { approvedVendors: [] } // Empty array
      });
      const res = mockResponse();

      await adminProductController.updateProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'At least one Approved Vendor is required if updating vendors'
      }));
    });

    it('should validate vendor IDs during update', async () => {
       const product = await ShopItem.create({
        sku: 'UPDATE-003',
        name: 'Update Item',
        description: 'Desc',
        category: 'ISF Shop',
        price: 100,
        stock: 10
      });

      const req = mockRequest({
        params: { productId: product._id },
        body: { approvedVendors: [{ vendorId: new mongoose.Types.ObjectId() }] } // Random ID
      });
      const res = mockResponse();

      await adminProductController.updateProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'One or more Vendor IDs are invalid'
      }));
    });

    it('should mark a pending product complete when admin saves required catalog fields', async () => {
      const product = await ShopItem.create({
        sku: 'UPDATE-PENDING-001',
        name: 'Pending Bottle',
        description: 'Pending product - details to be added',
        category: 'ISF Shop',
        price: 80,
        sellingPrice: 80,
        maxPrice: 100,
        stock: 0,
        isActive: true,
        isPendingProduct: true,
        approvedVendors: [{ vendorId: vendor._id, rank: 1 }]
      });

      const req = mockRequest({
        params: { productId: product._id },
        body: {
          name: 'Bottle',
          description: 'Pending product - details to be added',
          category: 'ISF Shop',
          price: 80,
          sellingPrice: 80,
          maxPrice: 100,
          stock: 45,
          isActive: true,
          approvedVendors: [{ vendorId: vendor._id, rank: 1 }]
        }
      });
      const res = mockResponse();

      await adminProductController.updateProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(200);

      const updated = await ShopItem.findById(product._id);
      expect(updated.isPendingProduct).toBe(false);
    });
  });
});
