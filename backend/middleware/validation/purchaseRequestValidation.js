const mongoose = require('mongoose');

/**
 * Purchase Request Validation Middleware - Sprint5-Story-17
 */

/**
 * Validate create purchase request payload - MULTI-PRODUCT (Sprint5-Story-17)
 */
exports.validateCreateRequest = (req, res, next) => {
  const { items, reason, justification } = req.body;

  // Note: items comes as JSON string from FormData, will be parsed in controller
  // Just validate that it exists here
  if (!items) {
    return res.status(400).json({
      success: false,
      message: 'Items are required'
    });
  }

  // Validate reason (optional)
  if (reason && reason.length > 200) {
    return res.status(400).json({
      success: false,
      message: 'Reason cannot exceed 200 characters'
    });
  }

  // Validate justification (optional)
  if (justification && justification.length > 500) {
    return res.status(400).json({
      success: false,
      message: 'Justification cannot exceed 500 characters'
    });
  }

  next();
};

/**
 * Validate request ID parameter
 */
exports.validateRequestId = (req, res, next) => {
  const { id } = req.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Valid request ID is required'
    });
  }

  next();
};

/**
 * Validate approve request payload - Sprint5-Story-18
 */
exports.validateApproval = (req, res, next) => {
  const { reviewNotes } = req.body;

  // Review notes are optional but if provided, validate length
  if (reviewNotes && reviewNotes.length > 500) {
    return res.status(400).json({
      success: false,
      message: 'Review notes cannot exceed 500 characters'
    });
  }

  next();
};

/**
 * Validate reject request payload - Sprint5-Story-18
 */
exports.validateRejection = (req, res, next) => {
  const { reviewNotes } = req.body;

  // Rejection reason is required
  if (!reviewNotes || typeof reviewNotes !== 'string' || reviewNotes.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Rejection reason is required'
    });
  }

  if (reviewNotes.length > 500) {
    return res.status(400).json({
      success: false,
      message: 'Rejection reason cannot exceed 500 characters'
    });
  }

  next();
};

/**
 * Validate complete purchase request (stock update) payload - Sprint5-Story-19
 * Multi-product validation with per-product received quantities
 */
exports.validateStockUpdate = (req, res, next) => {
  const { supplierName, invoiceNumber, purchaseDate, items } = req.body;

  // Validate supplier name (optional but if provided, check length)
  if (supplierName && (typeof supplierName !== 'string' || supplierName.trim().length === 0)) {
    return res.status(400).json({
      success: false,
      message: 'Supplier name must be a non-empty string'
    });
  }

  // Validate invoice number (optional but if provided, check length)
  if (invoiceNumber && (typeof invoiceNumber !== 'string' || invoiceNumber.trim().length === 0)) {
    return res.status(400).json({
      success: false,
      message: 'Invoice number must be a non-empty string'
    });
  }

  // Validate purchase date (required)
  if (!purchaseDate) {
    return res.status(400).json({
      success: false,
      message: 'Purchase date is required'
    });
  }

  const parsedDate = new Date(purchaseDate);
  if (isNaN(parsedDate.getTime())) {
    return res.status(400).json({
      success: false,
      message: 'Invalid purchase date format'
    });
  }

  // Validate items array (required)
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Items array is required and must not be empty'
    });
  }

  // Validate each item
  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // Validate productId
    if (!item.productId || !mongoose.Types.ObjectId.isValid(item.productId)) {
      return res.status(400).json({
        success: false,
        message: `Item ${i + 1}: Valid product ID is required`
      });
    }

    // Validate receivedQuantity (required, must be positive integer)
    if (typeof item.receivedQuantity !== 'number' || item.receivedQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: `Item ${i + 1}: Received quantity must be a non-negative number`
      });
    }

    if (!Number.isInteger(item.receivedQuantity)) {
      return res.status(400).json({
        success: false,
        message: `Item ${i + 1}: Received quantity must be a whole number`
      });
    }

    // Validate actualUnitCost (required, must be non-negative)
    if (typeof item.actualUnitCost !== 'number' || item.actualUnitCost < 0) {
      return res.status(400).json({
        success: false,
        message: `Item ${i + 1}: Actual unit cost must be a non-negative number`
      });
    }

    // Validate actualTotalCost (required, must be non-negative)
    if (typeof item.actualTotalCost !== 'number' || item.actualTotalCost < 0) {
      return res.status(400).json({
        success: false,
        message: `Item ${i + 1}: Actual total cost must be a non-negative number`
      });
    }

    // Validate cost consistency (actualTotalCost should equal receivedQuantity * actualUnitCost)
    const expectedTotal = item.receivedQuantity * item.actualUnitCost;
    const tolerance = 0.01; // Allow small floating point differences
    if (Math.abs(item.actualTotalCost - expectedTotal) > tolerance) {
      return res.status(400).json({
        success: false,
        message: `Item ${i + 1}: Total cost (${item.actualTotalCost}) does not match quantity (${item.receivedQuantity}) × unit cost (${item.actualUnitCost})`
      });
    }
  }

  next();
};

module.exports = exports;
