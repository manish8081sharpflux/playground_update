const express = require("express");
const router = express.Router();
const { authorize, authenticate } = require("../../middleware/auth");
const machineController = require("../../controllers/machineController");

// Get all machines
router.get(
  "/",
  authenticate,
  authorize("Machine Management", "Read"),
  machineController.getAllMachines
);

// Register a new machine
router.post(
  "/",
  authenticate,
  authorize("Machine Management", "Create"),
  machineController.registerMachine
);

// Toggle machine status
router.put(
  "/:id/status",
  authenticate,
  authorize("Machine Management", "Update"),
  machineController.toggleMachineStatus
);

// Assign or reassign a machine
router.put(
  "/:id/assign",
  authenticate,
  authorize("Machine Management", "Update"),
  machineController.assignMachine
);

// Get machine usage logs (active log history)
router.get(
  "/:id/logs",
  authenticate,
  authorize("Machine Management", "Read"),
  machineController.getMachineLogs
);

// Get machine history
router.get(
  "/:id/history",
  authenticate,
  authorize("Machine Management", "Read"),
  machineController.getMachineHistory
);

// Delete a machine
router.delete(
  "/:id",
  authenticate,
  authorize("Machine Management", "Delete"),
  machineController.deleteMachine
);

// API for fetch the unassigned machines list
router.get(
  "/unassigned",
  authenticate,
  authorize("Machine Management", "Read"),
  machineController.getUnassignedMachines
);

module.exports = router;
