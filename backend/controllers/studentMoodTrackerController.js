const { logger, errorLogger } = require("../config/pino-config");
const moodTrackerService = require("../services/studentMoodTracker");

// Create or update mood entry
exports.createOrUpdateMoodEntry = async (req, res) => {
  try {
    // get the userId from the token
    const userId = req.user ? req.user._id : null;
    req.body.userId = userId;
    // Add current user as creator if not specified
    if (!req.body.userId && req.user) {
      req.body.userId = req.user._id;
    }

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: req.body,
      },
      "Request received for creating/updating mood entry"
    );

    const result = await moodTrackerService.createOrUpdateMoodEntry(req.body);

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        "Successfully processed mood entry"
      );
      return res.status(201).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Error occurred while processing mood entry: ${result.message}`
      );
      return res.status(400).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: { error: error.message },
      },
      `Error occurred while processing mood entry request: ${error.message}`
    );
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get mood entries by userId
exports.getMoodEntriesByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Request received for fetching mood entries for user: ${userId}`
    );

    const result = await moodTrackerService.getMoodEntriesByUserId(userId);

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        "Successfully fetched mood entries"
      );
      return res.status(200).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Error occurred while fetching mood entries: ${result.message}`
      );
      return res.status(400).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: { error: error.message },
      },
      `Error occurred while processing get mood entries request: ${error.message}`
    );
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get mood entry by id
exports.getMoodEntryById = async (req, res) => {
  try {
    const id = req.params.id;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Request received for fetching mood entry with ID: ${id}`
    );

    const result = await moodTrackerService.getMoodEntryById(id);

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        "Successfully fetched mood entry"
      );
      return res.status(200).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Error occurred while fetching mood entry: ${result.message}`
      );
      return res.status(404).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: { error: error.message },
      },
      `Error occurred while processing get mood entry request: ${error.message}`
    );
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Update mood entry
exports.updateMoodEntry = async (req, res) => {
  try {
    const entryId = req.params.entryId;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: req.body,
      },
      `Request received for updating mood entry with ID: ${entryId}`
    );

    const result = await moodTrackerService.updateMoodEntry(entryId, req.body);

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        "Successfully updated mood entry"
      );
      return res.status(200).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Error occurred while updating mood entry: ${result.message}`
      );
      return res.status(404).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: { error: error.message },
      },
      `Error occurred while processing update mood entry request: ${error.message}`
    );
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Delete mood entry
exports.deleteMoodEntry = async (req, res) => {
  try {
    const id = req.params.id;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Request received for deleting mood entry with ID: ${id}`
    );

    const result = await moodTrackerService.deleteMoodEntry(id);

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        "Successfully deleted mood entry"
      );
      return res.status(200).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Error occurred while deleting mood entry: ${result.message}`
      );
      return res.status(404).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: { error: error.message },
      },
      `Error occurred while processing delete mood entry request: ${error.message}`
    );
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get mood entries by date range
exports.getMoodEntriesByDateRange = async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: req.query,
      },
      `Request received for fetching mood entries by date range for user: ${userId}`
    );

    const result = await moodTrackerService.getMoodEntriesByDateRange(
      userId,
      startDate,
      endDate
    );

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        "Successfully fetched mood entries by date range"
      );
      return res.status(200).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Error occurred while fetching mood entries by date range: ${result.message}`
      );
      return res.status(400).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: { error: error.message },
      },
      `Error occurred while processing get mood entries by date range request: ${error.message}`
    );
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// API: get latest mood entry by balagruhaIds list
exports.getLatestMoodEntry = async (req, res) => {
  try {
    let { balagruhaIds } = req.body;
    // RBAC: Restrict balagruhaIds to user's assigned scope
    if (req.scopeFilter && req.scopeFilter.balagruhaId) {
      const allowedIds = req.scopeFilter.balagruhaId.$in
        ? req.scopeFilter.balagruhaId.$in.map(id => id.toString())
        : [req.scopeFilter.balagruhaId.toString()];
      balagruhaIds = (balagruhaIds || []).filter(id => allowedIds.includes(id.toString()));
    }
    const result = await moodTrackerService.getLatestMoodEntry(balagruhaIds);
    return res.status(200).json(result);
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: { error: error.message },
      },
      `Error occurred while processing get latest mood entry request: ${error.message}`
    );
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
