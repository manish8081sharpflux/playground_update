const WtfSettings = require("../models/wtfSettings");
const { logger, errorLogger } = require("../config/pino-config");
const {
  uploadWtfMedia,
  uploadWtfMediaBuffer,
  deleteWtfMedia,
} = require("./aws/s3");

class WtfSettingsService {
  /**
   * Get current active WTF settings
   */
  async getCurrentSettings() {
    try {
      const settings = await WtfSettings.findOne({ isActive: true })
        .populate("createdBy", "name")
        .populate("updatedBy", "name");

      if (!settings) {
        // Return default settings if none exist
        return {
          backgroundType: "color",
          backgroundColor: "#f8fafc",
          backgroundImage: null,
          fontColor: "#0f172a",
          wtfCoinReward: 25,
          isActive: true,
        };
      }

      return settings;
    } catch (error) {
      errorLogger.error("Error getting current WTF settings:", error);
      throw new Error("Failed to get WTF settings");
    }
  }

  /**
   * Update WTF background settings
   */
  async updateSettings(settingsData, userId) {
    try {
      const {
        backgroundType,
        backgroundColor,
        backgroundImage,
        fontFamily,
        fontUrl,
        fontColor,
      } = settingsData;
      // Preserve existing coin reward value when background-only updates happen
      const current = await WtfSettings.findOne({ isActive: true });

      // Validate required fields
      if (!backgroundType || !["color", "image"].includes(backgroundType)) {
        throw new Error("Invalid background type");
      }

      if (backgroundType === "color" && !backgroundColor) {
        throw new Error("Background color is required when type is color");
      }

      if (backgroundType === "image" && !backgroundImage) {
        throw new Error("Background image is required when type is image");
      }

      // Deactivate current active settings
      await WtfSettings.updateMany({ isActive: true }, { isActive: false });

      // Create new settings
      const newSettings = new WtfSettings({
        backgroundType,
        backgroundColor:
          backgroundType === "color" ? backgroundColor : "#f8fafc",
        backgroundImage: backgroundType === "image" ? backgroundImage : null,
        fontFamily: fontFamily || null,
        fontUrl: fontUrl || null,
        fontColor: fontColor || current?.fontColor || "#0f172a",
        wtfCoinReward: current?.wtfCoinReward ?? 25,
        isActive: true,
        createdBy: userId,
        updatedBy: userId,
      });

      const savedSettings = await newSettings.save();
      await savedSettings.populate("createdBy", "name");
      await savedSettings.populate("updatedBy", "name");

      logger.info(`WTF settings updated by user ${userId}`, {
        settingsId: savedSettings._id,
        backgroundType,
        backgroundColor: backgroundType === "color" ? backgroundColor : null,
        backgroundImage: backgroundType === "image" ? backgroundImage : null,
        fontFamily: fontFamily || null,
        fontUrl: fontUrl || null,
        fontColor: fontColor || current?.fontColor || "#0f172a",
      });

      return savedSettings;
    } catch (error) {
      errorLogger.error("Error updating WTF settings:", error);
      throw error;
    }
  }

  /**
   * Get only the coin reward value
   */
  async getCoinReward() {
    try {
      const settings = await WtfSettings.findOne({ isActive: true });
      return typeof settings?.wtfCoinReward === "number"
        ? settings.wtfCoinReward
        : 25;
    } catch (error) {
      errorLogger.error("Error getting WTF coin reward:", error);
      return 25;
    }
  }

  /**
   * Update the coin reward value while preserving other active settings
   */
  async updateCoinReward(newRewardValue, userId) {
    try {
      const reward = Number(newRewardValue);
      if (!Number.isFinite(reward) || reward < 0) {
        throw new Error("Invalid coin reward value");
      }

      const current = await WtfSettings.findOne({ isActive: true });

      // Deactivate current active settings
      await WtfSettings.updateMany({ isActive: true }, { isActive: false });

      const newSettings = new WtfSettings({
        backgroundType: current?.backgroundType || "color",
        backgroundColor: current?.backgroundColor || "#f8fafc",
        backgroundImage: current?.backgroundImage || null,
        fontFamily: current?.fontFamily || null,
        fontUrl: current?.fontUrl || null,
        wtfCoinReward: reward,
        isActive: true,
        createdBy: userId,
        updatedBy: userId,
      });

      const saved = await newSettings.save();
      await saved.populate("createdBy", "name");
      await saved.populate("updatedBy", "name");
      return saved;
    } catch (error) {
      errorLogger.error("Error updating WTF coin reward:", error);
      throw error;
    }
  }

