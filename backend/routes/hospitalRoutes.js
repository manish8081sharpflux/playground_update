const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const {
  getAllHospitals,
  createHospital,
  searchHospitals,
} = require("../controllers/hospitalController");

const router = express.Router();

// Sprint6-Story-3-BugFix-006: Hospital routes for searchable dropdown

// GET /api/hospitals - Get all hospitals
router.get(
  "/",
  authenticate,
  authorize("Medical Check-in", "Read"),
  getAllHospitals
);

// GET /api/hospitals/search?q=searchTerm - Search hospitals
router.get(
  "/search",
  authenticate,
  authorize("Medical Check-in", "Read"),
  searchHospitals
);

// POST /api/hospitals - Create new hospital
router.post(
  "/",
  authenticate,
  authorize("Medical Check-in", "Create"),
  createHospital
);

module.exports = router;
