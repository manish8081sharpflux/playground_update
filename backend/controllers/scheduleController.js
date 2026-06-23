const Schedule = require("../services/schedule");
const { HTTP_STATUS_CODE } = require("../constants/general");
const { logger } = require("../config/pino-config");
const { isValidDate } = require("../utils/dateHelper");

exports.createSchedule = async (req, res) => {
  try {
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      "Request received to create a new schedule"
    );
    let createdBy = req.user.id;
    req.body.createdBy = createdBy;
    req.body.userRole = req.user.role;
    const result = await Schedule.createScheduleNew(req.body);
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        "Schedule created successfully"
      );
      res
        .status(HTTP_STATUS_CODE.OK)
        .json({ success: true, data: result.data, message: result.message });
    } else {
      logger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Failed to create schedule: ${result.message}`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    logger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Error creating schedule: ${error.message}`
    );
    res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getScheduleById = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Request received to fetch schedule with ID: ${scheduleId}`
    );
    const result = await Schedule.getScheduleById(scheduleId);
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        "Schedule fetched successfully"
      );
      res
        .status(HTTP_STATUS_CODE.OK)
        .json({ success: true, data: result.data, message: result.message });
    } else {
      logger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Failed to fetch schedule: ${result.message}`
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
      `Error fetching schedule: ${error.message}`
    );
    res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getSchedules = async (req, res) => {
  try {
    // RBAC: Merge scope filter with query filters
    const filters = { ...req.query, ...(req.scopeFilter || {}) };
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      "Request received to fetch schedules with filters"
    );
    const result = await Schedule.getSchedules(filters);
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        "Schedules fetched successfully"
      );
      res
        .status(HTTP_STATUS_CODE.OK)
        .json({ success: true, data: result.data, message: result.message });
    } else {
      logger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Failed to fetch schedules: ${result.message}`
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
      `Error fetching schedules: ${error.message}`
    );
    res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.updateSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Request received to update schedule with ID: ${scheduleId}`
    );
    const result = await Schedule.updateSchedule(scheduleId, req.body);
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        "Schedule updated successfully"
      );
      res
        .status(HTTP_STATUS_CODE.OK)
        .json({ success: true, data: result.data, message: result.message });
    } else {
      logger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Failed to update schedule: ${result.message}`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    logger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Error updating schedule: ${error.message}`
    );
    res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.deleteSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Request received to delete schedule with ID: ${scheduleId}`
    );
    const result = await Schedule.deleteSchedule(scheduleId);
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        "Schedule deleted successfully"
      );
      res
        .status(HTTP_STATUS_CODE.OK)
        .json({ success: true, data: result.data, message: result.message });
    } else {
      logger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Failed to delete schedule: ${result.message}`
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
      `Error deleting schedule: ${error.message}`
    );
    res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getSchedulesByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Request received to fetch schedules for user: ${userId}`
    );
    const result = await Schedule.getSchedulesByUser(userId);
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        "User schedules fetched successfully"
      );
      res
        .status(HTTP_STATUS_CODE.OK)
        .json({ success: true, data: result.data, message: result.message });
    } else {
      logger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Failed to fetch user schedules: ${result.message}`
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
      `Error fetching user schedules: ${error.message}`
    );
    res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getSchedulesForAdmin = async (req, res) => {
  try {
    let { balagruhaIds, assignedTo, startDate, endDate, status } = req.body;
    // RBAC: Restrict balagruhaIds to user's assigned scope
    if (req.scopeFilter && req.scopeFilter.balagruhaId) {
      const allowedIds = req.scopeFilter.balagruhaId.$in
        ? req.scopeFilter.balagruhaId.$in.map(id => id.toString())
        : [req.scopeFilter.balagruhaId.toString()];
      balagruhaIds = (balagruhaIds || []).filter(id => allowedIds.includes(id.toString()));
    }
    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
        success: false,
        message: "Invalid startDate / endDate format",
      });
    }
    const result = await Schedule.getSchedulesForAdmin(
      balagruhaIds,
      assignedTo,
      startDate,
      endDate,
      status
    );
    if (result.success) {
      res
        .status(HTTP_STATUS_CODE.OK)
        .json({ success: true, data: result.data, message: result.message });
    } else {
      res
        .status(HTTP_STATUS_CODE.BAD_REQUEST)
        .json({ success: false, data: {}, message: result.message });
    }
  } catch (error) {
    logger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Error fetching schedules for admin: ${error.message}`
    );
    res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getSchedulesForCoach = async (req, res) => {
  try {
    let { balagruhaIds, assignedTo, startDate, endDate, status } = req.body;
    // RBAC: Restrict balagruhaIds to user's assigned scope
    if (req.scopeFilter && req.scopeFilter.balagruhaId) {
      const allowedIds = req.scopeFilter.balagruhaId.$in
        ? req.scopeFilter.balagruhaId.$in.map(id => id.toString())
        : [req.scopeFilter.balagruhaId.toString()];
      balagruhaIds = (balagruhaIds || []).filter(id => allowedIds.includes(id.toString()));
    }
    const result = await Schedule.getSchedulesForCoach(
      balagruhaIds,
      assignedTo,
      startDate,
      endDate,
      status
    );
    if (result.success) {
      res
        .status(HTTP_STATUS_CODE.OK)
        .json({ success: true, data: result.data, message: result.message });
    } else {
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
      `Error fetching schedules for coach: ${error.message}`
    );
    res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.updateScheduleStatus = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { status } = req.body;
    const result = await Schedule.updateScheduleStatus(scheduleId, status);
    if (result.success) {
      res
        .status(HTTP_STATUS_CODE.OK)
        .json({ success: true, data: result.data, message: result.message });
    } else {
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
      `Error updating schedule status: ${error.message}`
    );
    res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
