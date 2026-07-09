const { validationResult } = require('express-validator');

/**
 * Middleware to validate request using express-validator
 * Checks for validation errors and returns 400 if any exist
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  next();
};

module.exports = { validate };
