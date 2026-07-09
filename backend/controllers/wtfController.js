const { errorLogger, logger } = require("../config/pino-config");
const { HTTP_STATUS_CODE } = require("../constants/general");
const WtfService = require("../services/wtf");
const { default: mongoose } = require("mongoose");

// ==================== PIN MANAGEMENT CONTROLLERS ====================

// Create a new WTF pin
exports.createPin = async (req, res) => {
  try {
    const logData = { ...req.body };
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: logData,
        file: req.file
          ? {
              name: req.file.filename,
              size: req.file.size,
              type: req.file.mimetype,
            }
          : null,
        userId: req.user?.id,
      },
      `Request received for WTF pin creation`
    );

    // Include file information only when present
    const payload = { ...req.body };
    if (req.file) {
      payload.file = req.file;
    }

    const result = await WtfService.createPin(payload);

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          pinId: result.data._id,
          userId: req.user?.id,
        },
        `WTF pin created successfully`
      );
      res.status(HTTP_STATUS_CODE.CREATED).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          error: result.message,
          userId: req.user?.id,
        },
        `Failed to create WTF pin`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        error: error.message,
        userId: req.user?.id,
      },
      `Error occurred while creating WTF pin`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Get active pins for students
exports.getActivePins = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      isOfficial,
      officialCategory,
      dateFrom,
      dateTo,
      source,
      pinType,
    } = req.query;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        query: req.query,
        userId: req.user?.id,
      },
      `Request received to fetch active WTF pins`
    );

    // Use different service based on user role
    // Admins can see all active pins (including expired), students see only non-expired pins
    const isAdmin =
      req.user?.role === "admin" || req.user?.role === "superadmin";
    const result = isAdmin
      ? await WtfService.getActivePinsForAdmin({
          page: parseInt(page),
          limit: parseInt(limit),
          type: type || null,
          isOfficial:
            isOfficial === "true"
              ? true
              : isOfficial === "false"
              ? false
              : null,
          officialCategory: officialCategory || null,
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
          source: source || null,
          pinType: pinType || null,
        })
      : await WtfService.getActivePinsForStudents({
          page: parseInt(page),
          limit: parseInt(limit),
          type: type || null,
          isOfficial:
            isOfficial === "true"
              ? true
              : isOfficial === "false"
              ? false
              : null,
          officialCategory: officialCategory || null,
        });

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          pinsCount: result.data.length,
          userId: req.user?.id,
        },
        `Successfully fetched active WTF pins`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          error: result.message,
          userId: req.user?.id,
        },
        `Failed to fetch active WTF pins`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        error: error.message,
        userId: req.user?.id,
      },
      `Error occurred while fetching active WTF pins`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Get pins by status (Admin only)
exports.getPinsByStatus = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = "archived",
      type,
      isOfficial,
    } = req.query;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        query: req.query,
        userId: req.user?.id,
      },
      `Request received to fetch pins by status`
    );

    const result = await WtfService.getPinsByStatus({
      status,
      page: parseInt(page),
      limit: parseInt(limit),
      type: type || null,
      isOfficial:
        isOfficial === "true" ? true : isOfficial === "false" ? false : null,
    });

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          pinsCount: result?.data?.pins?.length,
          userId: req.user?.id,
        },
        `Successfully fetched pins by status`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          error: result.message,
          userId: req.user?.id,
        },
        `Failed to fetch pins by status`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        error: error.message,
        userId: req.user?.id,
      },
      `Error occurred while fetching pins by status`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Get drafts (Admin only)
exports.getDrafts = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, author, isOfficial } = req.query;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        query: req.query,
        userId: req.user?.id,
      },
      `Request received to fetch WTF drafts`
    );

    const result = await WtfService.getDrafts({
      page: parseInt(page),
      limit: parseInt(limit),
      type: type || null,
      author: req.user?.id, // Always use the authenticated user's ID
      isOfficial:
        isOfficial === "true" ? true : isOfficial === "false" ? false : null,
    });

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          draftsCount: result.data.pins?.length || 0,
          userId: req.user?.id,
        },
        `Successfully fetched WTF drafts`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          error: result.message,
          userId: req.user?.id,
        },
        `Failed to fetch WTF drafts`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        error: error.message,
        userId: req.user?.id,
      },
      `Error occurred while fetching WTF drafts`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Get pin by ID
