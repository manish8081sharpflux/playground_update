const MedicalCheckIns = require("../services/medicalCheckIns");
const { HTTP_STATUS_CODE } = require("../constants/general");
const { logger } = require("../config/pino-config");
const mongoose = require("mongoose");

exports.createMedicalCheckIn = async (req, res) => {
  try {
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      "Request received to create a new medical check-in"
    );
    let createdBy = req.user._id;
    const {
      studentId,
      temperature,
      date,
      healthStatus,
      notes,
      symptoms,
      customSymptom,
      doctorVisit,  // Old format (backward compatibility)
      followUp,     // Old format (backward compatibility)
      doctorVisits: doctorVisitsRaw, // New format (Sprint6-Story-3-AC5)
      followUps: followUpsRaw,    // New format (Sprint6-Story-3-AC6)
    } = req.body;

    // Sprint6-Story-3-BugFix: Parse JSON strings from FormData
    let doctorVisits = [];
    let followUps = [];

    if (doctorVisitsRaw) {
      try {
        doctorVisits = typeof doctorVisitsRaw === 'string' ? JSON.parse(doctorVisitsRaw) : doctorVisitsRaw;
      } catch (e) {
        logger.error({ error: e.message }, "Failed to parse doctorVisits");
      }
    }

    if (followUpsRaw) {
      try {
        followUps = typeof followUpsRaw === 'string' ? JSON.parse(followUpsRaw) : followUpsRaw;
      } catch (e) {
        logger.error({ error: e.message }, "Failed to parse followUps");
      }
    }

    let attachmentFiles = [];
    let prescriptionFiles = [];
    let testResultFiles = [];
    let followUpDescriptionFiles = [];
    let followUpTestResultFiles = [];

    if (req.files) {
      if (req.files.attachments) {
        attachmentFiles = req.files.attachments.map((file) => file.path);
      }
      if (req.files.prescriptions) {
        prescriptionFiles = req.files.prescriptions.map((file) => file.path);
      }
      if (req.files.testResults) {
        testResultFiles = req.files.testResults.map((file) => file.path);
      }
      if (req.files.followUpDescriptions) {
        followUpDescriptionFiles = req.files.followUpDescriptions.map((file) => file.path);
      }
      if (req.files.followUpTestResults) {
        followUpTestResultFiles = req.files.followUpTestResults.map((file) => file.path);
      }
    }

    const result = await MedicalCheckIns.createMedicalCheckIn(
      {
        studentId,
        temperature,
        date,
        healthStatus,
        notes,
        createdBy,
        symptoms,
        customSymptom,
        doctorVisit,  // Old format
        followUp,     // Old format
        doctorVisits, // New format
        followUps,    // New format
      },
      {
        attachments: attachmentFiles,
        prescriptions: prescriptionFiles,
        testResults: testResultFiles,
        followUpDescriptions: followUpDescriptionFiles,
        followUpTestResults: followUpTestResultFiles,
      }
    );

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        "Successfully created a new medical check-in"
      );
      res
        .status(HTTP_STATUS_CODE.CREATED)
        .json({ success: true, data: result.data, message: result.message });
    } else {
      logger.warn(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Failed to create medical check-in: ${result.message}`
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
        error: error.message,
      },
      "Error creating medical check-in"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
  }
};

exports.getAllMedicalCheckIns = async (req, res) => {
  try {
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      "Request received to fetch all medical check-ins"
    );
    const { student, healthStatus, date, page, limit } = req.query;
    // RBAC: Apply scope filter from authorize middleware
    const filters = { ...(req.scopeFilter || {}) };
    if (student) {
      if (!mongoose.Types.ObjectId.isValid(student)) {
        return res
          .status(HTTP_STATUS_CODE.BAD_REQUEST)
          .json({ success: false, message: "Invalid student ID" });
      }
      filters.student = student;
    }
    if (healthStatus) filters.healthStatus = healthStatus;
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      filters.date = { $gte: startDate, $lte: endDate };
    }

    const pagination = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
    };
    const result = await MedicalCheckIns.getAllMedicalCheckIns(
      filters,
      pagination
    );
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        "Successfully fetched medical check-ins"
      );
      res
        .status(HTTP_STATUS_CODE.OK)
        .json({ success: true, data: result.data, message: result.message });
    } else {
      logger.warn(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Failed to fetch medical check-ins: ${result.message}`
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
        error: error.message,
      },
      "Error fetching medical check-ins"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
  }
};

