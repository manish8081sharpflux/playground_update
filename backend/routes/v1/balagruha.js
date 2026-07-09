const express = require("express");
const { authorize, authenticate } = require("../../middleware/auth");
const {
  createBalagruha,
  getAllBalagruha,
  getBalagruhaById,
  updateBalagruha,
  deleteBalagruha,
  getBalagruhaListByUserId,
  getBalagruhaListByAssignedID,
  getBalagruhasWithStock,  // Sprint5-Story-21
} = require("../../controllers/balagruha");
const router = express.Router();

// API for balagruha CRUD operations
router.post(
  "/",
  authenticate,
  authorize("User Management", "Create"),
  createBalagruha
);
router.get(
  "/",
  authenticate,
  authorize("User Management", "Read"),
  getAllBalagruha
);
// Sprint5-Story-21: Get Balagruhas with STOCK option
// MUST be before /:id route to avoid matching 'with-stock' as an ID
router.get(
  "/with-stock",
  authenticate,
  authorize("User Management", "Read"),
  getBalagruhasWithStock
);
router.get(
  "/:id",
  authenticate,
  authorize("User Management", "Read"),
  getBalagruhaById
);
router.put(
  "/:id",
  authenticate,
  authorize("User Management", "Update"),
  updateBalagruha
);
router.delete(
  "/:id",
  authenticate,
  authorize("User Management", "Delete"),
  deleteBalagruha
);
// API for fetch balagruha list by user id
router.get(
  "/user/:userId",
  authenticate,
  authorize("User Management", "Read"),
  getBalagruhaListByUserId
);

// API for fetch balagruha list by assigned user id
router.get(
  "/user/assigned/:userId",
  authenticate,
  authorize("User Management", "Read"),
  getBalagruhaListByAssignedID
);
module.exports = router;
