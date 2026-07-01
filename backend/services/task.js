const { default: mongoose } = require("mongoose");
const { errorLogger } = require("../config/pino-config");
const {
  fetchTasksByUserIdAndFilter,
  createTask,
  updateTaskStatus,
  getTaskById,
  getTaskListByUserId,
  findTaskById,
  updateTaskById,
  createMultipleTask,
  findTaskByIdWithDetails,
} = require("../data-access/task");
const { uploadFileToS3 } = require("./aws/s3");
const User = require("../models/user");
const TaskModel = require("../models/task");
const {
  getTasksByBalagruhaIdAndFilter,
  getUserIdsByRoles,
  getTasksOverviewCountByBalagruhaId,
  checkUsersExistByIds,
} = require("../data-access/User");
const { userTypeHierarchy, UserTypes } = require("../constants/users");
const {
  getFileContentType,
  getUploadedFilesFullPath,
} = require("../utils/helper");

class Task {
  constructor(obj) {
    this.title = obj.title || "";
    this.description = obj.description || "";
    this.drillOrExerciseType = obj.drillOrExerciseType || "";
    this.duration = obj.duration || "";
    this.assignedUser = obj.assignedUser || null;
    this.createdBy = obj.createdBy || null;
    this.deadline = obj.deadline || null;
    this.priority = obj.priority || "";
    this.status = obj.status || "";
    this.labels = obj.labels || [];
    this.type = obj.type || "";
    this.comments = obj.comments || "";
    this.attachments = obj.attachments || [];
    this.performanceMetrics = obj.performanceMetrics || {
      time: "",
      score: "",
      repetitions: "",
    };
    this.machineDetails = obj.machineDetails || "";
    this.vendorDetails = obj.vendorDetails || "";
    this.costEstimate = obj.costEstimate || "";
    this.requiredParts = obj.requiredParts || "";
  }

  toJSON() {
    return {
      title: this.title,
      description: this.description,
      drillOrExerciseType: this.drillOrExerciseType,
      duration: this.duration,
      assignedUser: this.assignedUser,
      createdBy: this.createdBy,
      deadline: this.deadline,
      priority: this.priority,
      status: this.status,
      labels: this.labels,
      type: this.type,
      comments: this.comments,
      attachments: this.attachments,
      performanceMetrics: this.performanceMetrics,
      machineDetails: this.machineDetails,
      vendorDetails: this.vendorDetails,
      costEstimate: this.costEstimate,
      requiredParts: this.requiredParts,
    };
  }

  static async getAllTasksByUser({ userId }) {
    try {
      // check the userid is valid
      if (!userId) {
        return {
          success: false,
          data: {},
          message: "User Id not found",
        };
      }
      // let result = await fetchTasksByUserIdAndFilter(userId);
      let result = await getTaskListByUserId(userId);
      if (result.success) {
        return {
          success: true,
          data: {
            tasks: result.data,
          },
          message: "Fetched all tasks successfully",
        };
      } else {
        return {
          success: false,
          data: {},
          message: "Failed to fetch tasks",
        };
      }
    } catch (error) {
      errorLogger.error({ error: error.message }, "Service error");
      errorLogger.error(
        { data: { error: error } },
        `Error occurred during getting all tasks: ${error.message}`
      );
      throw error;
    }
  }

