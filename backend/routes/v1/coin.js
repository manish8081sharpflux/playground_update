const express = require("express");
const { authorize, authenticate } = require("../../middleware/auth");
const {
  getUserBalance,
  getUserCoinStats,
  getUserTransactionHistory,
  exportTransactionHistory,
  getWtfTransactionHistory,
  getTopEarners,
  checkFirstPinBonusEligibility,
  checkWeeklyActiveBonusEligibility,
  getAllTransactions,
} = require("../../controllers/coinController");

const router = express.Router();

// ==================== USER COIN ROUTES ====================

// Get user coin balance (Authenticated users - own data)
router.get("/balance", authenticate, getUserBalance);

// Get user coin statistics (Authenticated users - own data)
router.get("/stats", authenticate, getUserCoinStats);

// Export transaction history as CSV (Sprint5-Story-09: AC7)
// IMPORTANT: Must be BEFORE /transactions route to avoid route shadowing
router.get("/transactions/export", authenticate, exportTransactionHistory);

// Get WTF transaction history (Authenticated users - own data)
router.get("/transactions/wtf", authenticate, getWtfTransactionHistory);

// Get user transaction history (Authenticated users - own data)
router.get("/transactions", authenticate, getUserTransactionHistory);

// ==================== BONUS ELIGIBILITY ROUTES ====================

// Check first pin bonus eligibility (Authenticated users - own data)
router.get(
  "/bonus/first-pin-eligibility",
  authenticate,
  checkFirstPinBonusEligibility
);

// Check weekly active bonus eligibility (Authenticated users - own data)
router.get(
  "/bonus/weekly-active-eligibility",
  authenticate,
  checkWeeklyActiveBonusEligibility
);

// ==================== ADMIN COIN ROUTES ====================

// Get student coin transactions across all users (Admin only)
router.get(
  "/all-transactions",
  authenticate,
  authorize("Coin Analytics", "Read"),
  getAllTransactions
);

// Get top coin earners (Admin only)
router.get(
  "/top-earners",
  authenticate,
  authorize("Coin Analytics", "Read"),
  getTopEarners
);

module.exports = router;
