const Task = require("../models/task");
const User = require("../models/user");
const mongoose = require("mongoose");
const { HTTP_STATUS_CODE } = require("../constants/general");
const { logger, errorLogger } = require("../config/pino-config");
const Tasks = require("../services/task");
const { isRequestFromLocalhost } = require("../utils/helper");
const { UserTypes } = require("../constants/users");
const { uploadFileToS3 } = require("../services/aws/s3");
const { cleanupLocalFile } = require("../utils/fileCleanup");
async function uploadTaskFilesToS3(files = []) {
  const attachments = [];

  for (const file of files) {
    const result = await uploadFileToS3(
      file.path,
      process.env.AWS_S3_FOLDER_TASK_ATTACHMENTS,
      file.filename,
    );

    if (!result.success) {
      throw new Error(result.error || result.message || `Failed to upload ${file.originalname} to S3`);
    }

    attachments.push(result.url);
    cleanupLocalFile(file.path, file.filename);
  }

  return attachments;
}
// Create a new task with file upload
exports.createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      assignedUser,
      createdBy,
      deadline,
      priority,
      status,
    } = req.body;

    if (!title || !description || !assignedUser || !createdBy || !deadline) {
      return res
        .status(400)
        .json({ message: "All required fields must be provided." });
    }

    // if (!mongoose.Types.ObjectId.isValid(assignedUser) || !mongoose.Types.ObjectId.isValid(createdBy)) {
    // 	return res.status(400).json({ message: 'Invalid assignedUser or createdBy ID.' });
    // }

    const assignedUserExists = await User.findById(assignedUser);
    const createdByExists = await User.findById(createdBy);

    if (!assignedUserExists || !createdByExists) {
      return res
        .status(404)
        .json({ message: "Assigned user or creator not found." });
    }

    if (isNaN(Date.parse(deadline)) || new Date(deadline) < new Date()) {
      return res.status(400).json({ message: "Invalid or past deadline." });
    }

    const attachments = req.files ? await uploadTaskFilesToS3(req.files) : [];

    const task = new Task({
      title,
      description,
      assignedUser,
      createdBy,
      deadline,
      priority: priority || "Medium", // Default to 'Medium' if not provided
      status: status || "Pending", // Default to 'Pending' if not provided
      attachments, // Save file paths in the database
    });

    await task.save();
    res.status(201).json({ message: "Task created successfully.", task });
  } catch (error) {
    errorLogger.error({ err: error }, "Error creating task:");
    res
      .status(500)
      .json({ message: "Internal server error.", error: error.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate task ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid task ID." });
    }

    // Parse form-data fields
    const { title, description, assignedUser, deadline, priority, status } =
      req.body;

    // Handle file uploads
    const newAttachments = req.files ? await uploadTaskFilesToS3(req.files) : [];

    // Find the task
    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    // Validate assignedUser if provided
    if (assignedUser) {
      if (!mongoose.Types.ObjectId.isValid(assignedUser)) {
        return res.status(400).json({ message: "Invalid assignedUser ID." });
      }
      const assignedUserExists = await User.findById(assignedUser);
      if (!assignedUserExists) {
        return res.status(404).json({ message: "Assigned user not found." });
      }
      task.assignedUser = assignedUser;
    }

    // Validate deadline if provided
    if (deadline) {
      if (isNaN(Date.parse(deadline)) || new Date(deadline) < new Date()) {
        return res.status(400).json({ message: "Invalid or past deadline." });
      }
      task.deadline = deadline;
    }

    // Update task fields
    if (title) task.title = title;
    if (description) task.description = description;
    if (priority) task.priority = priority;
    if (status) task.status = status;

    // Add new attachments to the existing ones
    if (newAttachments.length > 0) {
      task.attachments = [...task.attachments, ...newAttachments];
    }

    await task.save();
    res.status(200).json({ message: "Task updated successfully.", task });
  } catch (error) {
    errorLogger.error({ err: error }, "Error updating task:");
    res
      .status(500)
      .json({ message: "Internal server error.", error: error.message });
  }
};

