const ShopItem = require('../models/shopItem');
const Vendor = require('../models/vendor');
const { errorLogger } = require('../config/pino-config');

/**
 * Escape regex special characters to prevent ReDoS attacks
 * @param {string} str - Input string to sanitize
 * @returns {string} - Sanitized string safe for regex
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Admin Product Controller - Sprint5-Story-05
 * CRUD operations for shop products (admin only)
 */

/**
 * Get all products (admin view - includes inactive)
 * GET /api/v2/shop/admin/products
 * @access Admin
 */
async function getAllProducts(req, res) {
  try {
    const {
      category,
      isActive,
      search,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};

    // FIX-043: Support comma-separated categories for multi-select
    if (category) {
      if (category.includes(',')) {
        query.category = { $in: category.split(',').map(c => c.trim()) };
      } else {
        query.category = category;
      }
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (search) {
      const sanitizedSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: sanitizedSearch, $options: 'i' } },
        { sku: { $regex: sanitizedSearch, $options: 'i' } },
        { description: { $regex: sanitizedSearch, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Execute query
    const [products, total] = await Promise.all([
      ShopItem.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ShopItem.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Get all products error:');
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve products',
      error: error.message
    });
  }
}

/**
 * Get single product by ID
 * GET /api/v2/shop/admin/products/:productId
 * @access Admin
 */
async function getProduct(req, res) {
  try {
    const { productId } = req.params;

    const product = await ShopItem.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Get product error:');
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve product',
      error: error.message
    });
  }
}

/**
 * Create new product
 * POST /api/v2/shop/admin/products
 * @access Admin
 */
async function createProduct(req, res) {
  try {
    const {
      sku,
      name,
      description,
      category,
      price,
      discountPrice,
      stock,
      lowStockThreshold,
      imageUrl,
      images,
      isActive,
      availableFor,
      tags,
      metadata,
      maxPrice,
      sellingPrice,
      approvedVendors,
      purchaseCategory
    } = req.body;

    // Sprint 5 Story 1.2: Strict Introduction Policy
    if (!maxPrice) {
      return res.status(400).json({
        success: false,
        message: 'Max Price (Rupees) is required for new items'
      });
    }

    if (!approvedVendors || !Array.isArray(approvedVendors) || approvedVendors.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one Approved Vendor is required'
      });
    }

    // FIX-032: Reject more than 3 approved vendors
    if (approvedVendors.length > 3) {
      return res.status(400).json({
        success: false,
        message: 'Maximum of 3 Approved Vendors allowed per product'
      });
    }

    // Verify all vendor IDs exist and check for duplicates
    const vendorIds = approvedVendors.map(v => v.vendorId);

    // Check for duplicate vendor IDs in the request
    const uniqueVendorIds = new Set(vendorIds.map(id => id.toString()));
    if (uniqueVendorIds.size !== vendorIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate Vendor IDs found in approved vendors list'
      });
    }

    const validVendorsCount = await Vendor.countDocuments({ _id: { $in: vendorIds } });
    if (validVendorsCount !== vendorIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more Vendor IDs are invalid'
      });
    }

    // Auto-generate SKU if not provided, otherwise normalize it
    const normalizedSku = (sku || `NEW-${Date.now()}`).toUpperCase();

    const existingProduct = await ShopItem.findOne({ sku: normalizedSku });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'SKU already exists',
        field: 'sku'
      });
    }

    // FIX-017: Fuzzy duplicate product name detection (FR18)
    if (name && !req.body.force) {
      const trimmedName = name.trim();
      if (trimmedName.length > 0) {
        const escapedName = escapeRegex(trimmedName);
        const similarProducts = await ShopItem.find({
          name: { $regex: new RegExp(`^${escapedName}$`, 'i') }
        }).select('name sku _id').limit(5).lean();

        if (similarProducts.length > 0) {
          return res.status(409).json({
            success: false,
            message: 'Similar product name(s) already exist. Use force=true to override.',
            similarProducts: similarProducts.map(p => ({
              _id: p._id,
              name: p.name,
              sku: p.sku
            })),
            field: 'name'
          });
        }
      }
    }

    // Create product
    const product = new ShopItem({
      sku: normalizedSku,
      name,
      description,
      category,
      purchaseCategory,
      price: price ? Number(price) : undefined,
      discountPrice: discountPrice ? Number(discountPrice) : null,
      stock: stock ? Number(stock) : 0,
      lowStockThreshold: lowStockThreshold ? Number(lowStockThreshold) : 10,
      imageUrl: imageUrl || null,
      images: images || [],
      isActive: isActive !== undefined ? isActive : true,
      availableFor: availableFor || ['student'],
      tags: tags || [],
      metadata: metadata || {},
      maxPrice: Number(maxPrice),
      sellingPrice: Number(sellingPrice),
      approvedVendors
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Create product error:');

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message
        }))
      });
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'SKU already exists',
        field: 'sku'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: error.message
    });
  }
}

