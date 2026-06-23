const ShopItem = require('../models/shopItem');
const InventoryTransaction = require('../models/inventoryTransaction');
const Order = require('../models/order');
const Balagruha = require('../models/balagruha');
const mongoose = require('mongoose');
const csv = require('csv-parser');
const { Readable } = require('stream');
const { errorLogger } = require('../config/pino-config');

/**
 * Inventory Controller - Sprint5-Story-06
 * Handles inventory management operations with audit trail
 */

/**
 * @route   PATCH /api/v2/shop/admin/inventory/:productId/adjust
 * @desc    Manually adjust product stock with audit trail
 * @access  Admin (Shop Management: Manage)
 */
exports.adjustStock = async (req, res) => {
  try {
    const { productId } = req.params;
    const { adjustment, newStock, reason, notes } = req.body;
    const userId = req.user._id;

    // Map user-friendly reason to transactionType enum
    const transactionTypeMap = {
      'Purchase / Restock': 'purchase',
      'Inventory Adjustment': 'adjustment',
      'Student Return': 'return',
      'Stock Correction': 'correction',
      'Damaged Items': 'adjustment',
      'Other': 'adjustment'
    };

    const transactionType = transactionTypeMap[reason] || 'adjustment';

    const hasNewStock = newStock !== undefined && newStock !== null && newStock !== '';

    const parseNumber = (value) => {
      if (value === undefined || value === null || value === '') return null;
      const parsed = parseInt(value, 10);
      return Number.isNaN(parsed) ? null : parsed;
    };

    const applyUpdate = async (session) => {
      let previousProduct;
      let previousStock;
      let adjustmentNum;
      let resolvedNewStock;

      if (hasNewStock) {
        const parsedNewStock = parseNumber(newStock);
        if (parsedNewStock === null) {
          return { error: { status: 400, body: { message: 'New stock must be a number' } } };
        }

        resolvedNewStock = parsedNewStock;
        if (resolvedNewStock < 0) {
          return {
            error: {
              status: 400,
              body: { message: 'Stock cannot be negative', newStock: resolvedNewStock }
            }
          };
        }

        previousProduct = await ShopItem.findOneAndUpdate(
          { _id: productId, stock: { $ne: resolvedNewStock } },
          { $set: { stock: resolvedNewStock } },
          { new: false, session }
        )
          .select('sku name stock')
          .lean();

        if (!previousProduct) {
          const existing = await ShopItem.findById(productId)
            .select('sku name stock')
            .lean();

          if (!existing) {
            return { error: { status: 404, body: { message: 'Product not found' } } };
          }

          return {
            error: {
              status: 400,
              body: {
                message: 'No stock change detected',
                previousStock: existing.stock,
                newStock: existing.stock
              }
            }
          };
        }

        previousStock = previousProduct.stock;
        adjustmentNum = resolvedNewStock - previousStock;
      } else {
        const parsedAdjustment = parseNumber(adjustment);
        if (parsedAdjustment === null) {
          return { error: { status: 400, body: { message: 'Adjustment must be a number' } } };
        }

        adjustmentNum = parsedAdjustment;
        if (adjustmentNum === 0) {
          return {
            error: {
              status: 400,
              body: { message: 'No stock change detected', adjustment: 0 }
            }
          };
        }

        const filter = { _id: productId };
        if (adjustmentNum < 0) {
          filter.stock = { $gte: Math.abs(adjustmentNum) };
        }

        previousProduct = await ShopItem.findOneAndUpdate(
          filter,
          { $inc: { stock: adjustmentNum } },
          { new: false, session }
        )
          .select('sku name stock')
          .lean();

        if (!previousProduct) {
          const existing = await ShopItem.findById(productId)
            .select('sku name stock')
            .lean();

          if (!existing) {
            return { error: { status: 404, body: { message: 'Product not found' } } };
          }

          const wouldBe = (existing.stock ?? 0) + adjustmentNum;
          if (wouldBe < 0) {
            return {
              error: {
                status: 400,
                body: {
                  message: 'Stock cannot be negative',
                  previousStock: existing.stock,
                  adjustment: adjustmentNum,
                  wouldBe
                }
              }
            };
          }

          return {
            error: {
              status: 500,
              body: { message: 'Failed to adjust stock' }
            }
          };
        }

        previousStock = previousProduct.stock;
        resolvedNewStock = previousStock + adjustmentNum;
      }

      if (adjustmentNum === 0) {
        return {
          error: {
            status: 400,
            body: { message: 'No stock change detected', previousStock, newStock: resolvedNewStock }
          }
        };
      }

      if (resolvedNewStock < 0) {
        return {
          error: {
            status: 400,
            body: {
              message: 'Stock cannot be negative',
              previousStock,
              adjustment: adjustmentNum,
              wouldBe: resolvedNewStock
            }
          }
        };
      }

      return {
        previousProduct,
        previousStock,
        resolvedNewStock,
        adjustmentNum
      };
    };

    const isTransactionNotSupportedError = (err) => {
      const message = typeof err?.message === 'string' ? err.message : '';
      return (
        err?.code === 20 ||
        err?.codeName === 'IllegalOperation' ||
        message.includes('Transaction numbers are only allowed')
      );
    };

    let updateResult;
    let transaction;

    try {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          updateResult = await applyUpdate(session);
          if (updateResult?.error) return;

          transaction = new InventoryTransaction({
            productId,
            transactionType,
            quantity: updateResult.adjustmentNum,
            previousStock: updateResult.previousStock,
            newStock: updateResult.resolvedNewStock,
            reference: {
              type: 'manual',
              id: null
            },
            reason,
            notes: notes || '',
            performedBy: userId
          });

          await transaction.save({ session });
        });
      } finally {
        session.endSession();
      }
    } catch (err) {
      if (!isTransactionNotSupportedError(err)) {
        throw err;
      }

      updateResult = await applyUpdate(undefined);
      if (updateResult?.error) {
        return res.status(updateResult.error.status).json(updateResult.error.body);
      }

      try {
        transaction = await InventoryTransaction.create({
          productId,
          transactionType,
          quantity: updateResult.adjustmentNum,
          previousStock: updateResult.previousStock,
          newStock: updateResult.resolvedNewStock,
          reference: {
            type: 'manual',
            id: null
          },
          reason,
          notes: notes || '',
          performedBy: userId
        });
      } catch (txError) {
        try {
          await ShopItem.updateOne(
            { _id: productId, stock: updateResult.resolvedNewStock },
            { $set: { stock: updateResult.previousStock } }
          );
        } catch (revertError) {
          errorLogger.error({ err: revertError }, 'Failed to revert stock after audit log failure:');
        }

        throw txError;
      }
    }

    if (updateResult?.error) {
      return res.status(updateResult.error.status).json(updateResult.error.body);
    }

    // Populate user information for response
    await transaction.populate('performedBy', 'name email');

    res.status(200).json({
      message: 'Stock adjusted successfully',
      product: {
        _id: productId,
        sku: updateResult.previousProduct?.sku,
        name: updateResult.previousProduct?.name,
        previousStock: updateResult.previousStock,
        newStock: updateResult.resolvedNewStock,
        adjustment: updateResult.adjustmentNum
      },
      transaction
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error adjusting stock:');
    res.status(500).json({
      message: 'Failed to adjust stock',
      error: error.message
    });
  }
};