exports.getPinById = async (req, res) => {
  try {
    const { pinId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(pinId)) {
      return res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
        success: false,
        message: "Invalid pin ID format",
      });
    }

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        pinId,
        userId: req.user?.id,
      },
      `Request received to fetch WTF pin by ID`
    );

    const result = await WtfService.getPinById(pinId);

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          pinId,
          userId: req.user?.id,
        },
        `Successfully fetched WTF pin`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          pinId,
          error: result.message,
          userId: req.user?.id,
        },
        `Failed to fetch WTF pin`
      );
      res.status(HTTP_STATUS_CODE.NOT_FOUND).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        pinId: req.params.pinId,
        error: error.message,
        userId: req.user?.id,
      },
      `Error occurred while fetching WTF pin`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Update pin
exports.updatePin = async (req, res) => {
  try {
    const { pinId } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(pinId)) {
      return res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
        success: false,
        message: "Invalid pin ID format",
      });
    }

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        pinId,
        updateData,
        userId: req.user?.id,
      },
      `Request received to update WTF pin`
    );

    const result = await WtfService.updatePin(pinId, updateData);

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          pinId,
          userId: req.user?.id,
        },
        `Successfully updated WTF pin`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          pinId,
          error: result.message,
          userId: req.user?.id,
        },
        `Failed to update WTF pin`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        pinId: req.params.pinId,
        error: error.message,
        userId: req.user?.id,
      },
      `Error occurred while updating WTF pin`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Delete pin
exports.deletePin = async (req, res) => {
  try {
    const { pinId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(pinId)) {
      return res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
        success: false,
        message: "Invalid pin ID format",
      });
    }

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        pinId,
        userId: req.user?.id,
      },
      `Request received to delete WTF pin`
    );

    const result = await WtfService.deletePin(pinId);

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          pinId,
          userId: req.user?.id,
        },
        `Successfully deleted WTF pin`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          pinId,
          error: result.message,
          userId: req.user?.id,
        },
        `Failed to delete WTF pin`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        pinId: req.params.pinId,
        error: error.message,
        userId: req.user?.id,
      },
      `Error occurred while deleting WTF pin`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Change pin status
exports.changePinStatus = async (req, res) => {
  try {
    const { pinId } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(pinId)) {
      return res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
        success: false,
        message: "Invalid pin ID format",
      });
    }

    if (!status) {
      return res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
        success: false,
        message: "Status is required",
      });
    }

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        pinId,
        status,
        userId: req.user?.id,
      },
      `Request received to change WTF pin status`
    );

    const result = await WtfService.changePinStatus(pinId, status);

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          pinId,
          status,
          userId: req.user?.id,
        },
        `Successfully changed WTF pin status`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          pinId,
          status,
          error: result.message,
          userId: req.user?.id,
        },
        `Failed to change WTF pin status`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        pinId: req.params.pinId,
        error: error.message,
        userId: req.user?.id,
      },
      `Error occurred while changing WTF pin status`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Reorder pins (Admin only)
exports.reorderPins = async (req, res) => {
  try {
    const { orderedPinIds } = req.body || {};

    const result = await WtfService.reorderPins(orderedPinIds);

    if (result.success) {
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        error: error.message,
        userId: req.user?.id,
      },
      `Error occurred while reordering WTF pins`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// ==================== INTERACTION CONTROLLERS ====================

// Like/unlike pin
exports.likePin = async (req, res) => {
  try {
    const { pinId } = req.params;
    const { likeType = "thumbs_up" } = req.body;
    const studentId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(pinId)) {
      return res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
        success: false,
        message: "Invalid pin ID format",
      });
    }

    if (!studentId) {
      return res.status(HTTP_STATUS_CODE.UNAUTHORIZED).json({
        success: false,
        message: "User authentication required",
      });
    }

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        pinId,
        studentId,
        likeType,
      },
      `Request received to like/unlike WTF pin`
    );

    const result = await WtfService.likePin(studentId, pinId, likeType);

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          pinId,
          studentId,
          action: result.data.action,
        },
        `Successfully processed pin like interaction`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          pinId,
          studentId,
          error: result.message,
        },
        `Failed to process pin like interaction`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        pinId: req.params.pinId,
        studentId: req.user?.id,
        error: error.message,
      },
      `Error occurred while processing pin like interaction`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Love/unlove pin