/**
 * Update product
 * PUT /api/v2/shop/admin/products/:productId
 * @access Admin
 */
async function updateProduct(req, res) {
  try {
    const { productId } = req.params;
    const updateData = { ...req.body };

    // Remove SKU from update (cannot be changed)
    delete updateData.sku;

    // Remove _id and timestamps
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    // Sprint 5 Story 1.2: Validation for updates
    if (updateData.maxPrice !== undefined && updateData.maxPrice < 0) {
      return res.status(400).json({
        success: false,
        message: 'Max Price cannot be negative'
      });
    }

    if (updateData.approvedVendors !== undefined) {
      if (!Array.isArray(updateData.approvedVendors) || updateData.approvedVendors.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one Approved Vendor is required if updating vendors'
        });
      }

      // FIX-032: Reject more than 3 approved vendors
      if (updateData.approvedVendors.length > 3) {
        return res.status(400).json({
          success: false,
          message: 'Maximum of 3 Approved Vendors allowed per product'
        });
      }

      // Verify all vendor IDs exist and check for duplicates
      const vendorIds = updateData.approvedVendors.map(v => v.vendorId);

      // Check for duplicate vendor IDs in the request
      const uniqueVendorIds = new Set(vendorIds.map(id => id.toString()));
      if (uniqueVendorIds.size !== vendorIds.length) {
        return res.status(400).json({
          success: false,
          message: 'Duplicate Vendor IDs found in approved vendors list'
        });
      }

      const validVendorsCount = await Vendor.countDocuments({ _id: { $in: vendorIds } });
      if (validVendorsCount !== vendorIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more Vendor IDs are invalid'
        });
      }
    }

    // Cast numeric fields
    if (updateData.maxPrice !== undefined) updateData.maxPrice = Number(updateData.maxPrice);
    if (updateData.sellingPrice !== undefined) updateData.sellingPrice = Number(updateData.sellingPrice);
    if (updateData.price !== undefined) updateData.price = Number(updateData.price);
    if (updateData.stock !== undefined) updateData.stock = Number(updateData.stock);
    if (updateData.lowStockThreshold !== undefined) updateData.lowStockThreshold = Number(updateData.lowStockThreshold);

    // Find and update product
    const product = await ShopItem.findByIdAndUpdate(
      productId,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Update product error:');

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message
        }))
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message
    });
  }
}

/**
 * Soft delete product (set isActive: false)
 * DELETE /api/v2/shop/admin/products/:productId
 * @access Admin
 */
async function deleteProduct(req, res) {
  try {
    const { productId } = req.params;

    const product = await ShopItem.findByIdAndUpdate(
      productId,
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully (soft delete)',
      product
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Delete product error:');
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message
    });
  }
}

/**
 * Restore soft-deleted product (set isActive: true)
 * POST /api/v2/shop/admin/products/:productId/restore
 * @access Admin
 */
