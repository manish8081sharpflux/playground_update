const ShopItem = require('../models/shopItem');
const PurchaseRequest = require('../models/purchaseRequest');
const { logger, errorLogger } = require('../config/pino-config');

class ShopService {
  /**
   * Get filtered products with pagination
   * @param {Object} filters - Category, search, price filters
   * @param {Object} pagination - Page and limit
   * @returns {Promise<Object>} Products and pagination info
   */
  static async getProducts(filters = {}, pagination = {}) {
    try {
      const {
        category,
        purchaseCategory,
        search,
        minPrice,
        maxPrice,
        inStock = true,
        sort = '-createdAt'
      } = filters;

      const {
        page = 1,
        limit = 20
      } = pagination;

      // Build query
      // Sprint5-Story-25 (AC8): Include both active products AND pending products
      const query = {
        $or: [
          { isActive: true },
          { isPendingProduct: true }
        ]
      };

      // Category filter — FIX-043: Support comma-separated categories for multi-select
      if (category) {
        if (category.includes(',')) {
          query.category = { $in: category.split(',').map(c => c.trim()) };
        } else {
          query.category = category;
        }
      }

      // Story 2.5: Purchase category filter (scopes catalog by procurement bucket)
      // Also check category field as fallback for products where purchaseCategory wasn't set properly
      if (purchaseCategory) {
        query.$or = [
          { purchaseCategory: purchaseCategory },
          { category: purchaseCategory }
        ];
      }

      // Search filter (text index)
      if (search) {
        query.$text = { $search: search };
      }

      // Price range
      if (minPrice !== undefined || maxPrice !== undefined) {
        query.price = {};
        if (minPrice !== undefined) query.price.$gte = Number(minPrice);
        if (maxPrice !== undefined) query.price.$lte = Number(maxPrice);
      }

      // Stock filter - Sprint5-Story-25: Don't filter out pending products by stock
      // Updated to support granular stockStatus (low, out, high)
      const stockStatus = filters.stockStatus; // 'low', 'out', 'high', 'in_stock'

      if (stockStatus) {
        if (stockStatus === 'out') {
          query.stock = 0;
        } else if (stockStatus === 'low') {
          query.$expr = {
            $and: [
              { $gt: ['$stock', 0] },
              { $lte: ['$stock', '$lowStockThreshold'] }
            ]
          };
        } else if (stockStatus === 'high') {
          query.$expr = { $gt: ['$stock', '$lowStockThreshold'] };
        } else if (stockStatus === 'in_stock' || inStock === true || inStock === 'true') {
          // Default in_stock logic
          query.$and = query.$and || [];
          query.$and.push({
            $or: [
              { isPendingProduct: true },
              { stock: { $gt: 0 } }
            ]
          });
        }
      } else if (inStock === true || inStock === 'true') {
        // Fallback to legacy boolean check if stockStatus not provided
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { isPendingProduct: true },      // Pending products: include regardless of stock
            { stock: { $gt: 0 } }            // Regular products: only if stock > 0
          ]
        });
      }

      // Balagruha Scoping (for filtered views like PM Low Stock)
      // supports passing array of IDs. Includes shop-wide items (null/undefined balagruhaId)
      if (filters.balagruhaIds && Array.isArray(filters.balagruhaIds) && filters.balagruhaIds.length > 0) {
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { balagruhaId: { $in: filters.balagruhaIds } },
            { balagruhaId: null },
            { balagruhaId: { $exists: false } }
          ]
        });
      }

      const skip = (page - 1) * limit;

      // Execute queries in parallel
      const [products, total] = await Promise.all([
        ShopItem.find(query)
          .select('-__v')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        ShopItem.countDocuments(query)
      ]);

      // Add computed fields (since virtuals don't work with .lean())
      const enrichedProducts = products.map(product => {
        // Compute primaryImageUrl (virtual field logic)
        let primaryImageUrl = product.imageUrl; // fallback
        if (product.images && product.images.length > 0) {
          const primaryImage = product.images.find(img => img.isPrimary);
          primaryImageUrl = primaryImage ? primaryImage.url : product.images[0].url;
        }

        return {
          ...product,
          primaryImageUrl,
          inStock: product.stock > 0,
          lowStock: product.stock > 0 && product.stock <= (product.lowStockThreshold || 10),
          currentPrice: product.discountPrice !== null ? product.discountPrice : product.price
        };
      });

      logger.info({
        filters,
        pagination: { page, limit },
        resultCount: products.length,
        total
      }, 'Products retrieved successfully');

      return {
        success: true,
        data: {
          products: enrichedProducts,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      };
    } catch (error) {
      errorLogger.error({ error: error.message, filters, pagination }, 'Error retrieving products');
      return {
        success: false,
        message: 'Failed to retrieve products',
        error: error.message
      };
    }
  }

  /**
   * Get single product by ID
   * @param {String} productId - Product ID
   * @returns {Promise<Object>} Product data
   */
  static async getProductById(productId) {
    try {
      const product = await ShopItem.findOne({
        _id: productId,
        isActive: true
      }).select('-__v');

      if (!product) {
        return {
          success: false,
          message: 'Product not found'
        };
      }

      logger.info({ productId }, 'Product retrieved successfully');

      return {
        success: true,
        data: {
          product: {
            ...product.toObject(),
            inStock: product.inStock,
            lowStock: product.lowStock,
            currentPrice: product.currentPrice
          }
        }
      };
    } catch (error) {
      errorLogger.error({ error: error.message, productId }, 'Error retrieving product');
      return {
        success: false,
        message: 'Failed to retrieve product',
        error: error.message
      };
    }
  }

  /**
   * Get featured products (low stock or recently added)
   * @param {Number} limit - Number of products to return
   * @returns {Promise<Object>} Featured products
   */
  static async getFeaturedProducts(limit = 6) {
    try {
      const products = await ShopItem.find({
        isActive: true,
        stock: { $gt: 0 }
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('-__v')
        .lean();

      const enrichedProducts = products.map(product => {
        // Compute primaryImageUrl (virtual field logic)
        let primaryImageUrl = product.imageUrl; // fallback
        if (product.images && product.images.length > 0) {
          const primaryImage = product.images.find(img => img.isPrimary);
          primaryImageUrl = primaryImage ? primaryImage.url : product.images[0].url;
        }

        return {
          ...product,
          primaryImageUrl,
          inStock: product.stock > 0,
          lowStock: product.stock > 0 && product.stock <= (product.lowStockThreshold || 10),
          currentPrice: product.discountPrice !== null ? product.discountPrice : product.price
        };
      });

      logger.info({ count: products.length }, 'Featured products retrieved');

      return {
        success: true,
        data: {
          products: enrichedProducts
        }
      };
    } catch (error) {
      errorLogger.error({ error: error.message }, 'Error retrieving featured products');
      return {
        success: false,
        message: 'Failed to retrieve featured products',
        error: error.message
      };
    }
  }

  /**
   * Get categories with product counts
   * @returns {Promise<Object>} Categories
   */
  static async getCategories() {
    try {
      const categories = await ShopItem.aggregate([
        {
          $match: { isActive: true }
        },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            inStockCount: {
              $sum: { $cond: [{ $gt: ['$stock', 0] }, 1, 0] }
            }
          }
        },
        {
          $project: {
            _id: 0,
            category: '$_id',
            count: 1,
            inStockCount: 1
          }
        },
        {
          $sort: { category: 1 }
        }
      ]);

      logger.info({ categoriesCount: categories.length }, 'Categories retrieved');

      return {
        success: true,
        data: { categories }
      };
    } catch (error) {
      errorLogger.error({ error: error.message }, 'Error retrieving categories');
      return {
        success: false,
        message: 'Failed to retrieve categories',
        error: error.message
      };
    }
  }

  /**
   * Get stock levels for Present Stock tab
   * @param {Object} filters - Category filter
   * @returns {Promise<Object>} Stock levels and summary
   */
  static async getStockLevels({ category } = {}) {
    try {
      const query = { isActive: true };
      if (category && category !== 'all') {
        query.category = category;
      }

      const products = await ShopItem.find(query)
        .select('name sku category stock lowStockThreshold isActive balagruhaId')
        .sort({ stock: 1, name: 1 })
        .lean();

      let inStock = 0;
      let lowStock = 0;
      let outOfStock = 0;

      const enrichedProducts = products.map(p => {
        let stockStatus = 'in_stock';
        if (p.stock <= 0) {
          stockStatus = 'out_of_stock';
          outOfStock++;
        } else if (p.stock <= (p.lowStockThreshold || 10)) {
          stockStatus = 'low_stock';
          lowStock++;
        } else {
          inStock++;
        }
        return {
          ...p,
          stockStatus,
          minStockLevel: p.lowStockThreshold || 10,
          stockQuantity: p.stock
        };
      });

      return {
        success: true,
        data: enrichedProducts,
        summary: {
          total: products.length,
          inStock,
          lowStock,
          outOfStock
        }
      };
    } catch (error) {
      errorLogger.error({ error: error.message }, 'Error retrieving stock levels');
      return {
        success: false,
        message: 'Failed to retrieve stock levels',
        error: error.message
      };
    }
  }

  /**
   * Get vendors with product counts
   * @param {Object} options - Limit
   * @returns {Promise<Object>} Vendors with counts
   */
  static async getVendorsWithProductCount({ limit = 100 } = {}) {
    try {
      const vendors = await ShopItem.aggregate([
        { $match: { isActive: true } },
        { $unwind: '$approvedVendors' },
        {
          $group: {
            _id: '$approvedVendors.vendorId',
            productCount: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'vendors',
            localField: '_id',
            foreignField: '_id',
            as: 'vendor'
          }
        },
        { $unwind: '$vendor' },
        {
          $project: {
            _id: '$vendor._id',
            name: '$vendor.name',
            email: '$vendor.email',
            phone: '$vendor.phone',
            contactPerson: '$vendor.contactPerson',
            isActive: '$vendor.isActive',
            productCount: 1
          }
        },
        { $sort: { name: 1 } },
        { $limit: limit }
      ]);

      return {
        success: true,
        data: vendors
      };
    } catch (error) {
      errorLogger.error({ error: error.message }, 'Error retrieving vendors with counts');
      return {
        success: false,
        message: 'Failed to retrieve vendors',
        error: error.message
      };
    }
  }

  /**
   * Get most consumed products
   * @param {Object} options - Period (week/month/year/all), limit
   * @returns {Promise<Object>} Most consumed products
   */
  static async getMostConsumed({ period = 'all', limit = 50 } = {}) {
    try {
      const matchStage = { $match: {} };

      // Date filtering
      if (period !== 'all') {
        const now = new Date();
        let startDate = new Date();

        if (period === 'week') startDate.setDate(now.getDate() - 7);
        if (period === 'month') startDate.setMonth(now.getMonth() - 1);
        if (period === 'quarter') startDate.setMonth(now.getMonth() - 3);
        if (period === 'year') startDate.setFullYear(now.getFullYear() - 1);

        matchStage.$match.createdAt = { $gte: startDate };
      }

      const results = await PurchaseRequest.aggregate([
        matchStage,
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            totalQuantity: { $sum: '$items.requestedQuantity' },
            requestCount: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'shopitems',
            localField: '_id',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' },
        {
          $project: {
            productId: '$_id',
            productName: '$product.name',
            productSKU: '$product.sku',
            totalQuantity: 1,
            requestCount: 1
          }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: limit }
      ]);

      return {
        success: true,
        data: results
      };
    } catch (error) {
      errorLogger.error({ error: error.message }, 'Error retrieving consumption analytics');
      return {
        success: false,
        message: 'Failed to retrieve consumption data',
        error: error.message
      };
    }
  }
}

module.exports = ShopService;
