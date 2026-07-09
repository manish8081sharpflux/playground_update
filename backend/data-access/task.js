const { default: mongoose } = require("mongoose");
const Task = require("../models/task");

// Function for fetch all task by user id
exports.fetchTasksByUserIdAndFilter = async (userId, filter) => {
  return await Task.find({ assignedUser: userId })
    .lean()
    .then((result) => {
      return {
        success: true,
        data: result,
        message: "Fetched all task successfully",
      };
    })
    .catch((error) => {
      console.log("error", error);
      throw error;
    });
};

// Function for create task
exports.createTask = async (payload) => {
  return await Task.create([payload])
    .then((result) => {
      return {
        success: true,
        data: result,
        message: "Created task successfully",
      };
    })
    .catch((error) => {
      console.log("error", error);
      throw error;
    });
};
// Function for create task
exports.createMultipleTask = async (payloadArray) => {
  return await Task.create(payloadArray)
    .then((result) => {
      return {
        success: true,
        data: result,
        message: "Created task successfully",
      };
    })
    .catch((error) => {
      console.log("error", error);
      throw error;
    });
};
// Function for fetch all task by balagruha ids

exports.getAllTasksByBalagruhaIds = async (balagruhaIds) => {
  return await Task.aggregate([
    {
      $match: {
        role: "student",
        balagruhaIds: {
          $in: [[mongoose.Types.ObjectId.createFromHexString(balagruhaIds)]],
        },
      },
    },
    {
      $lookup: {
        from: "tasks",
        localField: "_id",
        foreignField: "assignedUser",
        as: "userTasks",
      },
    },
    {
      $unwind: "$userTasks",
    },
    {
      $lookup: {
        from: "users",
        localField: "userTasks.createdBy",
        foreignField: "_id",
        as: "createdByDetails",
      },
    },
    {
      $project: {
        email: 0,
        password: 0,
        lastLogin: 0,
        passwordResetToken: 0,
        loginAttempts: 0,
        parentalStatus: 0,
        guardianContact: 0,

        attendanceRecords: 0,
        medicalRecords: 0,
        __v: 0,
        "createdByDetails.email": 0,
        "createdByDetails.password": 0,
        "createdByDetails.status": 0,
        "createdByDetails.loginAttempts": 0,
        "createdByDetails.createdAt": 0,
        "createdByDetails.updatedAt": 0,
        "createdByDetails.__v": 0,
        "createdByDetails.lastLogin": 0,
        "createdByDetails.attendanceRecords": 0,
        "createdByDetails.medicalRecords": 0,
        "createdByDetails.parentalStatus": 0,

        "createdByDetails.assignedMachines": 0,
      },
    },
  ])
    .then((result) => {
      return {
        success: true,
        data: result,
        message: "Fetched all task successfully",
      };
    })
    .catch((error) => {
      console.log("error", error);
      throw error;
    });
};

// API for fetch the task overview details by balagruha ids
exports.getTaskOverviewDetailsByBalagruhaIds = async (balagruhaIds) => {
  let pipeline = [
    {
      $lookup: {
        from: "tasks",
        localField: "_id",
        foreignField: "assignedUser",
        as: "userTasks",
      },
    },
    {
      $unwind: "$userTasks",
    },
    {
      $lookup: {
        from: "users",
        localField: "userTasks.createdBy",
        foreignField: "_id",
        as: "createdByDetails",
      },
    },
    {
      $project: {
        email: 0,
        password: 0,
        lastLogin: 0,
        passwordResetToken: 0,
        loginAttempts: 0,
        parentalStatus: 0,
        guardianContact: 0,

        attendanceRecords: 0,
        medicalRecords: 0,
        __v: 0,
        "createdByDetails.email": 0,
        "createdByDetails.password": 0,
        "createdByDetails.status": 0,
        "createdByDetails.loginAttempts": 0,
        "createdByDetails.createdAt": 0,
        "createdByDetails.updatedAt": 0,
        "createdByDetails.__v": 0,
        "createdByDetails.lastLogin": 0,
        "createdByDetails.attendanceRecords": 0,
        "createdByDetails.medicalRecords": 0,
        "createdByDetails.parentalStatus": 0,

        "createdByDetails.assignedMachines": 0,
      },
    },
  ];

  if (balagruhaIds.length == 0) {
    // add the match condition to the start of the pipeline
    pipeline.unshift({
      $match: {
        role: "student",
        balagruhaIds: {
          $in: [[mongoose.Types.ObjectId.createFromHexString(balagruhaIds)]],
        },
      },
    });
  }

  return await Task.aggregate(pipeline)
    .then((result) => {
      return {
        success: true,
        data: result,
        message: "Fetched all task successfully",
      };
    })
    .catch((error) => {
      console.log("error", error);
      throw error;
    });
};