exports.lovePin = async (req, res) => {
  try {
    const { pinId } = req.params;
    const studentId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(pinId)) {
      return res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
        success: false,
        message: "Invalid pin ID format",
      });
    }

    if (!studentId) {
      return res.status(HTTP_STATUS_CODE.UNAUTHORIZED).json({
        success: false,
        message: "User authentication required",
      });
    }

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        pinId,
        studentId,
      },
      `Request received to love/unlove WTF pin`
    );

    const result = await WtfService.lovePin(studentId, pinId);

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          pinId,
          studentId,
          action: result.data.action,
        },
        `Successfully processed pin love interaction`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          pinId,
          studentId,
          error: result.message,
        },
        `Failed to process pin love interaction`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        pinId: req.params.pinId,
        studentId: req.user?.id,
        error: error.message,
      },
      `Error occurred while processing pin love interaction`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Mark pin as seen
exports.markPinAsSeen = async (req, res) => {
  try {
    const { pinId } = req.params;
    const { viewDuration = 0 } = req.body;
    const studentId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(pinId)) {
      return res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
        success: false,
        message: "Invalid pin ID format",
      });
    }

    if (!studentId) {
      return res.status(HTTP_STATUS_CODE.UNAUTHORIZED).json({
        success: false,
        message: "User authentication required",
      });
    }

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        pinId,
        studentId,
        viewDuration,
      },
      `Request received to mark WTF pin as seen`
    );

    const result = await WtfService.markPinAsSeen(
      studentId,
      pinId,
      viewDuration
    );

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          pinId,
          studentId,
          action: result.data.action,
        },
        `Successfully marked pin as seen`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          pinId,
          studentId,
          error: result.message,
        },
        `Failed to mark pin as seen`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        pinId: req.params.pinId,
        studentId: req.user?.id,
        error: error.message,
      },
      `Error occurred while marking pin as seen`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Get pin interactions
exports.getPinInteractions = async (req, res) => {
  try {
    const { pinId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(pinId)) {
      return res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
        success: false,
        message: "Invalid pin ID format",
      });
    }

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        pinId,
        userId: req.user?.id,
      },
      `Request received to fetch WTF pin interactions`
    );

    const result = await WtfService.getPinInteractions(pinId);

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          pinId,
          userId: req.user?.id,
        },
        `Successfully fetched WTF pin interactions`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          pinId,
          error: result.message,
          userId: req.user?.id,
        },
        `Failed to fetch WTF pin interactions`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        pinId: req.params.pinId,
        error: error.message,
        userId: req.user?.id,
      },
      `Error occurred while fetching WTF pin interactions`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// ==================== SUBMISSION CONTROLLERS ====================

// Submit voice note
exports.submitVoiceNote = async (req, res) => {
  try {
    const studentId = req.user?.id;
    const submissionData = req.body;
    if (req.file) submissionData.file = req.file;

    if (!studentId) {
      return res.status(HTTP_STATUS_CODE.UNAUTHORIZED).json({
        success: false,
        message: "User authentication required",
      });
    }

    // Add request metadata
    submissionData.userAgent = req.get("User-Agent");
    submissionData.ipAddress = req.socket.remoteAddress;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        studentId,
        title: submissionData.title,
      },
      `Request received to submit voice note`
    );

    const result = await WtfService.submitVoiceNote(studentId, submissionData);

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          studentId,
          submissionId: result.data._id,
        },
        `Successfully submitted voice note`
      );
      res.status(HTTP_STATUS_CODE.CREATED).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          studentId,
          error: result.message,
        },
        `Failed to submit voice note`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        studentId: req.user?.id,
        error: error.message,
      },
      `Error occurred while submitting voice note`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Submit media (image/video) as a student submission
