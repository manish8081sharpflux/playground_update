const fs = require("fs");
const { logger, errorLogger } = require("../config/pino-config");
const User = require("../models/user");
const frService = require("../services/frService");
const {
  createUser,
  findUsersByRoleAndBalagruhaId,
  getUserInfo,
  updateUserPasswordByAdmin,
  assignBalagruhaToUser,
  updateUserDetailsById,
  deleteUserById,
  getUserListByAssignedBalagruhaByRole,
} = require("../services/user");
const Student = require("../services/student");
const Attendance = require("../services/attendenance");
const { UserTypes } = require("../constants/users");
const { updateNextActionDate } = require("../data-access/medicalRecords");
const { isRequestFromLocalhost } = require("../utils/helper");
const { ensureUserEditFilesUseS3 } = require("../utils/ensureS3Urls");

exports.getAllUsers = async (req, res) => {
  try {
    // RBAC: Apply scope filtering based on user's permission scope
    // Transform scope filter for User collection field names
    let queryFilter = { ...(req.scopeFilter || {}) };
    
    // Fix field name mismatch: scope filter uses 'balagruhaId' but User collection uses 'balagruhaIds'
    if (queryFilter.balagruhaId) {
      queryFilter.balagruhaIds = queryFilter.balagruhaId;
      delete queryFilter.balagruhaId;
    }
    
    const { role, status } = req.query;
    if (role) {
      queryFilter.role = role;
    }
    if (status) {
      queryFilter.status = status;
    }

    // Pagination parameters
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 1000); // Cap at 1000
    const skip = (pageNum - 1) * limitNum;
    
    // Execute paginated query
    const [users, total] = await Promise.all([
      User.find(queryFilter)
        .lean()
        .select("-facialData -password")
        .populate("balagruhaIds")
        .populate("assignedMachines")
        .populate("medicalRecords")
        .skip(skip)
        .limit(limitNum),
      User.countDocuments(queryFilter)
    ]);
    
    for (const user of users) {
      try {
        await ensureUserEditFilesUseS3(user);
      } catch (upgradeError) {
        errorLogger.warn(
          { error: upgradeError.message, userId: user?._id },
          "Skipping S3 URL upgrade while listing users"
        );
      }
    }

    // Process users
    let processedUsers = users;
    if (users && users.length > 0) {
      processedUsers = users.map((item) => {
        let medicalHistoryItem = [];
        let nextActionDate = null;
        if (item?.medicalRecords?.length > 0) {
          let medicalRecords = item?.medicalRecords.map((record) => {
            if (record.nextActionDate && record.nextActionDate !== null) {
              nextActionDate = record.nextActionDate;
            }
            return record.medicalHistory;
          });
          medicalRecords.forEach((item) => {
            if (item.length > 0) {
              item.forEach((medItem) => {
                medicalHistoryItem.push(medItem);
              });
            }
          });
        }
        item.nextActionDate = nextActionDate;
        item.medicalHistory = medicalHistoryItem;
        delete item.medicalRecords;
        return item;
      });
    }
    
    res.status(200).json({
      success: true,
      data: processedUsers,
      count: processedUsers.length,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    errorLogger.error({ error: error.message }, "Controller error");
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params._id)
      .populate("medicalRecords")
      .lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    try {
      await ensureUserEditFilesUseS3(user);
    } catch (upgradeError) {
      errorLogger.warn(
        { error: upgradeError.message, userId: user?._id },
        "Skipping S3 URL upgrade while fetching user"
      );
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createUser = async (req, res) => {
  const { name, email, password, role } = req.body;
  const normalizedRole = (role || "").toString().toLowerCase();
  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";

  try {
    if (normalizedRole !== UserTypes.STUDENT && !normalizedEmail) {
      return res
        .status(400)
        .json({ message: "Email is required for non-student users" });
    }

    if (normalizedEmail) {
      const existingUser = await User.findOne({ email: normalizedEmail })
        .select("_id")
        .lean();

      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }
    }

    const newUser = new User({
      name,
      email: normalizedEmail || undefined,
      password,
      role,
    });

    await newUser.save();
    res.status(201).json(newUser);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateUser = async (req, res) => {
  const { name, email, password, role, status, lastLogin } = req.body;

  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, password, role, status, lastLogin },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// API for create User
exports.createUserV1 = async (req, res) => {
  try {
    const requesterRole = req.user?.role
      ? req.user.role.toLowerCase()
      : null;
    const requestedRole = req.body?.role
      ? req.body.role.toLowerCase()
      : UserTypes.STUDENT;

    if (requesterRole && requesterRole !== UserTypes.ADMIN) {
      if (requestedRole !== UserTypes.STUDENT) {
        return res.status(403).json({
          success: false,
          data: {},
          message: "Only admin users can create non-student accounts.",
        });
      }
      req.body.role = UserTypes.STUDENT;
    }

    const logData = { ...req.body };
    delete logData.password;
    req.body.createdBy = req.user._id;
    let data = req.file;
    // req.body.facialData = req.files['facialData']
    const uploadedFiles = Array.isArray(req.files) ? req.files : [];
    req.body.facialData = uploadedFiles.find(
      (file) => file.fieldname === "facialData"
    );
    // req.body.medicalHistory = req.files['medicalHistory']

    const medicalHistory = extractMedicalHistory(req);
    req.body.medicalHistory = medicalHistory;
    // res.status(201).json({ success: true, data: {}, message: "", });
    // return
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: logData,
      },
      `Request received for user registration`
    );
    // check the request if from localhost/ offline case
    let isOfflineReq = isRequestFromLocalhost(req);
    req.body.isOfflineReq = isOfflineReq;
    // Capture the facial file reference now; service mutation removes it
    // from req.body before save.
    const facialFileForEmbedding = req.body.facialData;
    let result = await createUser(req.body);
    if (result.success) {
      // If an admin attached a facial photo, register the embedding so the
      // student can log in via Face ID. Best-effort; doesn't block the response.
      const createdUserId = result?.data?.user?._id || result?.data?._id;
      if (createdUserId && facialFileForEmbedding) {
        registerFacialEmbeddingIfPresent(createdUserId, facialFileForEmbedding, req.user._id);
      }
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          data: logData,
        },
        `User registered successfully`
      );
      res.status(201).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          data: logData,
        },
        `Error occurred while user registration: ${result.message}`
      );
      res
        .status(400)
        .json({ success: false, data: {}, message: result.message });
    }
  } catch (error) {
    res.status(400).json({ success: false, data: {}, message: error.message });
  }
};

