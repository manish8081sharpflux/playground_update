const { errorLogger } = require("../config/pino-config");
const Balagruha = require("../models/balagruha");

// Function for create balagruha
exports.createBalagruha = async (payload) => {
  return await Balagruha.create(payload)
    .then((result) => {
      return {
        success: true,
        data: result.toObject(),
        message: "Balagruha created successfully",
      };
    })
    .catch((error) => {
      console.log("error", error);

      throw error;
    });
};

// Function to get all balagruhas
// Updated to support scope filtering (RBAC-001 fix, RBAC-002 fix)
exports.getAllBalagruha = async (scopeFilter = {}) => {
  try {
    // RBAC-002 FIX: Transform balagruhaId → _id for Balagruha collection queries
    // The getScopeFilter() middleware generates { balagruhaId: { $in: [...] } } for coach users
    // But Balagruha collection uses _id field, not balagruhaId (which exists in other collections)
    // This transformation ensures coaches see only their assigned Balagruhas
    const transformedFilter = { ...scopeFilter };
    if (transformedFilter.balagruhaId) {
      transformedFilter._id = transformedFilter.balagruhaId;
      delete transformedFilter.balagruhaId;
    }

    const result = await Balagruha.find(transformedFilter).populate("assignedMachines").lean();
    return {
      success: true,
      data: result,
      message: "Balagruhas fetched successfully",
    };
  } catch (error) {
    errorLogger.error({ error: error.message }, "Error in getAllBalagruha");
    throw error;
  }
};

// Optional filtered fetch helper used by service fallback
exports.getAllBalagruhaFiltered = async (filter = {}) => {
  try {
    const result = await Balagruha.find(filter)
      .populate("assignedMachines")
      .lean();
    return { success: true, data: result, message: "Balagruhas fetched" };
  } catch (error) {
    errorLogger.error(
      { error: error.message },
      "Error in getAllBalagruhaFiltered"
    );
    throw error;
  }
};

// Function to get balagruha by id
exports.getBalagruhaById = async (id) => {
  try {
    const result = await Balagruha.findById(id).populate("assignedMachines");
    if (!result) {
      return {
        success: false,
        data: null,
        message: "Balagruha not found",
      };
    }
    return {
      success: true,
      data: result,
      message: "Balagruha fetched successfully",
    };
  } catch (error) {
    errorLogger.error({ error: error.message }, "Error in getBalagruhaById");
    throw error;
  }
};

// Function to update balagruha
exports.updateBalagruha = async (id, updateData) => {
  try {
    const result = await Balagruha.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    if (!result) {
      return {
        success: false,
        data: null,
        message: "Balagruha not found",
      };
    }
    return {
      success: true,
      data: result,
      message: "Balagruha updated successfully",
    };
  } catch (error) {
    errorLogger.error({ error: error.message }, "Error in updateBalagruha");
    throw error;
  }
};

// Function to delete balagruha
exports.deleteBalagruha = async (id) => {
  try {
    const result = await Balagruha.findByIdAndDelete(id);
    if (!result) {
      return {
        success: false,
        data: null,
        message: "Balagruha not found",
      };
    }
    return {
      success: true,
      data: result,
      message: "Balagruha deleted successfully",
    };
  } catch (error) {
    errorLogger.error({ error: error.message }, "Error in deleteBalagruha");
    throw error;
  }
};

// Aggregation for fetch the list of balagruha details by user Id
exports.getAllBalagruhaDetails = async () => {
  return await Balagruha.find({})
    .lean()
    .then((result) => {
      return {
        success: true,
        data: result || null,
        message: "Balagruha details fetched successfully",
      };
    })
    .catch((error) => {
      console.log("error", error);
      throw error;
    });
};

// Function for fetch all balagruhaIds
exports.getAllBalagruhaIds = async () => {
  return await Balagruha.find({})
    .select("_id")
    .lean()
    .then((result) => {
      return {
        success: true,
        data: result || null,
        message: "Balagruha ids fetched successfully",
      };
    })
    .catch((error) => {
      console.log("error", error);
      throw error;
    });
};
