const mongoose = require('mongoose');
const adminProductController = require('../../controllers/adminProductController');
const ShopItem = require('../../models/shopItem');
const Vendor = require('../../models/vendor');
const { mockRequest, mockResponse } = global.testUtils;

describe('Admin Product Controller - FIX-032: Max 3 vendors per product', () => {
  let vendors;

  beforeEach(async () => {
    // Create 4 vendors so we can test the boundary
    vendors = await Vendor.create([
      { name: 'Vendor A', phone: '9876543210', address: 'Address A' },
      { name: 'Vendor B', phone: '9876543211', address: 'Address B' },
      { name: 'Vendor C', phone: '9876543212', address: 'Address C' },
      { name: 'Vendor D', phone: '9876543213', address: 'Address D' },
    ]);
    await ShopItem.deleteMany({});
  });

  describe('createProduct', () => {
    it('should reject creating a product with 4 approved vendors', async () => {
      const req = mockRequest({
        body: {
          sku: 'FIX032-001',
          name: 'Too Many Vendors Item',
          description: 'Desc',
          category: 'ISF Shop',
          price: 100,
          sellingPrice: 100,
          maxPrice: 50,
          approvedVendors: [
            { vendorId: vendors[0]._id },
            { vendorId: vendors[1]._id },
            { vendorId: vendors[2]._id },
            { vendorId: vendors[3]._id },
          ],
          stock: 10
        }
      });
      const res = mockResponse();

      await adminProductController.createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Maximum of 3 Approved Vendors allowed per product'
      }));
    });

    it('should accept creating a product with exactly 3 approved vendors', async () => {
      const req = mockRequest({
        body: {
          sku: 'FIX032-002',
          name: 'Three Vendors Item',
          description: 'Desc',
          category: 'ISF Shop',
          price: 100,
          sellingPrice: 100,
          maxPrice: 50,
          approvedVendors: [
            { vendorId: vendors[0]._id },
            { vendorId: vendors[1]._id },
            { vendorId: vendors[2]._id },
          ],
          stock: 10
        }
      });
      const res = mockResponse();

      await adminProductController.createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('updateProduct', () => {
    let product;

    beforeEach(async () => {
      product = await ShopItem.create({
        sku: 'FIX032-UPD',
        name: 'Update Target',
        description: 'Desc',
        category: 'ISF Shop',
        price: 100,
        stock: 10
      });
    });

    it('should reject updating a product with 4 approved vendors', async () => {
      const req = mockRequest({
        params: { productId: product._id },
        body: {
          approvedVendors: [
            { vendorId: vendors[0]._id },
            { vendorId: vendors[1]._id },
            { vendorId: vendors[2]._id },
            { vendorId: vendors[3]._id },
          ]
        }
      });
      const res = mockResponse();

      await adminProductController.updateProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Maximum of 3 Approved Vendors allowed per product'
      }));
    });

    it('should accept updating a product with exactly 3 approved vendors', async () => {
      const req = mockRequest({
        params: { productId: product._id },
        body: {
          approvedVendors: [
            { vendorId: vendors[0]._id },
            { vendorId: vendors[1]._id },
            { vendorId: vendors[2]._id },
          ]
        }
      });
      const res = mockResponse();

      await adminProductController.updateProduct(req, res);

      // Should not be rejected for vendor count — may be 200 or other success
      expect(res.status).not.toHaveBeenCalledWith(400);
    });
  });

  describe('createPendingProduct', () => {
    it('should reject creating a pending product with 4 approved vendors', async () => {
      const req = mockRequest({
        user: { _id: new mongoose.Types.ObjectId(), role: 'admin' },
        body: {
          name: 'Pending Too Many Vendors',
          category: 'ISF Shop',
          unit: 'units',
          maxPrice: 50,
          sellingPrice: 10,
          approvedVendors: [
            { vendorId: vendors[0]._id },
            { vendorId: vendors[1]._id },
            { vendorId: vendors[2]._id },
            { vendorId: vendors[3]._id },
          ]
        }
      });
      const res = mockResponse();

      await adminProductController.createPendingProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Maximum of 3 Approved Vendors allowed per product'
      }));
    });

    it('should accept creating a pending product with exactly 3 approved vendors', async () => {
      const req = mockRequest({
        user: { _id: new mongoose.Types.ObjectId(), role: 'admin' },
        body: {
          name: 'Pending Three Vendors',
          category: 'ISF Shop',
          unit: 'units',
          maxPrice: 50,
          sellingPrice: 10,
          approvedVendors: [
            { vendorId: vendors[0]._id },
            { vendorId: vendors[1]._id },
            { vendorId: vendors[2]._id },
          ]
        }
      });
      const res = mockResponse();

      await adminProductController.createPendingProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
