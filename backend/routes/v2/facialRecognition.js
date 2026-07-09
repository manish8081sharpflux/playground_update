/**
 * Facial Recognition Routes (v2)
 *
 * API endpoints for face registration, recognition, and management.
 *
 * @module routes/v2/facialRecognition
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const frController = require('../../controllers/frController');
const { authenticate } = require('../../middleware/auth');
const checkPermission = require('../../middleware/checkPermission');

// Rate limiting for facial recognition endpoints
const frLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    success: false,
    message: 'Too many facial recognition attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route POST /api/v2/fr/register
 * @desc Register face for a student
 * @access Private (Admin, In-Charge)
 */
router.post(
  '/register',
  authenticate,
  checkPermission('User Management', 'Create'),
  frController.upload.single('photo'),
  frController.registerFace
);

/**
 * @route POST /api/v2/fr/recognize
 * @desc Recognize face (identify student)
 * @access Public — this is the student login mechanism; no auth required
 * Note: In production, add rate limiting to prevent brute force
 */
router.post(
  '/recognize',
  frLimiter,
  frController.upload.single('photo'),
  frController.recognizeFace
);

/**
 * @route GET /api/v2/fr/status/:studentId
 * @desc Check if student has face registered
 * @access Private (Admin, In-Charge, Coach)
 */
router.get(
  '/status/:studentId',
  authenticate,
  checkPermission('User Management', 'Read'),
  frController.getRegistrationStatus
);

/**
 * @route DELETE /api/v2/fr/register/:studentId
 * @desc Delete face registration for student (GDPR compliance)
 * @access Private (Admin, In-Charge)
 */
router.delete(
  '/register/:studentId',
  authenticate,
  checkPermission('User Management', 'Delete'),
  frController.deleteFaceRegistration
);

/**
 * @route GET /api/v2/fr/stats
 * @desc Get FR system statistics
 * @access Private (Admin only)
 */
router.get(
  '/stats',
  authenticate,
  checkPermission('User Management', 'Read'),
  frController.getFRStats
);

module.exports = router;
