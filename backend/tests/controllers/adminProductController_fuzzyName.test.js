const mongoose = require('mongoose');
const adminProductController = require('../../controllers/adminProductController');
const ShopItem = require('../../models/shopItem');
const Vendor = require('../../models/vendor');
const { mockRequest, mockResponse } = global.testUtils;

describe('Admin Product Controller - FIX-017 Fuzzy Duplicate Name Detection', () => {
  let vendor;

  const buildProductBody = (overrides = {}) => ({
    sku: `TEST-${Date.now()}`,
    name: 'Test Product',
    description: 'Desc',
    category: 'ISF Shop',
    price: 100,
    sellingPrice: 80,
    maxPrice: 120,
    approvedVendors: [{ vendorId: vendor._id }],
    stock: 10,
    ...overrides
  });

  beforeEach(async () => {
    vendor = await Vendor.create({ name: 'Test Vendor', phone: '9876543210', address: 'Addr' });
    await ShopItem.deleteMany({});
  });

  describe('fuzzy name matching on createProduct', () => {
    it('should warn when exact name (case-insensitive) already exists', async () => {
      // Create existing product
      await ShopItem.create({
        sku: 'EXISTING-001',
        name: 'Blue Notebook',
        description: 'Desc',
        category: 'ISF Shop',
        price: 50,
        stock: 5
      });

      const req = mockRequest({
        body: buildProductBody({ sku: 'NEW-001', name: 'blue notebook' })
      });
      const res = mockResponse();

      await adminProductController.createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: expect.stringContaining('Similar product name'),
        similarProducts: expect.arrayContaining([
          expect.objectContaining({ name: 'Blue Notebook', sku: 'EXISTING-001' })
        ]),
        field: 'name'
      }));
    });

    it('should warn when name matches with different casing and whitespace', async () => {
      await ShopItem.create({
        sku: 'EXISTING-002',
        name: 'Red Pen',
        description: 'Desc',
        category: 'ISF Shop',
        price: 10,
        stock: 20
      });

      const req = mockRequest({
        body: buildProductBody({ sku: 'NEW-002', name: '  RED PEN  ' })
      });
      const res = mockResponse();

      await adminProductController.createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        similarProducts: expect.arrayContaining([
          expect.objectContaining({ name: 'Red Pen' })
        ])
      }));
    });

    it('should allow creation when force=true even if similar name exists', async () => {
      await ShopItem.create({
        sku: 'EXISTING-003',
        name: 'Green Eraser',
        description: 'Desc',
        category: 'ISF Shop',
        price: 5,
        stock: 100
      });

      const req = mockRequest({
        body: buildProductBody({ sku: 'NEW-003', name: 'green eraser', force: true })
      });
      const res = mockResponse();

      await adminProductController.createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Product created successfully'
      }));
    });

    it('should allow creation when no similar name exists', async () => {
      const req = mockRequest({
        body: buildProductBody({ sku: 'UNIQUE-001', name: 'Totally Unique Product' })
      });
      const res = mockResponse();

      await adminProductController.createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should not trigger fuzzy check if name is empty or missing', async () => {
      const req = mockRequest({
        body: buildProductBody({ sku: 'NONAME-001', name: '' })
      });
      const res = mockResponse();

      await adminProductController.createProduct(req, res);

      // Should proceed to product creation (may fail on model validation, but not on fuzzy check)
      // The key assertion is that we do NOT get a 409
      expect(res.status).not.toHaveBeenCalledWith(409);
    });

    it('should handle names with regex special characters safely', async () => {
      await ShopItem.create({
        sku: 'EXISTING-REGEX',
        name: 'Product (Special)',
        description: 'Desc',
        category: 'ISF Shop',
        price: 10,
        stock: 5
      });

      const req = mockRequest({
        body: buildProductBody({ sku: 'NEW-REGEX', name: 'Product (Special)' })
      });
      const res = mockResponse();

      await adminProductController.createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        similarProducts: expect.arrayContaining([
          expect.objectContaining({ name: 'Product (Special)' })
        ])
      }));
    });

    it('should not match partial names (only exact case-insensitive match)', async () => {
      await ShopItem.create({
        sku: 'EXISTING-PART',
        name: 'Blue Notebook Large',
        description: 'Desc',
        category: 'ISF Shop',
        price: 50,
        stock: 5
      });

      const req = mockRequest({
        body: buildProductBody({ sku: 'NEW-PART', name: 'Blue Notebook' })
      });
      const res = mockResponse();

      await adminProductController.createProduct(req, res);

      // Should NOT match because 'Blue Notebook' !== 'Blue Notebook Large'
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