// API for create User Medical Records
exports.createStudentMedicalRecords = async (req, res) => {
  try {
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: req.body,
      },
      `Request received for user registration`
    );
    let result = await Student.createStudentMedicalRecords(req.body);
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          data: req.body,
        },
        `User registered successfully`
      );
      res.status(201).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          data: req.body,
        },
        `Error occurred while user registration: ${error.message}`
      );
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// API for fetch the user overview details for the user management
exports.getUserManagementOverviewDetails = async (req, res) => {
  try {
    let balagruhaId = req.params.balagruhaId;
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: req.body,
      },
      `Request received for fetching the user overview for user management`
    );
    let result = await Student.getStudentListByBalagruhaId({ balagruhaId });
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          data: req.body,
        },
        `Successfully processed the request for fetching the user overview for user management`
      );
      res.status(201).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          data: req.body,
        },
        `Error occurred while fetching the user overview for user management: ${error.message}`
      );
      res.status(400).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: req.body,
      },
      `Error occurred while processing the request for fetching the user overview details: ${error.message}`
    );
    res.status(400).json({ message: error.message });
  }
};

// API for fetch the student list by balagruha id
exports.getStudentListByBalagruhaId = async (req, res) => {
  try {
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: req.body,
      },
      `Request received for fetching the student list by balagruha id`
    );
    let result = await Student.getStudentListByBalagruhaId(req.body);
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          data: req.body,
        },
        `Successfully processed the request for fetching the student list by balagruha id`
      );
      res.status(201).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          data: req.body,
        },
        `Error occurred while fetching the student list by balagruha id: ${error.message}`
      );
      res.status(400).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: req.body,
      },
      `Error occurred while processing the request for fetching the student list by balagruha id: ${error.message}`
    );
    res.status(400).json({ message: error.message });
  }
};

// API for create attendance for the student
exports.createStudentAttendance = async (req, res) => {
  try {
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: req.body,
      },
      `Request received for creating attendance for the student`
    );
    let result = await Attendance.saveAttendance(req.body);
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          data: req.body,
        },
        `Successfully processed the request for creating attendance for the student`
      );
      res.status(201).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          data: req.body,
        },
        `Error occurred while creating attendance for the student: ${error.message}`
      );
      res.status(400).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: req.body,
      },
      `Error occurred while processing the request for creating attendance for the student: ${error.message}`
    );
    res.status(400).json({ message: error.message });
  }
};

