const { default: mongoose } = require("mongoose");
const { errorLogger } = require("../config/pino-config");
const {
  createTrainingSession,
  fetchAllTrainingSessions,
  editTrainingSession,
  deleteTrainingSession,
} = require("../data-access/trainingSession");

class TrainingSession {
  constructor(obj) {
    this.title = obj.title || "";
    this.description = obj.description || "";
    this.date = obj.date || null;
    this.location = obj.location || "";
    this.drillsAndExercises = obj.drillsAndExercises || "";
    this.notificationPreferences = obj.notificationPreferences || "";
    this.createdBy = obj.createdBy || "";
    this.balagruhaId = obj.balagruhaId || "";
    this.type = obj.type || "";
    this.label = obj.label || "";
    this.assignedStudents = obj.assignedStudents || [];
  }

  static async createTrainingSession(payload) {
    try {
      let trainingSession = new TrainingSession(payload);
      let result = await createTrainingSession(trainingSession);
      if (result.success) {
        return {
          success: true,
          data: { trainingSession: result.data },
          message: "Training session created successfully",
        };
      }
      return { success: false, message: result.message };
    } catch (error) {
      errorLogger.error({ error: error.message }, "Service error");
      throw error;
    }
  }

  static async getAllTrainingSessions({ balagruhaIds, type }) {
    try {
      if (!balagruhaIds) {
        return { success: false, message: "balagruhaIds is required" };
      }

      // Check if type is provided, if not set it to "all"
      if (!type || type === "") {
        // convert the comma separated string to array
        type = ["sports", "music", "general"];
      } else {
        type = type.split(",").map((item) => item.trim());
      }

      // check the balagruhaId is a string and convert the comma separated string to array
      if (typeof balagruhaIds === "string") {
        balagruhaIds = balagruhaIds
          .split(",")
          .map((item) =>
            mongoose.Types.ObjectId.createFromHexString(item.trim())
          );
      }

      let result = await fetchAllTrainingSessions({
        balagruhaId: balagruhaIds,
        type,
      });
      if (result.success) {
        return {
          success: true,
          data: { trainingSessions: result.data },
          message: "Training sessions fetched successfully",
        };
      }
      return { success: false, message: result.message };
    } catch (error) {
      errorLogger.error({ error: error.message }, "Service error");
      throw error;
    }
  }

  //  Function for edit the training session
  static async editTrainingSession({ trainingSessionId, payload }) {
    try {
      let result = await editTrainingSession({ trainingSessionId, payload });
      if (result.success) {
        return {
          success: true,
          data: { trainingSession: result.data },
          message: "Training session updated successfully",
        };
      }
      return { success: false, message: result.message };
    } catch (error) {
      errorLogger.error({ error: error.message }, "Service error");
      throw error;
    }
  }

  // Function to delete a training session
  static async deleteTrainingSession(trainingSessionId) {
    try {
      let result = await deleteTrainingSession(trainingSessionId);
      if (result.success) {
        return {
          success: true,
          data: { trainingSession: result.data },
          message: "Training session deleted successfully",
        };
      }
      return { success: false, message: result.message };
    } catch (error) {
      errorLogger.error({ error: error.message }, "Service error");
      throw error;
    }
  }
}

module.exports = TrainingSession;
