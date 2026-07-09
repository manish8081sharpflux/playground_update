const { logger, errorLogger } = require("../config/pino-config");
const moodTrackerDA = require("../data-access/studentMoodTracker");

// Create or update mood entry
exports.createOrUpdateMoodEntry = async (moodData) => {
  try {
    // Validate required fields
    if (!moodData.userId || !moodData.mood) {
      return {
        success: false,
        message: "UserId and mood are required fields",
      };
    }

    // Create dateString if not provided
    if (!moodData.dateString && moodData.date) {
      const date = new Date(moodData.date);
      moodData.dateString = date.toISOString().split("T")[0];
    } else if (!moodData.dateString) {
      const date = new Date();
      moodData.dateString = date.toISOString().split("T")[0];
      moodData.date = date;
    }

    const result = await moodTrackerDA.createOrUpdateMoodEntry(moodData);

    if (result) {
      return {
        success: true,
        data: { moods: result },
        message: "Mood entry saved successfully",
      };
    } else {
      return {
        success: false,
        message: "Failed to save mood entry",
      };
    }
  } catch (error) {
    errorLogger.error(
      `Error in createOrUpdateMoodEntry service: ${error.message}`
    );
    return {
      success: false,
      message: error.message,
    };
  }
};

// Get latest mood entry by balagruha list
exports.getLatestMoodEntry = async (balagruhaIds) => {
  try {
    if (!balagruhaIds || balagruhaIds.length === 0) {
      return { success: false, message: "balagruhaIds are required" };
    }
    const result = await moodTrackerDA.getLatestMoodEntryByBalagruhaIds(
      balagruhaIds
    );
    return result;
  } catch (error) {
    errorLogger.error(`Error in getLatestMoodEntry service: ${error.message}`);
    return { success: false, message: error.message };
  }
};

// Get mood entries by userId
exports.getMoodEntriesByUserId = async (userId) => {
  try {
    if (!userId) {
      return {
        success: false,
        message: "UserId is required",
      };
    }

    const entries = await moodTrackerDA.getMoodEntriesByUserId(userId);

    return {
      success: true,
      data: { moods: entries },
      message: "Mood entries retrieved successfully",
    };
  } catch (error) {
    errorLogger.error(
      `Error in getMoodEntriesByUserId service: ${error.message}`
    );
    return {
      success: false,
      message: error.message,
    };
  }
};

// Get mood entry by id
exports.getMoodEntryById = async (entryId) => {
  try {
    if (!entryId) {
      return {
        success: false,
        message: "Entry ID is required",
      };
    }

    const entry = await moodTrackerDA.getMoodEntryById(entryId);

    if (!entry) {
      return {
        success: false,
        message: "Mood entry not found",
      };
    }

    return {
      success: true,
      data: { moods: entry },
      message: "Mood entry retrieved successfully",
    };
  } catch (error) {
    errorLogger.error(`Error in getMoodEntryById service: ${error.message}`);
    return {
      success: false,
      message: error.message,
    };
  }
};

// Update mood entry
exports.updateMoodEntry = async (entryId, updateData) => {
  try {
    if (!entryId) {
      return {
        success: false,
        message: "Entry ID is required",
      };
    }

    const updatedEntry = await moodTrackerDA.updateMoodEntry(
      entryId,
      updateData
    );

    if (!updatedEntry) {
      return {
        success: false,
        message: "Mood entry not found",
      };
    }

    return {
      success: true,
      data: updatedEntry,
      message: "Mood entry updated successfully",
    };
  } catch (error) {
    errorLogger.error(`Error in updateMoodEntry service: ${error.message}`);
    return {
      success: false,
      message: error.message,
    };
  }
};

// Delete mood entry
exports.deleteMoodEntry = async (entryId) => {
  try {
    if (!entryId) {
      return {
        success: false,
        message: "Entry ID is required",
      };
    }

    const deletedEntry = await moodTrackerDA.deleteMoodEntry(entryId);

    if (!deletedEntry) {
      return {
        success: false,
        message: "Mood entry not found",
      };
    }

    return {
      success: true,
      data: { moods: deletedEntry },
      message: "Mood entry deleted successfully",
    };
  } catch (error) {
    errorLogger.error(`Error in deleteMoodEntry service: ${error.message}`);
    return {
      success: false,
      message: error.message,
    };
  }
};

// Get mood entries by date range
exports.getMoodEntriesByDateRange = async (userId, startDate, endDate) => {
  try {
    if (!userId || !startDate || !endDate) {
      return {
        success: false,
        message: "UserId, start date and end date are required",
      };
    }

    const entries = await moodTrackerDA.getMoodEntriesByDateRange(
      userId,
      startDate,
      endDate
    );

    return {
      success: true,
      data: entries,
      message: "Mood entries retrieved successfully",
    };
  } catch (error) {
    errorLogger.error(
      `Error in getMoodEntriesByDateRange service: ${error.message}`
    );
    return {
      success: false,
      message: error.message,
    };
  }
};