exports.submitMedia = async (req, res) => {
  try {
    const studentId = req.user?.id;
    const submissionData = { ...req.body };
    if (req.file) {
      submissionData.file = req.file;
    }
    if (!studentId) {
      return res.status(HTTP_STATUS_CODE.UNAUTHORIZED).json({
        success: false,
        message: "User authentication required",
      });
    }

    // Basic validation
    const allowedTypes = ["image", "video"];
    const type = (submissionData.type || "").toLowerCase();
    if (!allowedTypes.includes(type)) {
      return res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
        success: false,
        message: "Invalid media type. Must be 'image' or 'video'",
      });
    }

    const result = await WtfService.submitMedia(studentId, submissionData);

    if (result.success) {
      res.status(HTTP_STATUS_CODE.CREATED).json(result);
    } else {
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        studentId: req.user?.id,
        error: error.message,
      },
      `Error occurred while submitting media`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Submit article
exports.submitArticle = async (req, res) => {
  try {
    const studentId = req.user?.id;
    const submissionData = req.body;

    if (!studentId) {
      return res.status(HTTP_STATUS_CODE.UNAUTHORIZED).json({
        success: false,
        message: "User authentication required",
      });
    }

    // Add request metadata
    submissionData.userAgent = req.get("User-Agent");
    submissionData.ipAddress = req.socket.remoteAddress;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        studentId,
        title: submissionData.title,
      },
      `Request received to submit article`
    );

    const result = await WtfService.submitArticle(studentId, submissionData);

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          studentId,
          submissionId: result.data._id,
        },
        `Successfully submitted article`
      );
      res.status(HTTP_STATUS_CODE.CREATED).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          studentId,
          error: result.message,
        },
        `Failed to submit article`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        studentId: req.user?.id,
        error: error.message,
      },
      `Error occurred while submitting article`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Get submissions for review (Admin only)
exports.getSubmissionsForReview = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, isCoachSuggestion, status } = req.query;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        query: req.query,
        userId: req.user?.id,
      },
      `Request received to fetch submissions for review`
    );

    const result = await WtfService.getSubmissionsForReview({
      page: parseInt(page),
      limit: parseInt(limit),
      type: type || null,
      isCoachSuggestion:
        isCoachSuggestion === "true"
          ? true
          : isCoachSuggestion === "false"
          ? false
          : null,
      status: status || null,
    });

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          submissionsCount: result.data.length,
          userId: req.user?.id,
        },
        `Successfully fetched submissions for review`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          error: result.message,
          userId: req.user?.id,
        },
        `Failed to fetch submissions for review`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        error: error.message,
        userId: req.user?.id,
      },
      `Error occurred while fetching submissions for review`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Review submission (Admin only)
exports.reviewSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { action, notes = "" } = req.body;
    const reviewerId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      return res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
        success: false,
        message: "Invalid submission ID format",
      });
    }

    if (!reviewerId) {
      return res.status(HTTP_STATUS_CODE.UNAUTHORIZED).json({
        success: false,
        message: "Reviewer authentication required",
      });
    }

    if (
      !action ||
      ![
        "approve",
        "reject",
        "archive",
        "mark_reviewed",
        "consider_future",
      ].includes(action)
    ) {
      return res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
        success: false,
        message:
          "Valid action (approve/reject/archive/mark_reviewed/consider_future) is required",
      });
    }

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        submissionId,
        action,
        reviewerId,
      },
      `Request received to review submission`
    );

    const result = await WtfService.reviewSubmission(
      submissionId,
      reviewerId,
      action,
      notes
    );

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          submissionId,
          action,
          reviewerId,
        },
        `Successfully reviewed submission`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          submissionId,
          action,
          error: result.message,
          reviewerId,
        },
        `Failed to review submission`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        submissionId: req.params.submissionId,
        error: error.message,
        reviewerId: req.user?.id,
      },
      `Error occurred while reviewing submission`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// List archived submissions (Admin only)
