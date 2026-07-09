const request = require('supertest');
const express = require('express');
const ShopItem = require('../models/shopItem');
const shopRoutes = require('../routes/v2/shop');

const app = express();
app.use(express.json());
app.use('/api/v2/shop', shopRoutes);

describe('Story 2.5: Purchase Category Filtering', () => {
  let medicineProduct;
  let repairProduct;
  let infraProduct;
  let isfShopProduct;

  beforeEach(async () => {

    medicineProduct = await ShopItem.create({
      sku: 'MED001',
      name: 'Test Medicine',
      description: 'Test medicine for category filtering',
      category: 'Medicines',
      purchaseCategory: 'Medicines',
      price: 100,
      stock: 50,
      lowStockThreshold: 10,
      isActive: true
    });

    repairProduct = await ShopItem.create({
      sku: 'REP001',
      name: 'Test Repair Item',
      description: 'Test repair item for category filtering',
      category: 'Repairs',
      purchaseCategory: 'Repairs',
      price: 200,
      stock: 30,
      lowStockThreshold: 5,
      isActive: true
    });

    infraProduct = await ShopItem.create({
      sku: 'INF001',
      name: 'Test Infra Item',
      description: 'Test infra item for category filtering',
      category: 'Infra',
      purchaseCategory: 'Infra',
      price: 500,
      stock: 20,
      lowStockThreshold: 5,
      isActive: true
    });

    isfShopProduct = await ShopItem.create({
      sku: 'ISF001',
      name: 'ISF Shop Item',
      description: 'ISF shop item for category filtering',
      category: 'ISF Shop',
      purchaseCategory: 'ISF Shop',
      price: 50,
      stock: 100,
      lowStockThreshold: 20,
      isActive: true
    });
  });

  test('should filter products by purchaseCategory - Medicines', async () => {
    const response = await request(app)
      .get('/api/v2/shop/products')
      .query({ purchaseCategory: 'Medicines' });

    expect(response.status).toBe(200);
    expect(response.body.products).toBeDefined();
    expect(response.body.products.length).toBe(1);
    expect(response.body.products[0].purchaseCategory).toBe('Medicines');
    expect(response.body.products[0].name).toBe('Test Medicine');
  });

  test('should filter products by purchaseCategory - Repairs', async () => {
    const response = await request(app)
      .get('/api/v2/shop/products')
      .query({ purchaseCategory: 'Repairs' });

    expect(response.status).toBe(200);
    expect(response.body.products).toBeDefined();
    expect(response.body.products.length).toBe(1);
    expect(response.body.products[0].purchaseCategory).toBe('Repairs');
    expect(response.body.products[0].name).toBe('Test Repair Item');
  });

  test('should filter products by purchaseCategory - Infra', async () => {
    const response = await request(app)
      .get('/api/v2/shop/products')
      .query({ purchaseCategory: 'Infra' });

    expect(response.status).toBe(200);
    expect(response.body.products).toBeDefined();
    expect(response.body.products.length).toBe(1);
    expect(response.body.products[0].purchaseCategory).toBe('Infra');
    expect(response.body.products[0].name).toBe('Test Infra Item');
  });

  test('should return ISF Shop products for ISF Shop category', async () => {
    const response = await request(app)
      .get('/api/v2/shop/products')
      .query({ purchaseCategory: 'ISF Shop' });

    expect(response.status).toBe(200);
    expect(response.body.products).toBeDefined();
    expect(response.body.products.length).toBe(1);
    expect(response.body.products[0].purchaseCategory).toBe('ISF Shop');
    expect(response.body.products[0].name).toBe('ISF Shop Item');
  });

  test('should return all products when no purchaseCategory filter provided', async () => {
    const response = await request(app)
      .get('/api/v2/shop/products');

    expect(response.status).toBe(200);
    expect(response.body.products).toBeDefined();
    expect(response.body.products.length).toBeGreaterThanOrEqual(4);
  });

  test('should return empty array for invalid purchaseCategory', async () => {
    const response = await request(app)
      .get('/api/v2/shop/products')
      .query({ purchaseCategory: 'InvalidCategory' });

    expect(response.status).toBe(200);
    expect(response.body.products).toBeDefined();
    expect(response.body.products.length).toBe(0);
  });

  test('should support Consumables purchase category', async () => {
    const consumableProduct = await ShopItem.create({
      sku: 'CON001',
      name: 'Test Consumable',
      description: 'Test consumable for category filtering',
      category: 'Consumables',
      purchaseCategory: 'Consumables',
      price: 50,
      stock: 100,
      lowStockThreshold: 20,
      isActive: true
    });

    const response = await request(app)
      .get('/api/v2/shop/products')
      .query({ purchaseCategory: 'Consumables' });

    expect(response.status).toBe(200);
    expect(response.body.products).toBeDefined();
    expect(response.body.products.length).toBe(1);
    expect(response.body.products[0].purchaseCategory).toBe('Consumables');
  });

  test('should support Others purchase category', async () => {
    const otherProduct = await ShopItem.create({
      sku: 'OTH001',
      name: 'Test Other Item',
      description: 'Test other item for category filtering',
      category: 'Others',
      purchaseCategory: 'Others',
      price: 75,
      stock: 25,
      lowStockThreshold: 10,
      isActive: true
    });

    const response = await request(app)
      .get('/api/v2/shop/products')
      .query({ purchaseCategory: 'Others' });

    expect(response.status).toBe(200);
    expect(response.body.products).toBeDefined();
    expect(response.body.products.length).toBe(1);
    expect(response.body.products[0].purchaseCategory).toBe('Others');
  });
});
