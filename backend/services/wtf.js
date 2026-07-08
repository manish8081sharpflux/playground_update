const { errorLogger, logger } = require("../config/pino-config");
const mongoose = require("mongoose");
const fs = require("fs");
const CoinService = require("./coin");
const wtfWebSocketService = require("./wtfWebSocket");
const {
  uploadWtfMedia,
  deleteWtfMedia,
  uploadWtfVoiceNote,
  generateWtfThumbnail,
} = require("./aws/s3");

// Import data access methods
const {
  createWtfPin,
  getActivePins,
  getActivePinsForAdmin: getActivePinsForAdminDA,
  getActivePinsCountForAdmin,
  getWtfPinById,
  updateWtfPin,
  deleteWtfPin,
  updatePinStatus,
  getPinsByAuthor,
  getExpiredPins,
  getPinsForFifoManagement,
  updateEngagementMetrics,
  getPinAnalytics,
  getWtfAnalytics,
  bulkUpdatePinStatus,
  getPinsByStatus,
  reorderPins,
} = require("../data-access/wtfPin");

// getSubmissionsForReview is implemented as a static method in this service

const {
  createInteraction,
  getInteractionById,
  getStudentPinInteractions,
  hasStudentInteracted,
  getPinInteractionCounts,
  getStudentInteractionHistory,
  getRecentInteractions,
  deleteInteraction,
  updateInteraction,
  getInteractionAnalytics,
  bulkCreateInteractions,
  getTopPerformingPins,
} = require("../data-access/wtfStudentInteraction");

const {
  createWtfSubmission,
  getWtfSubmissionById,
  getSubmissionsForReview: getSubmissionsForReviewDA,
  getPendingSubmissions,
  getStudentSubmissions,
  updateWtfSubmission,
  deleteWtfSubmission,
  approveSubmission,
  rejectSubmission,
  archiveSubmission,
  unarchiveSubmission,
  getArchivedSubmissions,
  getSubmissionsByType,
  getSubmissionStats,
  getRecentSubmissions,
  getSubmissionAnalytics,
  bulkUpdateSubmissionStatus,
  getSubmissionsNeedingReview,
  markSubmissionReviewed,
  markSubmissionConsidered,
} = require("../data-access/wtfSubmission");

class WtfService {
  constructor(obj = {}) {
    this.title = obj.title || "";
    this.content = obj.content || "";
    this.type = obj.type || "";
    this.author = obj.author || null;
    this.status = obj.status || "active";
    this.isOfficial = obj.isOfficial || false;
    this.language = obj.language || "english";
    this.tags = obj.tags || [];
  }

  toJSON() {
    return {
      title: this.title,
      content: this.content,
      type: this.type,
      author: this.author,
      status: this.status,
      isOfficial: this.isOfficial,
      language: this.language,
      tags: this.tags,
    };
  }

  // ==================== PIN MANAGEMENT ====================