// Function for update task status
exports.updateTaskStatus = async (taskId, status) => {
  return await Task.findByIdAndUpdate(taskId, { status: status }, { new: true })
    .then((result) => {
      return {
        success: true,
        data: result,
        message: "Updated task status successfully",
      };
    })
    .catch((error) => {
      console.log("error", error);
      throw error;
    });
};

// Function for fetch the task by id
exports.getTaskById = async (taskId) => {
  return await Task.findOne({ _id: taskId })
    .lean()
    .then((result) => {
      return {
        success: true,
        data: result,
        message: "Fetched task successfully",
      };
    })
    .catch((error) => {
      console.log("error", error);
      throw error;
    });
};

// Function for fetch the task list by user id
exports.getTaskListByUserId = async (userId) => {
  return await Task.aggregate([
    {
      $match: {
        assignedUser: mongoose.Types.ObjectId.createFromHexString(userId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "createdBy",
        foreignField: "_id",
        as: "createdByDetails",
      },
    },
    {
      $unwind: "$createdByDetails",
    },
    {
      $project: {
        email: 0,
        password: 0,
        lastLogin: 0,
        passwordResetToken: 0,
        loginAttempts: 0,
        parentalStatus: 0,
        guardianContact: 0,

        attendanceRecords: 0,
        medicalRecords: 0,
        __v: 0,
        "createdByDetails.email": 0,
        "createdByDetails.password": 0,
        "createdByDetails.status": 0,
        "createdByDetails.loginAttempts": 0,
        "createdByDetails.createdAt": 0,
        "createdByDetails.updatedAt": 0,
        "createdByDetails.__v": 0,
        "createdByDetails.lastLogin": 0,
        "createdByDetails.attendanceRecords": 0,
        "createdByDetails.medicalRecords": 0,
        "createdByDetails.parentalStatus": 0,

        "createdByDetails.assignedMachines": 0,
      },
    },
  ])
    .then((result) => {
      return {
        success: true,
        data: result,
        message: "Fetched all task successfully",
      };
    })
    .catch((error) => {
      console.log("error", error);
      throw error;
    });
};

// Find task by _id
exports.findTaskById = async ({ taskId }) => {
  return await Task.findOne({ _id: taskId })
    .lean()
    .then((result) => {
      return {
        success: true,
        data: result,
        message: "Fetched task successfully",
      };
    })
    .catch((error) => {
      console.log("error", error);
      throw error;
    });
};

// Function for fetch task by id with details
exports.findTaskByIdWithDetails = async ({ taskId }) => {
  return await Task.findOne({ _id: taskId })
    .populate("assignedUser", "name email role status age gender")
    .populate("createdBy", "name email role")
    .populate("comments.user", "name email role")
    .lean()
    .then((result) => {
      if (!result) {
        return {
          success: false,
          data: null,
          message: "Task not found",
        };
      }
      return {
        success: true,
        data: result,
        message: "Fetched task details successfully",
      };
    })
    .catch((error) => {
      console.log("error", error);
      throw error;
    });
};

// Function for update task
exports.updateTaskById = async ({ taskId, payload }) => {
  return await Task.findByIdAndUpdate(taskId, payload, { new: true })
    .then((result) => {
      return {
        success: true,
        data: result,
        message: "Updated task successfully",
      };
    })
    .catch((error) => {
      console.log("error", error);
      throw error;
    });
};

// Function for updating task
exports.updateTaskItemById = async (taskId, payload) => {
  return await Task.findByIdAndUpdate(taskId, { $set: payload }, { new: true })
    .then((result) => {
      if (!result) {
        return {
          success: false,
          data: null,
          message: "Task not found",
        };
      }
      return {
        success: true,
        data: result,
        message: "Updated task successfully",
      };
    })
    .catch((error) => {
      console.log("error", error);
      throw error;
    });
};