// Get all tasks with optional filters and pagination
exports.getAllTasks = async (req, res) => {
  try {
    const {
      status,
      assignedUser,
      deadline,
      priority,
      page = 1,
      limit = 10,
    } = req.query; // Optional filters and pagination

    // Build the query object with RBAC scope filter
    const query = { ...(req.scopeFilter || {}) };
    if (status) query.status = status; // Filter by status
    if (assignedUser) {
      if (!mongoose.Types.ObjectId.isValid(assignedUser)) {
        return res.status(400).json({ message: "Invalid assignedUser ID." });
      }
      query.assignedUser = assignedUser; // Filter by assigned user
    }
    if (deadline) {
      if (isNaN(Date.parse(deadline))) {
        return res.status(400).json({ message: "Invalid deadline value." });
      }
      query.deadline = { $lte: new Date(deadline) }; // Filter by deadline
    }
    if (priority) query.priority = priority; // Filter by priority

    // Fetch tasks with pagination
    const tasks = await Task.find(query)
      .populate("assignedUser", "name email") // Populate assigned user details (optional)
      .populate("createdBy", "name email") // Populate creator details (optional)
      .sort({ createdAt: -1 }) // Sort by creation date (most recent first)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalTasks = await Task.countDocuments(query); // Total number of tasks for the query

    res.status(200).json({
      success: true,
      tasks,
      totalTasks,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalTasks / limit),
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error fetching all tasks:");
    res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// API for fetch all task for the user
exports.getAllTasksForUser = async (req, res) => {
  try {
    const { userId } = req.params;
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId,
      },
      `Request received to fetch all tasks for user with ID: ${userId}`
    );
    let result = await Tasks.getAllTasksByUser({ userId });
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          userId,
        },
        `Successfully fetched all tasks for user with ID: ${userId}`
      );
      res.status(HTTP_STATUS_CODE.OK).json({
        success: true,
        data: result.data,
        message: "Fetched all task successfully",
      });
    } else {
      logger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          userId,
        },
        `Failed to fetch all tasks for user with ID: ${userId}. Error: ${result.message}`
      );
      res
        .status(HTTP_STATUS_CODE.BAD_REQUEST)
        .json({ success: false, message: result.message });
    }
  } catch (error) {
    logger.error({ error: error.message }, "Controller error");
    res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// API for fetch the task overview details
exports.getTaskOverview = async (req, res) => {
  try {
    let result = await Tasks.getTaskOverview();
    if (result.success) {
      res.status(HTTP_STATUS_CODE.OK).json({
        success: true,
        data: result.data,
        message: "Fetched task overview successfully",
      });
    } else {
      res
        .status(HTTP_STATUS_CODE.BAD_REQUEST)
        .json({ success: false, message: result.message });
    }
  } catch (error) {
    res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// API for create Task v1
exports.createTaskV1 = async (req, res) => {
  try {
    req.body.createdBy = req.user._id;

    if (req.user.role === UserTypes.STUDENT) {
      return res.status(HTTP_STATUS_CODE.FORBIDDEN).json({
        success: false,
        message: "Students are not allowed to create tasks",
      });
    }

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Request received to create a new task`
    );
    const attachments = req.files ? await uploadTaskFilesToS3(req.files) : [];
    req.body.attachments = attachments;
    // let result = await Tasks.createTask(req.body);
    let isOfflineReq = isRequestFromLocalhost(req);
    let result = await Tasks.createTaskV2(req.body, isOfflineReq);

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Successfully created a new task`
      );
      res.status(HTTP_STATUS_CODE.OK).json({
        success: true,
        data: result.data,
        message: "Task created successfully",
      });
    } else {
      logger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Failed to create a new task. Error: ${result.message}`
      );
      res
        .status(HTTP_STATUS_CODE.BAD_REQUEST)
        .json({ success: false, message: result.message });
    }
  } catch (error) {
    logger.error({ error: error.message }, "Controller error");
    res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

exports.getAssignableTaskUsers = async (req, res) => {
  try {
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        requester: req.user?._id,
      },
      "Request received to fetch assignable task users"
    );

    const result = await Tasks.getAssignableUsersForCreator({
      requester: req.user,
    });

    if (result.success) {
      return res.status(HTTP_STATUS_CODE.OK).json({
        success: true,
        data: result.data,
        message: "Assignable users fetched successfully",
      });
    }

    return res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
      success: false,
      message: result.message,
    });
  } catch (error) {
    logger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Failed to fetch assignable task users: ${error.message}`
    );
    return res.status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// API for fetch all tasks
exports.getAllTasksV1 = async (req, res) => {
  try {
    const {
      status,
      assignedUser,
      deadline,
      priority,
      page = 1,
      limit = 10,
    } = req.query;
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Request received to fetch all tasks`
    );
    let result = await Tasks.getAllTasks({
      status,
      assignedUser,
      deadline,
      priority,
      page,
      limit,
    });
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Successfully fetched all tasks`
      );
      res.status(HTTP_STATUS_CODE.OK).json({
        success: true,
        data: result.data,
        message: "Fetched all tasks successfully",
      });
    } else {
      logger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Failed to fetch all tasks. Error: ${result.message}`
      );
      res
        .status(HTTP_STATUS_CODE.BAD_REQUEST)
        .json({ success: false, message: result.message });
    }
  } catch (error) {
    logger.error({ error: error.message }, "Controller error");
    res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// API for fetch the task details by balagruha id and filter
exports.getTaskListByBalagruhaIdAndFilter = async (req, res) => {
  try {
    let userRole = req.user.role;
    let {
      balagruhaId,
      status,
      createdBy,
      priority,
      page = 1,
      limit = 10,
      assignedFor = [],
      type,
    } = req.body;
    let currentUserId = req.user._id;
    // RBAC: Validate balagruhaId against scope filter
    if (req.scopeFilter && req.scopeFilter.balagruhaId && balagruhaId) {
      const allowedIds = req.scopeFilter.balagruhaId.$in
        ? req.scopeFilter.balagruhaId.$in.map(id => id.toString())
        : [req.scopeFilter.balagruhaId.toString()];
      if (!allowedIds.includes(balagruhaId.toString())) {
        return res.status(HTTP_STATUS_CODE.FORBIDDEN).json({
          success: false,
          message: "Access denied: You do not have access to this Balagruha's tasks",
        });
      }
    }
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Request received to fetch task list by balagruha id and filter`
    );
    let result = await Tasks.getTaskListByBalagruhaIdAndFilter({
      balagruhaId,
      status,
      createdBy,
      priority,
      page,
      limit,
      currentUserId,
      userRole,
      assignedFor,
      type,
    });
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Successfully fetched task list by balagruha id and filter`
      );
      res.status(HTTP_STATUS_CODE.OK).json({
        success: true,
        data: result.data,
        message: "Fetched task list successfully",
      });
    } else {
      logger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Failed to fetch task list by balagruha id and filter. Error: ${result.message}`
      );
      res
        .status(HTTP_STATUS_CODE.BAD_REQUEST)
        .json({ success: false, message: result.message });
    }
  } catch (error) {
    logger.error({ error: error.message }, "Controller error");
    res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// API for fetch the task details by balagruha id and filter
exports.getTaskOverviewDetailsByBalagruhaId = async (req, res) => {
  try {
    const { balagruhaId } = req.params;
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Request received to fetch task overview details by balagruha id`
    );
    let result = await Tasks.getTaskOverviewDetailsByBalagruhaId({
      balagruhaId,
    });
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Successfully fetched task overview details by balagruha id`
      );
      res.status(HTTP_STATUS_CODE.OK).json({
        success: true,
        data: result.data,
        message: "Fetched task overview details successfully",
      });
    } else {
      logger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Failed to fetch task overview details by balagruha id. Error: ${result.message}`
      );
      res
        .status(HTTP_STATUS_CODE.BAD_REQUEST)
        .json({ success: false, message: result.message });
    }
  } catch (error) {
    logger.error({ error: error.message }, "Controller error");
    res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// API for update task status
exports.updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Request received to update task status`
    );
    let result = await Tasks.updateTaskStatus({ taskId: id, status });
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Successfully updated task status`
      );
      res.status(HTTP_STATUS_CODE.OK).json({
        success: true,
        data: result.data,
        message: "Task status updated successfully",
      });
    } else {
      logger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Failed to update task status. Error: ${result.message}`
      );
      res
        .status(HTTP_STATUS_CODE.BAD_REQUEST)
        .json({ success: false, message: result.message });
    }
  } catch (error) {
    logger.error({ error: error.message }, "Controller error");
    res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// API for add comments on task
exports.addCommentToTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { comments } = req.body;
    const attachments = req.files && req.files.attachments
      ? req.files.attachments
      : [];
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Request received to add comment to task`
    );
    let isOfflineReq = isRequestFromLocalhost(req);
    let result = await Tasks.addCommentToTask({
      taskId,
      comments: comments,
      createdById: req.user._id,
      attachments,
      isOfflineReq,
    });
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Successfully added comment to task`
      );
      res.status(HTTP_STATUS_CODE.OK).json({
        success: true,
        data: result.data,
        message: "Comment added successfully",
      });
    } else {
      logger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Failed to add comment to task. Error: ${result.message}`
      );
      res
        .status(HTTP_STATUS_CODE.BAD_REQUEST)
        .json({ success: false, message: result.message });
    }
  } catch (error) {
    logger.error({ error: error.message }, "Controller error");
    res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// API for add/ update the task attachment
exports.addOrUpdateTaskAttachment = async (req, res) => {
  try {
    const { taskId } = req.params;
    let attachments = req.files?.attachments || [];
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Request received to update task attachment`
    );
    let isOfflineReq = isRequestFromLocalhost(req);
    let result = await Tasks.addOrUpdateTaskAttachment({
      taskId,
      attachments,
      createdById: req.user._id,
      isOfflineReq,
    });
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Successfully updated task attachment`
      );
      res.status(HTTP_STATUS_CODE.OK).json({
        success: true,
        data: result.data,
        message: "Task attachment updated successfully",
      });
    } else {
      logger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Failed to update task attachment. Error: ${result.message}`
      );
      res
        .status(HTTP_STATUS_CODE.BAD_REQUEST)
        .json({ success: false, message: result.message });
    }
  } catch (error) {
    logger.error({ error: error.message }, "Controller error");
    res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// API for delete the task attachment by id
exports.deleteTaskAttachment = async (req, res) => {
  try {
    const { taskId, attachmentId } = req.params;
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Request received to delete task attachment`
    );
    let result = await Tasks.deleteTaskAttachment({ taskId, attachmentId });
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Successfully deleted task attachment`
      );
      res.status(HTTP_STATUS_CODE.OK).json({
        success: true,
        data: result.data,
        message: "Task attachment deleted successfully",
      });
    } else {
      logger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Failed to delete task attachment. Error: ${result.message}`
      );
      res
        .status(HTTP_STATUS_CODE.BAD_REQUEST)
        .json({ success: false, message: result.message });
    }
  } catch (error) {
    logger.error({ error: error.message }, "Controller error");
    res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// API for delete the task comment by id
exports.deleteTaskComment = async (req, res) => {
  try {
    const { taskId, commentId } = req.params;
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Request received to delete task comment`
    );
    let result = await Tasks.deleteTaskComment({ taskId, commentId });
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Successfully deleted task comment`
      );
      res.status(HTTP_STATUS_CODE.OK).json({
        success: true,
        data: result.data,
        message: "Task comment deleted successfully",
      });
    } else {
      logger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Failed to delete task comment. Error: ${result.message}`
      );
      res
        .status(HTTP_STATUS_CODE.BAD_REQUEST)
        .json({ success: false, message: result.message });
    }
  } catch (error) {
    logger.error({ error: error.message }, "Controller error");
    res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// API for fetch task details by task id
exports.getTaskDetailsById = async (req, res) => {
  try {
    const { taskId } = req.params;
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Request received to fetch task details by ID: ${taskId}`
    );

    let result = await Tasks.getTaskDetailsById({ taskId });

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Successfully fetched task details for ID: ${taskId}`
      );
      res.status(HTTP_STATUS_CODE.OK).json({
        success: true,
        data: result.data,
        message: "Task details fetched successfully",
      });
    } else {
      logger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Failed to fetch task details for ID: ${taskId}. Error: ${result.message}`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    logger.error({ error: error.message }, "Controller error");
    res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};
