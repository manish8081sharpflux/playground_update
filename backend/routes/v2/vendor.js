const express = require('express');
const router = express.Router();
const vendorController = require('../../controllers/vendorController');
const { authenticate } = require('../../middleware/auth');

// Middleware to check for Admin role
const isAdmin = (req, res, next) => {
  // Check if user exists and has admin role
  // Using case-insensitive check
  if (req.user && req.user.role && req.user.role.toLowerCase() === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      error: 'Access denied: Admin role required'
    });
  }
};

// All routes require authentication
router.use(authenticate);

// Read-only vendor routes accessible to admin and purchase-manager
router.get('/', vendorController.getAllVendors);
router.get('/:id', vendorController.getVendorById);

// Write routes require admin role
router.post('/', isAdmin, vendorController.createVendor);
router.put('/:id', isAdmin, vendorController.updateVendor);
router.delete('/:id', isAdmin, vendorController.deactivateVendor);

module.exports = router;