  static async createPin(payload) {
    try {
      // Map frontend field names to backend expected names
      const mappedPayload = {
        ...payload,
        type: payload.type || payload.contentType, // Accept both 'type' and 'contentType'
        author: payload.author || payload.pinnedBy, // Accept both 'author' and 'pinnedBy'
      };

      // Clean up the mapped payload to remove original field names
      if (payload.contentType && !payload.type) {
        delete mappedPayload.contentType; // Remove contentType if we mapped it to type
      }
      if (payload.pinnedBy && !payload.author) {
        delete mappedPayload.pinnedBy; // Remove pinnedBy if we mapped it to author
      }

      // Handle case where author might be a string (user name) instead of user ID
      // User lookup by name is implemented below as a fallback for non-ObjectId authors
      if (
        typeof mappedPayload.author === "string" &&
        !mappedPayload.author.match(/^[0-9a-fA-F]{24}$/)
      ) {
        // If author is a string name (not a MongoDB ObjectId), we need to handle it
        // For development, we'll use a placeholder approach
        // Author is a string name, attempting user ID lookup

        // In development mode, we can bypass this or use a default user ID
        if (
          process.env.NODE_ENV === "development" ||
          process.env.NODE_ENV === "local"
        ) {
          // For development, we'll need to either:
          // 1. Find the user by name in the database, or
          // 2. Use a default user ID, or
          // 3. Skip the author requirement temporarily

          // Option 1: Try to find user by name (recommended)
          try {
            const User = require("../models/user");
            const user = await User.findOne({ name: mappedPayload.author });
            if (user) {
              mappedPayload.author = user._id;
              // Found user by name
            } else {
              // User not found by name
              // For development, we could create a default user or skip this
              return {
                success: false,
                data: null,
                message: `User not found: ${mappedPayload.author}. Please ensure the user exists in the database.`,
              };
            }
          } catch (userError) {
            console.error("Error finding user by name:", userError);
            return {
              success: false,
              data: null,
              message: `Error finding user: ${userError.message}`,
            };
          }
        }
      }

      // Validate required fields
      if (
        !mappedPayload.title ||
        !mappedPayload.content ||
        !mappedPayload.type ||
        !mappedPayload.author
      ) {
        return {
          success: false,
          data: null,
          message: "Missing required fields: title, content, type, author",
        };
      }

      // Validate pin type
      const validTypes = ["image", "video", "audio", "text", "link"];
      if (!validTypes.includes(mappedPayload.type)) {
        return {
          success: false,
          data: null,
          message:
            "Invalid pin type. Must be one of: image, video, audio, text, link",
        };
      }

      // Handle file upload to S3 for media types
      let mediaUrl = mappedPayload.mediaUrl || mappedPayload.content;
      let thumbnailUrl = null; // Declare thumbnailUrl at function level

      if (
        mappedPayload.file &&
        ["image", "video", "audio"].includes(mappedPayload.type)
      ) {
        try {
          logger.info(
            {
              type: mappedPayload.type,
              fileName: mappedPayload.file.filename,
              filePath: mappedPayload.file.path,
              fileSize: mappedPayload.file.size,
            },
            "Uploading media file to S3"
          );

          // Upload file to S3
          const uploadResult = await uploadWtfMedia(
            mappedPayload.file.path,
            mappedPayload.type,
            `temp_${Date.now()}` // Temporary ID, will be updated with actual pin ID
          );

          if (!uploadResult.success) {
            throw new Error(
              uploadResult.message || "Failed to upload file to S3"
            );
          }

          mediaUrl = uploadResult.url;

          // Generate thumbnail for videos BEFORE uploading to S3
          if (mappedPayload.type === "video") {
            try {
              logger.info(
                { videoType: mappedPayload.type },
                "Starting video thumbnail generation from local file"
              );

              // Generate thumbnail from local file first
              const VideoThumbnailService = require("./videoThumbnail");
              const thumbnailService = new VideoThumbnailService();

              const thumbnailResult =
                await thumbnailService.generateThumbnailFromPath(
                  mappedPayload.file.path,
                  {
                    time: "00:00:01",
                    width: 320,
                    height: 240,
                  }
                );

              if (thumbnailResult.success) {
                // Create a temporary thumbnail file
                const tempDir = require("os").tmpdir();
                const tempThumbnailPath = require("path").join(
                  tempDir,
                  `temp_thumb_${Date.now()}.jpg`
                );

                try {
                  // Write thumbnail buffer to temp file
                  require("fs").writeFileSync(
                    tempThumbnailPath,
                    thumbnailResult.thumbnailBuffer
                  );

                  // Upload thumbnail file to S3
                  const thumbnailS3Result = await uploadWtfMedia(
                    tempThumbnailPath,
                    "image",
                    `thumb_${Date.now()}`
                  );

                  if (thumbnailS3Result.success) {
                    thumbnailUrl = thumbnailS3Result.url;
                    logger.info(
                      { thumbnailUrl: thumbnailS3Result.url },
                      "Video thumbnail generated and uploaded successfully"
                    );
                  } else {
                    logger.warn(
                      { error: thumbnailS3Result.message },
                      "Failed to upload thumbnail to S3"
                    );
                  }

                  // Clean up temp thumbnail file
                  require("fs").unlinkSync(tempThumbnailPath);
                } catch (fileError) {
                  logger.error(
                    { error: fileError.message },
                    "Error handling temporary thumbnail file"
                  );
                }
              } else {
                logger.warn(
                  { error: thumbnailResult.error },
                  "Failed to generate video thumbnail from local file"
                );
              }
            } catch (thumbnailError) {
              logger.error(
                {
                  error: thumbnailError.message,
                  videoType: mappedPayload.type,
                },
                "Error during thumbnail generation"
              );
            }
          } else {
            logger.info(
              { mediaType: mappedPayload.type },
              "Skipping thumbnail generation for non-video media"
            );
          }

          logger.info(
            { s3Url: uploadResult.url, thumbnailUrl },
            "File uploaded to S3 successfully"
          );

          // Clean up temporary file after successful S3 upload
          try {
            logger.info(
              { filePath: mappedPayload.file.path },
              "Attempting to clean up temporary file"
            );

            if (fs.existsSync(mappedPayload.file.path)) {
              fs.unlinkSync(mappedPayload.file.path);
              logger.info(
                { filePath: mappedPayload.file.path },
                "Temporary file cleaned up successfully"
              );
            } else {
              logger.warn(
                { filePath: mappedPayload.file.path },
                "Temporary file not found for cleanup"
              );
            }
          } catch (cleanupError) {
            logger.error(
              {
                error: cleanupError.message,
                filePath: mappedPayload.file.path,
                errorCode: cleanupError.code,
                errorStack: cleanupError.stack,
              },
              "Failed to delete temporary file"
            );
          }
        } catch (uploadError) {
          logger.error(
            { error: uploadError.message },
            "Failed to upload file to S3"
          );

          // Clean up temporary file even if S3 upload failed
          try {
            fs.unlinkSync(mappedPayload.file.path);
            logger.info(
              { filePath: mappedPayload.file.path },
              "Temporary file cleaned up after failed upload"
            );
          } catch (cleanupError) {
            logger.warn(
              {
                error: cleanupError.message,
                filePath: mappedPayload.file.path,
              },
              "Failed to delete temporary file after failed upload"
            );
          }

          return {
            success: false,
            data: null,
            message: `Failed to upload file: ${uploadError.message}`,
          };
        }
      }

      // Normalize link fields for 'link' type
      if (mappedPayload.type === "link") {
        // Accept linkUrl or content as the URL field
        mappedPayload.linkUrl =
          mappedPayload.linkUrl || mappedPayload.link || mappedPayload.content;
        // Ensure basic protocol if missing (frontend input may allow without protocol)
        if (
          typeof mappedPayload.linkUrl === "string" &&
          mappedPayload.linkUrl &&
          !/^https?:\/\//i.test(mappedPayload.linkUrl)
        ) {
          mappedPayload.linkUrl = `https://${mappedPayload.linkUrl}`;
        }
        // For link pins, ensure content stores the URL as well for compatibility
        mappedPayload.content = mappedPayload.linkUrl;
      }

      // Set default values
      const pinData = {
        ...mappedPayload,
        status: mappedPayload.status || "active",
        isOfficial: mappedPayload.isOfficial || false,
        language: mappedPayload.language || "english",
        expiresAt:
          mappedPayload.expiresAt ||
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      };

      // Only persist media fields for media/link pins (avoid polluting text pins)
      if (["image", "video", "audio"].includes(mappedPayload.type)) {
        pinData.mediaUrl = mediaUrl;
      } else if (mappedPayload.type === "link") {
        pinData.mediaUrl = mappedPayload.linkUrl || mappedPayload.content;
      }

      // Persist duration only when provided (audio/video)
      const duration =
        mappedPayload.duration != null
          ? mappedPayload.duration
          : mappedPayload.audioDuration != null
          ? mappedPayload.audioDuration
          : null;
      if ((mappedPayload.type === "audio" || mappedPayload.type === "video") && duration != null) {
        pinData.duration = duration;
      }

      // For image/video pins, persist thumbnailUrl
      if (mappedPayload.type === "image") {
        pinData.thumbnailUrl = mediaUrl;
      } else if (mappedPayload.type === "video") {
        pinData.thumbnailUrl = thumbnailUrl || mappedPayload.thumbnailUrl || null;
      }

      // Debug logging for thumbnail generation
      logger.info(
        {
          pinType: mappedPayload.type,
          mediaUrl: mediaUrl,
          thumbnailUrl: pinData.thumbnailUrl,
          hasThumbnailUrl: !!pinData.thumbnailUrl,
          caption: mappedPayload.caption,
          hasCaption: !!mappedPayload.caption,
        },
        "Pin data created with thumbnail information"
      );

      // Debug logging for final pin data
      logger.info(
        {
          pinDataKeys: Object.keys(pinData),
          pinDataCaption: pinData.caption,
          pinDataHasCaption: !!pinData.caption,
        },
        "Final pin data before database save"
      );

      // Remove file object from pinData before saving to database
      delete pinData.file;

      const result = await createWtfPin(pinData);

      if (result.success) {
        // Update engagement metrics for the new pin
        await updateEngagementMetrics(result.data._id, {
          likes: 0,
          loves: 0,
          seen: 0,
          shares: 0,
        });

        // Award coins for pin creation
        try {
          const isFirstPin = await CoinService.isEligibleForFirstPinBonus(
            mappedPayload.author
          );
          const coinResult = await CoinService.awardPinCreationCoins(
            mappedPayload.author,
            result.data._id,
            isFirstPin,
            {
              userAgent: mappedPayload.userAgent,
              ipAddress: mappedPayload.ipAddress,
            }
          );

          // Add coin information to response
          result.data.coinAward = coinResult.data;
        } catch (coinError) {
          errorLogger.error(
            {
              userId: payload.author,
              pinId: result.data._id,
              error: coinError.message,
            },
            "Error awarding coins for pin creation"
          );
          // Don't fail the pin creation if coin awarding fails
        }

        if (process.env.NODE_ENV !== "test") {
          // Trigger real-time event
          try {
            wtfWebSocketService.handlePinCreated(result.data);
          } catch (wsError) {
            errorLogger.error(
              { pinId: result.data._id, error: wsError.message },
              "Error triggering WebSocket pin created event"
            );
          }

          // Create notifications for pin creation
          try {
            const NotificationService = require("./notification");

            if (
              mappedPayload.author &&
              mappedPayload.author.toString().match(/^[0-9a-fA-F]{24}$/)
            ) {
              // Check if author is a student
              const User = require("../models/user");
              const user = await User.findById(mappedPayload.author);

              if (user && user.role === "student") {
                // Personal notification for student whose content was pinned
                await NotificationService.notifyWtfPinAdded(user._id, {
                  pinId: result.data._id,
                  title: mappedPayload.title,
                  contentType: mappedPayload.type,
                  pinnedBy: { adminId: user._id },
                });
              }
            }

            // Common notification for all students about new content (regardless of who created it)
            await NotificationService.createCommunityNotification(
              "New Content Featured on WTF!",
              `A new ${mappedPayload.type.toLowerCase()} "${
                mappedPayload.title
              }" has been featured on the WTF board! Check it out!`,
              "NEW_CONTENT",
              ["student"], // targetAudience: array of roles
              {
                pinId: result.data._id,
                contentType: mappedPayload.type,
                title: mappedPayload.title,
                actionUrl: `/wtf/pin/${result.data._id}`,
              }
            );
          } catch (notificationError) {
            errorLogger.error(
              {
                userId: mappedPayload.author,
                pinId: result.data._id,
                error: notificationError.message,
              },
              "Error creating notification for pin creation"
            );
            // Don't fail the pin creation if notification creation fails
          }
        }

        return {
          success: true,
          data: result.data,
          message: "WTF Pin created successfully",
        };
      }

      return result;
    } catch (error) {
      errorLogger.error({ error: error.message }, "Error in createPin service");
      throw error;
    }
  }