exports.getArchivedSubmissions = async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        query: req.query,
        userId: req.user?.id,
      },
      `Request received to fetch archived submissions`
    );

    const result = await WtfService.listArchivedSubmissions({
      page: parseInt(page),
      limit: parseInt(limit),
      type: type || null,
    });

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          userId: req.user?.id,
        },
        `Successfully fetched archived submissions`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          error: result.message,
          userId: req.user?.id,
        },
        `Failed to fetch archived submissions`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        error: error.message,
        userId: req.user?.id,
      },
      `Error occurred while fetching archived submissions`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Unarchive a submission (Admin only)
exports.unarchiveSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      return res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
        success: false,
        message: "Invalid submission ID format",
      });
    }

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        submissionId,
        userId: req.user?.id,
      },
      `Request received to unarchive submission`
    );

    const result = await WtfService.unarchiveSubmission(submissionId);

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          submissionId,
          userId: req.user?.id,
        },
        `Successfully unarchived submission`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          submissionId,
          error: result.message,
          userId: req.user?.id,
        },
        `Failed to unarchive submission`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        submissionId: req.params.submissionId,
        error: error.message,
        userId: req.user?.id,
      },
      `Error occurred while unarchiving submission`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// ==================== ANALYTICS CONTROLLERS ====================

// Get WTF analytics
exports.getWtfAnalytics = async (req, res) => {
  try {
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
      },
      `Request received to fetch WTF analytics`
    );

    const result = await WtfService.getWtfAnalytics();

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          userId: req.user?.id,
        },
        `Successfully fetched WTF analytics`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          error: result.message,
          userId: req.user?.id,
        },
        `Failed to fetch WTF analytics`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        error: error.message,
        userId: req.user?.id,
      },
      `Error occurred while fetching WTF analytics`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Get interaction analytics
exports.getInteractionAnalytics = async (req, res) => {
  try {
    const { days = 7, type } = req.query;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        query: req.query,
        userId: req.user?.id,
      },
      `Request received to fetch interaction analytics`
    );

    const result = await WtfService.getInteractionAnalytics({
      days: parseInt(days),
      type: type || null,
    });

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          userId: req.user?.id,
        },
        `Successfully fetched interaction analytics`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          error: result.message,
          userId: req.user?.id,
        },
        `Failed to fetch interaction analytics`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        error: error.message,
        userId: req.user?.id,
      },
      `Error occurred while fetching interaction analytics`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Get submission analytics
exports.getSubmissionAnalytics = async (req, res) => {
  try {
    const { days = 30, type } = req.query;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        query: req.query,
        userId: req.user?.id,
      },
      `Request received to fetch submission analytics`
    );

    const result = await WtfService.getSubmissionAnalytics({
      days: parseInt(days),
      type: type || null,
    });

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          userId: req.user?.id,
        },
        `Successfully fetched submission analytics`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          error: result.message,
          userId: req.user?.id,
        },
        `Failed to fetch submission analytics`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        error: error.message,
        userId: req.user?.id,
      },
      `Error occurred while fetching submission analytics`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// ==================== STUDENT MANAGEMENT CONTROLLERS ====================

// Get student submissions
exports.getStudentSubmissions = async (req, res) => {
  try {
    const studentId = req.user?.id;
    const { page = 1, limit = 20, status, type } = req.query;

    if (!studentId) {
      return res.status(HTTP_STATUS_CODE.UNAUTHORIZED).json({
        success: false,
        message: "User authentication required",
      });
    }

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        studentId,
        query: req.query,
      },
      `Request received to fetch student submissions`
    );

    const result = await WtfService.getStudentSubmissions(studentId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status: status || null,
      type: type || null,
    });

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          studentId,
          submissionsCount: result.data.length,
        },
        `Successfully fetched student submissions`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          studentId,
          error: result.message,
        },
        `Failed to fetch student submissions`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        studentId: req.user?.id,
        error: error.message,
      },
      `Error occurred while fetching student submissions`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Get student interaction history
