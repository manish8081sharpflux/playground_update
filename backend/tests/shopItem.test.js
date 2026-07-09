const mongoose = require('mongoose');
const ShopItem = require('../models/shopItem');

/**
 * Story-01: ShopItem Model Unit Tests
 * Tests validation, virtuals, and static methods
 */

describe('ShopItem Model - Story-01', () => {
  describe('Validation', () => {
    it('should create a valid shop item', async () => {
      const validItem = {
        sku: 'BOOK-001',
        name: 'Mathematics Workbook',
        description: 'Grade 5 mathematics practice workbook',
        category: 'Medicines',
        price: 50,
        stock: 25
      };

      const item = new ShopItem(validItem);
      const savedItem = await item.save();

      expect(savedItem._id).toBeDefined();
      expect(savedItem.sku).toBe('BOOK-001');
      expect(savedItem.name).toBe('Mathematics Workbook');
      expect(savedItem.category).toBe('Medicines');
      expect(savedItem.price).toBe(50);
      expect(savedItem.stock).toBe(25);
      expect(savedItem.isActive).toBe(true);
    });

    it('should fail without required fields', async () => {
      const item = new ShopItem({});

      let error;
      try {
        await item.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.name).toBeDefined();
      expect(error.errors.description).toBeDefined();
      expect(error.errors.category).toBeDefined();
      expect(error.errors.price).toBeDefined();
    });

    it('should fail with invalid category', async () => {
      const item = new ShopItem({
        sku: 'TEST-001',
        name: 'Test Product',
        description: 'Test description',
        category: 'invalid_category',
        price: 50
      });

      let error;
      try {
        await item.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.category).toBeDefined();
    });

    it('should fail with negative price', async () => {
      const item = new ShopItem({
        sku: 'TEST-002',
        name: 'Test Product',
        description: 'Test description',
        category: 'Medicines',
        price: -10
      });

      let error;
      try {
        await item.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
    });

    it('should fail if discount price >= regular price', async () => {
      const item = new ShopItem({
        sku: 'TEST-003',
        name: 'Test Product',
        description: 'Test description',
        category: 'Medicines',
        price: 50,
        discountPrice: 60
      });

      let error;
      try {
        await item.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.message).toContain('Discount price must be less than regular price');
    });
  });

  describe('Virtuals', () => {
    it('should calculate inStock correctly', () => {
      const inStockItem = new ShopItem({
        sku: 'TEST-004',
        name: 'Test',
        description: 'Test',
        category: 'Medicines',
        price: 50,
        stock: 10
      });

      const outOfStockItem = new ShopItem({
        sku: 'TEST-005',
        name: 'Test',
        description: 'Test',
        category: 'Medicines',
        price: 50,
        stock: 0
      });

      expect(inStockItem.inStock).toBe(true);
      expect(outOfStockItem.inStock).toBe(false);
    });

    it('should calculate lowStock correctly', () => {
      const lowStockItem = new ShopItem({
        sku: 'TEST-006',
        name: 'Test',
        description: 'Test',
        category: 'Medicines',
        price: 50,
        stock: 5,
        lowStockThreshold: 10
      });

      const normalStockItem = new ShopItem({
        sku: 'TEST-007',
        name: 'Test',
        description: 'Test',
        category: 'Medicines',
        price: 50,
        stock: 20,
        lowStockThreshold: 10
      });

      expect(lowStockItem.lowStock).toBe(true);
      expect(normalStockItem.lowStock).toBe(false);
    });

    it('should return currentPrice (discount if available)', () => {
      const regularItem = new ShopItem({
        sku: 'TEST-008',
        name: 'Test',
        description: 'Test',
        category: 'Medicines',
        price: 50
      });

      const discountedItem = new ShopItem({
        sku: 'TEST-009',
        name: 'Test',
        description: 'Test',
        category: 'Medicines',
        price: 50,
        discountPrice: 30
      });

      expect(regularItem.currentPrice).toBe(50);
      expect(discountedItem.currentPrice).toBe(30);
    });
  });

  describe('Instance Methods', () => {
    it('should check if product is available for user role', () => {
      const studentOnlyItem = new ShopItem({
        sku: 'TEST-010',
        name: 'Test',
        description: 'Test',
        category: 'Medicines',
        price: 50,
        availableFor: ['student']
      });

      const allUsersItem = new ShopItem({
        sku: 'TEST-011',
        name: 'Test',
        description: 'Test',
        category: 'Medicines',
        price: 50,
        availableFor: ['all']
      });

      expect(studentOnlyItem.isAvailableFor('student')).toBe(true);
      expect(studentOnlyItem.isAvailableFor('coach')).toBe(false);
      expect(allUsersItem.isAvailableFor('student')).toBe(true);
      expect(allUsersItem.isAvailableFor('coach')).toBe(true);
    });
  });
});

// Note: Integration tests for API endpoints should be in separate file
// Run with: npm test or jest backend/tests/shopItem.test.js