// API for create manual attendance (manual override when FR fails or unavailable)
// Sprint 1.1 Epic 02 Story 01 Task 9: Manual Override Workflow
// Ensures FR is an enhancement, not a blocker for attendance workflow
exports.createManualAttendance = async (req, res) => {
  try {
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?._id,
        data: req.body,
      },
      `Request received for creating manual attendance`
    );

    // Add markedBy from authenticated user
    const payload = {
      ...req.body,
      markedBy: req.user._id, // Get from JWT middleware
    };

    // Call manual attendance service method
    const result = await Attendance.saveManualAttendance(payload);

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          userId: req.user?._id,
          data: req.body,
        },
        `Successfully created manual attendance`
      );
      res.status(201).json(result);
    } else {
      logger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          userId: req.user?._id,
          data: req.body,
          error: result.message,
        },
        `Error occurred while creating manual attendance: ${result.message}`
      );
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userId: req.user?._id,
        data: req.body,
        error: error.message,
      },
      `Error occurred while processing manual attendance request: ${error.message}`
    );
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// API for fetch the student list in balagruha with the attendance by given date (pass date as query )
exports.getStudentListByBalagruhaIdWithAttendance = async (req, res) => {
  try {
    let date = req.query.date;
    if (!date || date == "") {
      date = new Date();
    }
    let balagruhaId = req.params.balagruhaId;
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: req.body,
      },
      `Request received for fetching the student list in balagruha with the attendance by given date`
    );
    let result = await Student.getStudentListByBalagruhaIdWithAttendance({
      balagruhaId,
      date,
    });
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          data: req.body,
        },
        `Successfully processed the request for fetching the student list in balagruha with the attendance by given date`
      );
      res.status(201).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          data: req.body,
        },
        `Error occurred while fetching the student list in balagruha with the attendance by given date: ${error.message}`
      );
      res.status(400).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: req.body,
      },
      `Error occurred while processing the request for fetching the student list in balagruha with the attendance by given date: ${error.message}`
    );
    res.status(400).json({ message: error.message });
  }
};

// API for facial login
exports.facialLogin = async (req, res) => {
  try {
    let macAddress = req.headers["mac-address"];
    req.body.facialData = req.files["facialData"];
    req.body.macAddress = macAddress;
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: req.body,
      },
      `Request received for facial login`
    );
    let result = await Student.faceLogin(req.body);
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          data: req.body,
        },
        `Successfully processed the request for facial login`
      );
      res.status(201).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          data: req.body,
        },
        `Error occurred while facial login`
      );
      res.status(400).json(result);
    }
  } catch (error) {
    errorLogger.error({ error: error.message }, "Controller error");
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: req.body,
      },
      `Error occurred while processing the request for facial login: ${error.message}`
    );
    res.status(400).json({ message: error.message });
  }
};

// API for find users by role and balagruha id
exports.getUsersByRoleAndBalagruhaId = async (req, res) => {
  try {
    const { role } = req.params;
    const { balagruhaId } = req.query;
    const scopedBalagruhaFilter = req.scopeFilter?.balagruhaId;

    if (scopedBalagruhaFilter && balagruhaId) {
      const allowedBalagruhaIds = scopedBalagruhaFilter.$in
        ? scopedBalagruhaFilter.$in.map((id) => id.toString())
        : [scopedBalagruhaFilter.toString()];

      if (!allowedBalagruhaIds.includes(balagruhaId.toString())) {
        return res.status(403).json({
          success: false,
          data: { users: [] },
          message: "Access denied. You do not have permission to access this Balagruha.",
        });
      }
    }

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: { role, balagruhaId },
      },
      `Request received for finding users by role: ${role} and balagruhaId: ${balagruhaId || "not specified"
      }`
    );

    let result = await findUsersByRoleAndBalagruhaId({ role, balagruhaId });

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Successfully fetched users by role and balagruhaId`
      );
      res.status(200).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Error occurred while fetching users by role and balagruhaId`
      );
      res.status(400).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: { error: error.message },
      },
      `Error occurred while processing the request for finding users by role and balagruhaId: ${error.message}`
    );
    res.status(500).json({ success: false, message: error.message });
  }
};

