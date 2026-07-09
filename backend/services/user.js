const { errorLogger } = require("../config/pino-config");
const { UserTypes } = require("../constants/users");
const Student = require("./student");
const UserDataAccess = require("../data-access/User");
const bcrypt = require("bcryptjs");
const User = require("../models/user");
const path = require("path");

// const canvas = require("canvas"); // REMOVED - Task 1: FR Rebuild
// const faceapi = require("face-api.js"); // REMOVED - Task 1: FR Rebuild
const { default: mongoose } = require("mongoose");
const { getAllBalagruhaIds } = require("../data-access/balagruha");
const { uploadFileToS3 } = require("./aws/s3");
const { getUploadedFilesFullPath } = require("../utils/helper");
const { cleanupLocalFile } = require("../utils/fileCleanup");
const { isRequestFromLocalhost } = require("../utils/helper");

// REMOVED - Task 1: FR Rebuild
// const { Canvas, Image, ImageData } = canvas;
// faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const enrichUsersWithMedicalHistory = (users = []) => {
  if (!Array.isArray(users)) {
    return [];
  }

  return users.map((item) => {
    if (!item) {
      return item;
    }

    const user = { ...item };
    let medicalHistoryItem = [];
    let nextActionDate = null;

    if (Array.isArray(user.medicalRecords) && user.medicalRecords.length > 0) {
      user.medicalRecords.forEach((record) => {
        if (!record) {
          return;
        }
        if (record.nextActionDate && record.nextActionDate !== null) {
          nextActionDate = record.nextActionDate;
        }
        if (Array.isArray(record.medicalHistory) && record.medicalHistory.length > 0) {
          medicalHistoryItem = medicalHistoryItem.concat(record.medicalHistory);
        }
      });
    }

    user.nextActionDate = nextActionDate;
    user.medicalHistory = medicalHistoryItem;
    delete user.medicalRecords;

    return user;
  });
};

// Function for create User

exports.createUser = async (payload) => {
  try {
    // Check the user role
    let { role } = payload;

    // Check duplicate Student User ID
    if (role === UserTypes.STUDENT && payload.userId) {
      const userIdValue = String(payload.userId).trim();

      const existingStudent = await User.findOne({
        role: UserTypes.STUDENT,
        userId: userIdValue,
      });

      if (existingStudent) {
        return {
          success: false,
          data: { user: null },
          message: "User ID already exists. Please enter a different User ID",
        };
      }

      payload.userId = userIdValue;
    }

    if (payload.email) {
      const emailValue = String(payload.email).trim().toLowerCase();

      const existingEmail = await User.findOne({
        email: emailValue,
      });

      if (existingEmail) {
        return {
          success: false,
          data: { user: null },
          message: "Email already exists. Please use a different email address",
        };
      }

      payload.email = emailValue;
    }

    switch (role) {
      case UserTypes.STUDENT:
        // return Student.registerStudent(payload);
        return await Student.registerStudentNew(payload);
        break;
      default:
        return this.registerUser(payload);
        break;
    }
  } catch (error) {
    errorLogger.error({ error: error.message }, "Service error");
    throw error;
  }
};

// Function for register user
exports.registerUser = async (payload) => {
  try {
    const { name, email, password, role, balagruhaIds } = payload;
    const normalizedRole = (role || "").toString().toLowerCase();
    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    if (normalizedRole !== UserTypes.STUDENT && !normalizedEmail) {
      return {
        success: false,
        data: { user: null },
        message: "Email is required for non-student users",
      };
    }

    if (normalizedEmail) {
      const existingUser = await User.findOne({ email: normalizedEmail })
        .select("_id")
        .lean();

      if (existingUser) {
        return {
          success: false,
          data: { user: null },
          message: "Email already exists",
        };
      }
    }

    // separate the comma separated balagruhaIds
    let balagruhaId = [];
    if (balagruhaIds) {
      balagruhaId = balagruhaIds.split(",").map((id) => id.trim());
    }
    const newUser = new User({
      name,
      email: normalizedEmail || undefined,
      password,
      role,
      balagruhaIds: balagruhaId || [],
    });

    let result = await newUser.save();
    if (result) {
      return {
        success: true,
        data: {
          user: result,
        },
        message: "User registered successfully",
      };
    } else {
      return {
        success: false,
        data: {
          user: null,
        },
        message: result?.message ? result.message : "Failed to register user",
      };
    }
  } catch (error) {
    errorLogger.error({ error: error.message }, "Service error");
    errorLogger.error(
      { data: { error: error } },
      `Error occurred during user registration: ${error.message}`
    );
    // Mirror older behavior: return friendly duplicate email error
    if (error?.errors?.email?.path === "email") {
      return {
        success: false,
        data: { user: null },
        message: "Email already exists",
      };
    }
    // Handle Mongo duplicate key error (e.g., unique index on email)
    if (
      error?.code === 11000 &&
      (error?.keyPattern?.email || error?.keyValue?.email)
    ) {
      return {
        success: false,
        data: { user: null },
        message: "Email already exists",
      };
    }
    throw error;
  }
};

