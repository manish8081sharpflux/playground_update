const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const {
  getAllDoctors,
  createDoctor,
  searchDoctors,
  updateDoctor,
  deleteDoctor,
} = require("../controllers/doctorController");

const router = express.Router();

// Sprint6-Story-3-AC2: Doctor routes for searchable dropdown + Doctors Data Bank CRUD

// GET /api/doctors - Get all doctors
router.get(
  "/",
  authenticate,
  authorize("Medical Check-in", "Read"),
  getAllDoctors
);

// GET /api/doctors/search?q=searchTerm - Search doctors
// NOTE: must come BEFORE /:id to avoid being caught as ID parameter
router.get(
  "/search",
  authenticate,
  authorize("Medical Check-in", "Read"),
  searchDoctors
);

// POST /api/doctors - Create new doctor
router.post(
  "/",
  authenticate,
  authorize("Medical Check-in", "Create"),
  createDoctor
);

// PUT /api/doctors/:id - Update doctor (Doctors Data Bank)
router.put(
  "/:id",
  authenticate,
  authorize("Medical Check-in", "Create"),
  updateDoctor
);

// DELETE /api/doctors/:id - Delete doctor (Doctors Data Bank)
router.delete(
  "/:id",
  authenticate,
  authorize("Medical Check-in", "Create"),
  deleteDoctor
);

module.exports = router;