// API for fetch detailed user information by userId
exports.getUserInfo = async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!userId || userId == ":userId") {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Request received for fetching detailed user information by ID: ${userId}`
    );

    const result = await getUserInfo(userId);

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Successfully fetched detailed user information`
      );
      return res.status(200).json(result);
    } else {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `User not found with ID: ${userId}`
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
      `Error occurred while fetching detailed user information: ${error.message}`
    );
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
/**
 * If an admin uploaded a `facialData` photo while creating or updating a user,
 * extract a face embedding from it and save it to the FaceEmbedding collection
 * so that Face-ID login can match against it. Best-effort: never throws;
 * failures here don't fail the user save.
 */
async function registerFacialEmbeddingIfPresent(userId, facialFile, adminId) {
  if (!facialFile || !facialFile.path) return;
  try {
    const buffer = await fs.promises.readFile(facialFile.path);
    const result = await frService.registerFace(userId, buffer, adminId, "admin_upload");
    if (result && result.success) {
      logger.info({ userId: String(userId) }, "Face embedding registered for user");
    } else {
      logger.warn({ userId: String(userId), reason: result?.failureReason, error: result?.error }, "Face embedding registration skipped");
    }
  } catch (err) {
    errorLogger.error({ err, userId: String(userId) }, "Failed to register face embedding from admin upload");
  }
}

const extractMedicalHistory = (req) => {
  const medicalHistory = [];

  Object.keys(req.body).forEach((key) => {
    const match = key.match(/^medicalHistory\[(\d+)\](?:\.(.+))?$/);
    if (match) {
      const index = parseInt(match[1], 10);
      const field = match[2];

      if (!medicalHistory[index]) {
        medicalHistory[index] = {
          prescriptions: [],
          otherAttachments: [],
          currentStatus: {},
        };
      }

      if (!field) {
        return;
      }

      if (field.startsWith("currentStatus.")) {
        medicalHistory[index].currentStatus[
          field.replace("currentStatus.", "")
        ] = req.body[key];
      } else {
        medicalHistory[index][field] = req.body[key];
      }
    }
  });

  // Handling file uploads
  if (req.files) {
    // Iterating through files array instead of using req.files as an object with keys
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const match = file.fieldname.match(
        /^medicalHistory\[(\d+)\]\.(prescriptions|otherAttachments)$/
      );

      if (match) {
        const index = parseInt(match[1], 10);
        const field = match[2];

        // Initialize the array if it doesn't exist
        if (!medicalHistory[index]) {
          medicalHistory[index] = {
            prescriptions: [],
            otherAttachments: [],
            currentStatus: {},
          };
        }

        // Add the filename to the appropriate array
        medicalHistory[index][field].push(file);
      }
    }
  }

  return medicalHistory;
};

// API for update user password by admin
exports.updateUserPassword = async (req, res) => {
  try {
    // get the current user role
    const role = req.user.role;
    // check the role is admin, otherwise return the error
    if (role !== UserTypes.ADMIN) {
      return res.status(403).json({
        success: false,
        message:
          "You don't have permission to perform this action. Only admin users can update passwords.",
      });
    }
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: req.body,
      },
      `Request received for updating user password`
    );
    let result = await updateUserPasswordByAdmin(req.body);
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          data: req.body,
        },
        `Successfully processed the request for updating user password`
      );
      res.status(201).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          data: req.body,
        },
        `Error occurred while updating user password: ${error.message}`
      );
      res.status(400).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: req.body,
      },
      `Error occurred while processing the request for updating user password: ${error.message}`
    );
    res.status(400).json({ message: error.message });
  }
};

// API for assign balagruha to the user
exports.assignBalagruhaToUser = async (req, res) => {
  try {
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: req.body,
      },
      `Request received for assigning balagruha to the user`
    );
    let result = await assignBalagruhaToUser(req.body);
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          data: req.body,
        },
        `Successfully processed the request for assigning balagruha to the user`
      );
      res.status(201).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          data: req.body,
        },
        `Error occurred while assigning balagruha to the user: ${error.message}`
      );
      res.status(400).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: req.body,
      },
      `Error occurred while processing the request for assigning balagruha to the user: ${error.message}`
    );
    res.status(400).json({ message: error.message });
  }
};