// Function for fetch the user overview details for user management
exports.getUserManagementOverviewDetails = async () => {
  try {
  } catch (error) {
    errorLogger.error({ error: error.message }, "Service error");
    throw error;
  }
};

// Function to find users by role and balagruhaId
exports.findUsersByRoleAndBalagruhaId = async (payload) => {
  try {
    const { role, balagruhaId } = payload;
    const result = await UserDataAccess.getUsersByRoleAndBalagruhaId({
      role,
      balagruhaId,
    });

    if (result.success) {
      return {
        success: true,
        data: {
          users: result.data || [],
        },
        message: "Users fetched successfully",
      };
    } else {
      return {
        success: false,
        data: { users: [] },
        message: "Failed to fetch users",
      };
    }
  } catch (error) {
    errorLogger.error({ error: error.message }, "Service error");
    errorLogger.error(
      { data: { error: error } },
      `Error occurred while fetching users by role and balagruhaId: ${error.message}`
    );
    throw error;
  }
};

// Function to get detailed user information by userId
exports.getUserInfo = async (userId) => {
  try {
    const result = await UserDataAccess.getUserDetailedInfoById({ userId });

    if (result.success && result.data) {
      return {
        success: true,
        data: {
          user: result.data,
        },
        message: "User details fetched successfully",
      };
    } else {
      return {
        success: false,
        data: { user: null },
        message: "User not found",
      };
    }
  } catch (error) {
    errorLogger.error({ error: error.message }, "Service error");
    errorLogger.error(
      { data: { error: error } },
      `Error occurred while fetching detailed user information: ${error.message}`
    );
    throw error;
  }
};

// Update user password
exports.updateUserPasswordByAdmin = async ({ userId, newPassword }) => {
  try {
    // check for the user is existing
    const user = await UserDataAccess.getUserInfoById({ userId });
    if (!user.success || !user.data) {
      return {
        success: false,
        data: { user: null },
        message: "User not found",
      };
    } else {
      // hash the password
      const salt = await bcrypt.genSalt(10);
      newPassword = await bcrypt.hash(newPassword, salt);
      const result = await UserDataAccess.updateUserById({
        userId,
        payload: { password: newPassword },
      });

      if (result.success) {
        return {
          success: true,
          data: {},
          message: "User password updated successfully",
        };
      } else {
        return {
          success: false,
          data: { user: null },
          message: "Failed to update user password",
        };
      }
    }
  } catch (error) {
    errorLogger.error({ error: error.message }, "Service error");
    throw error;
  }
};

// Function to assign balagruha to the user
exports.assignBalagruhaToUser = async (payload) => {
  try {
    const { userId, balagruhaIds } = payload;
    // separate the comma separated balagruhaIds
    let balagruhaId = [];
    // check the balagruhaIds are array
    if (Array.isArray(balagruhaIds)) {
      balagruhaId = balagruhaIds.map((id) => id.trim());
    } else {
      return {
        success: false,
        data: {},
        message: "Balagruha IDs should be an array",
      };
    }

    const result = await UserDataAccess.updateUserById({
      userId,
      payload: { balagruhaIds: balagruhaId },
    });

    if (result.success) {
      return {
        success: true,
        data: {},
        message: "Balagruha assigned to user successfully",
      };
    } else {
      return {
        success: false,
        data: {},
        message: "Failed to assign balagruha to user",
      };
    }
  } catch (error) {
    errorLogger.error({ error: error.message }, "Service error");
    throw error;
  }
};

