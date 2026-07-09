const { HTTP_STATUS_CODE } = require("../constants/general");
const { logger } = require("../config/pino-config");
const SportsTask = require("../services/sportsTask");
const TrainingSession = require("../services/trainingSession");
const { isRequestFromLocalhost } = require("../utils/helper");
const { UserTypes } = require("../constants/users");
// API for create Task v1
exports.createSportsTask = async (req, res) => {
  try {
    if (req.user.role === UserTypes.STUDENT) {
      return res.status(HTTP_STATUS_CODE.FORBIDDEN).json({
        success: false,
        message: "Students are not allowed to create tasks",
      });
    }
    req.body.createdBy = req.user._id;
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Request received to create a new sports task`
    );
    const attachments = req.files ? req.files.map((file) => file.path) : [];
    req.body.attachments = attachments;
    let isOfflineReq = isRequestFromLocalhost(req);
    req.body.isOfflineReq = isOfflineReq;
    let result = await SportsTask.createTask(req.body);
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Successfully created a new sports task`
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
        `Failed to create a new sports task. Error: ${result.message}`
      );
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

// API for updating Task
exports.updateSportsTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    // Add updatedBy field to track who updated the task
    req.body.updatedBy = req.user._id;
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Request received to update sports task with ID: ${taskId}`
    );

    let result = await SportsTask.updateTask(taskId, req.body);
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Successfully updated sports task with ID: ${taskId}`
      );
      res.status(HTTP_STATUS_CODE.OK).json({
        success: true,
        data: result.data,
        message: "Task updated successfully",
      });
    } else {
      logger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Failed to update sports task with ID: ${taskId}. Error: ${result.message}`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    logger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Internal server error while updating sports task: ${error.message}`
    );
    res.status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// API for fetching sports tasks with pagination
exports.getSportsTasks = async (req, res) => {
  try {
    let {
      balagruhaId,
      status,
      priority,
      createdBy,
      page,
      limit,
      assignedFor,
    } = req.body;

    // RBAC: Validate balagruhaId against scope filter
    if (req.scopeFilter && req.scopeFilter.balagruhaId && balagruhaId) {
      const allowedIds = req.scopeFilter.balagruhaId.$in
        ? req.scopeFilter.balagruhaId.$in.map(id => id.toString())
        : [req.scopeFilter.balagruhaId.toString()];
      if (!allowedIds.includes(balagruhaId.toString())) {
        return res.status(HTTP_STATUS_CODE.FORBIDDEN).json({
          success: false,
          message: "Access denied: You do not have access to this Balagruha's sports tasks",
        });
      }
    }

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Request received to fetch sports tasks for balagruhaId: ${balagruhaId}`
    );

    // Process status, priority, and assignedIds from query params
    // const statusArray = status ? status.split(',') : null;
    // const priorityArray = priority ? priority.split(',') : null;
    // const createdByArray = createdBy ? createdBy.split(',') : null;
    // const assignedIdsArray = assignedIds ? assignedIds.split(',') : null;

    const filters = {
      balagruhaId,
      status: status,
      priority: priority,
      createdBy: createdBy,
      page: page || 1,
      limit: limit || 10,
      currentUserId: req.user._id,
      userRole: req.user.role,
      assignedIds: assignedFor,
    };

    const result = await SportsTask.getSportsTasks(filters);

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Successfully fetched sports tasks for balagruhaId: ${balagruhaId}`
      );

      res.status(HTTP_STATUS_CODE.OK).json({
        success: true,
        data: result.data,
        message: "Sports tasks fetched successfully",
      });
    } else {
      logger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Failed to fetch sports tasks. Error: ${result.message}`
      );

      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    logger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Internal server error while fetching sports tasks: ${error.message}`
    );

    res.status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// API for create Training Session
exports.createSportsTrainingSession = async (req, res) => {
  try {
    req.body.createdBy = req.user._id;
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Request received to create a new training session`
    );
    const attachments = req.files ? req.files.map((file) => file.path) : [];
    req.body.attachments = attachments;
    let result = await TrainingSession.createTrainingSession(req.body);
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Successfully created a new training session`
      );
      res.status(HTTP_STATUS_CODE.OK).json({
        success: true,
        data: result.data,
        message: "Training session created successfully",
      });
    } else {
      logger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Failed to create a new training session. Error: ${result.message}`
      );
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

// API for fetch all training sessions
exports.getAllTrainingSessions = async (req, res) => {
  try {
    let { balagruhaIds, type } = req.query;
    // RBAC: Restrict balagruhaIds to user's assigned scope
    if (req.scopeFilter && req.scopeFilter.balagruhaId && balagruhaIds) {
      const allowedIds = req.scopeFilter.balagruhaId.$in
        ? req.scopeFilter.balagruhaId.$in.map(id => id.toString())
        : [req.scopeFilter.balagruhaId.toString()];
      const requestedIds = typeof balagruhaIds === 'string' ? balagruhaIds.split(',') : balagruhaIds;
      balagruhaIds = requestedIds.filter(id => allowedIds.includes(id.toString()));
    }
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Request received to fetch all training sessions for balagruhaId: ${balagruhaIds}`
    );
    let result = await TrainingSession.getAllTrainingSessions({
      balagruhaIds,
      type,
    });
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Successfully fetched all training sessions for balagruhaId: ${balagruhaIds}`
      );
      res.status(HTTP_STATUS_CODE.OK).json({
        success: true,
        data: result.data,
        message: "Training sessions fetched successfully",
      });
    } else {
      logger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Failed to fetch all training sessions. Error: ${result.message}`
      );
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

