const { default: mongoose } = require("mongoose");
const { errorLogger } = require("../config/pino-config");
const User = require("../models/user");
const { uploadFileToS3 } = require("./aws/s3");
const {
  createSportsTask,
  updateSportsTask,
  getSportsTasksByFilters,
  findSportsTaskById,
} = require("../data-access/sportsTask");
const { userTypeHierarchy, UserTypes } = require("../constants/users");
const {
  getUserIdsByRoles,
  getUserSportsTasksByFilters,
  getTasksByBalagruhaIdAndFilter,
  getTotalStudentsCountByBalagruhaId,
  getSportsTasksCountByBalagruhaId,
  getStudentsWithSportsTaskByBalagruhaId,
  getMusicTasksCountByBalagruhaId,
} = require("../data-access/User");
const {
  getTrainingSessionsCount,
  getTrainingSessionsByBalagruhaAndDate,
} = require("../data-access/trainingSession");
const Task = require("./task");
const {
  updateTaskItemById,
  updateTaskById,
  findTaskById,
} = require("../data-access/task");
const { getUploadedFilesFullPath } = require("../utils/helper");

class MusicTask {
  constructor(obj) {
    this.title = obj.title || "";
    this.description = obj.description || "";
    this.assignedUser = obj.assignedUser || null;
    this.createdBy = obj.createdBy || null;
    this.deadline = obj.deadline || null;
    this.priority = obj.priority || "";
    this.status = obj.status || "";
    this.comments = obj.comments || "";
    this.attachments = obj.attachments || null;
    this.drillOrExerciseType = obj.drillOrExerciseType || "";
    this.duration = obj.duration || "";
    this.performanceMetrics = obj.performanceMetrics || {
      time: "",
      score: "",
      repetitions: "",
    };
  }

  toJSON() {
    return {
      title: this.title,
      description: this.description,
      assignedUser: this.assignedUser,
      createdBy: this.createdBy,
      deadline: this.deadline,
      priority: this.priority,
      status: this.status,
      comments: this.comments,
      attachments: this.attachments,
      drillOrExerciseType: this.drillOrExerciseType,
      duration: this.duration,
      performanceMetrics: this.performanceMetrics,
    };
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
        drillOrExerciseType,
        duration,
      } = payload;

      let isOfflineReq = payload.isOfflineReq || false;

      // set the required fields for the sports task
      const performanceMetrics = {
        time: payload["performanceMetrics.time"] || "",
        score: payload["performanceMetrics.score"] || "",
        repetitions: payload["performanceMetrics.repetitions"] || "",
      };

      if (!title || !description || !assignedUser || !createdBy || !deadline) {
        return {
          success: false,
          data: {},
          message: "All required fields must be provided.",
        };
      }

