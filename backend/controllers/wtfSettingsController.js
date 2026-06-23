const WtfSettingsService = require("../services/wtfSettings");
const { logger, errorLogger } = require("../config/pino-config");

/**
 * Get current WTF settings
 */
const getCurrentSettings = async (req, res) => {
  try {
    const settings = await WtfSettingsService.getCurrentSettings();

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    errorLogger.error("Error in getCurrentSettings controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get WTF settings",
    });
  }
};

/**
 * Update WTF settings
 */
const updateSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const settingsData = req.body;

    const updatedSettings = await WtfSettingsService.updateSettings(
      settingsData,
      userId
    );

    res.status(200).json({
      success: true,
      message: "WTF settings updated successfully",
      data: updatedSettings,
    });
  } catch (error) {
    errorLogger.error("Error in updateSettings controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update WTF settings",
    });
  }
};

/**
 * Upload background image
 */
const uploadBackgroundImage = async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    const imageUrl = await WtfSettingsService.uploadBackgroundImage(
      file,
      userId
    );

    res.status(200).json({
      success: true,
      message: "Background image uploaded successfully",
      data: {
        imageUrl,
      },
    });
  } catch (error) {
    errorLogger.error("Error in uploadBackgroundImage controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to upload background image",
    });
  }
};

/**
 * Upload font
 */
const uploadFontFile = async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;
    if (!file) {
      return res
        .status(400)
        .json({ success: false, message: "No font file provided" });
    }

    const fontUrl = await WtfSettingsService.uploadFont(file, userId);
    res.status(200).json({
      success: true,
      message: "Font uploaded successfully",
      data: { fontUrl },
    });
  } catch (error) {
    errorLogger.error("Error in uploadFontFile controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to upload font",
    });
  }
};

/**
 * Delete background image from S3
 */
const deleteBackgroundImage = async (req, res) => {
  try {
    const { imageUrl } = req.body || {};
    // Prefer provided imageUrl; if missing, delete current active image
    let urlToDelete = imageUrl;
    if (!urlToDelete) {
      const settings = await WtfSettingsService.getCurrentSettings();
      urlToDelete = settings?.backgroundImage || null;
    }
    if (!urlToDelete) {
      return res.status(400).json({
        success: false,
        message: "No background image to delete",
      });
    }
    await WtfSettingsService.deleteBackgroundImage(urlToDelete);
    return res.status(200).json({
      success: true,
      message: "Background image deleted",
    });
  } catch (error) {
    errorLogger.error("Error in deleteBackgroundImage controller:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete background image",
    });
  }
};

/**
 * Get settings history
 */
const getSettingsHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await WtfSettingsService.getSettingsHistory(page, limit);

    res.status(200).json({
      success: true,
      data: result.settings,
      pagination: result.pagination,
    });
  } catch (error) {
    errorLogger.error("Error in getSettingsHistory controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get settings history",
    });
  }
};

module.exports = {
  getCurrentSettings,
  updateSettings,
  uploadBackgroundImage,
  uploadFontFile,
  deleteBackgroundImage,
  getSettingsHistory,
  // New coin reward handlers
  getCoinReward: async (req, res) => {
    try {
      const value = await WtfSettingsService.getCoinReward();
      return res
        .status(200)
        .json({ success: true, data: { wtfCoinReward: value } });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,
          message: error.message || "Failed to get coin reward",
        });
    }
  },
  updateCoinReward: async (req, res) => {
    try {
      const userId = req.user.id;
      const { wtfCoinReward } = req.body || {};
      const saved = await WtfSettingsService.updateCoinReward(
        wtfCoinReward,
        userId
      );
      return res
        .status(200)
        .json({
          success: true,
          message: "WTF coin reward updated",
          data: saved,
        });
    } catch (error) {
      return res
        .status(400)
        .json({
          success: false,
          message: error.message || "Failed to update coin reward",
        });
    }
  },
};