  static async getTaskOverview() {
    try {
    } catch (error) {
      errorLogger.error({ error: error.message }, "Service error");
      throw error;
    }
  }
  static async createTask(payload) {
    try {
      const {
        title,
        description,
        assignedUser,
        createdBy,
        deadline,
        priority,
        status,
        attachments,
        duration,
        drillOrExerciseType,
        type = "general",
        label,
      } = payload;

      if (!title || !description || !assignedUser || !createdBy || !deadline) {
        return {
          success: false,
          data: {},
          message: "All required fields must be provided.",
        };
      }

      if (
        !mongoose.Types.ObjectId.isValid(assignedUser) ||
        !mongoose.Types.ObjectId.isValid(createdBy)
      ) {
        return {
          success: false,
          data: {},
          message: "Invalid assignedUser or createdBy ID.",
        };
      }

      const assignedUserExists = await User.findById(assignedUser);
      const createdByExists = await User.findById(createdBy);

      if (!assignedUserExists || !createdByExists) {
        return {
          success: false,
          data: {},
          message: "Assigned user or creator not found.",
        };
      }

      if (isNaN(Date.parse(deadline)) || new Date(deadline) < new Date()) {
        return {
          success: false,
          data: {},
          message: "Invalid or past deadline.",
        };
      }

      // const attachments = req.files ? req.files.map((file) => file.path) : [];
      // upload the attachments to s3 bucket
      for (let i = 0; i < attachments.length; i++) {
        let file = attachments[i];
        let fileName = file.replace("uploads/", "");
        let result = await uploadFileToS3(
          file,
          process.env.AWS_S3_BUCKET_NAME_TASK_ATTACHMENTS,
          fileName
        );
        if (result.success) {
          // replace the /upload from the file name to empty string
          let attachmentObj = {
            fileName: fileName,
            fileUrl: result.url,
            fileType: result.contentType,
            uploadedBy: createdBy,
          };
          attachments[i] = attachmentObj;
        } else {
          return {
            success: false,
            data: {},
            message: "Failed to upload attachments.",
          };
        }
      }
      const task = new Task({
        title,
        description,
        assignedUser,
        createdBy,
        deadline,
        priority: priority || "medium", // Default to 'Medium' if not provided
        status: status || "pending", // Default to 'Pending' if not provided
        attachments, // Save file paths in the database
        comments: [],
        duration,
        drillOrExerciseType,
        type,
        label,
      });

      let result = await createTask(task);
      if (result && result.success) {
        return {
          success: true,
          data: {
            task: result.data[0],
          },
          message: "Task created successfully",
        };
      } else {
        return {
          success: false,
          data: {},
          message: "Failed to create task",
        };
      }
    } catch (error) {
      errorLogger.error({ error: error.message }, "Service error");
      throw error;
    }
  }

  static async createTaskV2(payload, isOfflineReq) {
    try {
      const {
        title,
        description,
        assignedUser,
        createdBy,
        deadline,
        priority,
        status,
        attachments,
        duration,
        drillOrExerciseType,
        type = "general",
        label,
        machineDetails,
        vendorDetails,
        costEstimate,
        requiredParts,
      } = payload;

      if (!title || !description || !assignedUser || !createdBy || !deadline) {
        return {
          success: false,
          data: {},
          message: "All required fields must be provided.",
        };
      }

      // if (!mongoose.Types.ObjectId.isValid(assignedUser) || !mongoose.Types.ObjectId.isValid(createdBy)) {
      //     return { success: false, data: {}, message: 'Invalid assignedUser or createdBy ID.' }
      // }
      // consider the assigned user as multiple userIds separated by comma
      let assignedUserIds = new Set();
      assignedUser.split(",").forEach((item) => {
        assignedUserIds.add(mongoose.Types.ObjectId.createFromHexString(item));
      });
      // check all the assigned user ids are valid or not
      let userIdsExists = await checkUsersExistByIds(
        Array.from(assignedUserIds)
      );

      // const assignedUserExists = await User.findById(assignedUser);
      const createdByExists = await User.findById(createdBy);

      if (!userIdsExists.success || !createdByExists) {
        return {
          success: false,
          data: {},
          message: "Assigned user or creator not found.",
        };
      }

      if (isNaN(Date.parse(deadline)) || new Date(deadline) < new Date()) {
        return {
          success: false,
          data: {},
          message: "Invalid or past deadline.",
        };
      }

      // const attachments = req.files ? req.files.map((file) => file.path) : [];
      // upload the attachments to s3 bucket
      for (let i = 0; i < attachments.length; i++) {
        let file = attachments[i];
        let fileName = file.replace("uploads/", "");
        let fileType = getFileContentType(fileName);
        let fileFullPath = getUploadedFilesFullPath(fileName);

        if (!isOfflineReq) {
          let result = await uploadFileToS3(
            file,
            process.env.AWS_S3_BUCKET_NAME_TASK_ATTACHMENTS,
            fileName
          );
          if (result.success) {
            // replace the /upload from the file name to empty string
            let attachmentObj = {
              fileName: fileName,
              fileUrl: result.url,
              fileType: result.contentType,
              uploadedBy: createdBy,
            };
            attachments[i] = attachmentObj;
          } else {
            return {
              success: false,
              data: {},
              message: "Failed to upload attachments.",
            };
          }
        } else {
          // if the request is offline, then set the file name to the attachments
          let attachmentObj = {
            fileName: fileName,
            fileUrl: fileFullPath,
            fileType: fileType,
            uploadedBy: createdBy,
          };
          attachments[i] = attachmentObj;
        }
      }
      let taskList = [];

      const task = new Task({
        title,
        description,
        assignedUser,
        createdBy,
        deadline,
        priority: priority || "medium", // Default to 'Medium' if not provided
        status: status || "pending", // Default to 'Pending' if not provided
        attachments, // Save file paths in the database
        comments: [],
        duration,
        drillOrExerciseType,
        type,
        label,
        requiredParts,
        costEstimate,
        vendorDetails,
        machineDetails,
      });
      // iterate the assigned user and create the task for each user
      Array.from(assignedUserIds).forEach((item) => {
        task.assignedUser = item;
        // Create a deep copy of the task object to avoid reference issues
        let taskCopy = JSON.parse(JSON.stringify(task.toJSON()));
        taskCopy.assignedUser = item;
        taskList.push(taskCopy);
      });
      let result = await createMultipleTask(taskList);
      if (result && result.success) {
        return {
          success: true,
          data: {
            task: result.data,
          },
          message: "Task created successfully",
        };
      } else {
        return {
          success: false,
          data: {},
          message: "Failed to create task",
        };
      }
    } catch (error) {
      errorLogger.error({ error: error.message }, "Service error");
      throw error;
    }
  }

