const mongoose = require('mongoose');
const ShopItem = require('../models/shopItem');
const Vendor = require('../models/vendor');

/**
 * Story 1.2: ShopItem Refactor Tests
 */

describe('ShopItem Model - Story 1.2', () => {
  let vendor;

  beforeAll(async () => {
    // Create a dummy vendor for reference
    vendor = new Vendor({
      name: 'Test Vendor',
      phone: '9876543210',
      address: 'Test Addr'
    });
    await vendor.save();
  });

  afterEach(async () => {
    await ShopItem.deleteMany({ sku: /STORY1-2/ });
  });

  it('should accept approvedVendors, maxPrice, and sellingPrice', async () => {
    const item = new ShopItem({
      sku: 'STORY1-2-001',
      name: 'Refactored Item',
      description: 'Test',
      category: 'ISF Shop',
      price: 10,
      stock: 5,
      approvedVendors: [{ vendorId: vendor._id, rank: 1 }],
      maxPrice: 500, // Rupees
      sellingPrice: 15 // Coins
    });

    const savedItem = await item.save();

    expect(savedItem.approvedVendors).toHaveLength(1);
    expect(savedItem.approvedVendors[0].vendorId.toString()).toBe(vendor._id.toString());
    expect(savedItem.maxPrice).toBe(500);
    expect(savedItem.sellingPrice).toBe(15);
  });

  it('should allow saving without new fields (backward compatibility)', async () => {
    const item = new ShopItem({
      sku: 'STORY1-2-OLD',
      name: 'Legacy Item',
      description: 'Test',
      category: 'ISF Shop',
      price: 10,
      stock: 5
    });

    const savedItem = await item.save();
    expect(savedItem._id).toBeDefined();
    expect(savedItem.maxPrice).toBeUndefined();
  });
});