exports.getStudentInteractionHistory = async (req, res) => {
  try {
    const studentId = req.user?.id;
    const { page = 1, limit = 50, type } = req.query;

    if (!studentId) {
      return res.status(HTTP_STATUS_CODE.UNAUTHORIZED).json({
        success: false,
        message: "User authentication required",
      });
    }

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        studentId,
        query: req.query,
      },
      `Request received to fetch student interaction history`
    );

    const result = await WtfService.getStudentInteractionHistory(studentId, {
      page: parseInt(page),
      limit: parseInt(limit),
      type: type || null,
    });

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          studentId,
          interactionsCount: result.data.length,
        },
        `Successfully fetched student interaction history`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          studentId,
          error: result.message,
        },
        `Failed to fetch student interaction history`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        studentId: req.user?.id,
        error: error.message,
      },
      `Error occurred while fetching student interaction history`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// ==================== ADMIN MANAGEMENT CONTROLLERS ====================

// Get pins by author
exports.getPinsByAuthor = async (req, res) => {
  try {
    const { authorId } = req.params;
    const { page = 1, limit = 20, status } = req.query;

    if (!mongoose.Types.ObjectId.isValid(authorId)) {
      return res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
        success: false,
        message: "Invalid author ID format",
      });
    }

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        authorId,
        query: req.query,
        userId: req.user?.id,
      },
      `Request received to fetch pins by author`
    );

    const result = await WtfService.getPinsByAuthor(authorId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status: status || null,
    });

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          authorId,
          pinsCount: result.data.length,
          userId: req.user?.id,
        },
        `Successfully fetched pins by author`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          authorId,
          error: result.message,
          userId: req.user?.id,
        },
        `Failed to fetch pins by author`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        authorId: req.params.authorId,
        error: error.message,
        userId: req.user?.id,
      },
      `Error occurred while fetching pins by author`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Get submission stats
exports.getSubmissionStats = async (req, res) => {
  try {
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
      },
      `Request received to fetch submission stats`
    );

    const result = await WtfService.getSubmissionStats();

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          userId: req.user?.id,
        },
        `Successfully fetched submission stats`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          error: result.message,
          userId: req.user?.id,
        },
        `Failed to fetch submission stats`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        error: error.message,
        userId: req.user?.id,
      },
      `Error occurred while fetching submission stats`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// ==================== DASHBOARD METRICS CONTROLLERS ====================

// Get WTF dashboard metrics
exports.getWtfDashboardMetrics = async (req, res) => {
  try {
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
      },
      `Request received to fetch WTF dashboard metrics`
    );

    const result = await WtfService.getWtfDashboardMetrics();

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          userId: req.user?.id,
        },
        `Successfully fetched WTF dashboard metrics`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          error: result.message,
          userId: req.user?.id,
        },
        `Failed to fetch WTF dashboard metrics`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        error: error.message,
        userId: req.user?.id,
      },
      `Error occurred while fetching WTF dashboard metrics`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Get unified dashboard counts
exports.getDashboardCounts = async (req, res) => {
  try {
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
      },
      `Request received to fetch dashboard counts`
    );

    const result = await WtfService.getWtfDashboardCounts();

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          userId: req.user?.id,
          counts: result.data,
        },
        `Successfully fetched dashboard counts`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          error: result.message,
          userId: req.user?.id,
        },
        `Failed to fetch dashboard counts`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        error: error.message,
        userId: req.user?.id,
      },
      `Error occurred while fetching dashboard counts`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Get active pins count (legacy - kept for backward compatibility)
exports.getActivePinsCount = async (req, res) => {
  try {
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
      },
      `Request received to fetch active pins count`
    );

    const result = await WtfService.getActivePinsCount();

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          userId: req.user?.id,
        },
        `Successfully fetched active pins count`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          error: result.message,
          userId: req.user?.id,
        },
        `Failed to fetch active pins count`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        error: error.message,
        userId: req.user?.id,
      },
      `Error occurred while fetching active pins count`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Get total engagement
exports.getWtfTotalEngagement = async (req, res) => {
  try {
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
      },
      `Request received to fetch total engagement`
    );

    const result = await WtfService.getWtfTotalEngagement();

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          userId: req.user?.id,
        },
        `Successfully fetched total engagement`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          error: result.message,
          userId: req.user?.id,
        },
        `Failed to fetch total engagement`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        error: error.message,
        userId: req.user?.id,
      },
      `Error occurred while fetching total engagement`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Get coach suggestions count