/**
 * @route   POST /api/v2/shop/admin/inventory/bulk-update
 * @desc    Bulk update stock levels via CSV
 * @access  Admin (Shop Management: Manage)
 */
exports.bulkUpdateStock = async (req, res) => {
  try {
    const { csvData, reason, notes } = req.body;
    const userId = req.user._id;

    if (!csvData || !Array.isArray(csvData)) {
      return res.status(400).json({
        message: 'CSV data is required and must be an array',
        example: [
          { sku: 'PROD-001', stock: 50 },
          { sku: 'PROD-002', stock: 100 }
        ]
      });
    }

    const results = {
      successful: [],
      failed: [],
      totalProcessed: csvData.length
    };

    // Process each row
    for (const row of csvData) {
      try {
        const { sku, stock } = row;

        if (!sku || stock === undefined || stock === null) {
          results.failed.push({
            sku: sku || 'UNKNOWN',
            error: 'Missing SKU or stock value',
            row
          });
          continue;
        }

        // Parse stock as integer
        const newStock = parseInt(stock, 10);
        if (isNaN(newStock) || newStock < 0) {
          results.failed.push({
            sku,
            error: 'Invalid stock value (must be non-negative integer)',
            value: stock
          });
          continue;
        }

        // Find product by SKU
        const product = await ShopItem.findOne({ sku: sku.toUpperCase().trim() });
        if (!product) {
          results.failed.push({
            sku,
            error: 'Product not found'
          });
          continue;
        }

        const previousStock = product.stock;
        const adjustment = newStock - previousStock;

        // Update product stock
        product.stock = newStock;
        await product.save();

        // Create audit trail entry
        await InventoryTransaction.create({
          productId: product._id,
          transactionType: reason || 'adjustment',
          quantity: adjustment,
          previousStock,
          newStock,
          reference: {
            type: 'bulk_import',
            id: null
          },
          reason: reason || 'Bulk CSV import',
          notes: notes || `Bulk import: ${sku}`,
          performedBy: userId
        });

        results.successful.push({
          sku,
          name: product.name,
          previousStock,
          newStock,
          adjustment
        });
      } catch (rowError) {
        results.failed.push({
          sku: row.sku || 'UNKNOWN',
          error: rowError.message,
          row
        });
      }
    }

    res.status(200).json({
      message: 'Bulk update completed',
      summary: {
        total: results.totalProcessed,
        successful: results.successful.length,
        failed: results.failed.length
      },
      results
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error in bulk update:');
    res.status(500).json({
      message: 'Failed to process bulk update',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/v2/shop/admin/inventory/:productId/audit
 * @desc    Get audit trail for a product
 * @access  Admin (Shop Management: Manage)
 */
exports.getAuditTrail = async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 50, page = 1, reason } = req.query;

    const parsePositiveInt = (value, fallback) => {
      const parsed = parseInt(value, 10);
      return Number.isNaN(parsed) ? fallback : parsed;
    };

    const parsedLimit = Math.min(Math.max(parsePositiveInt(limit, 50), 1), 200);
    const parsedPage = Math.max(parsePositiveInt(page, 1), 1);

    // Validate product exists
    const product = await ShopItem.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const skip = (parsedPage - 1) * parsedLimit;

    const allowedReasons = [
      'Purchase / Restock',
      'Inventory Adjustment',
      'Student Return',
      'Stock Correction',
      'Damaged Items',
      'Other'
    ];

    const normalizedReason = Array.isArray(reason) ? reason[0] : reason;

    // Build filter for transactions
    const filter = { productId };
    if (normalizedReason && normalizedReason !== 'all') {
      if (!allowedReasons.includes(normalizedReason)) {
        return res.status(400).json({
          message: 'Invalid reason filter',
          allowed: allowedReasons
        });
      }

      filter.reason = normalizedReason;
    }

    // Get transactions for this product
    const [transactions, total] = await Promise.all([
      InventoryTransaction.find(filter)
        .populate('performedBy', 'name email role')
        .sort({ createdAt: -1 })
        .limit(parsedLimit)
        .skip(skip),
      InventoryTransaction.countDocuments(filter)
    ]);

    res.status(200).json({
      product: {
        _id: product._id,
        sku: product.sku,
        name: product.name,
        currentStock: product.stock
      },
      transactions,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching audit trail:');
    res.status(500).json({
      message: 'Failed to fetch audit trail',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/v2/shop/admin/inventory
 * @desc    Get inventory dashboard with all products and stock levels
 * @access  Admin (Shop Management: Manage)
 */
exports.getInventoryDashboard = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      category,
      stockStatus, // 'high', 'low', 'out'
      sortBy = 'stock',
      sortOrder = 'asc'
    } = req.query;

    const parsePositiveInt = (value, fallback) => {
      const parsed = parseInt(value, 10);
      return Number.isNaN(parsed) ? fallback : parsed;
    };

    const parsedLimit = Math.min(Math.max(parsePositiveInt(limit, 50), 1), 200);
    const parsedPage = Math.max(parsePositiveInt(page, 1), 1);

    // Build filter
    const filter = {};

    const rawSearch = Array.isArray(search) ? search[0] : search;
    const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const safeSearch = typeof rawSearch === 'string' ? rawSearch.trim().slice(0, 100) : '';

    if (safeSearch) {
      const escapedSearch = escapeRegex(safeSearch);
      filter.$or = [
        { sku: new RegExp(escapedSearch, 'i') },
        { name: new RegExp(escapedSearch, 'i') }
      ];
    }

    const rawCategory = Array.isArray(category) ? category[0] : category;
    if (typeof rawCategory === 'string' && rawCategory && rawCategory !== 'all') {
      filter.category = rawCategory;
    }

    // Stock status filter
    if (stockStatus === 'out') {
      filter.stock = 0;
    } else if (stockStatus === 'low') {
      filter.$expr = {
        $and: [
          { $gt: ['$stock', 0] },
          { $lte: ['$stock', '$lowStockThreshold'] }
        ]
      };
    } else if (stockStatus === 'high') {
      filter.$expr = { $gt: ['$stock', '$lowStockThreshold'] };
    }

    // Build sort
    const sort = {};
    const resolvedSortBy = Array.isArray(sortBy) ? sortBy[0] : sortBy;
    const resolvedSortOrder = Array.isArray(sortOrder) ? sortOrder[0] : sortOrder;
    sort[resolvedSortBy] = resolvedSortOrder === 'desc' ? -1 : 1;

    const skip = (parsedPage - 1) * parsedLimit;

    // Get products with pagination
    const [products, total] = await Promise.all([
      ShopItem.find(filter)
        .sort(sort)
        .limit(parsedLimit)
        .skip(skip)
        .select('sku name category stock lowStockThreshold price imageUrl images isActive updatedAt'),
      ShopItem.countDocuments(filter)
    ]);

    // Calculate stock statistics
    const stats = await ShopItem.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          outOfStock: {
            $sum: { $cond: [{ $eq: ['$stock', 0] }, 1, 0] }
          },
          lowStock: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ['$stock', 0] },
                    { $lte: ['$stock', '$lowStockThreshold'] }
                  ]
                },
                1,
                0
              ]
            }
          },
          totalValue: {
            $sum: { $multiply: ['$stock', '$price'] }
          }
        }
      }
    ]);

    res.status(200).json({
      products,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(total / parsedLimit)
      },
      statistics: stats[0] || {
        totalProducts: 0,
        outOfStock: 0,
        lowStock: 0,
        totalValue: 0
      }
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching inventory dashboard:');
    res.status(500).json({
      message: 'Failed to fetch inventory dashboard',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/v2/shop/admin/inventory/master-report
 * @desc    Master inventory report (In Store + Deployed)
 * @access  Admin (Shop Management: Manage)
 */
exports.getMasterInventoryReport = async (req, res) => {
  try {
    const { search, category } = req.query;

    // Build ShopItem filter
    const itemFilter = { isActive: true };

    const rawSearch = Array.isArray(search) ? search[0] : search;
    const rawCategory = Array.isArray(category) ? category[0] : category;

    const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const safeSearch = typeof rawSearch === 'string' ? rawSearch.trim().slice(0, 100) : '';

    if (safeSearch) {
      const escapedSearch = escapeRegex(safeSearch);
      itemFilter.$or = [
        { sku: new RegExp(escapedSearch, 'i') },
        { name: new RegExp(escapedSearch, 'i') }
      ];
    }

    if (typeof rawCategory === 'string' && rawCategory && rawCategory !== 'all') {
      itemFilter.category = rawCategory;
    }

    const products = await ShopItem.find(itemFilter)
      .sort({ sku: 1 })
      .select('sku name category stock')
      .lean();

    if (products.length === 0) {
      // FIX-018: Include empty balagruha breakdown even when no products match
      const allBalagruhas = await Balagruha.find({}).select('name').lean();
      return res.status(200).json({
        count: 0,
        products: [],
        balagruhaBreakdown: allBalagruhas.map(bg => ({
          balagruhaId: bg._id,
          balagruhaName: bg.name,
          totalInStore: 0,
          totalDeployed: 0,
          totalQuantity: 0,
          items: []
        }))
      });
    }

    const productIds = products.map(product => product._id);

    // Calculate deployed quantities from completed + delivered orders (scoped to returned products)
    const deployedAggregation = await Order.aggregate([
      {
        $match: {
          status: 'completed',
          deliveryStatus: 'delivered',
          'items.shopItemId': { $in: productIds }
        }
      },
      { $unwind: '$items' },
      { $match: { 'items.shopItemId': { $in: productIds } } },
      {
        $group: {
          _id: '$items.shopItemId',
          deployed: { $sum: '$items.quantity' }
        }
      }
    ]);

    const deployedByItemId = new Map(
      deployedAggregation.map(row => [row._id?.toString(), row.deployed])
    );

    // FIX-018: Per-Balagruha breakdown aggregation
    // Join Orders -> Users -> balagruhaIds to segment deployed quantities by Balagruha
    const balagruhaAggregation = await Order.aggregate([
      {
        $match: {
          status: 'completed',
          deliveryStatus: 'delivered',
          'items.shopItemId': { $in: productIds }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      { $unwind: '$items' },
      { $match: { 'items.shopItemId': { $in: productIds } } },
      { $unwind: { path: '$user.balagruhaIds', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: {
            shopItemId: '$items.shopItemId',
            balagruhaId: '$user.balagruhaIds'
          },
          deployed: { $sum: '$items.quantity' }
        }
      },
      {
        $lookup: {
          from: 'balagruhas',
          localField: '_id.balagruhaId',
          foreignField: '_id',
          as: 'balagruha'
        }
      },
      { $unwind: { path: '$balagruha', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$_id.balagruhaId',
          balagruhaName: { $first: { $ifNull: ['$balagruha.name', 'Unknown'] } },
          items: {
            $push: {
              shopItemId: '$_id.shopItemId',
              deployed: '$deployed'
            }
          }
        }
      }
    ]);

    // Build lookup: balagruhaId -> Map(shopItemId -> deployed)
    const balagruhaDeployedMap = new Map();
    for (const bg of balagruhaAggregation) {
      const itemMap = new Map();
      for (const item of bg.items) {
        itemMap.set(item.shopItemId.toString(), item.deployed);
      }
      balagruhaDeployedMap.set(bg._id.toString(), {
        name: bg.balagruhaName,
        itemMap
      });
    }

    // Also fetch all Balagruhas so we include those with zero deployed
    const allBalagruhas = await Balagruha.find({}).select('name').lean();

    // Build per-balagruha breakdown
    const balagruhaBreakdown = allBalagruhas.map(bg => {
      const bgData = balagruhaDeployedMap.get(bg._id.toString());
      const items = products.map(product => {
        const deployed = bgData
          ? (bgData.itemMap.get(product._id.toString()) || 0)
          : 0;
        return {
          shopItemId: product._id,
          sku: product.sku,
          name: product.name,
          inStore: product.stock,
          deployed,
          total: product.stock + deployed
        };
      });

      const totalInStore = items.reduce((sum, i) => sum + i.inStore, 0);
      const totalDeployed = items.reduce((sum, i) => sum + i.deployed, 0);

      return {
        balagruhaId: bg._id,
        balagruhaName: bg.name,
        totalInStore,
        totalDeployed,
        totalQuantity: totalInStore + totalDeployed,
        items
      };
    });

    const report = products.map(product => ({
      _id: product._id,
      sku: product.sku,
      name: product.name,
      category: product.category,
      stock: product.stock,
      deployed: deployedByItemId.get(product._id.toString()) || 0
    }));

    res.status(200).json({
      count: report.length,
      products: report,
      balagruhaBreakdown
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error generating master inventory report:');
    res.status(500).json({
      message: 'Failed to generate master inventory report',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/v2/shop/admin/inventory/export
 * @desc    Export current inventory to CSV format
 * @access  Admin (Shop Management: Manage)
 */
exports.exportInventory = async (req, res) => {
  try {
    const products = await ShopItem.find({ isActive: true })
      .sort({ sku: 1 })
      .select('sku name category stock lowStockThreshold price');

    // Generate CSV data
    const csvHeaders = 'SKU,Name,Category,Stock,Low Stock Threshold,Price\n';
    const csvRows = products.map(p =>
      `${p.sku},"${p.name}",${p.category},${p.stock},${p.lowStockThreshold},${p.price}`
    ).join('\n');

    const csvContent = csvHeaders + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="inventory-export.csv"');
    res.status(200).send(csvContent);
  } catch (error) {
    errorLogger.error({ err: error }, 'Error exporting inventory:');
    res.status(500).json({
      message: 'Failed to export inventory',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/v2/shop/admin/inventory/low-stock
 * @desc    Get products with stock <= lowStockThreshold (Story-07)
 * @access  Admin (Shop Management: Manage)
 */
exports.getLowStockProducts = async (req, res) => {
  try {
    const products = await ShopItem.find({
      isActive: true,
      stock: { $gt: 0 },
      $expr: { $lte: ['$stock', '$lowStockThreshold'] }
    })
      .sort({ stock: 1 })
      .select('sku name category stock lowStockThreshold price imageUrl images');

    res.status(200).json({
      count: products.length,
      products
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching low stock products:');
    res.status(500).json({
      message: 'Failed to fetch low stock products',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/v2/shop/admin/inventory/out-of-stock
 * @desc    Get products with stock = 0 (Story-07)
 * @access  Admin (Shop Management: Manage)
 */
exports.getOutOfStockProducts = async (req, res) => {
  try {
    const products = await ShopItem.find({
      isActive: true,
      stock: 0
    })
      .sort({ name: 1 })
      .select('sku name category stock lowStockThreshold price imageUrl updatedAt');

    res.status(200).json({
      count: products.length,
      products
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching out of stock products:');
    res.status(500).json({
      message: 'Failed to fetch out of stock products',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/v2/shop/admin/stock-alerts
 * @desc    Get stock alert counts for admin floating panel (Sprint5-Story-15)
 * @access  Admin (Shop Management: Manage)
 */
exports.getStockAlerts = async (req, res) => {
  try {
    // Count low stock products (stock > 0 AND stock <= lowStockThreshold)
    const lowStockCount = await ShopItem.countDocuments({
      isActive: true,
      stock: { $gt: 0 },
      $expr: { $lte: ['$stock', '$lowStockThreshold'] }
    });

    // Count out of stock products
    const outOfStockCount = await ShopItem.countDocuments({
      isActive: true,
      stock: 0
    });

    res.status(200).json({
      lowStock: lowStockCount,
      outOfStock: outOfStockCount,
      total: lowStockCount + outOfStockCount
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching stock alerts:');
    res.status(500).json({
      message: 'Failed to fetch stock alerts',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/v2/shop/admin/quick-stats
 * @desc    Get quick statistics for admin floating panel (Sprint5-Story-15)
 * @access  Admin (Shop Management: Manage)
 */
exports.getQuickStats = async (req, res) => {
  try {
    // Get total active products
    const totalProducts = await ShopItem.countDocuments({ isActive: true });

    // Get total orders (completed and pending)
    const totalOrders = await Order.countDocuments({
      status: { $in: ['completed', 'pending', 'processing'] }
    });

    res.status(200).json({
      totalProducts,
      totalOrders
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching quick stats:');
    res.status(500).json({
      message: 'Failed to fetch quick stats',
      error: error.message
    });
  }
};

/**
 * Story 3.6: Get all stock levels with status for PM dashboard
 * @route   GET /api/v2/shop/admin/inventory/stock-levels
 * @desc    Get all products with stock status (in_stock/low_stock/out_of_stock)
 * @access  Purchase Manager, Admin
 */
exports.getStockLevels = async (req, res) => {
  try {
    const { category, status, search, limit = 100 } = req.query;

    // Build query
    let query = { isActive: true };

    // Category filter
    if (category && category !== 'all') {
      query.purchaseCategory = category;
    }

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    // Fetch products
    const products = await ShopItem.find(query)
      .select('name sku stock lowStockThreshold category purchaseCategory price')
      .sort({ stock: 1 }) // Lowest stock first
      .limit(parseInt(limit));

    // Calculate stock status for each product
    const productsWithStatus = products.map(product => {
      const stockNum = product.stock || 0;
      const threshold = product.lowStockThreshold || 10;
      
      let stockStatus;
      if (stockNum === 0) {
        stockStatus = 'out_of_stock';
      } else if (stockNum <= threshold) {
        stockStatus = 'low_stock';
      } else {
        stockStatus = 'in_stock';
      }

      return {
        _id: product._id,
        name: product.name,
        sku: product.sku,
        stock: stockNum,
        lowStockThreshold: threshold,
        status: stockStatus,
        category: product.category,
        purchaseCategory: product.purchaseCategory,
        price: product.price
      };
    });

    // Filter by status if provided
    let filteredProducts = productsWithStatus;
    if (status && status !== 'all') {
      filteredProducts = productsWithStatus.filter(p => p.status === status);
    }

    // Get summary counts
    const summary = {
      total: productsWithStatus.length,
      inStock: productsWithStatus.filter(p => p.status === 'in_stock').length,
      lowStock: productsWithStatus.filter(p => p.status === 'low_stock').length,
      outOfStock: productsWithStatus.filter(p => p.status === 'out_of_stock').length
    };

    res.status(200).json({
      success: true,
      data: filteredProducts,
      summary
    });

  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching stock levels:');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock levels',
      error: error.message
    });
  }
};

/**
 * Story 3.6: Get most consumed products analytics
 * @route   GET /api/v2/shop/admin/analytics/most-consumed
 * @desc    Get products ranked by consumption/request frequency
 * @access  Purchase Manager, Admin
 */
exports.getMostConsumed = async (req, res) => {
  try {
    const { period = 'all', limit = 50 } = req.query;
    const PurchaseRequest = require('../models/purchaseRequest');

    // Calculate date filter based on period
    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFilter = { createdAt: { $gte: weekAgo } };
        break;
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        dateFilter = { createdAt: { $gte: monthAgo } };
        break;
      case 'year':
        const yearAgo = new Date(now);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        dateFilter = { createdAt: { $gte: yearAgo } };
        break;
      default:
        // 'all' - no date filter
        break;
    }

    // Aggregate purchase request items
    const consumptionData = await PurchaseRequest.aggregate([
      // Match by date if applicable
      { $match: { ...dateFilter, status: { $ne: 'cancelled' } } },
      // Unwind items array
      { $unwind: '$items' },
      // Group by product
      {
        $group: {
          _id: '$items.productId',
          productName: { $first: '$items.productName' },
          productSKU: { $first: '$items.productSKU' },
          totalQuantityRequested: { $sum: '$items.requestedQuantity' },
          requestCount: { $sum: 1 },
          lastRequestedAt: { $max: '$createdAt' }
        }
      },
      // Sort by total quantity descending
      { $sort: { totalQuantityRequested: -1 } },
      // Limit results
      { $limit: parseInt(limit) }
    ]);

    res.status(200).json({
      success: true,
      data: consumptionData,
      period,
      totalProducts: consumptionData.length
    });

  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching most consumed products:');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch consumption data',
      error: error.message
    });
  }
};