// Function to update user details by userId
exports.updateUserDetailsById = async (userId, payload) => {
  try {
    // Check if user exists
    const userExists = await UserDataAccess.getUserInfoById({ userId });
    if (!userExists.success || !userExists.data) {
      return {
        success: false,
        data: {},
        message: "User not found",
      };
    }

    // Handle special fields
    const updateData = { ...payload };

    // Don't update password this way - use dedicated password update function
    // delete updateData.password;

    // check the key balagruhaId is an array or string
    if (typeof updateData.balagruhaIds === "string") {
      updateData.balagruhaIds = updateData.balagruhaIds
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item);
    } else if (Array.isArray(updateData.balagruhaIds)) {
      updateData.balagruhaIds = updateData.balagruhaIds
        .map((item) => (typeof item === "string" ? item.trim() : item))
        .filter((item) => item);
    }

    if (updateData.assignedMachines) {
      let assignedMachinesList = [];
      const normalizeIds = (list) =>
        list
          .map((item) => (typeof item === "string" ? item.trim() : item))
          .filter((item) => item && mongoose.Types.ObjectId.isValid(item))
          .map((item) => mongoose.Types.ObjectId.createFromHexString(item));

      if (typeof updateData?.assignedMachines === "string") {
        assignedMachinesList = normalizeIds(
          updateData.assignedMachines.split(",")
        );
      } else if (Array.isArray(updateData.assignedMachines)) {
        assignedMachinesList = normalizeIds(updateData.assignedMachines);
      }

      if (assignedMachinesList.length > 0) {
        updateData.assignedMachines = assignedMachinesList;
      } else {
        delete updateData.assignedMachines;
      }
    }

    // Handle balagruhaIds if present
    if (updateData.balagruhaIds && Array.isArray(updateData.balagruhaIds)) {
      if (updateData.balagruhaIds.length === 0) {
        delete updateData.balagruhaIds;
      }
    } else if (updateData.balagruhaIds) {
      delete updateData.balagruhaIds;
    }

    // Process facial data if uploaded.
    // Sprint 1.1 FR rebuild: face descriptor extraction now happens in the
    // controller via frService.registerFace (which uses @vladmandic/human).
    // We still need to upload the photo to S3 and persist facialDataUrl on
    // the user so the Edit form can display the saved photo on next open.
    if (updateData.facialData && updateData.facialData.path) {
      const facialFile = updateData.facialData;
      const isOfflineReq = updateData.isOfflineReq || false;
      let facialDataUrl = null;

      if (!isOfflineReq) {
        try {
          const s3Result = await uploadFileToS3(
            facialFile.path,
            process.env.AWS_S3_FOLDER_MEDICAL_RECORDS,
            facialFile.filename
          );
          if (s3Result && s3Result.success) {
            facialDataUrl = s3Result.url;
          }
        } catch (s3Error) {
          errorLogger.error({ err: s3Error }, "Error uploading facial photo to S3 (update path) — falling back to local URL");
        }
      }

      // Fallback: if S3 didn't return a URL (offline mode or upload failed),
      // serve the photo from the backend's /uploads static mount so the
      // frontend can still display it. Prefers a configured PUBLIC_BACKEND_URL.
      if (!facialDataUrl) {
        const base = process.env.PUBLIC_BACKEND_URL || `http://localhost:${process.env.PORT || 5001}`;
        facialDataUrl = `${base}/uploads/${facialFile.filename}`;
      }

      updateData.facialDataUrl = facialDataUrl;
      // The raw file object isn't a valid Mongoose field — remove before saving.
      // The controller has already captured a reference to it for FR registration.
      delete updateData.facialData;
    }

    /* COMMENTED OUT - Old face-api.js detection in updateUser
    if (updateData.facialData) {
      let descriptorArray = null;
      let facialDataUrl = null;
      let isOfflineReq = updateData.isOfflineReq || false;

      let imagePath = updateData.facialData.path;
      let fileName = updateData.facialData.filename;

      // Upload photo to S3 first (before face detection) for display purposes
      if (!isOfflineReq) {
        try {
          const s3Result = await uploadFileToS3(
            imagePath,
            process.env.AWS_S3_FOLDER_MEDICAL_RECORDS,
            fileName
          );
          if (s3Result.success) {
            facialDataUrl = s3Result.url;
          }
        } catch (s3Error) {
          console.error("Error uploading facial photo to S3:", s3Error);
          // Continue with face detection even if S3 upload fails
        }
      } else {
        // For offline requests, use local file path
        facialDataUrl = getUploadedFilesFullPath(fileName);
      }

      // Now extract face descriptor for facial recognition
      const img = await canvas.loadImage(
        path.join(process.cwd(), "uploads", path.basename(imagePath))
      );
      const detection = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        return {
          success: false,
          data: {},
          message: "Failed to detect face. Try uploading clear image ",
          error: "No face detected",
        };
      }

      descriptorArray = Array.from(detection.descriptor);

      // Clean up local file after successful S3 upload
      if (!isOfflineReq && facialDataUrl) {
        cleanupLocalFile(imagePath, fileName);
      }

      // Store both face descriptor AND photo URL
      if (descriptorArray) {
        updateData.facialData = {
          faceDescriptor: descriptorArray,
          createdAt: new Date(),
        };
      }
      if (facialDataUrl) {
        updateData.facialDataUrl = facialDataUrl;
      }
    }
    */ // END COMMENTED OUT - Face detection in updateUser

    // Check for the password key is present with any value
    if (updateData.password && updateData.password !== "") {
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    }

    // Update user
    const result = await UserDataAccess.updateUserById({
      userId,
      payload: updateData,
    });

    if (result.success) {
      return {
        success: true,
        data: {
          user: result.data,
        },
        message: "User details updated successfully",
      };
    } else {
      return {
        success: false,
        data: {},
        message: "Failed to update user details",
      };
    }
  } catch (error) {
    errorLogger.error({ error: error.message }, "Service error");
    errorLogger.error(
      { data: { error: error } },
      `Error occurred while updating user details: ${error.message}`
    );
    throw error;
  }
};

