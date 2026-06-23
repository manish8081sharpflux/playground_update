const mongoose = require('mongoose');
const Vendor = require('../../models/vendor');
const vendorController = require('../../controllers/vendorController');
const { mockRequest, mockResponse } = global.testUtils;

describe('Vendor Controller - Story 1.1', () => {
  
  beforeEach(async () => {
    await Vendor.deleteMany({});
  });

  describe('createVendor', () => {
    it('should create a new vendor', async () => {
      const req = mockRequest({
        body: {
          name: 'Controller Vendor',
          phone: '9876543210',
          address: 'Controller Address'
        }
      });
      const res = mockResponse();

      await vendorController.createVendor(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        vendor: expect.objectContaining({
          name: 'Controller Vendor'
        })
      }));

      const vendor = await Vendor.findOne({ name: 'Controller Vendor' });
      expect(vendor).toBeTruthy();
    });

    it('should fail validation', async () => {
      const req = mockRequest({
        body: {
          name: 'Incomplete Vendor'
          // Missing phone and address
        }
      });
      const res = mockResponse();

      await vendorController.createVendor(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false
      }));
    });
  });

  describe('getAllVendors', () => {
    it('should get all vendors', async () => {
      await Vendor.create([
        { name: 'V1', phone: '9876543210', address: 'A1' },
        { name: 'V2', phone: '9876543211', address: 'A2' }
      ]);

      const req = mockRequest();
      const res = mockResponse();

      await vendorController.getAllVendors(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        count: 2
      }));
    });

    it('should cap limit to 100', async () => {
      const vendors = [];
      for (let i = 0; i < 110; i++) {
        vendors.push({ name: `V${i}`, phone: '9876543210', address: 'A' });
      }
      await Vendor.create(vendors);

      const req = mockRequest({
        query: { limit: '1000' }
      });
      const res = mockResponse();

      await vendorController.getAllVendors(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        pagination: expect.objectContaining({
          limit: 100
        })
      }));
    });

    it('should filter by active status', async () => {
      await Vendor.create([
        { name: 'Active', phone: '9876543210', address: 'A1', active: true },
        { name: 'Inactive', phone: '9876543211', address: 'A2', active: false }
      ]);

      const req = mockRequest({
        query: { active: 'true' }
      });
      const res = mockResponse();

      await vendorController.getAllVendors(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        count: 1,
        vendors: expect.arrayContaining([
          expect.objectContaining({ name: 'Active' })
        ])
      }));
    });

    it('should filter by search term', async () => {
      await Vendor.create([
        { name: 'Alpha Supplies', phone: '9876543210', address: 'MG Road' },
        { name: 'Beta Traders', phone: '9876543211', address: 'Brigade Road' }
      ]);

      const req = mockRequest({
        query: { search: 'alpha' }
      });
      const res = mockResponse();

      await vendorController.getAllVendors(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        count: 1,
        vendors: expect.arrayContaining([
          expect.objectContaining({ name: 'Alpha Supplies' })
        ])
      }));
    });
  });

  describe('updateVendor', () => {
    it('should update a vendor', async () => {
      const vendor = await Vendor.create({ name: 'Old Name', phone: '9876543210', address: 'A1' });

      const req = mockRequest({
        params: { id: vendor._id },
        body: { name: 'New Name' }
      });
      const res = mockResponse();

      await vendorController.updateVendor(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        vendor: expect.objectContaining({ name: 'New Name' })
      }));
    });

    it('should return 404 for non-existent vendor', async () => {
      const req = mockRequest({
        params: { id: new mongoose.Types.ObjectId() },
        body: { name: 'New Name' }
      });
      const res = mockResponse();

      await vendorController.updateVendor(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getVendorById', () => {
    it('should get vendor by id', async () => {
      const vendor = await Vendor.create({ name: 'Find Me', phone: '9876543210', address: 'A1' });

      const req = mockRequest({
        params: { id: vendor._id }
      });
      const res = mockResponse();

      await vendorController.getVendorById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        vendor: expect.objectContaining({ name: 'Find Me' })
      }));
    });

    it('should return 404 for non-existent vendor', async () => {
      const req = mockRequest({
        params: { id: new mongoose.Types.ObjectId() }
      });
      const res = mockResponse();

      await vendorController.getVendorById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
