const { default: mongoose } = require("mongoose");
const TrainingSession = require("../models/trainingSession");

// create training session
exports.createTrainingSession = async (payload) => {
  return await TrainingSession.create(payload)
    .then((result) => {
      return {
        success: true,
        data: result,
        message: "Training session created successfully",
      };
    })
    .catch((error) => {
      console.log("error", error);
      throw error;
    });
};

// fetch all training sessions
exports.fetchAllTrainingSessions = async ({ balagruhaId, type }) => {
  const match = {};

  if (balagruhaId && Array.isArray(balagruhaId) && balagruhaId.length > 0) {
    match.balagruhaId = { $in: balagruhaId };
  } else if (balagruhaId) {
    match.balagruhaId = balagruhaId;
  }

  if (type && Array.isArray(type) && type.length > 0) {
    match.type = { $in: type };
  } else if (type) {
    match.type = type;
  }

  return await TrainingSession.aggregate([
    {
      $match: match,
    },
    {
      $project: {
        __v: 0,
      },
    },
  ])
    .then((result) => {
      return {
        success: true,
        data: result,
        message: "Training sessions fetched successfully",
      };
    })
    .catch((error) => {
      console.log("error", error);
      throw error;
    });
};

// Get training session count by balagruhaId
exports.getTrainingSessionsCount = async ({ balagruhaIds, type }) => {
  const match = {
    balagruhaId: {
      $in: balagruhaIds,
    },
  };

  if (type) {
    match.type = type;
  }

  return await TrainingSession.aggregate([
    {
      $match: match,
    },
    {
      $count: "count",
    },
  ])
    .then((result) => {
      return {
        success: true,
        data: result,
        message: "Training sessions count fetched successfully",
      };
    })
    .catch((error) => {
      console.log("error", error);
      throw error;
    });
};

// get all training session by balagruha and date
exports.getTrainingSessionsByBalagruhaAndDate = async ({
  balagruhaIds,
  date,
  type = ["music", "sports", "general"],
}) => {
  // Convert the input date to a Date object if it's a string
  const targetDate = new Date(date);
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  return await TrainingSession.aggregate([
    {
      $match: {
        balagruhaId: {
          $in: balagruhaIds,
        },
        date: {
          $gte: new Date(startOfDay),
          $lte: new Date(endOfDay),
        },
      },
    },
    {
      $project: {
        __v: 0,
      },
    },
  ])
    .then((result) => {
      return {
        success: true,
        data: result,
        message: "Training sessions fetched successfully",
      };
    })
    .catch((error) => {
      console.log("error", error);
      throw error;
    });
};

// edit training session
exports.editTrainingSession = async ({ trainingSessionId, payload }) => {
  return await TrainingSession.findByIdAndUpdate(trainingSessionId, payload, {
    new: true,
  })
    .then((result) => {
      return {
        success: true,
        data: result,
        message: "Training session updated successfully",
      };
    })
    .catch((error) => {
      console.log("error", error);
      throw error;
    });
};

// delete training session
exports.deleteTrainingSession = async (trainingSessionId) => {
  return await TrainingSession.findByIdAndDelete(trainingSessionId)
    .then((result) => {
      if (!result) {
        return { success: false, message: "Training session not found" };
      }
      return {
        success: true,
        data: result,
        message: "Training session deleted successfully",
      };
    })
    .catch((error) => {
      console.log("error", error);
      throw error;
    });
};
