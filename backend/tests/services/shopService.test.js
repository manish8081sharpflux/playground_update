jest.mock('../../config/pino-config', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  errorLogger: { error: jest.fn(), info: jest.fn() },
}));

const ShopService = require('../../services/shop');
const ShopItem = require('../../models/shopItem');

describe('ShopService', () => {
  describe('getProducts', () => {
    it('excludes zero-stock products when inStock filter is enabled', async () => {
      await ShopItem.create([
        {
          sku: 'INSTOCK-001',
          name: 'Available Bottle',
          description: 'Available bottle for student shop',
          category: 'ISF Shop',
          price: 70,
          sellingPrice: 70,
          maxPrice: 100,
          stock: 45,
          isActive: true,
          isPendingProduct: false
        },
        {
          sku: 'OUTSTOCK-001',
          name: 'Pending Empty Item',
          description: 'Pending product with no stock',
          category: 'ISF Shop',
          price: 80,
          sellingPrice: 80,
          maxPrice: 100,
          stock: 0,
          isActive: true,
          isPendingProduct: true
        }
      ]);

      const result = await ShopService.getProducts(
        { category: 'ISF Shop', inStock: 'true' },
        { page: 1, limit: 20 }
      );

      expect(result.success).toBe(true);
      expect(result.data.products).toHaveLength(1);
      expect(result.data.products[0].sku).toBe('INSTOCK-001');
      expect(result.data.products[0].stock).toBe(45);
    });

    it('matches partial search text against product name, sku, and description', async () => {
      await ShopItem.create([
        {
          sku: 'ANKLET-001',
          name: 'Golden Anklet',
          description: 'Jewellery for student shop',
          category: 'ISF Shop',
          price: 70,
          sellingPrice: 70,
          maxPrice: 100,
          stock: 10,
          isActive: true,
          isPendingProduct: false
        },
        {
          sku: 'BRACE-001',
          name: 'Bracelets',
          description: 'Elegant wrist wear',
          category: 'ISF Shop',
          price: 80,
          sellingPrice: 80,
          maxPrice: 100,
          stock: 10,
          isActive: true,
          isPendingProduct: false
        }
      ]);

      const result = await ShopService.getProducts(
        { category: 'ISF Shop', search: 'ank', inStock: 'true' },
        { page: 1, limit: 20 }
      );

      expect(result.success).toBe(true);
      expect(result.data.products).toHaveLength(1);
      expect(result.data.products[0].sku).toBe('ANKLET-001');
    });
  });
});
