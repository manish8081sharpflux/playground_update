const { body, param, query, validationResult } = require('express-validator');
const { SHOP_CATEGORIES } = require('../../constants/shopCategories');

/**
 * Admin Product Validation Middleware - Sprint5-Story-05
 */

/**
 * Validate product creation
 */
const validateProductCreate = [
  body('sku')
    .optional({ values: 'falsy' })
    .isString().withMessage('SKU must be a string')
    .trim()
    .matches(/^[A-Z0-9-]+$/).withMessage('SKU must contain only uppercase letters, numbers, and hyphens')
    .isLength({ min: 3, max: 20 }).withMessage('SKU must be between 3 and 20 characters'),

  body('name')
    .notEmpty().withMessage('Product name is required')
    .isString().withMessage('Product name must be a string')
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage('Product name must be between 3 and 100 characters'),

  body('description')
    .notEmpty().withMessage('Description is required')
    .isString().withMessage('Description must be a string')
    .trim()
    .isLength({ min: 10, max: 500 }).withMessage('Description must be between 10 and 500 characters'),

  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn(SHOP_CATEGORIES)
    .withMessage(`Invalid category. Must be one of: ${SHOP_CATEGORIES.join(', ')}`),

  body('purchaseCategory')
    .optional()
    .isIn(['ISF Shop', 'Medicines', 'Repairs', 'Consumables', 'Infra', 'Others'])
    .withMessage('Invalid purchaseCategory. Must be one of: ISF Shop, Medicines, Repairs, Consumables, Infra, Others'),

  body('price')
    .trim()
    .notEmpty().withMessage('Price is required').bail()
    .isInt({ min: 1 }).withMessage('Price must be a positive integer (coins)'),

  body('discountPrice')
    .optional({ nullable: true })
    .isInt({ min: 0 }).withMessage('Discount price must be a non-negative integer'),

  body('stock')
    .optional()
    .isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),

  body('lowStockThreshold')
    .optional()
    .isInt({ min: 0 }).withMessage('Low stock threshold must be a non-negative integer'),

  body('imageUrl')
    .optional({ nullable: true })
    .isString().withMessage('Image URL must be a string')
    .trim()
    .isURL().withMessage('Image URL must be a valid URL'),

  body('images')
    .optional()
    .isArray().withMessage('Images must be an array'),

  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean'),

  body('availableFor')
    .optional()
    .isArray().withMessage('availableFor must be an array'),

  body('availableFor.*')
    .optional()
    .isIn(['student', 'coach', 'all']).withMessage('Invalid availableFor value'),

  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array'),

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
 * Validate product update
 */
const validateProductUpdate = [
  param('productId')
    .notEmpty().withMessage('Product ID is required')
    .isMongoId().withMessage('Invalid product ID'),

  body('name')
    .optional()
    .isString().withMessage('Product name must be a string')
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage('Product name must be between 3 and 100 characters'),

  body('description')
    .optional()
    .isString().withMessage('Description must be a string')
    .trim()
    .isLength({ min: 10, max: 500 }).withMessage('Description must be between 10 and 500 characters'),

  body('category')
    .optional()
    .isIn(SHOP_CATEGORIES)
    .withMessage('Invalid category'),

  body('purchaseCategory')
    .optional()
    .isIn(['ISF Shop', 'Medicines', 'Repairs', 'Consumables', 'Infra', 'Others'])
    .withMessage('Invalid purchaseCategory'),

  body('price')
    .optional()
    .isInt({ min: 1 }).withMessage('Price must be a positive integer'),

  body('discountPrice')
    .optional({ nullable: true })
    .isInt({ min: 0 }).withMessage('Discount price must be a non-negative integer'),

  body('stock')
    .optional()
    .isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),

  body('lowStockThreshold')
    .optional()
    .isInt({ min: 0 }).withMessage('Low stock threshold must be a non-negative integer'),

  body('imageUrl')
    .optional({ nullable: true })
    .isString().withMessage('Image URL must be a string')
    .trim(),

  body('images')
    .optional()
    .isArray().withMessage('Images must be an array'),

  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean'),

  body('availableFor')
    .optional()
    .isArray().withMessage('availableFor must be an array'),

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

/**
 * Validate query parameters for product list
 */
const validateProductQuery = [
  query('category')
    .optional()
    .isIn(SHOP_CATEGORIES)
    .withMessage('Invalid category'),

  query('purchaseCategory')
    .optional()
    .isIn(['ISF Shop', 'Medicines', 'Repairs', 'Consumables', 'Infra', 'Others'])
    .withMessage('Invalid purchaseCategory'),

  query('isActive')
    .optional()
    .isIn(['true', 'false']).withMessage('isActive must be true or false'),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

  query('sortBy')
    .optional()
    .isIn(['createdAt', 'name', 'price', 'stock', 'category'])
    .withMessage('Invalid sortBy field'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),

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
  validateProductCreate,
  validateProductUpdate,
  validateProductId,
  validateProductQuery
};