exports.getMedicalCheckInsByStudentId = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { page, limit } = req.query;
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        studentId,
      },
      `Request received to fetch medical check-ins for student with ID: ${studentId}`
    );
    const pagination = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
    };
    const result = await MedicalCheckIns.getMedicalCheckInsByStudentId(
      studentId,
      pagination
    );
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          studentId,
        },
        "Successfully fetched student's medical check-ins"
      );
      res
        .status(HTTP_STATUS_CODE.OK)
        .json({ success: true, data: result.data, message: result.message });
    } else {
      logger.warn(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          studentId,
        },
        `Failed to fetch student's medical check-ins: ${result.message}`
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
        error: error.message,
      },
      "Error fetching student's medical check-ins"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
  }
};

exports.getMedicalCheckInById = async (req, res) => {
  try {
    const { checkInId } = req.params;
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        checkInId,
      },
      `Request received to fetch medical check-in with ID: ${checkInId}`
    );
    const result = await MedicalCheckIns.getMedicalCheckInById(checkInId);
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          checkInId,
        },
        "Successfully fetched medical check-in"
      );
      res
        .status(HTTP_STATUS_CODE.OK)
        .json({ success: true, data: result.data, message: result.message });
    } else {
      logger.warn(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          checkInId,
        },
        `Failed to fetch medical check-in: ${result.message}`
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
        error: error.message,
      },
      "Error fetching medical check-in"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
  }
};

exports.updateMedicalCheckIn = async (req, res) => {
  try {
    const { checkInId } = req.params;
    const {
      studentId,
      temperature,
      date,
      healthStatus,
      notes,
      symptoms,
      customSymptom,
      doctorVisit,        // Old format (backward compatibility)
      followUp,           // Old format (backward compatibility)
      doctorVisits: doctorVisitsRaw,  // New format (Sprint6-Story-3-AC5)
      followUps: followUpsRaw,         // New format (Sprint6-Story-3-AC6)
    } = req.body;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        checkInId,
      },
      `Request received to update medical check-in with ID: ${checkInId}`
    );

    // Sprint6-Story-3-BugFix: Parse JSON strings for array fields (if needed)
    let doctorVisits = [];
    let followUps = [];

    if (doctorVisitsRaw) {
      try {
        doctorVisits = typeof doctorVisitsRaw === 'string' ? JSON.parse(doctorVisitsRaw) : doctorVisitsRaw;
      } catch (e) {
        logger.error({ error: e.message }, "Failed to parse doctorVisits during update");
      }
    }

    if (followUpsRaw) {
      try {
        followUps = typeof followUpsRaw === 'string' ? JSON.parse(followUpsRaw) : followUpsRaw;
      } catch (e) {
        logger.error({ error: e.message }, "Failed to parse followUps during update");
      }
    }

    const updateData = {};
    if (studentId) updateData.studentId = studentId;
    if (temperature) updateData.temperature = temperature;
    if (date) updateData.date = new Date(date);
    if (healthStatus) updateData.healthStatus = healthStatus;
    if (notes !== undefined) updateData.notes = notes;

    // Sprint6-Story-3: Update symptoms
    if (symptoms !== undefined) updateData.symptoms = symptoms;
    if (customSymptom !== undefined) updateData.customSymptom = customSymptom;

    // Sprint6-Story-3-BugFix: Support NEW array formats
    if (doctorVisits && Array.isArray(doctorVisits) && doctorVisits.length > 0) {
      updateData.doctorVisits = doctorVisits;
    }
    if (followUps && Array.isArray(followUps) && followUps.length > 0) {
      updateData.followUps = followUps;
    }

    // Backward compatibility: Support OLD single object formats
    if (doctorVisit !== undefined) updateData.doctorVisit = doctorVisit;
    if (followUp !== undefined) updateData.followUp = followUp;

    const result = await MedicalCheckIns.updateMedicalCheckIn(
      checkInId,
      updateData
    );
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          checkInId,
        },
        "Successfully updated medical check-in"
      );
      res
        .status(HTTP_STATUS_CODE.OK)
        .json({ success: true, data: result.data, message: result.message });
    } else {
      logger.warn(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          checkInId,
        },
        `Failed to update medical check-in: ${result.message}`
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
        error: error.message,
      },
      "Error updating medical check-in"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
  }
};

