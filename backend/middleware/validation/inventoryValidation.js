const { body, param, query, validationResult } = require('express-validator');

/**
 * Inventory Validation Middleware - Sprint5-Story-06
 */

/**
 * Validate stock adjustment
 */
const validateStockAdjustment = [
  param('productId')
    .notEmpty().withMessage('Product ID is required')
    .isMongoId().withMessage('Invalid product ID'),

  // Either `adjustment` (delta) or `newStock` (physical count) is required.
  body('adjustment')
    .optional({ checkFalsy: true, nullable: true })
    .isInt().withMessage('Adjustment must be an integer')
    .custom((value) => {
      if (parseInt(value, 10) === 0) {
        throw new Error('Adjustment cannot be zero');
      }
      return true;
    }),

  body('newStock')
    .optional({ checkFalsy: true, nullable: true })
    .isInt({ min: 0 }).withMessage('New stock must be a non-negative integer'),

  body('reason')
    .notEmpty().withMessage('Reason is required')
    .isIn(['Purchase / Restock', 'Inventory Adjustment', 'Student Return', 'Stock Correction', 'Damaged Items', 'Other'])
    .withMessage('Invalid reason. Must be one of: Purchase / Restock, Inventory Adjustment, Student Return, Stock Correction, Damaged Items, Other'),

  body('notes')
    .optional({ nullable: true })
    .isString().withMessage('Notes must be a string')
    .trim()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),

  body().custom((_, { req }) => {
    const hasAdjustment = req.body.adjustment !== undefined && req.body.adjustment !== null && req.body.adjustment !== '';
    const hasNewStock = req.body.newStock !== undefined && req.body.newStock !== null && req.body.newStock !== '';

    if (!hasAdjustment && !hasNewStock) {
      throw new Error('Either adjustment or newStock is required');
    }

    if (hasAdjustment && hasNewStock) {
      throw new Error('Provide either adjustment or newStock, not both');
    }

    return true;
  }),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg
        }))
      });
    }
    next();
  }
];

/**
 * Validate bulk update
 */
const validateBulkUpdate = [
  body('csvData')
    .notEmpty().withMessage('CSV data is required')
    .isArray().withMessage('CSV data must be an array')
    .custom((value) => {
      if (value.length === 0) {
        throw new Error('CSV data cannot be empty');
      }
      return true;
    }),

  body('reason')
    .optional({ nullable: true })
    .isString().withMessage('Reason must be a string')
    .trim(),

  body('notes')
    .optional({ nullable: true })
    .isString().withMessage('Notes must be a string')
    .trim()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg
        }))
      });
    }
    next();
  }
];

/**
 * Validate product ID parameter
 */
const validateProductId = [
  param('productId')
    .notEmpty().withMessage('Product ID is required')
    .isMongoId().withMessage('Invalid product ID'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg
        }))
      });
    }
    next();
  }
];

module.exports = {
  validateStockAdjustment,
  validateBulkUpdate,
  validateProductId
};
