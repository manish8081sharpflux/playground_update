const machine = require("../models/machine");

/**
 * Fetches machines by a list of ObjectIds
 * @param {Array<ObjectId>} machineIds - Array of machine ObjectIds to fetch
 * @returns {Promise<Array>} Array of machine documents
 */

exports.fetchMachinesByIds = async (machineIds) => {
  try {
    return await machine
      .find({
        _id: { $in: machineIds },
      })
      .lean()
      .then((result) => {
        return {
          success: true,
          data: result,
          message: "Successfully fetched machines data",
        };
      })
      .catch((error) => {
        console.log("error", error);
        throw error;
      });
  } catch (error) {
    console.error("Error fetching machines by ids:", error);
    throw error;
  }
};

// Function for delete balagruha.
exports.deleteMachine = async (machineId) => {
  try {
    return await machine
      .findByIdAndDelete(machineId)
      .then((result) => {
        return {
          success: true,
          data: result,
          message: "Successfully deleted machine",
        };
      })
      .catch((error) => {
        console.log("error", error);
        throw error;
      });
  } catch (error) {
    console.error("Error deleting machine:", error);
    throw error;
  }
};
// Function for get the machine by id
exports.getMachineById = async (machineId) => {
  try {
    return await machine
      .findOne({ _id: machineId })
      .then((result) => {
        return {
          success: true,
          data: result,
          message: "Successfully fetched machine data",
        };
      })
      .catch((error) => {
        console.log("error", error);
        throw error;
      });
  } catch (error) {
    console.error("Error fetching machine by id:", error);
    throw error;
  }
};

// Function to get unassigned machines
exports.getUnassignedMachines = async () => {
  try {
    return await machine
      .find({ assignedBalagruha: null })
      .lean()
      .then((result) => {
        return {
          success: true,
          data: result,
          message: "Successfully fetched unassigned machines",
        };
      })
      .catch((error) => {
        console.log("error", error);
        throw error;
      });
  } catch (error) {
    console.error("Error fetching unassigned machines:", error);
    throw error;
  }
};

// Function for update machines by ids
exports.updateMachinesByIds = async (machineIds, updateData) => {
  try {
    return await machine
      .updateMany({ _id: { $in: machineIds } }, updateData)
      .then((result) => {
        return {
          success: true,
          data: result,
          message: "Successfully updated machines",
        };
      })
      .catch((error) => {
        console.log("error", error);
        throw error;
      });
  } catch (error) {
    console.error("Error updating machines:", error);
    throw error;
  }
};