exports.deleteMedicalCheckIn = async (req, res) => {
  try {
    const { checkInId } = req.params;
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        checkInId,
      },
      `Request received to delete medical check-in with ID: ${checkInId}`
    );
    const result = await MedicalCheckIns.deleteMedicalCheckIn(checkInId);
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          checkInId,
        },
        "Successfully deleted medical check-in"
      );
      res
        .status(HTTP_STATUS_CODE.OK)
        .json({ success: true, data: result.data, message: result.message });
    } else {
      logger.warn(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          checkInId,
        },
        `Failed to delete medical check-in: ${result.message}`
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
        error: error.message,
      },
      "Error deleting medical check-in"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
  }
};

exports.addOrUpdateAttachments = async (req, res) => {
  try {
    const { checkInId } = req.params;
    const { createdBy } = req.body;
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        checkInId,
      },
      `Request received to add/update attachments for medical check-in with ID: ${checkInId}`
    );
    let attachmentFiles = [];
    let prescriptionFiles = [];
    let testResultFiles = [];

    if (req.files) {
      if (req.files.attachments) {
        attachmentFiles = req.files.attachments.map((file) => file.path);
      }
      if (req.files.prescriptions) {
        prescriptionFiles = req.files.prescriptions.map((file) => file.path);
      }
      if (req.files.testResults) {
        testResultFiles = req.files.testResults.map((file) => file.path);
      }
    }

    if (!createdBy) {
      return res
        .status(HTTP_STATUS_CODE.BAD_REQUEST)
        .json({ success: false, message: "createdBy ID is required" });
    }
    const result = await MedicalCheckIns.addOrUpdateAttachments(
      checkInId,
      {
        attachments: attachmentFiles,
        prescriptions: prescriptionFiles,
        testResults: testResultFiles,
      },
      createdBy
    );
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          checkInId,
        },
        "Successfully added/updated attachments"
      );
      res
        .status(HTTP_STATUS_CODE.OK)
        .json({ success: true, data: result.data, message: result.message });
    } else {
      logger.warn(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          checkInId,
        },
        `Failed to add/update attachments: ${result.message}`
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
        error: error.message,
      },
      "Error adding/updating attachments"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
  }
};

exports.deleteAttachment = async (req, res) => {
  try {
    const { checkInId, attachmentId } = req.params;
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        checkInId,
        attachmentId,
      },
      `Request received to delete attachment from medical check-in`
    );
    const result = await MedicalCheckIns.deleteAttachment(
      checkInId,
      attachmentId
    );
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          checkInId,
          attachmentId,
        },
        "Successfully deleted attachment"
      );
      res
        .status(HTTP_STATUS_CODE.OK)
        .json({ success: true, data: result.data, message: result.message });
    } else {
      logger.warn(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          checkInId,
          attachmentId,
        },
        `Failed to delete attachment: ${result.message}`
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
        error: error.message,
      },
      "Error deleting attachment"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
  }
};

exports.getMedicalCheckInsByBalagruhaIds = async (req, res) => {
  try {
    let { balagruhaIds } = req.body;
    // RBAC: Restrict balagruhaIds to user's assigned scope.
    // When a scope is enforced, an empty result MUST stay empty — do not let the
    // service-layer fallback expand to "all balagruhas in the database".
    let scopeApplied = false;
    if (req.scopeFilter && req.scopeFilter.balagruhaId) {
      const allowedIds = req.scopeFilter.balagruhaId.$in
        ? req.scopeFilter.balagruhaId.$in.map(id => id.toString())
        : [req.scopeFilter.balagruhaId.toString()];
      // No IDs from caller → default to their full allowed scope.
      // Specific IDs from caller → intersect with allowed scope.
      balagruhaIds = (balagruhaIds && balagruhaIds.length > 0)
        ? balagruhaIds.filter(id => allowedIds.includes(id.toString()))
        : allowedIds;
      scopeApplied = true;
    }
    const result = await MedicalCheckIns.getMedicalCheckInsByBalagruhaIds(
      balagruhaIds,
      { scopeApplied }
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
        error: error.message,
      },
      "Error getting medical check-ins by balagruha Ids list"
    );
    res
      .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
  }
};