// API for fetch the all students list with sports tasks by balagruhaId and filters
exports.getStudentsWithSportsTask = async (req, res) => {
  try {
    let { balagruhaId, assignedFor, status, priority } = req.body;
    // RBAC: Validate balagruhaId against scope filter
    if (req.scopeFilter && req.scopeFilter.balagruhaId && balagruhaId) {
      const allowedIds = req.scopeFilter.balagruhaId.$in
        ? req.scopeFilter.balagruhaId.$in.map(id => id.toString())
        : [req.scopeFilter.balagruhaId.toString()];
      if (!allowedIds.includes(balagruhaId.toString())) {
        return res.status(HTTP_STATUS_CODE.FORBIDDEN).json({
          success: false,
          message: "Access denied: You do not have access to this Balagruha",
        });
      }
    }
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Request received to fetch all students with sports tasks for balagruhaId: ${balagruhaId}`
    );
    let result = await SportsTask.getStudentsWithSportsTask({
      balagruhaId,
      assignedFor,
      status,
      priority,
    });
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Successfully fetched all students with sports tasks for balagruhaId: ${balagruhaId}`
      );
      res.status(HTTP_STATUS_CODE.OK).json({
        success: true,
        data: result.data,
        message: "Students fetched successfully",
      });
    } else {
      logger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Failed to fetch all students with sports tasks. Error: ${result.message}`
      );
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

// API for fetch the sports overview by balagruhaId
exports.getSportsInsights = async (req, res) => {
  try {
    let { date, balagruhaIds } = req.query;
    // RBAC: Restrict balagruhaIds to user's assigned scope
    if (req.scopeFilter && req.scopeFilter.balagruhaId && balagruhaIds) {
      const allowedIds = req.scopeFilter.balagruhaId.$in
        ? req.scopeFilter.balagruhaId.$in.map(id => id.toString())
        : [req.scopeFilter.balagruhaId.toString()];
      const requestedIds = typeof balagruhaIds === 'string' ? balagruhaIds.split(',') : balagruhaIds;
      balagruhaIds = requestedIds.filter(id => allowedIds.includes(id.toString()));
    }
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Request received to fetch sports overview for balagruhaId: ${balagruhaIds}`
    );
    let result = await SportsTask.getSportsInsights({ balagruhaIds, date });
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Successfully fetched sports overview for balagruhaIds: ${balagruhaIds}`
      );
      res.status(HTTP_STATUS_CODE.OK).json({
        success: true,
        data: result.data,
        message: "Sports overview fetched successfully",
      });
    } else {
      logger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Failed to fetch sports overview. Error: ${result.message}`
      );
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

// Api for edit training session
exports.editTrainingSession = async (req, res) => {
  try {
    const { trainingSessionId } = req.params;
    // Add updatedBy field to track who updated the task
    req.body.updatedBy = req.user._id;
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Request received to update training session with ID: ${trainingSessionId}`
    );
    let result = await TrainingSession.editTrainingSession({
      trainingSessionId: trainingSessionId,
      payload: req.body,
    });
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Successfully updated training session with ID: ${trainingSessionId}`
      );
      res.status(HTTP_STATUS_CODE.OK).json({
        success: true,
        data: result.data,
        message: "Training session updated successfully",
      });
    } else {
      logger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Failed to update training session with ID: ${trainingSessionId}. Error: ${result.message}`
      );
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

// API for delete training session
exports.deleteTrainingSession = async (req, res) => {
  try {
    const { trainingSessionId } = req.params;
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Request received to delete training session with ID: ${trainingSessionId}`
    );

    let result = await TrainingSession.deleteTrainingSession(trainingSessionId);
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Successfully deleted training session with ID: ${trainingSessionId}`
      );
      res.status(HTTP_STATUS_CODE.OK).json({
        success: true,
        data: result.data,
        message: "Training session deleted successfully",
      });
    } else {
      logger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Failed to delete training session with ID: ${trainingSessionId}. Error: ${result.message}`
      );
      res
        .status(HTTP_STATUS_CODE.BAD_REQUEST)
        .json({ success: false, message: result.message });
    }
  } catch (error) {
    logger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Internal server error while deleting training session: ${error.message}`
    );
    res.status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// API for add/ update the task attachment
exports.addOrUpdateSportsTaskAttachment = async (req, res) => {
  try {
    const { taskId } = req.params;
    let attachments = req.files["attachments"];
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Request received to update task attachment`
    );
    let isOfflineReq = isRequestFromLocalhost(req);
    let result = await SportsTask.addOrUpdateSportsTaskAttachment({
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
    res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// API for add comments on task
exports.addCommentToSportsTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { comments } = req.body;
    const attachments = req.files["attachments"];
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Request received to add comment to task`
    );
    let isOfflineReq = isRequestFromLocalhost(req);
    let result = await SportsTask.addCommentsToSportsTask({
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
    res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};