  static async getAllTasks({
    status,
    assignedUser,
    deadline,
    priority,
    page = 1,
    limit = 10,
  }) {
    try {
      // Build the query object
      const query = {};
      if (status) query.status = status; // Filter by status
      if (assignedUser) {
        if (!mongoose.Types.ObjectId.isValid(assignedUser)) {
          return {
            success: false,
            data: {},
            message: "Invalid assignedUser ID.",
          };
        }
        query.assignedUser = assignedUser; // Filter by assigned user
      }
      if (deadline) {
        if (isNaN(Date.parse(deadline))) {
          return {
            success: false,
            message: "Invalid deadline value.",
            data: {},
          };
        }
        query.deadline = { $lte: new Date(deadline) }; // Filter by deadline
      }
      if (priority) query.priority = priority; // Filter by priority

      // Fetch tasks with pagination
      const tasks = await TaskModel.find(query)
        .populate("assignedUser", "name email") // Populate assigned user details (optional)
        .populate("createdBy", "name email") // Populate creator details (optional)
        .sort({ createdAt: -1 }) // Sort by creation date (most recent first)
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const totalTasks = await TaskModel.countDocuments(query); // Total number of tasks for the query

      return {
        success: true,
        data: {
          tasks,
          totalTasks,
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalTasks / limit),
        },
        message: "All tasks fetched successfully.",
      };
    } catch (error) {
      console.error("Error fetching all tasks:", error);
      return {
        success: false,
        message: "Internal server error.",
        error: error.message,
      };
    }
  }

  static async getTaskListByBalagruhaIdAndFilter({
    balagruhaId,
    status,
    assignedUser,
    createdBy,
    deadline,
    priority,
    page = 1,
    limit = 10,
    currentUserId,
    userRole,
    assignedFor,
    type,
  }) {
    try {
      // check the type is null or empty array, then the set default value is = ["sports","music","general"]
      if (!type || type.length == 0) {
        type = ["sports", "music", "general"];
      }
      // send empty response if the balagruhaId is not found

      if (!balagruhaId) {
        return {
          success: true,
          data: {
            tasks: [],
            totalTasks: 0,
            currentPage: 1,
            totalPages: 1,
          },
          message: "No balagruha Id found",
        };
      }

      // get the user role hierarchy
      let userHierarchy = userTypeHierarchy[userRole];
      if (userRole === UserTypes.ADMIN) {
        // For admin role, remove student from the hierarchy to ensure students' tasks are visible to admins
        if (userRole === UserTypes.ADMIN) {
          userHierarchy = userHierarchy.filter(
            (role) => role !== UserTypes.STUDENT
          );
        }
      }
      let assignedByUserIds = await getUserIdsByRoles({ roles: userHierarchy });
      let assignedIds = [];
      if (assignedByUserIds && assignedByUserIds.success) {
        assignedIds = assignedByUserIds.data.map((item) => {
          return item._id;
        });
      }
      if (assignedFor.length != 0) {
        assignedIds = assignedFor.map((item) =>
          mongoose.Types.ObjectId.createFromHexString(item)
        );
      }
      // check for the user role is student (only allow to see his own task. ie, set assignedBy as his own id )
      if (userRole == UserTypes.STUDENT) {
        assignedIds = [currentUserId];
      }

      let result = await getTasksByBalagruhaIdAndFilter({
        balagruhaId,
        status,
        assignedUser,
        createdBy,
        deadline,
        priority,
        page,
        limit,
        currentUserId,
        userRole,
        assignedIds,
        assignedFor,
        type,
      });
      if (result && result.success) {
        let taskList = [];
        // iterate the task object and format the data
        if (result.data[0].documents) {
          result.data[0].documents.forEach((item) => {
            let task = item.userTasks;
            task.assignedUser = item.user;
            task.createdBy = item.createdByDetails[0];
            task.assignedUser = {
              _id: item._id.toString(),
              age: item.age || 0,
              gender: item.gender || "",
              name: item.name || "",
              role: item.role || "",
              status: item.status || "",
            };
            taskList.push(task);
          });
        }
        return {
          success: true,
          data: {
            tasks: taskList,
            totalTasks: result.data[0].totalCount,
            currentPage: page,
            totalPages: Math.ceil(result.data[0].totalCount / limit),
          },
          message: "Task list fetched successfully",
        };
      }
    } catch (error) {
      errorLogger.error({ error: error.message }, "Service error");
      throw error;
    }
  }

  static async getTaskOverviewDetailsByBalagruhaId({ balagruhaId }) {
    try {
      let result = await getTasksOverviewCountByBalagruhaId({ balagruhaId });
      if (result && result.success) {
        return {
          success: true,
          data: {
            taskOverview: result.data[0],
          },
          message: "Task overview details fetched successfully",
        };
      } else {
        return {
          success: false,
          data: {},
          message: "Failed to fetch task overview details",
        };
      }
    } catch (error) {
      errorLogger.error({ error: error.message }, "Service error");
      throw error;
    }
  }

  static async updateTaskStatus({ taskId, status }) {
    try {
      if (!taskId) {
        return {
          success: false,
          data: {},
          message: "Task Id not found",
        };
      }
      let result = await updateTaskStatus(taskId, status);
      if (result.success) {
        return {
          success: true,
          data: {
            task: result.data,
          },
          message: "Task status updated successfully",
        };
      } else {
        return {
          success: false,
          data: {},
          message: "Failed to update task status",
        };
      }
    } catch (error) {
      errorLogger.error({ error: error.message }, "Service error");
      throw error;
    }
  }

  static async addCommentToTask({
    taskId,
    comments,
    createdById,
    attachments,
    isOfflineReq,
  }) {
    try {
      // get the task details by task id
      let task = await getTaskById(taskId);
      if (task && task.success && task.data) {
        if (attachments && attachments.length > 0) {
          // upload the attachment if existing
          for (let i = 0; i < attachments.length; i++) {
            let file = attachments[i];
            let fileName = file.filename;
            let fileFullPath = getUploadedFilesFullPath(fileName);

            if (!isOfflineReq) {
              let result = await uploadFileToS3(
                file.path,
                process.env.AWS_S3_BUCKET_NAME_TASK_ATTACHMENTS,
                fileName
              );
              if (result.success) {
                // replace the /upload from the file name to empty string
                let attachmentObj = {
                  fileName: fileName,
                  fileUrl: result.url,
                  fileType: result.contentType,
                  uploadedBy: createdById,
                };
                attachments[i] = attachmentObj;
              } else {
                return {
                  success: false,
                  data: {},
                  message: "Failed to upload attachments.",
                };
              }
            } else {
              // if the request is offline, then set the file name to the attachments
              let attachmentObj = {
                fileName: fileName,
                fileUrl: fileFullPath,
                fileType: getFileContentType(fileName),
                uploadedBy: createdById,
              };
              attachments[i] = attachmentObj;
            }
          }
        }
        // prepare the comment object
        let comment = {
          user: createdById || null,
          comment: comments,
          attachments: attachments,
          createdAt: new Date(),
        };
        if (task.data.comments && task.data.comments.length > 0) {
          // push the comment object to the task comments array
          task.data.comments.push(comment);
        } else {
          task.data.comments = [comment];
        }
        let updateResult = await updateTaskById({
          taskId,
          payload: { comments: task.data.comments },
        });
        if (updateResult.success) {
          return {
            success: true,
            data: {
              task: updateResult.data,
            },
            message: "Task comments added successfully",
          };
        } else {
          return {
            success: false,
            data: {},
            message: "Failed to add comments",
          };
        }
      } else {
        return {
          success: false,
          data: {},
          message: "Task not found",
        };
      }
    } catch (error) {
      errorLogger.error({ error: error.message }, "Service error");
      throw error;
    }
  }

  static async addOrUpdateTaskAttachment({
    taskId,
    attachments,
    createdById,
    isOfflineReq,
  }) {
    try {
      // check the task id existing,
      if (!taskId) {
        return {
          success: false,
          data: {},
          message: "Task Id not found",
        };
      }
      // check the task existing.
      let task = await findTaskById({ taskId });
      if (task.success && task.data) {
        // upload the attachments
        errorLogger.error({ msg: 'addOrUpdateTaskAttachment - incoming attachments', attachmentsReceived: attachments.length });

        const useLocalFallback =
          !process.env.AWS_S3_ACCESS_KEY_ID ||
          !process.env.AWS_S3_SECRET_KEY ||
          process.env.AWS_S3_ACCESS_KEY_ID.includes("YOUR_") ||
          process.env.AWS_S3_SECRET_KEY.includes("YOUR_");

        for (let i = 0; i < attachments.length; i++) {
          let file = attachments[i];
          let fileName = file.filename;
          let fileFullPath = getUploadedFilesFullPath(fileName);
          if (!isOfflineReq && !useLocalFallback) {
            let result = await uploadFileToS3(
              file.path,
              process.env.AWS_S3_BUCKET_NAME_TASK_ATTACHMENTS,
              fileName
            );
            if (result.success) {
              // replace the /upload from the file name to empty string
              let attachmentObj = {
                fileName: fileName,
                fileUrl: result.url,
                fileType: result.contentType,
                uploadedBy: createdById,
              };
              attachments[i] = attachmentObj;
            } else {
              errorLogger.error(
                {
                  msg: 'addOrUpdateTaskAttachment - upload failed',
                  filePath: file.path,
                  error: result.error || result.message,
                },
                'S3 upload failed; falling back to local upload path'
              );
              let attachmentObj = {
                fileName: fileName,
                fileUrl: `/uploads/${fileName}`,
                fileType: file.mimetype || getFileContentType(fileName),
                uploadedBy: createdById,
              };
              attachments[i] = attachmentObj;
            }
          } else {
            // if the request is offline or S3 is not configured, then set the file name to the attachments
            let attachmentObj = {
              fileName: fileName,
              fileUrl: `/uploads/${fileName}`,
              fileType: file.mimetype || getFileContentType(fileName),
              uploadedBy: createdById,
            };
            attachments[i] = attachmentObj;
          }
        }
        let existingAttachments = task.data.attachments || [];
        errorLogger.error({ msg: 'addOrUpdateTaskAttachment - existingAttachments length', existingLength: existingAttachments.length });
        errorLogger.error({ msg: 'addOrUpdateTaskAttachment - final attachments array', attachments });
        if (existingAttachments.length > 0) {
          attachments = [...existingAttachments, ...attachments];
        } else {
          attachments = attachments;
        }

        let updateResult = await updateTaskById({
          taskId,
          payload: { attachments: attachments },
        });
        errorLogger.error({ msg: 'addOrUpdateTaskAttachment - updateResult.success', success: updateResult.success });
        if (updateResult.success) {
          return {
            success: true,
            data: {
              task: updateResult.data,
            },
            message: "Task attachments updated successfully",
          };
        } else {
          return {
            success: false,
            data: {},
            message: "Failed to update task attachments",
          };
        }
      } else {
        return {
          success: false,
          data: {},
          message: "Task not found",
        };
      }
    } catch (error) {
      errorLogger.error({ error: error.message }, "Service error");
      throw error;
    }
  }
  // Function for delete the task attachment
  static async deleteTaskAttachment({ taskId, attachmentId }) {
    try {
      // check the task id existing,
      if (!taskId) {
        return {
          success: false,
          data: {},
          message: "Task Id not found",
        };
      }
      // check the attachment id existing,
      if (!attachmentId) {
        return {
          success: false,
          data: {},
          message: "Attachment Id not found",
        };
      }
      // check the task existing.
      let task = await findTaskById({ taskId });
      if (task.success && task.data) {
        let existingAttachments = task.data.attachments || [];
        let updatedAttachments = existingAttachments.filter(
          (item) => item._id.toString() !== attachmentId
        );
        let updateResult = await updateTaskById({
          taskId,
          payload: { attachments: updatedAttachments },
        });
        if (updateResult.success) {
          return {
            success: true,
            data: {
              task: updateResult.data,
            },
            message: "Task attachment deleted successfully",
          };
        } else {
          return {
            success: false,
            data: {},
            message: "Failed to delete task attachment",
          };
        }
      } else {
        return {
          success: false,
          data: {},
          message: "Task not found",
        };
      }
    } catch (error) {
      errorLogger.error({ error: error.message }, "Service error");
      throw error;
    }
  }

  // Function for delete the task comment by id
  static async deleteTaskComment({ taskId, commentId }) {
    try {
      // check the task id existing,
      if (!taskId) {
        return {
          success: false,
          data: {},
          message: "Task Id not found",
        };
      }
      // check the comment id existing,
      if (!commentId) {
        return {
          success: false,
          data: {},
          message: "Comment Id not found",
        };
      }
      // check the task existing.
      let task = await findTaskById({ taskId });
      if (task.success && task.data) {
        let existingComments = task.data.comments || [];
        let updatedComments = existingComments.filter(
          (item) => item._id.toString() !== commentId
        );
        let updateResult = await updateTaskById({
          taskId,
          payload: { comments: updatedComments },
        });
        if (updateResult.success) {
          return {
            success: true,
            data: {
              task: updateResult.data,
            },
            message: "Task comment deleted successfully",
          };
        } else {
          return {
            success: false,
            data: {},
            message: "Failed to delete task comment",
          };
        }
      } else {
        return {
          success: false,
          data: {},
          message: "Task not found",
        };
      }
    } catch (error) {
      errorLogger.error({ error: error.message }, "Service error");
      throw error;
    }
  }

  // Function to get task details by task ID
  static async getTaskDetailsById({ taskId }) {
    try {
      if (!taskId) {
        return {
          success: false,
          data: {},
          message: "Task ID not provided",
        };
      }

      // Check if the taskId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(taskId)) {
        return {
          success: false,
          data: {},
          message: "Invalid task ID format",
        };
      }

      // Get task details with populated references
      let result = await findTaskByIdWithDetails({ taskId });

      if (result.success && result.data) {
        return {
          success: true,
          data: {
            task: result.data,
          },
          message: "Task details fetched successfully",
        };
      } else {
        return {
          success: false,
          data: {},
          message: result.message || "Task not found",
        };
      }
    } catch (error) {
      errorLogger.error({ error: error.message }, "Service error");
      errorLogger.error(
        { data: { error: error } },
        `Error occurred during fetching task details: ${error.message}`
      );
      throw error;
    }
  }

  static async getAssignableUsersForCreator({ requester }) {
    try {
      if (!requester) {
        return {
          success: false,
          data: {},
          message: "Requester information missing",
        };
      }

      if (requester.role === UserTypes.STUDENT) {
        return {
          success: false,
          data: {},
          message: "Students are not allowed to assign tasks",
        };
      }

      const formatUser = (user) => ({
        _id: user._id,
        name: user.name,
        role: user.role,
        balagruhaIds: (user.balagruhaIds || []).map((id) => id.toString()),
      });

      const staffUsers = await User.find({
        status: "active",
        role: { $ne: UserTypes.STUDENT },
      })
        .select("_id name role balagruhaIds")
        .sort({ name: 1 })
        .lean();

      let studentUsers = [];
      if (requester.role === UserTypes.ADMIN) {
        studentUsers = await User.find({
          status: "active",
          role: UserTypes.STUDENT,
        })
          .select("_id name role balagruhaIds")
          .sort({ name: 1 })
          .lean();
      } else {
        const balagruhaIds = (requester.balagruhaIds || [])
          .map((id) =>
            typeof id === "string" ? mongoose.Types.ObjectId.createFromHexString(id) : id
          )
          .filter(Boolean);

        if (balagruhaIds.length > 0) {
          studentUsers = await User.find({
            status: "active",
            role: UserTypes.STUDENT,
            balagruhaIds: { $in: balagruhaIds },
          })
            .select("_id name role balagruhaIds")
            .sort({ name: 1 })
            .lean();
        }
      }

      return {
        success: true,
        data: {
          staff: staffUsers.map(formatUser),
          students: studentUsers.map(formatUser),
        },
        message: "Assignable users fetched successfully",
      };
    } catch (error) {
      errorLogger.error({ error: error.message }, "Service error");
      throw error;
    }
  }
}

module.exports = Task;