  /**
   * Upload font file (woff2/ttf/otf)
   */
  async uploadFont(file, userId) {
    try {
      if (!file) {
        throw new Error("No file provided");
      }

      const allowedTypes = [
        "font/woff2",
        "font/woff",
        "application/x-font-ttf",
        "font/ttf",
        "application/x-font-otf",
        "font/otf",
      ];
      if (!allowedTypes.includes(file.mimetype)) {
        throw new Error(
          "Invalid font type. Only WOFF2/WOFF/TTF/OTF are allowed"
        );
      }

      // 1MB limit for fonts
      const maxSize = 1 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error("Font file too large. Maximum size is 1MB");
      }

      const ext = file.originalname.split(".").pop();
      const fileName = `fonts/wtf-font-${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}.${ext}`;

      const fontUrl = await uploadWtfMediaBuffer(
        file.buffer,
        fileName,
        file.mimetype
      );

      // Clean up uploaded temp file on disk if exists (multer disk storage)
      try {
        if (file.path) {
          const fs = require("fs");
          fs.unlink(file.path, () => {});
        }
      } catch (e) {
        // non-blocking cleanup
      }

      logger.info(`WTF font uploaded by user ${userId}`, {
        fileName,
        fontUrl,
      });

      return fontUrl;
    } catch (error) {
      errorLogger.error("Error uploading WTF font:", error);
      throw error;
    }
  }

  /**
   * Upload background image
   */
  async uploadBackgroundImage(file, userId) {
    try {
      if (!file) {
        throw new Error("No file provided");
      }

      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/jpg",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.mimetype)) {
        throw new Error(
          "Invalid file type. Only JPEG, PNG, and WebP images are allowed"
        );
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new Error("File size too large. Maximum size is 5MB");
      }

      // Upload to S3 in settings folder
      const path = require("path");
      const originalExt =
        path.extname(file.originalname) || `.${file.mimetype.split("/")[1]}`;
      const fileName = `settings/backgrounds/wtf-bg-${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}${originalExt}`;

      // Some multer configs provide buffer, others write to disk
      const fs = require("fs");
      const buffer =
        file.buffer || (file.path ? fs.readFileSync(file.path) : null);
      if (!buffer) {
        throw new Error("Failed to read uploaded image data");
      }

      const imageUrl = await uploadWtfMediaBuffer(
        buffer,
        fileName,
        file.mimetype
      );

      logger.info(`WTF background image uploaded by user ${userId}`, {
        fileName,
        imageUrl,
        fileSize: file.size,
      });

      // Clean up temporary file if written to disk
      try {
        if (file.path) {
          fs.unlink(file.path, () => {});
        }
      } catch (e) {
        // Non-blocking cleanup
      }

      return imageUrl;
    } catch (error) {
      errorLogger.error("Error uploading WTF background image:", error);
      throw error;
    }
  }

  /**
   * Delete background image from S3
   */
  async deleteBackgroundImage(imageUrl) {
    try {
      if (!imageUrl) {
        return;
      }

      await deleteWtfMedia(imageUrl);
      logger.info("WTF background image deleted", { imageUrl });
    } catch (error) {
      errorLogger.error("Error deleting WTF background image:", error);
      // Don't throw error for delete operations to avoid blocking updates
    }
  }

  /**
   * Get settings history
   */
  async getSettingsHistory(page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;

      const settings = await WtfSettings.find()
        .populate("createdBy", "name")
        .populate("updatedBy", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await WtfSettings.countDocuments();

      return {
        settings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      errorLogger.error("Error getting WTF settings history:", error);
      throw new Error("Failed to get settings history");
    }
  }
}

module.exports = new WtfSettingsService();