exports.getCoachSuggestionsCount = async (req, res) => {
  try {
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
      },
      `Request received to fetch coach suggestions count`
    );

    const result = await WtfService.getCoachSuggestionsCount();

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          userId: req.user?.id,
        },
        `Successfully fetched coach suggestions count`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          error: result.message,
          userId: req.user?.id,
        },
        `Failed to fetch coach suggestions count`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        error: error.message,
        userId: req.user?.id,
      },
      `Error occurred while fetching coach suggestions count`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Get coach suggestions
exports.getCoachSuggestions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, coachId } = req.query;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?.id,
        query: req.query,
      },
      `Request received to fetch coach suggestions`
    );

    const result = await WtfService.getCoachSuggestions({
      page: parseInt(page),
      limit: parseInt(limit),
      status: status || null,
      coachId: coachId || null,
    });

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          userId: req.user?.id,
          suggestionsCount: result.data.length,
        },
        `Successfully fetched coach suggestions`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          error: result.message,
          userId: req.user?.id,
        },
        `Failed to fetch coach suggestions`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        error: error.message,
        userId: req.user?.id,
      },
      `Error occurred while fetching coach suggestions`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// ==================== COACH SUGGESTIONS CONTROLLERS ====================

// Create coach suggestion
exports.createCoachSuggestion = async (req, res) => {
  try {
    const logData = { ...req.body };

    // Add coach information from authenticated user
    const payload = {
      ...req.body,
      coachId: req.user?.id,
      suggestedBy: req.user?.name || req.user?.email || "Coach",
    };

    if (req.file) {
      payload.file = req.file;
    }

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: logData,
        userId: req.user?.id,
        coachId: req.user?.id,
      },
      `Request received for coach suggestion creation`
    );

    const result = await WtfService.createCoachSuggestion(payload);

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          suggestionId: result.data.id,
          userId: req.user?.id,
          studentName: payload.studentName,
        },
        `Coach suggestion created successfully`
      );
      res.status(HTTP_STATUS_CODE.CREATED).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          error: result.message,
          userId: req.user?.id,
        },
        `Failed to create coach suggestion`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        error: error.message,
        userId: req.user?.id,
      },
      `Error occurred while creating coach suggestion`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// ==================== COIN REWARD CONTROLLERS ====================

// Award coins for pinned content (called after admin pins student work)
exports.awardCoinsForPin = async (req, res) => {
  try {
    const { pinId } = req.params;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        pinId,
        adminId: req.user?.id,
      },
      `Request received to award coins for pinned content`
    );

    // Get pin data first
    const pinResult = await WtfService.getPinById(pinId);
    if (!pinResult.success) {
      return res.status(HTTP_STATUS_CODE.NOT_FOUND).json({
        success: false,
        message: "Pin not found",
      });
    }

    // Award coins for the pinned content
    const result = await WtfService.awardCoinsForPinnedContent(pinResult.data);

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          pinId,
          coinsAwarded: result.coinsAwarded,
          adminId: req.user?.id,
        },
        `Successfully awarded coins for pinned content`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          error: result.message,
          pinId,
          adminId: req.user?.id,
        },
        `Failed to award coins for pinned content`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        error: error.message,
        pinId: req.params.pinId,
        adminId: req.user?.id,
      },
      `Error occurred while awarding coins for pinned content`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Award milestone coins for highly liked content
exports.awardMilestoneCoins = async (req, res) => {
  try {
    const { pinId } = req.params;
    const { likeCount, likeType } = req.body;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        pinId,
        likeCount,
        likeType,
        userId: req.user?.id,
      },
      `Request received to award milestone coins`
    );

    const result = await WtfService.awardMilestoneCoins(
      pinId,
      likeCount,
      likeType
    );

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          pinId,
          coinsAwarded: result.coinsAwarded,
          userId: req.user?.id,
        },
        `Successfully processed milestone coins`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          error: result.message,
          pinId,
          userId: req.user?.id,
        },
        `Failed to award milestone coins`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        error: error.message,
        pinId: req.params.pinId,
        userId: req.user?.id,
      },
      `Error occurred while awarding milestone coins`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Manual trigger for pin expiration (admin function)
