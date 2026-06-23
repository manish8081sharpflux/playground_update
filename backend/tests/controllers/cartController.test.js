const mongoose = require('mongoose');

// Mock pino logger before requiring controller
jest.mock('../../config/pino-config', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  errorLogger: { error: jest.fn(), info: jest.fn() },
}));

// Mock cart service
jest.mock('../../services/cart', () => ({
  getCart: jest.fn(),
  addToCart: jest.fn(),
  updateQuantity: jest.fn(),
  removeFromCart: jest.fn(),
  clearCart: jest.fn(),
  validateCartStock: jest.fn(),
}));

const cartController = require('../../controllers/cartController');
const cartService = require('../../services/cart');
const { mockRequest, mockResponse } = global.testUtils;

describe('CartController (Story 5.2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== getCart ====================
  describe('getCart', () => {
    it('should get cart successfully', async () => {
      const userId = new mongoose.Types.ObjectId();
      const req = mockRequest({ user: { _id: userId } });
      const res = mockResponse();

      const mockResult = { success: true, cart: { items: [], itemCount: 0 } };
      cartService.getCart.mockResolvedValue(mockResult);

      await cartController.getCart(req, res);

      expect(cartService.getCart).toHaveBeenCalledWith(userId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 500 on error', async () => {
      const userId = new mongoose.Types.ObjectId();
      const req = mockRequest({ user: { _id: userId } });
      const res = mockResponse();

      cartService.getCart.mockRejectedValue(new Error('Failed to fetch cart'));

      await cartController.getCart(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
      }));
    });
  });

  // ==================== addToCart ====================
  describe('addToCart', () => {
    it('should add item to cart successfully', async () => {
      const userId = new mongoose.Types.ObjectId();
      const productId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({
        user: { _id: userId },
        body: { productId, quantity: 2 },
      });
      const res = mockResponse();

      const mockResult = { success: true, message: 'Item added to cart' };
      cartService.addToCart.mockResolvedValue(mockResult);

      await cartController.addToCart(req, res);

      expect(cartService.addToCart).toHaveBeenCalledWith(userId, productId, 2);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 404 when product not found', async () => {
      const userId = new mongoose.Types.ObjectId();
      const req = mockRequest({
        user: { _id: userId },
        body: { productId: 'invalid-id', quantity: 1 },
      });
      const res = mockResponse();

      cartService.addToCart.mockRejectedValue(new Error('Product not found'));

      await cartController.addToCart(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 when item not available', async () => {
      const userId = new mongoose.Types.ObjectId();
      const req = mockRequest({
        user: { _id: userId },
        body: { productId: 'some-id', quantity: 1 },
      });
      const res = mockResponse();

      cartService.addToCart.mockRejectedValue(new Error('Product is not available'));

      await cartController.addToCart(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when item out of stock', async () => {
      const userId = new mongoose.Types.ObjectId();
      const req = mockRequest({
        user: { _id: userId },
        body: { productId: 'some-id', quantity: 1 },
      });
      const res = mockResponse();

      cartService.addToCart.mockRejectedValue(new Error('Product is out of stock'));

      await cartController.addToCart(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when exceeds available in stock', async () => {
      const userId = new mongoose.Types.ObjectId();
      const req = mockRequest({
        user: { _id: userId },
        body: { productId: 'some-id', quantity: 100 },
      });
      const res = mockResponse();

      cartService.addToCart.mockRejectedValue(new Error('Only 5 available in stock'));

      await cartController.addToCart(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on unexpected error', async () => {
      const userId = new mongoose.Types.ObjectId();
      const req = mockRequest({
        user: { _id: userId },
        body: { productId: 'some-id', quantity: 1 },
      });
      const res = mockResponse();

      cartService.addToCart.mockRejectedValue(new Error('Unexpected error'));

      await cartController.addToCart(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== updateQuantity ====================
  describe('updateQuantity', () => {
    it('should update quantity successfully', async () => {
      const userId = new mongoose.Types.ObjectId();
      const shopItemId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({
        user: { _id: userId },
        params: { shopItemId },
        body: { quantity: 3 },
      });
      const res = mockResponse();

      const mockResult = { success: true, message: 'Quantity updated' };
      cartService.updateQuantity.mockResolvedValue(mockResult);

      await cartController.updateQuantity(req, res);

      expect(cartService.updateQuantity).toHaveBeenCalledWith(userId, shopItemId, 3);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 when item not found in cart', async () => {
      const userId = new mongoose.Types.ObjectId();
      const req = mockRequest({
        user: { _id: userId },
        params: { shopItemId: 'some-id' },
        body: { quantity: 3 },
      });
      const res = mockResponse();

      cartService.updateQuantity.mockRejectedValue(new Error('Item not found in cart'));

      await cartController.updateQuantity(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 on invalid quantity', async () => {
      const userId = new mongoose.Types.ObjectId();
      const req = mockRequest({
        user: { _id: userId },
        params: { shopItemId: 'some-id' },
        body: { quantity: 200 },
      });
      const res = mockResponse();

      cartService.updateQuantity.mockRejectedValue(new Error('Quantity must be between 1 and 99'));

      await cartController.updateQuantity(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on unexpected error', async () => {
      const userId = new mongoose.Types.ObjectId();
      const req = mockRequest({
        user: { _id: userId },
        params: { shopItemId: 'some-id' },
        body: { quantity: 3 },
      });
      const res = mockResponse();

      cartService.updateQuantity.mockRejectedValue(new Error('DB error'));

      await cartController.updateQuantity(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== removeFromCart ====================
  describe('removeFromCart', () => {
    it('should remove item from cart successfully', async () => {
      const userId = new mongoose.Types.ObjectId();
      const shopItemId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({
        user: { _id: userId },
        params: { shopItemId },
      });
      const res = mockResponse();

      const mockResult = { success: true, message: 'Item removed' };
      cartService.removeFromCart.mockResolvedValue(mockResult);

      await cartController.removeFromCart(req, res);

      expect(cartService.removeFromCart).toHaveBeenCalledWith(userId, shopItemId);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 when item not found', async () => {
      const userId = new mongoose.Types.ObjectId();
      const req = mockRequest({
        user: { _id: userId },
        params: { shopItemId: 'some-id' },
      });
      const res = mockResponse();

      cartService.removeFromCart.mockRejectedValue(new Error('Item not found'));

      await cartController.removeFromCart(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on unexpected error', async () => {
      const userId = new mongoose.Types.ObjectId();
      const req = mockRequest({
        user: { _id: userId },
        params: { shopItemId: 'some-id' },
      });
      const res = mockResponse();

      cartService.removeFromCart.mockRejectedValue(new Error('DB error'));

      await cartController.removeFromCart(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== clearCart ====================
  describe('clearCart', () => {
    it('should clear cart successfully', async () => {
      const userId = new mongoose.Types.ObjectId();
      const req = mockRequest({ user: { _id: userId } });
      const res = mockResponse();

      const mockResult = { success: true, message: 'Cart cleared' };
      cartService.clearCart.mockResolvedValue(mockResult);

      await cartController.clearCart(req, res);

      expect(cartService.clearCart).toHaveBeenCalledWith(userId);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 when cart not found', async () => {
      const userId = new mongoose.Types.ObjectId();
      const req = mockRequest({ user: { _id: userId } });
      const res = mockResponse();

      cartService.clearCart.mockRejectedValue(new Error('Cart not found'));

      await cartController.clearCart(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on unexpected error', async () => {
      const userId = new mongoose.Types.ObjectId();
      const req = mockRequest({ user: { _id: userId } });
      const res = mockResponse();

      cartService.clearCart.mockRejectedValue(new Error('DB error'));

      await cartController.clearCart(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== validateStock ====================
  describe('validateStock', () => {
    it('should validate stock successfully', async () => {
      const userId = new mongoose.Types.ObjectId();
      const req = mockRequest({ user: { _id: userId } });
      const res = mockResponse();

      const mockResult = { success: true, valid: true, issues: [] };
      cartService.validateCartStock.mockResolvedValue(mockResult);

      await cartController.validateStock(req, res);

      expect(cartService.validateCartStock).toHaveBeenCalledWith(userId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 500 on error', async () => {
      const userId = new mongoose.Types.ObjectId();
      const req = mockRequest({ user: { _id: userId } });
      const res = mockResponse();

      cartService.validateCartStock.mockRejectedValue(new Error('Validation failed'));

      await cartController.validateStock(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
