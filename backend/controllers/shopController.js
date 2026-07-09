const ShopService = require('../services/shop');
const { logger, errorLogger } = require('../config/pino-config');
const mongoose = require('mongoose');
const User = require('../models/user');
const PurchaseRequest = require('../models/purchaseRequest');

/**
 * Get all products with filtering and pagination
 * @route GET /api/v2/shop/products
 * @access Public
 */
exports.getProducts = async (req, res, next) => {
  try {
    const {
      category,
      purchaseCategory,
      search,
      minPrice,
      maxPrice,
      inStock,
      page,
      limit,
      sort,
      stockStatus,
      balagruhaIds,
      coachId
    } = req.query;

    const filters = {
      category,
      purchaseCategory,
      search,
      minPrice,
      maxPrice,
      inStock,
      sort,
      stockStatus
    };

    if (balagruhaIds) {
      if (Array.isArray(balagruhaIds)) {
        filters.balagruhaIds = balagruhaIds.filter(id => id); // Remove null/empty
      } else if (typeof balagruhaIds === 'string' && balagruhaIds.trim() !== '') {
        filters.balagruhaIds = balagruhaIds.split(',').map(id => id.trim()).filter(id => id);
      }
    }

    // Shop items do not belong directly to a coach. Scope coach-option data
    // through the selected coach's assigned Balagruhas, created products, and
    // products included in purchase requests raised by that coach.
    if (coachId) {
      filters.coachScoped = true;
      filters.coachId = coachId;
      let coachBalagruhaIds = [];
      let requestedProductIds = [];

      if (mongoose.Types.ObjectId.isValid(coachId)) {
        const selectedCoach = await User.findById(coachId)
          .select('balagruhaIds')
          .lean();
        coachBalagruhaIds = (selectedCoach?.balagruhaIds || []).map(id => id.toString());

        const coachRequests = await PurchaseRequest.find({ requestedBy: coachId })
          .select('items.productId')
          .lean();
        requestedProductIds = coachRequests
          .flatMap(request => request.items || [])
          .map(item => item.productId)
          .filter(Boolean)
          .map(id => id.toString());
      }

      filters.balagruhaIds = filters.balagruhaIds?.length
        ? filters.balagruhaIds.filter(id => coachBalagruhaIds.includes(id.toString()))
        : coachBalagruhaIds;
      filters.requestedProductIds = Array.from(new Set(requestedProductIds));
    }

    const pagination = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    };

    const result = await ShopService.getProducts(filters, pagination);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }

    res.status(200).json(result.data);
  } catch (error) {
    errorLogger.error({ error: error.message }, 'Error in getProducts controller');
    next(error);
  }
};

/**
 * Get single product by ID
 * @route GET /api/v2/shop/products/:id
 * @access Public
 */
exports.getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await ShopService.getProductById(id);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message
      });
    }

    res.status(200).json(result.data);
  } catch (error) {
    errorLogger.error({ error: error.message }, 'Error in getProductById controller');
    next(error);
  }
};

/**
 * Get featured products
 * @route GET /api/v2/shop/products/featured
 * @access Public
 */
exports.getFeaturedProducts = async (req, res, next) => {
  try {
    const { limit } = req.query;

    const result = await ShopService.getFeaturedProducts(parseInt(limit) || 6);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }

    res.status(200).json(result.data);
  } catch (error) {
    errorLogger.error({ error: error.message }, 'Error in getFeaturedProducts controller');
    next(error);
  }
};

/**
 * Get categories with product counts
 * @route GET /api/v2/shop/categories
 * @access Public
 */
exports.getCategories = async (req, res, next) => {
  try {
    const result = await ShopService.getCategories();

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }

    res.status(200).json(result.data);
  } catch (error) {
    next(error);
  }
};

/**
 * Get stock levels for Present Stock tab
 * @route GET /api/v2/shop/admin/inventory/stock-levels
 * @access Private (Purchase Manager, Admin)
 */
exports.getStockLevels = async (req, res, next) => {
  try {
    const { category } = req.query;
    const result = await ShopService.getStockLevels({ category });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }

    res.status(200).json(result);
  } catch (error) {
    errorLogger.error({ error: error.message }, 'Error in getStockLevels controller');
    next(error);
  }
};

/**
 * Get vendors with product counts for Supplier List tab
 * @route GET /api/v2/vendors
 * @access Private (Purchase Manager, Admin)
 */
exports.getVendorsWithProductCount = async (req, res, next) => {
  try {
    const { limit } = req.query;
    const result = await ShopService.getVendorsWithProductCount({ limit: parseInt(limit) || 100 });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }

    res.status(200).json(result.data);
  } catch (error) {
    errorLogger.error({ error: error.message }, 'Error in getVendorsWithProductCount controller');
    next(error);
  }
};

/**
 * Get most consumed products for Analytics tab
 * @route GET /api/v2/shop/admin/analytics/most-consumed
 * @access Private (Purchase Manager, Admin)
 */
exports.getMostConsumed = async (req, res, next) => {
  try {
    const { period, limit } = req.query;
    const result = await ShopService.getMostConsumed({
      period: period || 'all',
      limit: parseInt(limit) || 50
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }

    res.status(200).json(result);
  } catch (error) {
    errorLogger.error({ error: error.message }, 'Error in getMostConsumed controller');
    next(error);
  }
};