  static async getActivePinsForStudents({
    page = 1,
    limit = 20,
    type = null,
    isOfficial = null,
    officialCategory = null,
  }) {
    try {
      const params = {
        page,
        limit,
        type,
        isOfficial,
      };
      if (officialCategory !== null && officialCategory !== undefined) {
        params.officialCategory = officialCategory;
      }

      const result = await getActivePins(params);

      if (result.success) {
        return {
          success: true,
          data: result.data,
          message: "Active pins fetched successfully",
        };
      }

      return result;
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in getActivePinsForStudents service"
      );
      throw error;
    }
  }

  static async getActivePinsForAdmin({
    page = 1,
    limit = 20,
    type = null,
    author = null,
    isOfficial = null,
    officialCategory = null,
    dateFrom = null,
    dateTo = null,
    source = null,
    pinType = null,
  }) {
    try {
      const result = await getActivePinsForAdminDA({
        page,
        limit,
        type,
        author,
        isOfficial,
        officialCategory,
        dateFrom,
        dateTo,
        source,
        pinType,
      });
      return result;
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in getActivePinsForAdmin service"
      );
      throw error;
    }
  }

  static async getDrafts({
    page = 1,
    limit = 20,
    type = null,
    author = null,
    isOfficial = null,
  }) {
    try {
      const result = await getPinsByStatus({
        page,
        limit,
        status: "draft",
        type,
        author,
        isOfficial,
      });

      if (result.success) {
        return {
          success: true,
          data: result.data,
          message: "Drafts fetched successfully",
        };
      }

      return result;
    } catch (error) {
      errorLogger.error({ error: error.message }, "Error in getDrafts service");
      throw error;
    }
  }

  static async getPinById(pinId) {
    try {
      if (!pinId) {
        return {
          success: false,
          data: null,
          message: "Pin ID is required",
        };
      }

      const result = await getWtfPinById(pinId);
      return result;
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in getPinById service"
      );
      throw error;
    }
  }

  static async getPinsByStatus({
    status = "archived",
    page = 1,
    limit = 20,
    type = null,
    isOfficial = null,
  }) {
    try {
      if (!status) {
        return { success: false, data: null, message: "Status is required" };
      }
      const result = await getPinsByStatus({
        status,
        page,
        limit,
        type,
        isOfficial,
      });
      return result;
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in getPinsByStatus service"
      );
      throw error;
    }
  }

  static async updatePin(pinId, updateData) {
    try {
      if (!pinId) {
        return {
          success: false,
          data: null,
          message: "Pin ID is required",
        };
      }

      const result = await updateWtfPin(pinId, updateData);
      return result;
    } catch (error) {
      errorLogger.error({ error: error.message }, "Error in updatePin service");
      throw error;
    }
  }

  static async deletePin(pinId) {
    try {
      if (!pinId) {
        return {
          success: false,
          data: null,
          message: "Pin ID is required",
        };
      }

      // Best-effort fetch of pin metadata (for S3 cleanup); deletion proceeds regardless.
      let pin = null;
      try {
        const pinResult = await getWtfPinById(pinId);
        if (pinResult?.success && pinResult.data) {
          pin = pinResult.data;
        }
      } catch (lookupError) {
        logger.warn(
          { pinId, error: lookupError.message },
          "Error fetching pin before deletion"
        );
      }

      if (pin) {
        logger.info(
          {
            pinId,
            title: pin.title,
            mediaUrl: pin.mediaUrl,
            thumbnailUrl: pin.thumbnailUrl,
          },
          "Deleting pin and associated media files"
        );
      }

      // Delete associated S3 files if they exist
      const s3DeletionResults = [];

      // Delete main media file
      if (pin?.mediaUrl && pin.mediaUrl.includes("s3.")) {
        try {
          const mediaDeleteResult = await deleteWtfMedia(pin.mediaUrl);
          s3DeletionResults.push({
            type: "media",
            url: pin.mediaUrl,
            result: mediaDeleteResult,
          });

          if (mediaDeleteResult.success) {
            logger.info(
              { pinId, mediaUrl: pin.mediaUrl },
              "Successfully deleted main media file from S3"
            );
          } else {
            logger.warn(
              {
                pinId,
                mediaUrl: pin.mediaUrl,
                error: mediaDeleteResult.message,
              },
              "Failed to delete main media file from S3"
            );
          }
        } catch (s3Error) {
          logger.warn(
            { pinId, mediaUrl: pin.mediaUrl, error: s3Error.message },
            "Error deleting main media file from S3"
          );
          s3DeletionResults.push({
            type: "media",
            url: pin.mediaUrl,
            result: { success: false, error: s3Error.message },
          });
        }
      }

      // Delete thumbnail file if different from main media
      if (
        pin?.thumbnailUrl &&
        pin.thumbnailUrl.includes("s3.") &&
        pin.thumbnailUrl !== pin.mediaUrl
      ) {
        try {
          const thumbnailDeleteResult = await deleteWtfMedia(pin.thumbnailUrl);
          s3DeletionResults.push({
            type: "thumbnail",
            url: pin.thumbnailUrl,
            result: thumbnailDeleteResult,
          });

          if (thumbnailDeleteResult.success) {
            logger.info(
              { pinId, thumbnailUrl: pin.thumbnailUrl },
              "Successfully deleted thumbnail file from S3"
            );
          } else {
            logger.warn(
              {
                pinId,
                thumbnailUrl: pin.thumbnailUrl,
                error: thumbnailDeleteResult.message,
              },
              "Failed to delete thumbnail file from S3"
            );
          }
        } catch (s3Error) {
          logger.warn(
            { pinId, thumbnailUrl: pin.thumbnailUrl, error: s3Error.message },
            "Error deleting thumbnail file from S3"
          );
          s3DeletionResults.push({
            type: "thumbnail",
            url: pin.thumbnailUrl,
            result: { success: false, error: s3Error.message },
          });
        }
      }

      // Delete the pin from database
      const result = await deleteWtfPin(pinId);

      if (result.success) {
        logger.info(
          {
            pinId,
            title: pin?.title,
            s3DeletionResults,
          },
          "Pin and associated files deleted successfully"
        );

        // Include S3 deletion results in response
        return {
          ...result,
          s3DeletionResults,
        };
      }

      return result;
    } catch (error) {
      errorLogger.error({ error: error.message }, "Error in deletePin service");
      throw error;
    }
  }

  static async changePinStatus(pinId, status) {
    try {
      if (!pinId || !status) {
        return {
          success: false,
          data: null,
          message: "Pin ID and status are required",
        };
      }

      const validStatuses = ["active", "unpinned", "archived"];
      if (!validStatuses.includes(status)) {
        return {
          success: false,
          data: null,
          message: "Invalid status. Must be one of: active, unpinned, archived",
        };
      }

      const result = await updatePinStatus(pinId, status);
      return result;
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in changePinStatus service"
      );
      throw error;
    }
  }

  /**
   * Reorder active pins by explicit order from admin
   */
  static async reorderPins(orderedPinIds = []) {
    try {
      if (!Array.isArray(orderedPinIds) || orderedPinIds.length === 0) {
        return {
          success: false,
          data: null,
          message: "orderedPinIds must be a non-empty array",
        };
      }
      const result = await reorderPins(orderedPinIds);
      return result;
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in reorderPins service"
      );
      throw error;
    }
  }

  // ==================== INTERACTION MANAGEMENT ====================

  static async likePin(studentId, pinId, likeType = "thumbs_up", metadata = {}) {
    try {
      if (!studentId || !pinId) {
        return {
          success: false,
          data: null,
          message: "Student ID and Pin ID are required",
        };
      }

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return {
          success: false,
          data: null,
          message: "Invalid student ID format",
        };
      }

      if (!mongoose.Types.ObjectId.isValid(pinId)) {
        return {
          success: false,
          data: null,
          message: "Invalid pin ID format",
        };
      }

      // Check if pin exists and is active
      const pinResult = await getWtfPinById(pinId);
      if (!pinResult.success) {
        return {
          success: false,
          data: null,
          message: "Pin not found or not active",
        };
      }

      // Check if student already liked this pin with this specific likeType
      const hasLiked = await hasStudentInteracted(
        studentId,
        pinId,
        "like",
        likeType
      );

      if (!hasLiked?.success) {
        return {
          success: false,
          data: null,
          message: hasLiked?.message || "Failed to check student interaction",
        };
      }

      const alreadyLiked = !!hasLiked?.data?.hasInteracted;

      if (alreadyLiked) {
        // Unlike: delete the specific interaction
        const deleteResult = await deleteInteraction(
          studentId,
          pinId,
          "like",
          likeType
        );

        if (deleteResult.success) {
          // Update engagement metrics
          await updateEngagementMetrics(pinId, { "engagementMetrics.likes": -1 });
          return {
            success: true,
            data: { action: "unliked", likeType: null },
            message: "Pin unliked successfully",
          };
        }
        return deleteResult;
      }

      // Like: create new interaction
      const interactionData = {
        studentId: new mongoose.Types.ObjectId(studentId),
        pinId: new mongoose.Types.ObjectId(pinId),
        type: "like",
        likeType: likeType,
      };

      const result = await createInteraction(interactionData);
      if (result.success) {
        // Update engagement metrics
        await updateEngagementMetrics(pinId, { "engagementMetrics.likes": 1 });

        // Award coins for interaction (with daily limit)
        try {
          const coinResult = await CoinService.awardInteractionCoins(
            studentId,
            result.data._id,
            {
              pinId: pinId,
              likeType: likeType,
              userAgent: metadata?.userAgent,
              ipAddress: metadata?.ipAddress,
            }
          );

          // Add coin information to response if coins were awarded
          if (coinResult.success) {
            result.data.coinAward = coinResult.data;
          }
        } catch (coinError) {
          errorLogger.error(
            { studentId, pinId, error: coinError.message },
            "Error awarding coins for interaction"
          );
          // Don't fail the interaction if coin awarding fails
        }

        // Trigger real-time event
        try {
          wtfWebSocketService.handlePinLiked(pinId, studentId, {
            likeType,
            interactionId: result.data._id,
          });
        } catch (wsError) {
          errorLogger.error(
            { pinId, studentId, error: wsError.message },
            "Error triggering WebSocket pin liked event"
          );
        }

        return {
          success: true,
          data: { action: "liked", likeType, ...result.data },
          message: "Pin liked successfully",
        };
      }

      return result;
    } catch (error) {
      errorLogger.error({ error: error.message }, "Error in likePin service");
      throw error;
    }
  }

  static async lovePin(studentId, pinId) {
    try {
      if (!studentId || !pinId) {
        return {
          success: false,
          data: null,
          message: "Student ID and Pin ID are required",
        };
      }

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return {
          success: false,
          data: null,
          message: "Invalid student ID format",
        };
      }

      if (!mongoose.Types.ObjectId.isValid(pinId)) {
        return {
          success: false,
          data: null,
          message: "Invalid pin ID format",
        };
      }

      // Check if pin exists and is active
      const pinResult = await getWtfPinById(pinId);
      if (!pinResult.success) {
        return {
          success: false,
          data: null,
          message: "Pin not found or not active",
        };
      }

      // Check if student already loved this pin
      const hasLoved = await hasStudentInteracted(studentId, pinId, "love");
      if (hasLoved.data.hasInteracted) {
        // Unlove: delete the interaction
        const deleteResult = await deleteInteraction(studentId, pinId, "love");
        if (deleteResult.success) {
          // Update engagement metrics
          // Use -1 but the data-access clamps to zero; leaving as-is but safe now
          await updateEngagementMetrics(pinId, { loves: -1 });
          return {
            success: true,
            data: { action: "unloved" },
            message: "Pin unloved successfully",
          };
        }
        return deleteResult;
      }

      // Love: create new interaction
      const interactionData = {
        studentId: new mongoose.Types.ObjectId(studentId),
        pinId: new mongoose.Types.ObjectId(pinId),
        type: "love",
      };

      const result = await createInteraction(interactionData);
      if (result.success) {
        // Update engagement metrics
        await updateEngagementMetrics(pinId, { loves: 1 });

        // Award coins for interaction (with daily limit)
        try {
          const coinResult = await CoinService.awardInteractionCoins(
            studentId,
            result.data._id,
            {
              pinId: pinId,
              likeType: "love",
              userAgent: metadata?.userAgent,
              ipAddress: metadata?.ipAddress,
            }
          );

          // Add coin information to response if coins were awarded
          if (coinResult.success) {
            result.data.coinAward = coinResult.data;
          }
        } catch (coinError) {
          errorLogger.error(
            { studentId, pinId, error: coinError.message },
            "Error awarding coins for interaction"
          );
          // Don't fail the interaction if coin awarding fails
        }

        // Trigger real-time event
        try {
          wtfWebSocketService.handlePinLiked(pinId, studentId, {
            likeType: "love",
            interactionId: result.data._id,
          });
        } catch (wsError) {
          errorLogger.error(
            { pinId, studentId, error: wsError.message },
            "Error triggering WebSocket pin loved event"
          );
        }

        return {
          success: true,
          data: { action: "loved", ...result.data },
          message: "Pin loved successfully",
        };
      }

      return result;
    } catch (error) {
      errorLogger.error({ error: error.message }, "Error in lovePin service");
      throw error;
    }
  }

  static async markPinAsSeen(studentId, pinId, viewDuration = 0) {
    try {
      if (!studentId || !pinId) {
        return {
          success: false,
          data: null,
          message: "Student ID and Pin ID are required",
        };
      }

      // Check if pin exists and is active
      const pinResult = await getWtfPinById(pinId);
      if (!pinResult.success) {
        return {
          success: false,
          data: null,
          message: "Pin not found or not active",
        };
      }

      // Check if student already marked this pin as seen
      const hasSeen = await hasStudentInteracted(studentId, pinId, "seen");
      if (hasSeen.data.hasInteracted) {
        // Update existing seen interaction with new duration
        const interactions = await getStudentPinInteractions(studentId, pinId);
        const seenInteraction = interactions.data.find(
          (i) => i.type === "seen"
        );
        if (seenInteraction) {
          const updateResult = await updateInteraction(seenInteraction._id, {
            viewDuration: Math.max(
              seenInteraction.viewDuration || 0,
              viewDuration
            ),
          });
          return {
            success: true,
            data: { action: "updated", viewDuration },
            message: "Pin seen duration updated",
          };
        }
      }

      // Mark as seen: create new interaction
      const interactionData = {
        studentId: new mongoose.Types.ObjectId(studentId),
        pinId: new mongoose.Types.ObjectId(pinId),
        type: "seen",
        viewDuration: viewDuration,
      };

      const result = await createInteraction(interactionData);
      if (result.success) {
        // Update engagement metrics
        await updateEngagementMetrics(pinId, { seen: 1 });
        // Trigger real-time event
        try {
          wtfWebSocketService.handlePinSeen(pinId, studentId, {
            viewDuration,
            interactionId: result.data._id,
          });
        } catch (wsError) {
          errorLogger.error(
            { pinId, studentId, error: wsError.message },
            "Error triggering WebSocket pin seen event"
          );
        }

        return {
          success: true,
          data: { action: "seen", viewDuration },
          message: "Pin marked as seen successfully",
        };
      }

      return result;
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in markPinAsSeen service"
      );
      throw error;
    }
  }

  static async getPinInteractions(pinId) {
    try {
      if (!pinId) {
        return {
          success: false,
          data: null,
          message: "Pin ID is required",
        };
      }

      const result = await getPinInteractionCounts(pinId);
      return result;
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in getPinInteractions service"
      );
      throw error;
    }
  }

  // ==================== SUBMISSION MANAGEMENT ====================

  static async submitVoiceNote(studentId, payload) {
    try {
      if (!studentId) {
        return {
          success: false,
          data: null,
          message: "Student ID is required",
        };
      }

      const submissionData = {
        studentId: new mongoose.Types.ObjectId(studentId),
        type: "voice",
        title: payload.title,
        audioUrl: payload.audioUrl,
        audioDuration: payload.audioDuration,
        audioTranscription: payload.audioTranscription,
        tags: payload.tags || [],
        isDraft: payload.isDraft || false,
        metadata: {
          fileSize:
            payload.fileSize ||
            (payload.file && payload.file.size) ||
            undefined,
          recordingQuality: payload.recordingQuality,
          userAgent: payload.userAgent,
          ipAddress: payload.ipAddress,
        },
      };

      // If a file was uploaded, try S3 first; if it fails or not configured, fall back to local file URL
      if (payload.file && payload.file.path) {
        let uploadedToS3 = false;
        try {
          const s3Url = await uploadWtfVoiceNote(
            payload.file.path,
            `submission_${Date.now()}`
          );
          if (s3Url && s3Url.success && s3Url.url) {
            submissionData.audioUrl = s3Url.url;
            uploadedToS3 = true;
          }
        } catch (e) {
          errorLogger.error(
            { error: e.message },
            "Failed to upload voice note to S3"
          );
        }

        if (!submissionData.audioUrl) {
          try {
            const { getUploadedFilesFullPath } = require("../utils/helper");
            submissionData.audioUrl = getUploadedFilesFullPath(
              payload.file.path
            );
          } catch {}
        }

        // Delete local temp file only if uploaded to S3
        if (uploadedToS3) {
          try {
            const fs = require("fs");
            if (fs.existsSync(payload.file.path)) {
              fs.unlinkSync(payload.file.path);
            }
          } catch {}
        }
      }

      // Ensure audio URL fallback even if no S3 attempt (e.g., S3 not configured)
      if (!submissionData.audioUrl && payload.file?.path) {
        try {
          const { getUploadedFilesFullPath } = require("../utils/helper");
          submissionData.audioUrl = getUploadedFilesFullPath(payload.file.path);
        } catch {}
      }

      // Normalize and default audio duration if missing
      if (submissionData.audioDuration == null) {
        const parsed = parseInt(payload.audioDuration, 10);
        let duration = Number.isNaN(parsed) ? 10 : parsed; // default 10s
        if (duration < 0) duration = 0;
        if (duration > 60) duration = 60;
        submissionData.audioDuration = duration;
      }

      const result = await createWtfSubmission(submissionData);

      // Trigger real-time event
      if (result.success) {
        try {
          wtfWebSocketService.handleSubmissionCreated(result.data);
        } catch (wsError) {
          errorLogger.error(
            { submissionId: result.data._id, error: wsError.message },
            "Error triggering WebSocket submission created event"
          );
        }
      }

      return result;
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in submitVoiceNote service"
      );
      throw error;
    }
  }

  static async submitMedia(studentId, payload) {
    try {
      if (!studentId) {
        return {
          success: false,
          data: null,
          message: "Student ID is required",
        };
      }

      const type = (payload.type || "").toLowerCase();
      if (!["image", "video"].includes(type)) {
        return {
          success: false,
          data: null,
          message: "Invalid media type. Must be 'image' or 'video'",
        };
      }

      if (!payload.file || !payload.file.path) {
        return {
          success: false,
          data: null,
          message: "Media file is required",
        };
      }

      // Upload media to S3
      let mediaUrl = null;
      let thumbnailUrl = null; // Declare thumbnailUrl at function level
      try {
        const uploadResult = await uploadWtfMedia(
          payload.file.path,
          type,
          `submission_${Date.now()}`
        );

        if (!uploadResult.success) {
          throw new Error(
            uploadResult.message || "Failed to upload media to S3"
          );
        }

        mediaUrl = uploadResult.url;

        // Generate thumbnail for videos from local file
        if (type === "video") {
          try {
            logger.info(
              { videoType: type },
              "Starting video thumbnail generation for submission"
            );

            const VideoThumbnailService = require("./videoThumbnail");
            const thumbnailService = new VideoThumbnailService();

            const thumbnailResult =
              await thumbnailService.generateThumbnailFromPath(
                payload.file.path,
                {
                  time: "00:00:01",
                  width: 320,
                  height: 240,
                }
              );

            if (thumbnailResult.success) {
              // Create a temporary thumbnail file
              const tempDir = require("os").tmpdir();
              const tempThumbnailPath = require("path").join(
                tempDir,
                `temp_thumb_${Date.now()}.jpg`
              );

              try {
                // Write thumbnail buffer to temp file
                require("fs").writeFileSync(
                  tempThumbnailPath,
                  thumbnailResult.thumbnailBuffer
                );

                // Upload thumbnail file to S3
                const thumbnailS3Result = await uploadWtfMedia(
                  tempThumbnailPath,
                  "image",
                  `thumb_${Date.now()}`
                );

                if (thumbnailS3Result.success) {
                  thumbnailUrl = thumbnailS3Result.url;
                  logger.info(
                    { thumbnailUrl: thumbnailS3Result.url },
                    "Video thumbnail generated and uploaded successfully for submission"
                  );
                } else {
                  logger.warn(
                    { error: thumbnailS3Result.message },
                    "Failed to upload thumbnail to S3 for submission"
                  );
                }

                // Clean up temp thumbnail file
                require("fs").unlinkSync(tempThumbnailPath);
              } catch (fileError) {
                logger.error(
                  { error: fileError.message },
                  "Error handling temporary thumbnail file for submission"
                );
              }
            } else {
              logger.warn(
                { error: thumbnailResult.error },
                "Failed to generate video thumbnail from local file for submission"
              );
            }
          } catch (thumbnailError) {
            logger.error(
              { error: thumbnailError.message },
              "Error during thumbnail generation for submission"
            );
          }
        }

        // Cleanup local temp file
        try {
          if (fs.existsSync(payload.file.path)) {
            fs.unlinkSync(payload.file.path);
          }
        } catch {}
      } catch (e) {
        errorLogger.error({ error: e.message }, "Failed to upload media to S3");
        return {
          success: false,
          data: null,
          message: `Failed to upload media: ${e.message}`,
        };
      }

      // Persist as an article submission with content URL and type in metadata
      const submissionData = {
        studentId: new mongoose.Types.ObjectId(studentId),
        type: "article",
        title: payload.title,
        content: mediaUrl,
        thumbnailUrl: thumbnailUrl, // Include thumbnail URL for videos
        language: payload.language || "english",
        tags: payload.tags || [],
        isDraft: payload.isDraft || false,
        metadata: {
          originalType: type,
          fileSize: payload.file.size,
          userAgent: payload.userAgent,
          ipAddress: payload.ipAddress,
        },
      };

      const result = await createWtfSubmission(submissionData);

      // Trigger real-time event
      if (result.success) {
        try {
          wtfWebSocketService.handleSubmissionCreated(result.data);
        } catch (wsError) {
          errorLogger.error(
            { submissionId: result.data._id, error: wsError.message },
            "Error triggering WebSocket submission created event"
          );
        }
      }

      return result;
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in submitMedia service"
      );
      throw error;
    }
  }

  static async submitArticle(studentId, payload) {
    try {
      if (!studentId) {
        return {
          success: false,
          data: null,
          message: "Student ID is required",
        };
      }

      const submissionData = {
        studentId: new mongoose.Types.ObjectId(studentId),
        type: "article",
        title: payload.title,
        content: payload.content,
        language: payload.language || "english",
        tags: payload.tags || [],
        isDraft: payload.isDraft || false,
        metadata: {
          userAgent: payload.userAgent,
          ipAddress: payload.ipAddress,
        },
      };

      const result = await createWtfSubmission(submissionData);

      // Trigger real-time event
      if (result.success) {
        try {
          wtfWebSocketService.handleSubmissionCreated(result.data);
        } catch (wsError) {
          errorLogger.error(
            { submissionId: result.data._id, error: wsError.message },
            "Error triggering WebSocket submission created event"
          );
        }
      }

      return result;
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in submitArticle service"
      );
      throw error;
    }
  }

  static async getSubmissionsForReview({
    page = 1,
    limit = 20,
    type = null,
    isCoachSuggestion = null,
    status = null,
  }) {
    try {
      const params = { page, limit, type };
      if (isCoachSuggestion !== null && isCoachSuggestion !== undefined) {
        params.isCoachSuggestion = isCoachSuggestion;
      }
      if (status !== null && status !== undefined) {
        params.status = status;
      }

      const result = await getPendingSubmissions(params);
      return result;
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in getSubmissionsForReview service"
      );
      throw error;
    }
  }

  static async reviewSubmission(submissionId, reviewerId, action, notes = "") {
    try {
      if (!submissionId || !reviewerId || !action) {
        return {
          success: false,
          data: null,
          message: "Submission ID, reviewer ID, and action are required",
        };
      }

      const validActions = [
        "approve",
        "reject",
        "archive",
        "mark_reviewed",
        "consider_future",
      ];
      if (!validActions.includes(action)) {
        return {
          success: false,
          data: null,
          message: "Invalid action. Must be 'approve' or 'reject'",
        };
      }

      let result;
      if (action === "approve") {
        result = await approveSubmission(submissionId, reviewerId, notes);

        // On approval, auto-create a pin which will appear on the Wall of Fame
        if (result.success && result.data) {
          try {
            const approvedSubmission = result.data;

            // Determine pin type based on submission type and metadata
            let pinType = "text";
            let mediaUrl = null;

            if (approvedSubmission.type === "voice") {
              pinType = "audio";
              mediaUrl = approvedSubmission.audioUrl;
            } else if (approvedSubmission.metadata?.originalType === "image") {
              pinType = "image";
              mediaUrl = approvedSubmission.content; // content contains the S3 URL for images
            } else if (approvedSubmission.metadata?.originalType === "video") {
              pinType = "video";
              mediaUrl = approvedSubmission.content; // content contains the S3 URL for videos
            }

            // Ensure required fields are populated according to pin type
            const contentForPin =
              pinType === "audio"
                ? approvedSubmission.audioTranscription ||
                  approvedSubmission.title ||
                  "Voice Note"
                : approvedSubmission.content;

            const pinPayload = {
              title: approvedSubmission.title || "Untitled",
              content: contentForPin, // Text content or transcription/title for audio
              type: pinType,
              mediaUrl: mediaUrl, // Set mediaUrl for all media types
              author: approvedSubmission.studentId, // Use the original student as author, not the reviewer
              status: "active",
              isOfficial: false,
              language: approvedSubmission.language || "english",
              tags: approvedSubmission.tags || [],
            };

            const pinCreateResult = await createWtfPin(pinPayload);

            if (pinCreateResult?.success) {
              // Link the created pin back to the submission
              await updateWtfSubmission(submissionId, {
                approvedPinId: pinCreateResult.data._id,
              });
              // Attach info for client
              result.data.approvedPin = pinCreateResult.data;
            }
          } catch (pinError) {
            errorLogger.error(
              { submissionId, reviewerId, error: pinError.message },
              "Error creating pin from approved submission"
            );
          }

          // Award coins for submission approval
          try {
            const coinResult = await CoinService.awardSubmissionApprovalCoins(
              result.data.studentId,
              submissionId,
              {
                reviewerId: reviewerId,
                notes: notes,
              }
            );

            // Add coin information to response
            result.data.coinAward = coinResult.data;

            if (process.env.NODE_ENV !== "test") {
              // Create notification for student about submission approval
              try {
                const NotificationService = require("./notification");
                await NotificationService.createPersonalNotification(
                  result.data.studentId,
                  "Submission Approved!",
                  `Your ${result.data.type} submission "${result.data.title}" has been approved and is now featured on the WTF board!`,
                  "NEW_CONTENT",
                  {
                    submissionId: submissionId,
                    pinId: result.data.approvedPin?._id,
                    contentType: result.data.type,
                    title: result.data.title,
                    actionUrl: `/wtf/pin/${result.data.approvedPin?._id}`,
                  }
                );
              } catch (notificationError) {
                errorLogger.error(
                  {
                    studentId: result.data.studentId,
                    submissionId: submissionId,
                    error: notificationError.message,
                  },
                  "Error creating submission approval notification"
                );
                // Don't fail the approval if notification creation fails
              }
            }
          } catch (coinError) {
            errorLogger.error(
              { submissionId, reviewerId, error: coinError.message },
              "Error awarding coins for submission approval"
            );
            // Don't fail the approval if coin awarding fails
          }
        }
      } else if (action === "reject") {
        result = await rejectSubmission(submissionId, reviewerId, notes);
      } else if (action === "archive") {
        result = await archiveSubmission(submissionId);
      } else if (action === "mark_reviewed") {
        result = await markSubmissionReviewed(submissionId, reviewerId, notes);
      } else if (action === "consider_future") {
        result = await markSubmissionConsidered(
          submissionId,
          reviewerId,
          notes
        );
      }

      if (process.env.NODE_ENV !== "test") {
        // Trigger real-time event
        if (result.success) {
          try {
            wtfWebSocketService.handleSubmissionReviewed(submissionId, {
              action,
              reviewerId,
              notes,
              result: result.data,
            });
          } catch (wsError) {
            errorLogger.error(
              { submissionId, error: wsError.message },
              "Error triggering WebSocket submission reviewed event"
            );
          }
        }
      }

      return result;
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in reviewSubmission service"
      );
      throw error;
    }
  }

  // Archived submissions listing
  static async listArchivedSubmissions({ page = 1, limit = 20, type = null }) {
    try {
      const result = await getArchivedSubmissions({ page, limit, type });
      return result;
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in listArchivedSubmissions service"
      );
      throw error;
    }
  }

  // Unarchive a submission
  static async unarchiveSubmission(submissionId) {
    try {
      if (!submissionId) {
        return {
          success: false,
          data: null,
          message: "Submission ID is required",
        };
      }

      const result = await unarchiveSubmission(submissionId);
      return result;
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in unarchiveSubmission service"
      );
      throw error;
    }
  }

  // ==================== LIFECYCLE MANAGEMENT ====================

  static async managePinLifecycle() {
    try {
      // Get expired pins
      const expiredPins = await getExpiredPins();
      if (expiredPins.success && expiredPins.data.length > 0) {
        const expiredPinIds = expiredPins.data.map((pin) => pin._id);
        await bulkUpdatePinStatus(expiredPinIds, "unpinned");

        errorLogger.info(
          { expiredPinsCount: expiredPins.data.length },
          "Expired pins unpinned successfully"
        );
      }

      // Get pins for FIFO management
      const fifoPins = await getPinsForFifoManagement();
      if (fifoPins.success && fifoPins.data.length > 0) {
        const fifoPinIds = fifoPins.data.map((pin) => pin._id);
        await bulkUpdatePinStatus(fifoPinIds, "unpinned");

        errorLogger.info(
          { fifoPinsCount: fifoPins.data.length },
          "FIFO management completed successfully"
        );
      }

      return {
        success: true,
        data: {
          expiredPinsCount: expiredPins.data.length,
          fifoPinsCount: fifoPins.data.length,
        },
        message: "Pin lifecycle management completed",
      };
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in managePinLifecycle service"
      );
      throw error;
    }
  }

  // Get expired pins (for scheduler)
  static async getExpiredPins() {
    try {
      const result = await getExpiredPins();
      return result;
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in getExpiredPins service"
      );
      throw error;
    }
  }

  // Get pins for FIFO management (for scheduler)
  static async getPinsForFifoManagement() {
    try {
      const result = await getPinsForFifoManagement();
      return result;
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in getPinsForFifoManagement service"
      );
      throw error;
    }
  }

  // ==================== ANALYTICS ====================

  static async getWtfAnalytics() {
    try {
      const result = await getWtfAnalytics();
      return result;
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in getWtfAnalytics service"
      );
      throw error;
    }
  }

  static async getInteractionAnalytics({ days = 7, type = null }) {
    try {
      const result = await getInteractionAnalytics({ days, type });
      return result;
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in getInteractionAnalytics service"
      );
      throw error;
    }
  }

  static async getSubmissionAnalytics({ days = 30, type = null }) {
    try {
      const result = await getSubmissionAnalytics({ days, type });
      return result;
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in getSubmissionAnalytics service"
      );
      throw error;
    }
  }

  static async getTopPerformingPins({ limit = 10, type = null, days = 30 }) {
    try {
      const result = await getTopPerformingPins({ limit, type, days });
      return result;
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in getTopPerformingPins service"
      );
      throw error;
    }
  }

  // ==================== STUDENT MANAGEMENT ====================

  static async getStudentSubmissions(
    studentId,
    { page = 1, limit = 20, status = null, type = null }
  ) {
    try {
      if (!studentId) {
        return {
          success: false,
          data: null,
          message: "Student ID is required",
        };
      }

      const result = await getStudentSubmissions(studentId, {
        page,
        limit,
        status,
        type,
      });
      return result;
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in getStudentSubmissions service"
      );
      throw error;
    }
  }

  static async getStudentInteractionHistory(
    studentId,
    { page = 1, limit = 50, type = null }
  ) {
    try {
      if (!studentId) {
        return {
          success: false,
          data: null,
          message: "Student ID is required",
        };
      }

      const result = await getStudentInteractionHistory(studentId, {
        page,
        limit,
        type,
      });
      return result;
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in getStudentInteractionHistory service"
      );
      throw error;
    }
  }

  // ==================== ADMIN MANAGEMENT ====================

  static async getPinsByAuthor(
    authorId,
    { page = 1, limit = 20, status = null }
  ) {
    try {
      if (!authorId) {
        return {
          success: false,
          data: null,
          message: "Author ID is required",
        };
      }

      const result = await getPinsByAuthor(authorId, { page, limit, status });
      return result;
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in getPinsByAuthor service"
      );
      throw error;
    }
  }

  static async getSubmissionStats() {
    try {
      const result = await getSubmissionStats();
      return result;
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in getSubmissionStats service"
      );
      throw error;
    }
  }

  // ==================== DASHBOARD METRICS ====================

  static async getWtfDashboardCounts() {
    try {
      const [activePinsResult, submissionStatsResult, analyticsResult] =
        await Promise.all([
          getActivePins({ page: 1, limit: 1 }),
          getSubmissionStats(),
          this.getWtfAnalytics(),
        ]);

      const activePinsCount = activePinsResult?.pagination?.total || 0;
      const pendingCount = submissionStatsResult?.success
        ? submissionStatsResult?.data?.pendingCount || 0
        : 0;
      const newCount = submissionStatsResult?.success
        ? submissionStatsResult?.data?.newCount || 0
        : 0;
      const analytics = analyticsResult?.success ? analyticsResult.data || {} : {};
      const totalEngagement = analytics?.totalViews || analytics?.totalSeen || 0;

      const dashboardCounts = {
        activePins: activePinsCount,
        coachSuggestions: pendingCount,
        studentSubmissions: newCount,
        totalEngagement,
        // Backward-compatible/UX fields expected by older clients/tests
        pendingSuggestions: pendingCount,
        newSubmissions: newCount,
        reviewQueueCount: pendingCount,
        // Additional useful metrics
        totalPins: analytics?.totalPins || 0,
        officialPins: analytics?.officialPins || 0,
        totalLikes: analytics?.totalLikes || 0,
        totalShares: analytics?.totalShares || 0,
      };

      return {
        success: true,
        data: dashboardCounts,
        message: "Dashboard counts fetched successfully",
      };
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in getWtfDashboardCounts service"
      );
      throw error;
    }
  }

  // Legacy method for backward compatibility
  static async getWtfDashboardMetrics() {
    return this.getWtfDashboardCounts();
  }

  static async getActivePinsCount() {
    try {
      const result = await getActivePins({ page: 1, limit: 1 });
      const total = result?.pagination?.total || 0;

      return {
        success: true,
        data: total,
        message: "Active pins count fetched successfully",
      };
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in getActivePinsCount service"
      );
      throw error;
    }
  }

  static async getWtfTotalEngagement() {
    try {
      const result = await this.getWtfAnalytics();
      const totalEngagement =
        result?.data?.totalViews || result?.data?.totalSeen || 0;

      return {
        success: true,
        data: { totalViews: totalEngagement },
        message: "Total engagement fetched successfully",
      };
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in getWtfTotalEngagement service"
      );
      throw error;
    }
  }

  static async getCoachSuggestionsCount() {
    try {
      const result = await getSubmissionStats();
      const pendingCount = result?.success ? result?.data?.pendingCount || 0 : 0;

      return {
        success: true,
        data: { pendingCount },
        message: "Coach suggestions count fetched successfully",
      };
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in getCoachSuggestionsCount service"
      );
      throw error;
    }
  }

  static async getCoachSuggestions({ page = 1, limit = 20, status = null, coachId = null }) {
    try {
      const result = await getSubmissionsForReviewDA({
        page,
        limit,
        type: null,
        isCoachSuggestion: true,
        status,
        coachId,
      });

      if (!result?.success) {
        return {
          success: false,
          data: null,
          message: "Failed to fetch coach suggestions",
        };
      }

      const submissions = Array.isArray(result.data)
        ? result.data
        : result?.data?.submissions || [];
      const pagination = result?.pagination || result?.data?.pagination;

      const coachSuggestions = submissions.map((submission) => {
        const meta = submission?.metadata || {};
        const rawType = (submission.type || meta.originalType || "text").toLowerCase();
        const normalizedType = rawType === "voice" ? "audio" : rawType;
        const workType =
          rawType === "voice" || rawType === "audio"
            ? "Voice Note"
            : rawType.charAt(0).toUpperCase() + rawType.slice(1);

        const statusUpper = (submission.status || "PENDING").toUpperCase();
        const normalizedStatus = statusUpper === "NEW" ? "PENDING" : statusUpper;

        return {
          _id: submission._id,
          studentName:
            submission.studentName || meta.studentName || "Unknown Student",
          coachName: submission.suggestedBy || meta.suggestedBy || "Coach",
          coachId: meta.coachId,
          workType,
          type: normalizedType,
          title: submission.title,
          content: submission.audioUrl || submission.content,
          suggestedDate: submission.createdAt,
          status: normalizedStatus,
          balagruha: submission.balagruha || meta.balagruha || "Unknown House",
        };
      });

      return {
        success: true,
        data: coachSuggestions,
        pagination,
        message: "Coach suggestions fetched successfully",
      };
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error in getCoachSuggestions service"
      );
      throw error;
    }
  }

  // ==================== COACH SUGGESTIONS ====================

  static async createCoachSuggestion(payload) {
    try {
      // Validate required fields for coach suggestion
      if (
        !payload.title ||
        !payload.content ||
        !payload.type ||
        !payload.suggestedBy ||
        !payload.studentName ||
        !payload.studentId
      ) {
        return {
          success: false,
          data: null,
          message:
            "Missing required fields: title, content, type, suggestedBy, studentName, studentId",
        };
      }

      // Validate suggestion type and map to submission types
      const validTypes = ["image", "video", "audio", "text", "link"];
      if (!validTypes.includes(payload.type)) {
        return {
          success: false,
          data: null,
          message:
            "Invalid suggestion type. Must be one of: image, video, audio, text, link",
        };
      }

      // Map coach suggestion types to submission types
      // audio/voice -> voice submission, others -> article submission
      const submissionType = payload.type === "audio" ? "voice" : "article";

      // Create submission data for coach suggestion
      const suggestionData = {
        studentId: payload.studentId, // Add proper student ID for submissions
        title: payload.title,
        type: submissionType,
        status: "pending", // Coach suggestions start as pending
        metadata: {
          isCoachSuggestion: true,
          originalType: payload.type, // Store the original suggestion type
          studentName: payload.studentName,
          balagruha: payload.balagruha || "Unknown House",
          suggestedBy: payload.suggestedBy, // Coach ID/name
          coachId: payload.coachId,
          suggestedDate: new Date(),
          reason: payload.reason || "Coach recommendation for Wall of Fame",
          ...payload.metadata,
        },
        language: payload.language || "english",
        tags: payload.tags || [],
      };

      // If a file is present, upload to S3 first and get a URL
      let thumbnailUrl = null; // Declare thumbnailUrl at function level
      if (payload.file && payload.file.path) {
        try {
          const uploadResult = await uploadWtfMedia(
            payload.file.path,
            payload.type === "audio" ? "audio" : payload.type,
            `coach_suggestion_${Date.now()}`
          );

          if (uploadResult.success) {
            // Generate thumbnail for videos from local file
            if (payload.type === "video") {
              try {
                logger.info(
                  { videoType: payload.type },
                  "Starting video thumbnail generation for coach suggestion"
                );

                const VideoThumbnailService = require("./videoThumbnail");
                const thumbnailService = new VideoThumbnailService();

                const thumbnailResult =
                  await thumbnailService.generateThumbnailFromPath(
                    payload.file.path,
                    {
                      time: "00:00:01",
                      width: 320,
                      height: 240,
                    }
                  );

                if (thumbnailResult.success) {
                  // Create a temporary thumbnail file
                  const tempDir = require("os").tmpdir();
                  const tempThumbnailPath = require("path").join(
                    tempDir,
                    `temp_thumb_${Date.now()}.jpg`
                  );

                  try {
                    // Write thumbnail buffer to temp file
                    require("fs").writeFileSync(
                      tempThumbnailPath,
                      thumbnailResult.thumbnailBuffer
                    );

                    // Upload thumbnail file to S3
                    const thumbnailS3Result = await uploadWtfMedia(
                      tempThumbnailPath,
                      "image",
                      `thumb_${Date.now()}`
                    );

                    if (thumbnailS3Result.success) {
                      thumbnailUrl = thumbnailS3Result.url;
                      logger.info(
                        { thumbnailUrl: thumbnailS3Result.url },
                        "Video thumbnail generated and uploaded successfully for coach suggestion"
                      );
                    } else {
                      logger.warn(
                        { error: thumbnailS3Result.message },
                        "Failed to upload thumbnail to S3 for coach suggestion"
                      );
                    }

                    // Clean up temp thumbnail file
                    require("fs").unlinkSync(tempThumbnailPath);
                  } catch (fileError) {
                    logger.error(
                      { error: fileError.message },
                      "Error handling temporary thumbnail file for coach suggestion"
                    );
                  }
                } else {
                  logger.warn(
                    { error: thumbnailResult.error },
                    "Failed to generate video thumbnail from local file for coach suggestion"
                  );
                }
              } catch (thumbnailError) {
                logger.error(
                  { error: thumbnailError.message },
                  "Error during thumbnail generation for coach suggestion"
                );
              }
            }

            // Map to correct field
            if (submissionType === "voice") {
              suggestionData.audioUrl = uploadResult.url;
            } else if (submissionType === "article") {
              suggestionData.content =
                uploadResult.url || payload.content || "";
              // Add thumbnail URL for video suggestions
              if (payload.type === "video" && thumbnailUrl) {
                suggestionData.thumbnailUrl = thumbnailUrl;
              }
            }
          } else {
            errorLogger.error(
              { error: uploadResult.message },
              "S3 upload failed for coach suggestion"
            );
          }
          // Clean up local temp file
          try {
            if (fs.existsSync(payload.file.path)) {
              fs.unlinkSync(payload.file.path);
            }
          } catch {}
        } catch (e) {
          errorLogger.error(
            { error: e.message },
            "S3 upload failed for coach suggestion"
          );
        }
      } else {
        // No file provided; use URL/text from payload
        if (submissionType === "voice") {
          suggestionData.audioUrl = payload.audioUrl || payload.content;
          if (payload.audioDuration != null) {
            suggestionData.audioDuration = payload.audioDuration;
          }
          suggestionData.audioTranscription = payload.audioTranscription;
        } else {
          suggestionData.content = payload.content;
        }
      }

      // Create the suggestion using the submission system
      const result = await createWtfSubmission(suggestionData);

      if (result.success) {
        logger.info(
          {
            suggestionId: result.data._id,
            coachId: payload.coachId,
            studentName: payload.studentName,
          },
          "Coach suggestion created successfully"
        );

        return {
          success: true,
          data: {
            id: result.data._id,
            title: result.data.title,
            studentName: result.data.studentName,
            suggestedBy: result.data.suggestedBy,
            status: result.data.status,
            createdAt: result.data.createdAt,
          },
          message: "Coach suggestion created successfully",
        };
      }

      return result;
    } catch (error) {
      errorLogger.error(
        { error: error.message, payload },
        "Error in createCoachSuggestion service"
      );
      throw error;
    }
  }

  // ==================== PIN LIFECYCLE MANAGEMENT ====================

  /**
   * Automatically delete pins after one week (including S3 files)
   * Should be called by a scheduled job (cron/scheduler)
   */
  static async expireOldPins() {
    try {
      logger.info("Starting automatic pin expiration process");

      // Get expired pins using the updated data access method
      const expiredPinsResult = await getExpiredPins();

      if (!expiredPinsResult.success || expiredPinsResult.data.length === 0) {
        logger.info("No pins to expire");
        return {
          success: true,
          expiredCount: 0,
          message: "No pins to expire",
          expirationCutoff: expiredPinsResult.expirationCutoff,
        };
      }

      const expiredPins = expiredPinsResult.data;
      let deletedCount = 0;
      const deletedPinDetails = [];
      const failedDeletions = [];

      logger.info(
        {
          expiredPinsCount: expiredPins.length,
          expirationCutoff: expiredPinsResult.expirationCutoff,
        },
        "Found expired pins to delete"
      );

      for (const pin of expiredPins) {
        try {
          logger.info(
            {
              pinId: pin._id,
              title: pin.title,
              createdAt: pin.createdAt,
              author: pin.author?.name,
            },
            "Deleting expired pin"
          );

          // Use the enhanced deletePin method which includes S3 cleanup
          const result = await this.deletePin(pin._id);

          if (result.success) {
            deletedCount++;
            deletedPinDetails.push({
              pinId: pin._id,
              title: pin.title,
              createdAt: pin.createdAt,
              author: pin.author?.name,
              s3DeletionResults: result.s3DeletionResults,
            });

            logger.info(
              {
                pinId: pin._id,
                title: pin.title,
                createdAt: pin.createdAt,
                s3FilesDeleted: result.s3DeletionResults?.length || 0,
              },
              "Pin deleted due to age limit (1 week)"
            );
          } else {
            failedDeletions.push({
              pinId: pin._id,
              title: pin.title,
              error: result.message,
            });
          }
        } catch (error) {
          errorLogger.error(
            {
              error: error.message,
              pinId: pin._id,
              title: pin.title,
            },
            "Error deleting expired pin"
          );
          failedDeletions.push({
            pinId: pin._id,
            title: pin.title,
            error: error.message,
          });
        }
      }

      logger.info(
        {
          totalDeleted: deletedCount,
          totalProcessed: expiredPins.length,
          failedDeletions: failedDeletions.length,
        },
        "Pin expiration process completed"
      );

      return {
        success: true,
        expiredCount: deletedCount,
        totalProcessed: expiredPins.length,
        deletedPins: deletedPinDetails,
        failedDeletions,
        message: `${deletedCount} expired pins deleted automatically (including S3 files)`,
        expirationCutoff: expiredPinsResult.expirationCutoff,
      };
    } catch (error) {
      errorLogger.error(
        {
          error: error.message,
        },
        "Error in automatic pin expiration"
      );

      throw error;
    }
  }

  /**
   * Clean up expired pins to make room for new ones
   * Called when the softboard is full (15-20 pins)
   */
  static async cleanupExpiredPins() {
    try {
      const activePins = await getActivePins({
        status: "ACTIVE",
      });

      // If we have more than 20 active pins, expire the oldest ones
      if (activePins && activePins.length > 20) {
        const pinsToExpire = activePins
          .sort(
            (a, b) => new Date(a.pinnedTimestamp) - new Date(b.pinnedTimestamp)
          )
          .slice(0, activePins.length - 15); // Keep only 15 most recent

        let cleanedCount = 0;

        for (const pin of pinsToExpire) {
          const result = await updatePinStatus(pin.pinId, "EXPIRED");
          if (result.success) {
            cleanedCount++;
          }
        }

        logger.info(
          {
            totalActive: activePins.length,
            cleaned: cleanedCount,
          },
          "Cleaned up old pins to make room for new ones"
        );

        return {
          success: true,
          cleanedCount,
          message: `${cleanedCount} old pins cleaned up`,
        };
      }

      return {
        success: true,
        cleanedCount: 0,
        message: "No cleanup needed",
      };
    } catch (error) {
      errorLogger.error(
        {
          error: error.message,
        },
        "Error in pin cleanup"
      );

      throw error;
    }
  }

  // ==================== ISF COINS AUTO-ASSIGNMENT ====================

  /**
   * Award ISF Coins to students when their content gets pinned
   * Called when admin pins student work to WTF
   */
  static async awardCoinsForPinnedContent(pinData) {
    try {
      if (
        !pinData.originalAuthor?.userId ||
        pinData.originalAuthor?.type !== "STUDENT"
      ) {
        logger.info("No coin award - not student content", {
          pinData: pinData.pinId,
        });
        return {
          success: true,
          message: "Not student content - no coins awarded",
        };
      }

      const studentId = pinData.originalAuthor.userId;
      const coinReward = this.calculateCoinReward(pinData.contentType);

      if (coinReward <= 0) {
        return {
          success: true,
          message: "No coins configured for this content type",
        };
      }

      // Award coins using the coin service
      const coinResult = await CoinService.awardPinCreationCoins(
        studentId,
        pinData.pinId,
        false, // isFirstPin
        {
          contentType: pinData.contentType,
          pinnedBy: pinData.pinnedBy.adminId,
          isPinned: true,
        }
      );

      if (coinResult.success) {
        // Create notification for coin award
        try {
          const NotificationService = require("./notification");
          await NotificationService.notifyCoinsAwarded(
            studentId,
            coinReward,
            "WTF_CONTENT_PINNED",
            `Your ${pinData.contentType.toLowerCase()} "${
              pinData.title
            }" was featured on WTF!`,
            {
              pinId: pinData.pinId,
              contentType: pinData.contentType,
              pinnedBy: pinData.pinnedBy?.adminId,
            }
          );
        } catch (notificationError) {
          errorLogger.error(
            {
              studentId,
              pinId: pinData.pinId,
              error: notificationError.message,
            },
            "Error creating coin award notification"
          );
          // Don't fail coin award if notification creation fails
        }

        logger.info(
          {
            studentId,
            pinId: pinData.pinId,
            coinsAwarded: coinReward,
            contentType: pinData.contentType,
          },
          "ISF Coins awarded for pinned content"
        );

        return {
          success: true,
          coinsAwarded: coinReward,
          message: `${coinReward} ISF Coins awarded to student for pinned content`,
        };
      }

      return coinResult;
    } catch (error) {
      errorLogger.error(
        {
          error: error.message,
          pinData: pinData?.pinId,
        },
        "Error awarding coins for pinned content"
      );

      // Don't throw - coin awards shouldn't block pin creation
      return {
        success: false,
        message: "Error awarding coins",
        error: error.message,
      };
    }
  }

  /**
   * Calculate coin reward based on content type
   */
  static calculateCoinReward(contentType) {
    const coinRewards = {
      IMAGE: 50, // Student artwork/drawings
      VIDEO: 100, // Spoken English performances, student videos
      AUDIO: 75, // Voice notes, student recordings
      TEXT: 25, // Student articles/stories
    };

    return coinRewards[contentType] || 0;
  }

  /**
   * Award coins for highly liked content (milestone rewards)
   */
  static async awardMilestoneCoins(pinId, likeCount, likeType = "total") {
    try {
      // Get pin data
      const pin = await getWtfPinById(pinId);
      if (
        !pin ||
        !pin.originalAuthor?.userId ||
        pin.originalAuthor?.type !== "STUDENT"
      ) {
        return {
          success: true,
          message: "Not student content - no milestone coins",
        };
      }

      const milestones = [10, 25, 50, 100]; // Like count milestones
      const milestoneRewards = [25, 50, 100, 200]; // Corresponding coin rewards

      let totalMilestoneCoins = 0;

      for (let i = 0; i < milestones.length; i++) {
        const milestone = milestones[i];
        const reward = milestoneRewards[i];

        if (likeCount >= milestone) {
          // Check if we've already awarded this milestone
          const existingReward = await CoinService.checkExistingReward(
            pin.originalAuthor.userId,
            `WTF_MILESTONE_${milestone}`,
            { pinId }
          );

          if (!existingReward) {
            const coinResult = await CoinService.addCoins(
              pin.originalAuthor.userId,
              reward,
              `WTF_MILESTONE_${milestone}`,
              `Your content "${pin.title}" reached ${milestone} likes!`,
              {
                pinId,
                milestone,
                likeCount,
                likeType,
              }
            );

            if (coinResult.success) {
              totalMilestoneCoins += reward;
              logger.info(
                {
                  studentId: pin.originalAuthor.userId,
                  pinId,
                  milestone,
                  coinsAwarded: reward,
                  totalLikes: likeCount,
                },
                "Milestone coins awarded for popular content"
              );
            }
          }
        }
      }

      return {
        success: true,
        coinsAwarded: totalMilestoneCoins,
        message:
          totalMilestoneCoins > 0
            ? `${totalMilestoneCoins} milestone coins awarded`
            : "No new milestones reached",
      };
    } catch (error) {
      errorLogger.error(
        {
          error: error.message,
          pinId,
          likeCount,
        },
        "Error awarding milestone coins"
      );

      return {
        success: false,
        message: "Error awarding milestone coins",
        error: error.message,
      };
    }
  }
}

module.exports = WtfService;
