const mongoose = require('mongoose');

// Mock pino logger before requiring controller
jest.mock('../../config/pino-config', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  errorLogger: { error: jest.fn(), info: jest.fn() },
}));

// Mock shop service
jest.mock('../../services/shop', () => ({
  getProducts: jest.fn(),
  getProductById: jest.fn(),
  getFeaturedProducts: jest.fn(),
  getCategories: jest.fn(),
  getStockLevels: jest.fn(),
  getVendorsWithProductCount: jest.fn(),
  getMostConsumed: jest.fn(),
}));

const shopController = require('../../controllers/shopController');
const ShopService = require('../../services/shop');
const { mockRequest, mockResponse, mockNext } = global.testUtils;

describe('ShopController (Story 5.2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== getProducts ====================
  describe('getProducts', () => {
    it('should get products with default pagination', async () => {
      const req = mockRequest({ query: {} });
      const res = mockResponse();
      const next = mockNext();

      ShopService.getProducts.mockResolvedValue({
        success: true,
        data: { products: [], pagination: { page: 1, limit: 20, total: 0 } },
      });

      await shopController.getProducts(req, res, next);

      expect(ShopService.getProducts).toHaveBeenCalledWith(
        expect.any(Object),
        { page: 1, limit: 20 }
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should pass filter and pagination params', async () => {
      const req = mockRequest({
        query: {
          category: 'electronics',
          purchaseCategory: 'ISF Shop',
          search: 'pen',
          minPrice: '10',
          maxPrice: '100',
          inStock: 'true',
          page: '2',
          limit: '10',
          sort: 'price',
          stockStatus: 'in_stock',
        },
      });
      const res = mockResponse();
      const next = mockNext();

      ShopService.getProducts.mockResolvedValue({
        success: true,
        data: { products: [] },
      });

      await shopController.getProducts(req, res, next);

      expect(ShopService.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'electronics',
          purchaseCategory: 'ISF Shop',
          search: 'pen',
          sort: 'price',
        }),
        { page: 2, limit: 10 }
      );
    });

    it('should handle balagruhaIds as comma-separated string', async () => {
      const req = mockRequest({
        query: { balagruhaIds: 'bg1,bg2,bg3' },
      });
      const res = mockResponse();
      const next = mockNext();

      ShopService.getProducts.mockResolvedValue({ success: true, data: {} });

      await shopController.getProducts(req, res, next);

      expect(ShopService.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          balagruhaIds: ['bg1', 'bg2', 'bg3'],
        }),
        expect.any(Object)
      );
    });

    it('should handle balagruhaIds as array', async () => {
      const req = mockRequest({
        query: { balagruhaIds: ['bg1', 'bg2'] },
      });
      const res = mockResponse();
      const next = mockNext();

      ShopService.getProducts.mockResolvedValue({ success: true, data: {} });

      await shopController.getProducts(req, res, next);

      expect(ShopService.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          balagruhaIds: ['bg1', 'bg2'],
        }),
        expect.any(Object)
      );
    });

    it('should return 500 when service returns failure', async () => {
      const req = mockRequest({ query: {} });
      const res = mockResponse();
      const next = mockNext();

      ShopService.getProducts.mockResolvedValue({
        success: false,
        message: 'Database error',
        error: 'Connection timeout',
      });

      await shopController.getProducts(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
      }));
    });

    it('should call next on exception', async () => {
      const req = mockRequest({ query: {} });
      const res = mockResponse();
      const next = mockNext();
      const error = new Error('Unexpected error');

      ShopService.getProducts.mockRejectedValue(error);

      await shopController.getProducts(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // ==================== getProductById ====================
  describe('getProductById', () => {
    it('should get product by ID successfully', async () => {
      const productId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({ params: { id: productId } });
      const res = mockResponse();
      const next = mockNext();

      ShopService.getProductById.mockResolvedValue({
        success: true,
        data: { _id: productId, name: 'Test Product' },
      });

      await shopController.getProductById(req, res, next);

      expect(ShopService.getProductById).toHaveBeenCalledWith(productId);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 when product not found', async () => {
      const req = mockRequest({ params: { id: 'nonexistent' } });
      const res = mockResponse();
      const next = mockNext();

      ShopService.getProductById.mockResolvedValue({
        success: false,
        message: 'Product not found',
      });

      await shopController.getProductById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should call next on exception', async () => {
      const req = mockRequest({ params: { id: 'some-id' } });
      const res = mockResponse();
      const next = mockNext();
      const error = new Error('DB error');

      ShopService.getProductById.mockRejectedValue(error);

      await shopController.getProductById(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // ==================== getFeaturedProducts ====================
  describe('getFeaturedProducts', () => {
    it('should get featured products with default limit', async () => {
      const req = mockRequest({ query: {} });
      const res = mockResponse();
      const next = mockNext();

      ShopService.getFeaturedProducts.mockResolvedValue({
        success: true,
        data: [{ name: 'Featured Item' }],
      });

      await shopController.getFeaturedProducts(req, res, next);

      expect(ShopService.getFeaturedProducts).toHaveBeenCalledWith(6);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should use custom limit', async () => {
      const req = mockRequest({ query: { limit: '12' } });
      const res = mockResponse();
      const next = mockNext();

      ShopService.getFeaturedProducts.mockResolvedValue({ success: true, data: [] });

      await shopController.getFeaturedProducts(req, res, next);

      expect(ShopService.getFeaturedProducts).toHaveBeenCalledWith(12);
    });

    it('should return 500 on service failure', async () => {
      const req = mockRequest({ query: {} });
      const res = mockResponse();
      const next = mockNext();

      ShopService.getFeaturedProducts.mockResolvedValue({ success: false, message: 'Error', error: 'DB' });

      await shopController.getFeaturedProducts(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should call next on exception', async () => {
      const req = mockRequest({ query: {} });
      const res = mockResponse();
      const next = mockNext();
      const error = new Error('Unexpected');

      ShopService.getFeaturedProducts.mockRejectedValue(error);

      await shopController.getFeaturedProducts(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // ==================== getCategories ====================
  describe('getCategories', () => {
    it('should get categories successfully', async () => {
      const req = mockRequest({});
      const res = mockResponse();
      const next = mockNext();

      ShopService.getCategories.mockResolvedValue({
        success: true,
        data: [{ name: 'Electronics', count: 5 }],
      });

      await shopController.getCategories(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 500 on service failure', async () => {
      const req = mockRequest({});
      const res = mockResponse();
      const next = mockNext();

      ShopService.getCategories.mockResolvedValue({ success: false, message: 'Error', error: 'DB' });

      await shopController.getCategories(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should call next on exception', async () => {
      const req = mockRequest({});
      const res = mockResponse();
      const next = mockNext();
      const error = new Error('Unexpected');

      ShopService.getCategories.mockRejectedValue(error);

      await shopController.getCategories(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // ==================== getStockLevels ====================
  describe('getStockLevels', () => {
    it('should get stock levels successfully', async () => {
      const req = mockRequest({ query: { category: 'electronics' } });
      const res = mockResponse();
      const next = mockNext();

      const mockResult = { success: true, data: [{ name: 'Item A', stock: 10 }] };
      ShopService.getStockLevels.mockResolvedValue(mockResult);

      await shopController.getStockLevels(req, res, next);

      expect(ShopService.getStockLevels).toHaveBeenCalledWith({ category: 'electronics' });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 500 on service failure', async () => {
      const req = mockRequest({ query: {} });
      const res = mockResponse();
      const next = mockNext();

      ShopService.getStockLevels.mockResolvedValue({ success: false, message: 'Error', error: 'DB' });

      await shopController.getStockLevels(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should call next on exception', async () => {
      const req = mockRequest({ query: {} });
      const res = mockResponse();
      const next = mockNext();
      const error = new Error('Unexpected');

      ShopService.getStockLevels.mockRejectedValue(error);

      await shopController.getStockLevels(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // ==================== getMostConsumed ====================
  describe('getMostConsumed', () => {
    it('should get most consumed products with defaults', async () => {
      const req = mockRequest({ query: {} });
      const res = mockResponse();
      const next = mockNext();

      const mockResult = { success: true, data: [{ name: 'Popular Item', orderCount: 50 }] };
      ShopService.getMostConsumed.mockResolvedValue(mockResult);

      await shopController.getMostConsumed(req, res, next);

      expect(ShopService.getMostConsumed).toHaveBeenCalledWith({ period: 'all', limit: 50 });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should pass custom period and limit', async () => {
      const req = mockRequest({ query: { period: 'month', limit: '20' } });
      const res = mockResponse();
      const next = mockNext();

      ShopService.getMostConsumed.mockResolvedValue({ success: true, data: [] });

      await shopController.getMostConsumed(req, res, next);

      expect(ShopService.getMostConsumed).toHaveBeenCalledWith({ period: 'month', limit: 20 });
    });

    it('should return 500 on service failure', async () => {
      const req = mockRequest({ query: {} });
      const res = mockResponse();
      const next = mockNext();

      ShopService.getMostConsumed.mockResolvedValue({ success: false, message: 'Error', error: 'DB' });

      await shopController.getMostConsumed(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should call next on exception', async () => {
      const req = mockRequest({ query: {} });
      const res = mockResponse();
      const next = mockNext();
      const error = new Error('Unexpected');

      ShopService.getMostConsumed.mockRejectedValue(error);

      await shopController.getMostConsumed(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
