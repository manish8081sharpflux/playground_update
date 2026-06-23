const { default: mongoose } = require("mongoose");
const SportsTask = require("../models/sportsTasks");

// Function for create task
exports.createSportsTask = async (payload) => {
  return await SportsTask.create([payload])
    .then((result) => {
      return {
        success: true,
        data: result,
        message: "Created sports task successfully",
      };
    })
    .catch((error) => {
      console.log("error", error);
      throw error;
    });
};

// Function for updating task
exports.updateSportsTask = async (taskId, payload) => {
  return await SportsTask.findByIdAndUpdate(
    taskId,
    { $set: payload },
    { new: true }
  )
    .then((result) => {
      if (!result) {
        return {
          success: false,
          data: null,
          message: "Sports task not found",
        };
      }
      return {
        success: true,
        data: result,
        message: "Updated sports task successfully",
      };
    })
    .catch((error) => {
      console.log("error", error);
      throw error;
    });
};

// find sports task by id
exports.findSportsTaskById = async ({ taskId }) => {
  return await SportsTask.findById(taskId)
    .then((result) => {
      if (!result) {
        return {
          success: false,
          data: null,
          message: "Sports task not found",
        };
      }
      return {
        success: true,
        data: result,
        message: "Sports task found successfully",
      };
    })
    .catch((error) => {
      console.log("error", error);
      throw error;
    });
};