async function restoreProduct(req, res) {
  try {
    const { productId } = req.params;

    const product = await ShopItem.findByIdAndUpdate(
      productId,
      { isActive: true },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product restored successfully',
      product
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Restore product error:');
    res.status(500).json({
      success: false,
      message: 'Failed to restore product',
      error: error.message
    });
  }
}

/**
 * Create Pending Product - Sprint5-Story-25
 * POST /api/v2/shop/admin/products/pending
 * @access Admin
 */
async function createPendingProduct(req, res) {
  try {
    // Sprint 5 Story 1.2: Restrict to Admin only
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only Admins can introduce new items.',
        error: 'Forbidden'
      });
    }

    const {
      name,
      category,
      unit,
      sku,
      description,
      maxPrice,
      sellingPrice,
      discountPrice,
      approvedVendors,
      imageUrl,
      images,
      stock,
      lowStockThreshold,
      purchaseCategory
    } = req.body;
    const userId = req.user._id;

    // Validation
    if (!name || !category || !unit) {
      return res.status(400).json({
        success: false,
        message: 'Name, category, and unit are required',
        error: 'Validation Error'
      });
    }

    // Align pending product creation with Story 1.2 governance rules
    if (maxPrice === undefined || maxPrice === null) {
      return res.status(400).json({
        success: false,
        message: 'Max Price (Rupees) is required for new items',
        error: 'Validation Error'
      });
    }

    if (sellingPrice === undefined || sellingPrice === null) {
      return res.status(400).json({
        success: false,
        message: 'Selling Price (Coins) is required for new items',
        error: 'Validation Error'
      });
    }

    if (!approvedVendors || !Array.isArray(approvedVendors) || approvedVendors.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one Approved Vendor is required',
        error: 'Validation Error'
      });
    }

    // FIX-032: Reject more than 3 approved vendors
    if (approvedVendors.length > 3) {
      return res.status(400).json({
        success: false,
        message: 'Maximum of 3 Approved Vendors allowed per product',
        error: 'Validation Error'
      });
    }

    // Verify all vendor IDs exist and check for duplicates
    const vendorIds = approvedVendors.map(v => v.vendorId);
    const uniqueVendorIds = new Set(vendorIds.map(id => id.toString()));
    if (uniqueVendorIds.size !== vendorIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate Vendor IDs found in approved vendors list',
        error: 'Validation Error'
      });
    }

    const validVendorsCount = await Vendor.countDocuments({ _id: { $in: vendorIds } });
    if (validVendorsCount !== vendorIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more Vendor IDs are invalid',
        error: 'Validation Error'
      });
    }

    // Generate SKU if not provided
    const generatedSKU = (sku || `NEW-${Date.now()}`).toUpperCase();

    // Check SKU uniqueness
    const existingProduct = await ShopItem.findOne({ sku: generatedSKU });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'SKU already exists. Please use a different SKU.',
        error: 'Duplicate SKU'
      });
    }

    // Create pending product
    const newProduct = new ShopItem({
      name,
      sku: generatedSKU,
      category,
      purchaseCategory,
      unit,
      description: description || 'Pending product - details to be added',
      isPendingProduct: true,
      isActive: false,
      stock: stock !== undefined && stock !== null ? Number(stock) : 0,
      lowStockThreshold: lowStockThreshold !== undefined && lowStockThreshold !== null ? Number(lowStockThreshold) : 10,
      price: Number(sellingPrice),
      discountPrice: discountPrice !== undefined && discountPrice !== null && discountPrice !== ''
        ? Number(discountPrice)
        : null,
      maxPrice: Number(maxPrice),
      sellingPrice: Number(sellingPrice),
      approvedVendors,
      imageUrl: imageUrl || null,
      images: Array.isArray(images) ? images : [],
      balagruhaId: null,
      createdBy: userId,
      createdInRequest: null  // Will be set when added to request
    });

    await newProduct.save();

    res.status(201).json({
      success: true,
      message: 'Pending product created successfully',
      product: newProduct
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error creating pending product:');

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create pending product',
      error: error.message
    });
  }
}

/**
 * Get Pending Products - Sprint5-Story-25
 * GET /api/v2/shop/admin/products/pending
 * @access Multi-role (Coach, Medical, Admin, PM)
 */
async function getPendingProducts(req, res) {
  try {
    const products = await ShopItem.find({ isPendingProduct: true })
      .populate('createdBy', 'name email')
      .populate('createdInRequest', 'requestId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching pending products:');
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  getAllProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  restoreProduct,
  createPendingProduct,
  getPendingProducts
};
