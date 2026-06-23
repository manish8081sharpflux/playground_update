const Vendor = require('../models/vendor');
const ShopItem = require('../models/shopItem');
const { errorLogger } = require('../config/pino-config');

/**
 * @desc    Create new vendor
 * @route   POST /api/v2/vendors
 * @access  Admin
 */
exports.createVendor = async (req, res) => {
  try {
    const { name, phone, address, active } = req.body;

    const vendor = await Vendor.create({
      name,
      phone,
      address,
      active
    });

    res.status(201).json({
      success: true,
      vendor
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Get all vendors (Story 3.6: Enhanced with product count)
 * @route   GET /api/v2/vendors
 * @access  Admin, Purchase Manager
 */
exports.getAllVendors = async (req, res) => {
  try {
    const { active, search, page = 1, limit = 20, includeProductCount } = req.query;
    const query = {};

    if (active !== undefined) {
      query.active = active === 'true';
    }

    if (typeof search === 'string' && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      query.$or = [
        { name: regex },
        { phone: regex },
        { address: regex }
      ];
    }

    const pageNum = parseInt(page);
    // Cap limit at 100 to prevent DoS
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    let vendors = await Vendor.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Story 3.6: Add product count per vendor if requested
    if (includeProductCount === 'true') {
      const vendorIds = vendors.map(v => v._id);
      
      // Count products per vendor from ShopItem.approvedVendors
      const productCounts = await ShopItem.aggregate([
        { $match: { isActive: true, approvedVendors: { $in: vendorIds } } },
        { $unwind: '$approvedVendors' },
        { $match: { approvedVendors: { $in: vendorIds } } },
        { $group: { _id: '$approvedVendors', count: { $sum: 1 } } }
      ]);

      // Create a map for quick lookup
      const countMap = {};
      productCounts.forEach(pc => {
        countMap[pc._id.toString()] = pc.count;
      });

      // Add product count to each vendor
      vendors = vendors.map(vendor => ({
        ...vendor,
        productCount: countMap[vendor._id.toString()] || 0
      }));
    }

    const total = await Vendor.countDocuments(query);

    res.status(200).json({
      success: true,
      count: vendors.length,
      total,
      pagination: {
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      },
      vendors
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching vendors:');
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Get single vendor
 * @route   GET /api/v2/vendors/:id
 * @access  Admin
 */
exports.getVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found'
      });
    }

    res.status(200).json({
      success: true,
      vendor
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Update vendor
 * @route   PUT /api/v2/vendors/:id
 * @access  Admin
 */
exports.updateVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found'
      });
    }

    res.status(200).json({
      success: true,
      vendor
    });
  } catch (error) {
     if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Soft-delete (deactivate) vendor
 * @route   DELETE /api/v2/vendors/:id
 * @access  Admin
 */
exports.deactivateVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found'
      });
    }

    if (!vendor.active) {
      return res.status(400).json({
        success: false,
        error: 'Vendor is already deactivated'
      });
    }

    vendor.active = false;
    await vendor.save();

    res.status(200).json({
      success: true,
      message: 'Vendor deactivated successfully',
      vendor
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error deactivating vendor:');
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};