// API for update user details by userId
exports.updateUserDetails = async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!userId || userId === ":userId") {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // RBAC scope enforcement: when authorize() has injected a balagruha scope,
    // verify the target user belongs to one of the caller's allowed balagruhas.
    // Admins (scope:'all') have no scopeFilter.balagruhaId, so this is a no-op.
    if (req.scopeFilter && req.scopeFilter.balagruhaId) {
      const allowedIds = req.scopeFilter.balagruhaId.$in
        ? req.scopeFilter.balagruhaId.$in.map((id) => id.toString())
        : [req.scopeFilter.balagruhaId.toString()];
      const target = await User.findById(userId).select("balagruhaIds role").lean();
      if (!target) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      const targetBalagruhas = (target.balagruhaIds || []).map((id) => id.toString());
      const inScope = targetBalagruhas.some((id) => allowedIds.includes(id));
      if (!inScope) {
        return res.status(403).json({
          success: false,
          message: "User is outside your assigned balagruha scope.",
        });
      }
    }

    req.body.updatedBy = req.user._id;
    // check the request if from localhost/ offline case
    let isOfflineReq = isRequestFromLocalhost(req);
    req.body.isOfflineReq = isOfflineReq;

    // Handle facial data if uploaded
    if (req.files && req.files.length > 0) {
      req.body.facialData = req.files.filter(
        (file) => file.fieldname === "facialData"
      )[0];
    }

    // Handle medical history extraction from request
    try {
      const medicalHistory = extractMedicalHistory(req);

      // Check if we need to update medical records
      // If medicalHistory fields were sent (even if empty), or if there's an explicit clear flag
      const shouldUpdateMedicalRecords = req.body.clearMedicalHistory === 'true' ||
        Object.keys(req.body).some(key => key.startsWith('medicalHistory')) ||
        medicalHistory.length > 0;

      if (shouldUpdateMedicalRecords) {
        const MedicalRecord = require("../models/medical");
        const existingRecord = await MedicalRecord.findOne({ studentId: userId });

        if (medicalHistory.length > 0) {
          // Process medical history (upload files to S3)
          req.body.medicalHistory = medicalHistory;
          req.body.medicalHistory =
            await Student.handleStudentMedicalRecordUpdate(req.body);
        } else {
          // Empty medical history - clear it
          req.body.medicalHistory = [];
        }

        if (existingRecord) {
          // Update existing medical record (including clearing if empty)
          existingRecord.medicalHistory = req.body.medicalHistory;
          if (req.body.nextActionDate) {
            existingRecord.nextActionDate = req.body.nextActionDate;
          }
          // updatedBy field might not exist in the schema, so we'll skip it
          await existingRecord.save();
        } else if (req.body.medicalHistory.length > 0) {
          // Only create new record if there's actual medical history
          const { createMedicalRecords } = require("../data-access/medicalRecords");
          const medicalRecordsEntry = {
            studentId: userId,
            healthCheckupDate: null,
            vaccinations: null,
            nextActionDate: req.body.nextActionDate || null,
            medicalHistory: req.body.medicalHistory,
            notes: "",
            createdBy: req.user._id,
          };
          const medicalRecordsSaveResult = await createMedicalRecords(medicalRecordsEntry);

          if (medicalRecordsSaveResult && medicalRecordsSaveResult.success) {
            // Update user's medicalRecords reference
            const User = require("../models/user");
            const user = await User.findById(userId);
            if (user) {
              if (!user.medicalRecords) {
                user.medicalRecords = [];
              }
              user.medicalRecords.push(medicalRecordsSaveResult.data[0]._id);
              await user.save();
            }
          }
        }
      } else if (req.body.nextActionDate && req.body.nextActionDate !== "") {
        // Only update next action date if no medical history changes
        updateNextActionDate(userId, req.body.nextActionDate);
      }
    } catch (medicalError) {
      errorLogger.error({ err: medicalError }, "Error updating medical records:");
      // Continue with user update even if medical records fail
      // You might want to log this error but not fail the entire update
    }

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: req.body,
      },
      `Request received for updating user details for ID: ${userId}`
    );

    // Capture facial file before the service strips it from req.body.
    const facialFileForEmbedding = req.body.facialData;
    const result = await updateUserDetailsById(userId, req.body);

    if (result.success) {
      if (req.body.nextActionDate) {
        result.data.user.nextActionDate = req.body.nextActionDate;
      }
      // If admin attached a new facial photo, also register the FR embedding.
      if (facialFileForEmbedding) {
        registerFacialEmbeddingIfPresent(userId, facialFileForEmbedding, req.user._id);
      }
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Successfully updated user details for ID: ${userId}`
      );
      return res.status(200).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Error occurred while updating user details: ${result.message}`
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
      `Error occurred while processing the request for updating user details: ${error.message}`
    );
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// API for delete user by userId
exports.deleteUserById = async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!userId || userId === ":userId") {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Check permission (only admin can delete users)
    const role = req.user.role;
    if (role !== UserTypes.ADMIN) {
      return res.status(403).json({
        success: false,
        message:
          "You don't have permission to perform this action. Only admin users can delete users.",
      });
    }

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: { userId },
      },
      `Request received for deleting user with ID: ${userId}`
    );

    const result = await deleteUserById(userId);

    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Successfully deleted user with ID: ${userId}`
      );
      return res.status(200).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Error occurred while deleting user: ${result.message}`
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
      `Error occurred while processing the request for deleting user: ${error.message}`
    );
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// API for assign balagruha to the user
exports.getUserListByAssignedBalagruhaByRole = async (req, res) => {
  try {
    // get user id and role from token
    const userId = req.user._id;
    const role = req.user.role;
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: req.body,
      },
      `Request received for assigning balagruha to the user`
    );
    let result = await getUserListByAssignedBalagruhaByRole({ userId, role });
    res.status(201).json(result);
    return;
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          data: req.body,
        },
        `Successfully processed the request for assigning balagruha to the user`
      );
      res.status(201).json(result);
    } else {
      errorLogger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          data: req.body,
        },
        `Error occurred while assigning balagruha to the user: ${error.message}`
      );
      res.status(400).json(result);
    }
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: req.body,
      },
      `Error occurred while processing the request for assigning balagruha to the user: ${error.message}`
    );
    res.status(400).json({ message: error.message });
  }
};

