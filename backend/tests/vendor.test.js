const mongoose = require('mongoose');
const Vendor = require('../models/vendor');

/**
 * Story 1.1: Vendor Model Unit Tests
 */

describe('Vendor Model - Story 1.1', () => {
  describe('Validation', () => {
    it('should create a valid vendor', async () => {
      const validVendor = {
        name: 'Global Supplies Inc.',
        phone: '+91-9876543210',
        address: '123 Business Park, Bangalore, India',
        active: true
      };

      const vendor = new Vendor(validVendor);
      const savedVendor = await vendor.save();

      expect(savedVendor._id).toBeDefined();
      expect(savedVendor.name).toBe('Global Supplies Inc.');
      expect(savedVendor.phone).toBe('+91-9876543210');
      expect(savedVendor.address).toBe('123 Business Park, Bangalore, India');
      expect(savedVendor.active).toBe(true);
      expect(savedVendor.createdAt).toBeDefined();
    });

    it('should fail without required fields', async () => {
      const vendor = new Vendor({});

      let error;
      try {
        await vendor.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.name).toBeDefined();
      expect(error.errors.phone).toBeDefined();
      expect(error.errors.address).toBeDefined();
    });

    it('should default active to true', async () => {
      const vendorData = {
        name: 'Test Vendor',
        phone: '9876543210',
        address: 'Test Address'
      };

      const vendor = new Vendor(vendorData);
      const savedVendor = await vendor.save();

      expect(savedVendor.active).toBe(true);
    });

    it('should fail with invalid phone number', async () => {
      const vendorData = {
        name: 'Bad Phone Vendor',
        phone: '123', // Invalid
        address: 'Test Address'
      };

      const vendor = new Vendor(vendorData);
      let error;
      try {
        await vendor.save();
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error.errors.phone).toBeDefined();
    });
  });
});
