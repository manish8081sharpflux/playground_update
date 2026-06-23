const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { upload } = require("../middleware/upload");
const { facialLogin } = require("../controllers/userController");
const authController = require("../controllers/authController");
const rateLimit = require("express-rate-limit");

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs (increased for E2E testing)
  message: {
    success: false,
    message: "Too many attempts. Please try again after 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Register User
/**
 * @swagger
 * /register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *               role:
 *                 type: string
 *                 example: admin
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: User already exists
 *       500:
 *         description: Error in registration
 */
router.post("/register", authLimiter, authController.register);

// Login User
/**
 * @swagger
 * /login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid credentials
 *       423:
 *         description: Account is locked
 *       500:
 *         description: Error in login
 */
router.post("/login", authLimiter, authController.login);

// Student userId-only login
router.post("/student/login", authLimiter, authController.studentLogin);

// Get User Profile
router.get("/profile", authenticate, authController.getProfile);

// Update User Profile
router.put("/profile", authenticate, authController.updateProfile);

// Change Password
router.put("/change-password", authenticate, authController.changePassword);

// Facial login
router.post(
  "/student/facial/login",
  authLimiter,
  upload.fields([
    { name: "facialData", maxCount: 5 },
  ]),
  facialLogin
);

module.exports = router;