// API for fetching assignable users for schedule creation (S6-S1-PROD-BUG-001 fix)
// Admin can assign to any coach/staff (NOT students)
// Coach can only assign to coaches/staff in their assigned Balagruhas (NOT students)
exports.getAssignableUsersForSchedule = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user._id;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userRole,
        userId,
      },
      `Request received for fetching assignable users for schedule`
    );

    // Admin can assign to any coaches/staff (no students, no admins)
    if (userRole === UserTypes.ADMIN) {
      const users = await User.find({
        role: {
          $in: ['coach', 'sports-coach', 'music-coach']
        }
      })
        .select('name email role balagruhaIds')
        .populate('balagruhaIds')
        .lean();

      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Admin fetched ${users.length} assignable users`
      );

      return res.status(200).json({
        success: true,
        data: users
      });
    }

    // Coach can only assign to users in their assigned Balagruhas (no students, no admins)
    if (userRole === UserTypes.COACH || userRole === 'sports-coach' || userRole === 'music-coach') {
      // Get coach's assigned Balagruhas
      const coach = await User.findById(userId).select('balagruhaIds').lean();

      if (!coach || !coach.balagruhaIds || coach.balagruhaIds.length === 0) {
        logger.info(
          {
            clientIP: req.socket.remoteAddress,
            method: req.method,
            api: req.originalUrl,
            userId,
          },
          `Coach has no assigned Balagruhas`
        );
        return res.status(200).json({
          success: true,
          data: []
        });
      }

      // Find users in coach's assigned Balagruhas
      const users = await User.find({
        balagruhaIds: { $in: coach.balagruhaIds },
        role: {
          $nin: ['student', 'admin']  // Exclude students and admins
        }
      })
        .select('name email role balagruhaIds')
        .populate('balagruhaIds')
        .lean();

      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
          balagruhaCount: coach.balagruhaIds.length,
        },
        `Coach fetched ${users.length} assignable users from their Balagruhas`
      );

      return res.status(200).json({
        success: true,
        data: users
      });
    }

    // Unauthorized role
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        userRole,
      },
      `Unauthorized role attempted to fetch assignable users`
    );

    return res.status(403).json({
      success: false,
      message: "Unauthorized to fetch assignable users"
    });
  } catch (error) {
    errorLogger.error(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        error: error.message,
      },
      `Error fetching assignable users for schedule: ${error.message}`
    );
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