      payload.performanceMetrics = performanceMetrics;
      // set the type to sports
      payload.type = "music";
      let result = await Task.createTaskV2(payload, isOfflineReq);
      return result;
    } catch (error) {
      errorLogger.error({ error: error.message }, "Service error");
      throw error;
    }
  }

  static async updateTask(taskId, payload) {
    try {
      if (!mongoose.Types.ObjectId.isValid(taskId)) {
        return { success: false, data: {}, message: "Invalid task ID." };
      }

      // Check if assignedUser is provided and valid
      if (payload.assignedUser) {
        if (!mongoose.Types.ObjectId.isValid(payload.assignedUser)) {
          return {
            success: false,
            data: {},
            message: "Invalid assignedUser ID.",
          };
        }
        const assignedUserExists = await User.findById(payload.assignedUser);
        if (!assignedUserExists) {
          return {
            success: false,
            data: {},
            message: "Assigned user not found.",
          };
        }
      }

      // Validate deadline if provided
      if (
        payload.deadline &&
        (isNaN(Date.parse(payload.deadline)) ||
          new Date(payload.deadline) < new Date())
      ) {
        return {
          success: false,
          data: {},
          message: "Invalid or past deadline.",
        };
      }

      // Handle attachments if provided
      if (payload.attachments && payload.attachments.length > 0) {
        const updatedAttachments = [];
        for (let i = 0; i < payload.attachments.length; i++) {
          let file = payload.attachments[i];
          // Check if it's a path (new file) or an existing attachment object
          if (typeof file === "string" && file.startsWith("uploads/")) {
            let fileName = file.replace("uploads/", "");
            let result = await uploadFileToS3(
              file,
              process.env.AWS_S3_FOLDER_SPORTS_TASK_ATTACHMENTS,
              fileName
            );
            if (result.success) {
              let attachmentObj = {
                fileName: fileName,
                fileUrl: result.url,
                fileType: result.contentType,
                uploadedBy: payload.updatedBy,
              };
              updatedAttachments.push(attachmentObj);
            } else {
              return {
                success: false,
                data: {},
                message: "Failed to upload attachments.",
              };
            }
          } else {
            // If it's an existing attachment object, keep it as is
            updatedAttachments.push(file);
          }
        }
        payload.attachments = updatedAttachments;
      }

      // Update performance metrics if provided
      if (
        payload["performanceMetrics.time"] ||
        payload["performanceMetrics.score"] ||
        payload["performanceMetrics.repetitions"]
      ) {
        payload.performanceMetrics = {
          time: payload["performanceMetrics.time"] || "",
          score: payload["performanceMetrics.score"] || "",
          repetitions: payload["performanceMetrics.repetitions"] || "",
        };

        // Remove the dot notation fields
        delete payload["performanceMetrics.time"];
        delete payload["performanceMetrics.score"];
        delete payload["performanceMetrics.repetitions"];
      }

      // Add last updated timestamp
      payload.updatedAt = new Date();

      let result = await updateTaskItemById(taskId, payload);

      if (result && result.success) {
        return {
          success: true,
          data: { task: result.data },
          message: "Sports Task updated successfully",
        };
      } else {
        return {
          success: false,
          data: {},
          message: result.message || "Failed to update sports task",
        };
      }
    } catch (error) {
      errorLogger.error({ error: error.message }, "Service error");
      throw error;
    }
  }

  static async getSportsTasks(filters) {
    try {
      let {
        balagruhaId,
        status,
        priority,
        createdBy,
        page,
        limit,
        currentUserId,
        userRole,
        assignedIds,
      } = filters;

      if (!balagruhaId) {
        return {
          success: false,
          data: {},
          message: "Balagruha ID is required.",
        };
      }

      // if (!mongoose.Types.ObjectId.isValid(balagruhaId)) {
      //     return { success: false, data: {}, message: 'Invalid Balagruha ID.' };
      // }

      // Validate and process assignedIds if provided
      let processedAssignedIds = [];
      if (assignedIds && assignedIds.length > 0) {
        for (const id of assignedIds) {
          if (mongoose.Types.ObjectId.isValid(id)) {
            processedAssignedIds.push(
              mongoose.Types.ObjectId.createFromHexString(id)
            );
          }
        }
      } else {
        let userHierarchy = userTypeHierarchy[UserTypes.STUDENT];
        assignedIds = await getUserIdsByRoles({ roles: userHierarchy });
      }

      // Parse status and priority values
      let statusValues = ["pending", "in-progress", "completed"];
      if (status && Array.isArray(status) && status.length > 0) {
        statusValues = status;
      }

      let priorityValues = ["low", "medium", "high"];
      if (priority && Array.isArray(priority) && priority.length > 0) {
        priorityValues = priority;
      }

      const result = await getUserSportsTasksByFilters({
        balagruhaId,
        status: statusValues,
        priority: priorityValues,
        createdBy,
        page: page || 1,
        limit: limit || 10,
        currentUserId,
        userRole,
        assignedIds: processedAssignedIds,
      });

      if (result && result.success) {
        return {
          success: true,
          data: {
            tasks: result.data[0].documents || [],
            count: result.data[0].totalCount || 0,
          },
          message: "Sports tasks fetched successfully",
        };
      } else {
        return {
          success: false,
          data: {},
          message: "Failed to fetch sports tasks",
        };
      }
    } catch (error) {
      errorLogger.error({ error: error.message }, "Service error");
      throw error;
    }
  }

  static async getStudentsWithSportsTask({
    balagruhaId,
    drillOrExerciseType,
    startDate = new Date("2000-03-28"),
    endDate = new Date(),
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
  }) {
    try {
      // get the user role hierarchy
      let userHierarchy = userTypeHierarchy[userRole];
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
      let result = await getUserSportsTasksByFilters({
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
        drillOrExerciseType,
      });
      if (result && result.success) {
        let taskList = [];
        let studentList = [];
        // iterate the task object and format the data
        if (result.data[0].documents) {
          result.data[0].documents.forEach((item) => {
            item.taskList = item.userSportsTasks;
            delete item.userSportsTasks;

            // let task = item.userSportsTasks
            // task.assignedUser = item.user
            // task.createdBy = item.createdByDetails[0]
            // task.assignedUser = {
            //     _id: item._id.toString(),
            //     age: item.age || 0,
            //     gender: item.gender || "",
            //     name: item.name || "",
            //     role: item.role || "",
            //     status: item.status || "",
            // }
            studentList.push(item);
          });
        }
        return {
          success: true,
          data: {
            students: studentList,
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

  static async getMusicInsights({ balagruhaId, date = new Date() }) {
    try {
      let type = ["music"];
      // convert the balagruhaId to array of object id
      if (typeof balagruhaId === "string") {
        balagruhaId = [
          mongoose.Types.ObjectId.createFromHexString(balagruhaId),
        ];
      } else if (Array.isArray(balagruhaId)) {
        balagruhaId = balagruhaId.map((item) =>
          mongoose.Types.ObjectId.createFromHexString(item)
        );
      }
      // get the total count of student by balagruha
      let studentCount = await getTotalStudentsCountByBalagruhaId({
        balagruhaIds: balagruhaId,
      });
      let trainingSessionCount = await getTrainingSessionsCount({
        balagruhaIds: balagruhaId,
        type,
      });
      let activeTaskCount = await getMusicTasksCountByBalagruhaId({
        balagruhaIds: balagruhaId,
      });
      let todaysTrainingSessions = await getTrainingSessionsByBalagruhaAndDate({
        balagruhaIds: balagruhaId,
        date,
        type: ["music"],
      });
      let todaysTasks = await getStudentsWithSportsTaskByBalagruhaId({
        balagruhaIds: balagruhaId,
        date,
      });
      // also fetch attendance details
      let result = await Promise.all([
        studentCount,
        trainingSessionCount,
        activeTaskCount,
        todaysTrainingSessions,
        todaysTasks,
      ]);
      if (result) {
        // Extract values from result array with proper null checking
        studentCount =
          result[0]?.success &&
          result[0]?.data?.[0]?.total !== undefined &&
          result[0]?.data?.[0]?.total !== ""
            ? result[0].data[0].total
            : 0;

        trainingSessionCount =
          result[1]?.success && result[1]?.data?.[0]
            ? result[1].data[0].count || 0
            : 0;

        activeTaskCount =
          result[2]?.success && result[2]?.data?.[0]
            ? result[2].data[0].totalSportsTasksCount || 0
            : 0;

        todaysTrainingSessions =
          result[3]?.success && result[3]?.data ? result[3].data : [];

        todaysTasks =
          result[4]?.success && result[4]?.data ? result[4].data : [];
        return {
          success: true,
          data: {
            studentCount: studentCount || 0,
            trainingSessionCount: trainingSessionCount || 0,
            activeTaskCount: activeTaskCount || 0,
            attendanceRage: 91,
            todaysTrainingSessions: todaysTrainingSessions || [],
            todaysTasks: todaysTasks || [],
          },
          message: "Sports insights fetched successfully",
        };
      } else {
        return {
          success: false,
          data: {
            studentCount: 0,
            trainingSessionCount: 0,
            activeTaskCount: 0,
            todaysTrainingSessions: [],
            todaysTasks: [],
          },
          message: "Failed to fetch sports insights",
        };
      }
    } catch (error) {
      errorLogger.error({ error: error.message }, "Service error");
      throw error;
    }
  }

  static async addOrUpdateMusicTaskAttachment({
    taskId,
    attachments,
    createdById,
    isOfflineReq = false,
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

        for (let i = 0; i < attachments.length; i++) {
          let file = attachments[i];
          let fileName = file.filename;
          let fileFullPath = getUploadedFilesFullPath(fileName);

          if (!isOfflineReq) {
            let result = await uploadFileToS3(
              file.path,
              process.env.AWS_S3_FOLDER_TASK_ATTACHMENTS,
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
            return {
              success: false,
              data: {},
              message: "S3 upload is required for attachments.",
            };
          }
        }

        let existingAttachments = task.data.attachments || [];
        if (existingAttachments.length > 0) {
          attachments = [...existingAttachments, ...attachments];
        } else {
          attachments = attachments;
        }

        let updateResult = await updateTaskById({
          taskId: taskId,
          payload: { attachments: attachments },
        });
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

  static async addCommentsToMusicTask({
    taskId,
    comments,
    createdById,
    attachments,
    isOfflineReq = false,
  }) {
    try {
      // get the task details by task id
      let task = await findTaskById({ taskId });
      if (task && task.success && task.data) {
        // upload the attachment if existing
        for (let i = 0; i < attachments.length; i++) {
          let file = attachments[i];
          let fileName = file.filename;
          let fileFullPath = getUploadedFilesFullPath(fileName);
          if (!isOfflineReq) {
            let result = await uploadFileToS3(
              file.path,
              process.env.AWS_S3_FOLDER_TASK_ATTACHMENTS,
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
            return {
              success: false,
              data: {},
              message: "S3 upload is required for attachments.",
            };
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
          taskId: taskId,
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
}

module.exports = MusicTask;
