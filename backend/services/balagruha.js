const { errorLogger } = require("../config/pino-config");
const { UserTypes } = require("../constants/users");
const {
  createBalagruha,
  getAllBalagruha,
  getBalagruhaById,
  updateBalagruha,
  deleteBalagruha,
  getAllBalagruhaDetails,
} = require("../data-access/balagruha");
const { updateMachinesByIds } = require("../data-access/machines");
const { getBalagruhaDetailsByUserId } = require("../data-access/User");
const BalagruhaDA = require("../data-access/balagruha");

class Balagruha {
  constructor(obj = {}) {
    // this._id = obj._id || null;
    this.name = obj.name || "";
    this.location = obj.location || "";
    this.assignedMachines = obj.assignedMachines || [];
  }

  toJSON() {
    return {
      // _id: this._id || null,
      name: this.name,
      location: this.location,
      assignedMachines: this.assignedMachines,
    };
  }

  static async create(obj) {
    try {
      const balagruha = new Balagruha(obj).toJSON();
      let result = await createBalagruha(balagruha);
      if (result.success) {
        return {
          success: true,
          data: {
            balagruha: result.data,
          },
          message: "Balagruha created successfully",
        };
      } else {
        return {
          success: false,
          data: {},
          message: "Error creating balagruha",
        };
      }
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in create balagruha service"
      );
      throw error;
    }
  }

  // Updated to support scope filtering (RBAC-001 fix)
  static async getAll(scopeFilter = {}) {
    try {
      const result = await getAllBalagruha(scopeFilter);
      if (result.success) {
        return {
          success: true,
          data: {
            balagruhas: result.data,
          },
          message: "Balagruhas fetched successfully",
        };
      } else {
        return {
          success: false,
          data: {},
          message: "Error fetching balagruhas",
        };
      }
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in getAll balagruha service"
      );
      throw error;
    }
  }

  static async getById(id) {
    try {
      const result = await getBalagruhaById(id);
      if (result.success) {
        return {
          success: true,
          data: {
            balagruha: result.data,
          },
          message: "Balagruha fetched successfully",
        };
      } else {
        return {
          success: false,
          data: {},
          message: "Balagruha not found",
        };
      }
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in getById balagruha service"
      );
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      // get the balagruha details by id
      let balagruha = await getBalagruhaById(id);
      const result = await updateBalagruha(id, updateData);
      if (result.success) {
        // check the assignedMachines key is available and not empty
        if (
          updateData.assignedMachines &&
          updateData.assignedMachines.length > 0
        ) {
          // also find the removed machines from the assignedMachines
          let existingAssignedMachines = Array.isArray(
            balagruha.data.assignedMachines
          )
            ? [...balagruha.data.assignedMachines]
            : [];
          let removedMachines = existingAssignedMachines.filter((machineId) => {
            return !updateData.assignedMachines.includes(
              machineId._id.toString()
            );
          });
          let updateResult = await updateMachinesByIds(
            updateData.assignedMachines,
            { assignedBalagruha: id }
          );
          // get removedMachinesIds
          let removedMachinesIds = removedMachines.map(
            (machineId) => machineId._id
          );
          if (removedMachinesIds.length > 0) {
            let updateResult = await updateMachinesByIds(removedMachinesIds, {
              assignedBalagruha: null,
            });
          }
        } else {
          // set balagruhaId to null to all the machines which are not assigned to any balagruha
          let existingAssignedMachines = balagruha.data.assignedMachines || [];
          let unassignedMachines = existingAssignedMachines.filter(
            (machineId) => !updateData.assignedMachines.includes(machineId)
          );
          // get unassignedMachinesIds
          let unassignedMachinesIds = unassignedMachines.map(
            (machineId) => machineId._id
          );
          if (unassignedMachinesIds.length > 0) {
            let updateResult = await updateMachinesByIds(
              unassignedMachinesIds,
              { assignedBalagruha: null }
            );
          }
        }
        return {
          success: true,
          data: {
            balagruha: result.data,
          },
          message: "Balagruha updated successfully",
        };
      } else {
        return result;
      }
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in update balagruha service"
      );
      throw error;
    }
  }

  static async delete(id) {
    try {
      const result = await deleteBalagruha(id);
      if (result.success) {
        return {
          success: true,
          data: {},
          message: "Balagruha deleted successfully",
        };
      } else {
        return {
          success: false,
          data: {},
          message: "Error deleting balagruha",
        };
      }
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in delete balagruha service"
      );
      throw error;
    }
  }

  // Function for fetch list of assigned balagruha details by user id
  static async getBalagruhaListByUserId(userId, role) {
    try {
      let result = null;
      if (role == UserTypes.ADMIN) {
        result = await getAllBalagruhaDetails();
        if (result.success && result.data && result.data.length > 0) {
          result.data.balagruhas = result.data;
        } else {
          result.data.balagruhas = [];
        }
      } else {
        result = await getBalagruhaDetailsByUserId({ userId });
      }
      if (result.success) {
        return {
          success: true,
          data: {
            balagruhas: result?.data?.balagruhas || [],
          },
          message: "Assigned balagruha fetched successfully",
        };
      } else {
        return {
          success: false,
          data: {},
          message: "Error fetching assigned balagruha",
        };
      }
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in getBalagruhaListByUserId service"
      );
      throw error;
    }
  }

  // Fetch balagruhas by assigned user id (coaches etc.)
  static async getByAssignedUserId(userId) {
    try {
      const result = await BalagruhaDA.getAllBalagruha({
        assignedUser: userId,
      });
      // If the above DA does not support filter, fallback to getAll and filter in memory
      let balagruhas = [];
      if (result && result.success && Array.isArray(result.data)) {
        balagruhas = result.data.filter((b) =>
          Array.isArray(b.assignedUsers)
            ? b.assignedUsers.includes(userId)
            : false
        );
      } else if (result && result.success && result.data) {
        balagruhas = result.data;
      }
      return {
        success: true,
        data: { balagruhas },
        message: "Assigned balagruha fetched successfully",
      };
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in getByAssignedUserId balagruha service"
      );
      throw error;
    }
  }
}

module.exports = Balagruha;