// Function to delete user by userId
exports.deleteUserById = async (userId) => {
  try {
    // Check if user exists
    const userExists = await UserDataAccess.getUserInfoById({ userId });

    if (!userExists.success || !userExists.data) {
      return {
        success: false,
        data: {},
        message: "User not found",
      };
    }

    // Delete the user
    const result = await UserDataAccess.deleteUserById({ userId });

    if (result.success) {
      return {
        success: true,
        data: {},
        message: "User deleted successfully",
      };
    } else {
      return {
        success: false,
        data: {},
        message: result.message || "Failed to delete user",
      };
    }
  } catch (error) {
    errorLogger.error({ error: error.message }, "Service error");
    errorLogger.error(
      { data: { error } },
      `Error occurred while deleting user: ${error.message}`
    );
    throw error;
  }
};

// API for fetch the user list by role and assigned balagruha
exports.getUserListByAssignedBalagruhaByRole = async ({ role, userId }) => {
  try {
    // Admins can view every user across all Balagruhas and roles
    if (role === UserTypes.ADMIN) {
      const users = await User.find()
        .select(
          "-facialData -password -passwordResetToken -loginAttempts -lockUntil -__v"
        )
        .populate("balagruhaIds")
        .populate("assignedMachines")
        .populate("medicalRecords")
        .lean();

      return enrichUsersWithMedicalHistory(users);
    }

    const userInfo = await UserDataAccess.getUserInfoById({ userId });
    if (!userInfo.success || !userInfo.data) {
      return [];
    }

    const balagruhaIds = Array.isArray(userInfo.data.balagruhaIds)
      ? userInfo.data.balagruhaIds
        .map((item) => (item?._id ? item._id : item))
        .filter(Boolean)
      : [];

    if (balagruhaIds.length === 0) {
      return [];
    }

    // Non-admin users can only see students in their assigned Balagruhas
    const result = await UserDataAccess.getUsersByRoleAndBalagruhaIdList({
      role: UserTypes.STUDENT,
      balagruhaId: balagruhaIds,
    });

    if (!result.success || !Array.isArray(result.data)) {
      return [];
    }

    const uniqueUsersMap = new Map();

    result.data.forEach((user) => {
      if (!user || !user._id) {
        return;
      }
      const id = user._id.toString();
      if (!uniqueUsersMap.has(id)) {
        uniqueUsersMap.set(id, user);
      }
    });

    return Array.from(uniqueUsersMap.values());
  } catch (error) {
    errorLogger.error({ error: error.message }, "Service error");
    errorLogger.error(
      { data: { error } },
      `Error occurred while fetching user list by assigned balagruha and role: ${error.message}`
    );
    throw error;
  }
};