exports.expireOldPins = async (req, res) => {
  try {
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        adminId: req.user?.id,
      },
      `Manual pin expiration triggered by admin`
    );

    const result = await WtfService.expireOldPins();

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          expiredCount: result.expiredCount,
          adminId: req.user?.id,
        },
        `Successfully expired old pins`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          error: result.message,
          adminId: req.user?.id,
        },
        `Failed to expire old pins`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        error: error.message,
        adminId: req.user?.id,
      },
      `Error occurred while expiring old pins`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// ==================== SCHEDULER MANAGEMENT CONTROLLERS ====================

// Manually trigger pin expiration process
exports.triggerPinExpiration = async (req, res) => {
  try {
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        adminId: req.user?.id,
      },
      `Admin manually triggered pin expiration process`
    );

    const result = await WtfService.expireOldPins();

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          adminId: req.user?.id,
          expiredCount: result.expiredCount,
          totalProcessed: result.totalProcessed,
        },
        `Pin expiration process completed successfully`
      );
      res.status(HTTP_STATUS_CODE.OK).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          error: result.message,
          adminId: req.user?.id,
        },
        `Pin expiration process failed`
      );
      res.status(HTTP_STATUS_CODE.BAD_REQUEST).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        error: error.message,
        adminId: req.user?.id,
      },
      `Error occurred while triggering pin expiration`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Manually trigger FIFO management process
exports.triggerFifoManagement = async (req, res) => {
  try {
    const SchedulerService = require("../services/scheduler");
    const schedulerService = new SchedulerService();

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        adminId: req.user?.id,
      },
      `Admin manually triggered FIFO management process`
    );

    const result = await schedulerService.processFifoManagement();

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        adminId: req.user?.id,
        deletedPinsCount: result.deletedPinsCount,
        totalProcessed: result.totalProcessed,
      },
      `FIFO management process completed`
    );

    res.status(HTTP_STATUS_CODE.OK).json({
      success: true,
      data: result,
      message: result.message || "FIFO management process completed",
    });
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        error: error.message,
        adminId: req.user?.id,
      },
      `Error occurred while triggering FIFO management`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

// Get scheduler status and next run times
exports.getSchedulerStatus = async (req, res) => {
  try {
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        adminId: req.user?.id,
      },
      `Admin requested scheduler status`
    );

    // Get current active pins count for FIFO status
    const activePinsResult = await WtfService.getActivePinsCount();
    const activePinsCount = activePinsResult.success
      ? activePinsResult.data
      : 0;

    // Get expired pins count
    const { getExpiredPins } = require("../data-access/wtfPin");
    const expiredPinsResult = await getExpiredPins();
    const expiredPinsCount = expiredPinsResult.success
      ? expiredPinsResult.data.length
      : 0;

    const status = {
      activePins: {
        count: activePinsCount,
        limit: 20,
        needsFifoCleanup: activePinsCount > 20,
        excessPins: Math.max(0, activePinsCount - 20),
      },
      expiredPins: {
        count: expiredPinsCount,
        cutoffDate: expiredPinsResult.expirationCutoff,
        needsCleanup: expiredPinsCount > 0,
      },
      scheduledJobs: {
        pinExpiration: {
          schedule: "0 * * * *", // Every hour
          description: "Deletes pins older than 7 days (including S3 files)",
        },
        fifoManagement: {
          schedule: "*/30 * * * *", // Every 30 minutes
          description: "Deletes oldest pins when board exceeds 20 pins",
        },
        weeklyCleanup: {
          schedule: "0 2 * * 0", // Sunday at 2 AM
          description: "Weekly maintenance and cleanup",
        },
      },
    };

    res.status(HTTP_STATUS_CODE.OK).json({
      success: true,
      data: status,
      message: "Scheduler status retrieved successfully",
    });
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        error: error.message,
        adminId: req.user?.id,
      },
      `Error occurred while getting scheduler status`
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};
