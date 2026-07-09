const cron = require("node-cron");
const {
  errorLogger,
  logger,
  schedulerLogger,
  lifecycleLogger,
} = require("../config/pino-config");
const WtfService = require("./wtf");
const {
  getExpiredPins,
  getPinsForFifoManagement,
  bulkUpdatePinStatus,
} = require("../data-access/wtfPin");

class SchedulerService {
  constructor() {
    this.jobs = new Map();
    this.isInitialized = false;
  }

  // Initialize all scheduled jobs
  async initialize() {
    if (this.isInitialized) {
      logger.info("Scheduler already initialized");
      return;
    }

    try {
      // Schedule pin expiration job (runs every hour)
      this.schedulePinExpirationJob();

      // Schedule FIFO management job (runs every 30 minutes)
      this.scheduleFifoManagementJob();

      // Schedule weekly cleanup job (runs every Sunday at 2 AM)
      this.scheduleWeeklyCleanupJob();

      // Schedule daily analytics job (runs every day at 6 AM)
      this.scheduleDailyAnalyticsJob();

      this.isInitialized = true;
      schedulerLogger.info("WTF Scheduler initialized successfully");
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error initializing WTF scheduler"
      );
      throw error;
    }
  }

  // Schedule pin expiration job
  schedulePinExpirationJob() {
    const jobName = "wtf-pin-expiration";

    // Run every hour at minute 0
    const job = cron.schedule(
      "0 * * * *",
      async () => {
        try {
          schedulerLogger.info("Starting WTF pin expiration job");

          const startTime = Date.now();
          const result = await this.processExpiredPins();

          const duration = Date.now() - startTime;
          schedulerLogger.info(
            {
              jobName,
              expiredPinsCount: result.expiredPinsCount,
              duration,
            },
            "WTF pin expiration job completed successfully"
          );
        } catch (error) {
          errorLogger.error(
            { jobName, error: error.message },
            "Error in WTF pin expiration job"
          );
        }
      },
      {
        scheduled: false, // Don't start immediately
        // Removed timezone setting to use server's natural timezone
      }
    );

    this.jobs.set(jobName, job);
    job.start();

    logger.info("WTF pin expiration job scheduled (every hour)");
  }

  // Schedule FIFO management job
  scheduleFifoManagementJob() {
    const jobName = "wtf-fifo-management";

    // Run every 30 minutes
    const job = cron.schedule(
      "*/30 * * * *",
      async () => {
        try {
          logger.info("Starting WTF FIFO management job");

          const startTime = Date.now();
          const result = await this.processFifoManagement();

          const duration = Date.now() - startTime;
          logger.info(
            {
              jobName,
              fifoPinsCount: result.fifoPinsCount,
              duration,
            },
            "WTF FIFO management job completed successfully"
          );
        } catch (error) {
          errorLogger.error(
            { jobName, error: error.message },
            "Error in WTF FIFO management job"
          );
        }
      },
      {
        scheduled: false,
        // Removed timezone setting to use server's natural timezone
      }
    );

    this.jobs.set(jobName, job);
    job.start();

    logger.info("WTF FIFO management job scheduled (every 30 minutes)");
  }

  // Schedule weekly cleanup job
  scheduleWeeklyCleanupJob() {
    const jobName = "wtf-weekly-cleanup";

    // Run every Sunday at 2 AM
    const job = cron.schedule(
      "0 2 * * 0",
      async () => {
        try {
          logger.info("Starting WTF weekly cleanup job");

          const startTime = Date.now();
          const result = await this.processWeeklyCleanup();

          const duration = Date.now() - startTime;
          logger.info(
            {
              jobName,
              cleanupStats: result,
              duration,
            },
            "WTF weekly cleanup job completed successfully"
          );
        } catch (error) {
          errorLogger.error(
            { jobName, error: error.message },
            "Error in WTF weekly cleanup job"
          );
        }
      },
      {
        scheduled: false,
        // Removed timezone setting to use server's natural timezone
      }
    );

    this.jobs.set(jobName, job);
    job.start();

    logger.info("WTF weekly cleanup job scheduled (every Sunday at 2 AM)");
  }

  // Schedule daily analytics job
  scheduleDailyAnalyticsJob() {
    const jobName = "wtf-daily-analytics";

    // Run every day at 6 AM
    const job = cron.schedule(
      "0 6 * * *",
      async () => {
        try {
          logger.info("Starting WTF daily analytics job");

          const startTime = Date.now();
          const result = await this.processDailyAnalytics();

          const duration = Date.now() - startTime;
          logger.info(
            {
              jobName,
              analyticsStats: result,
              duration,
            },
            "WTF daily analytics job completed successfully"
          );
        } catch (error) {
          errorLogger.error(
            { jobName, error: error.message },
            "Error in WTF daily analytics job"
          );
        }
      },
      {
        scheduled: false,
        // Removed timezone setting to use server's natural timezone
      }
    );

    this.jobs.set(jobName, job);
    job.start();

    logger.info("WTF daily analytics job scheduled (every day at 6 AM)");
  }

  // Process expired pins
  async processExpiredPins() {
    try {
      // Use the new WTF service method for expiring old pins
      const result = await WtfService.expireOldPins();

      if (result.success && result.expiredCount > 0) {
        schedulerLogger.info(
          {
            expiredPinsCount: result.expiredCount,
            totalProcessed: result.totalProcessed,
          },
          "Successfully expired old pins using WTF service"
        );
      }

      return { expiredPinsCount: result.expiredCount || 0 };
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error processing expired pins"
      );
      throw error;
    }
  }

  // Process FIFO management - delete oldest pins when board exceeds 20 pins
  async processFifoManagement() {
    try {
      // Get pins for FIFO management (beyond 20 active pins limit)
      const fifoPinsResult = await getPinsForFifoManagement();

      if (!fifoPinsResult.success || fifoPinsResult.data.length === 0) {
        logger.info(
          "No pins need FIFO management - board has 20 or fewer active pins"
        );
        return { deletedPinsCount: 0 };
      }

      const pinsToDelete = fifoPinsResult.data;
      let deletedCount = 0;
      const deletedPinDetails = [];
      const failedDeletions = [];

      logger.info(
        {
          pinsToDeleteCount: pinsToDelete.length,
          reason: "Board exceeded 20 active pins limit",
        },
        "Starting FIFO pin deletion process"
      );

      // Delete each pin (including S3 files) using WtfService.deletePin
      for (const pin of pinsToDelete) {
        try {
          logger.info(
            {
              pinId: pin._id,
              title: pin.title,
              createdAt: pin.createdAt,
              author: pin.author?.name || "Unknown",
            },
            "Deleting oldest pin for FIFO management"
          );

          // Use WtfService.deletePin for proper S3 cleanup
          const deleteResult = await WtfService.deletePin(pin._id);

          if (deleteResult.success) {
            deletedCount++;
            deletedPinDetails.push({
              pinId: pin._id,
              title: pin.title,
              createdAt: pin.createdAt,
              author: pin.author?.name || "Unknown",
              s3DeletionResults: deleteResult.s3DeletionResults,
            });

            logger.info(
              {
                pinId: pin._id,
                title: pin.title,
                createdAt: pin.createdAt,
                s3FilesDeleted: deleteResult.s3DeletionResults?.length || 0,
              },
              "Pin deleted due to FIFO management (board full)"
            );
          } else {
            failedDeletions.push({
              pinId: pin._id,
              title: pin.title,
              error: deleteResult.message,
            });

            logger.error(
              {
                pinId: pin._id,
                title: pin.title,
                error: deleteResult.message,
              },
              "Failed to delete pin during FIFO management"
            );
          }
        } catch (error) {
          errorLogger.error(
            {
              error: error.message,
              pinId: pin._id,
              title: pin.title,
            },
            "Error deleting pin during FIFO management"
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
          totalProcessed: pinsToDelete.length,
          failedDeletions: failedDeletions.length,
        },
        "FIFO management process completed"
      );

      return {
        deletedPinsCount: deletedCount,
        totalProcessed: pinsToDelete.length,
        deletedPins: deletedPinDetails,
        failedDeletions,
        message: `${deletedCount} oldest pins deleted to maintain 20-pin limit`,
      };
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error processing FIFO management"
      );
      throw error;
    }
  }

  // Process weekly cleanup
  async processWeeklyCleanup() {
    try {
      const cleanupStats = {
        oldInteractionsCleaned: 0,
        oldSubmissionsCleaned: 0,
        analyticsGenerated: 0,
      };

      // Clean up old interactions (older than 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // This would require adding cleanup methods to data access layer
      // For now, we'll just log the cleanup process
      logger.info(
        { cutoffDate: thirtyDaysAgo },
        "Weekly cleanup: Old interactions cleanup process"
      );

      // Generate weekly analytics
      try {
        const analyticsResult = await WtfService.getWtfAnalytics();
        if (analyticsResult.success) {
          cleanupStats.analyticsGenerated = 1;
          logger.info(
            { analyticsData: analyticsResult.data },
            "Weekly analytics generated successfully"
          );
        }
      } catch (analyticsError) {
        errorLogger.error(
          { error: analyticsError.message },
          "Error generating weekly analytics"
        );
      }

      return cleanupStats;
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error processing weekly cleanup"
      );
      throw error;
    }
  }

  // Process daily analytics
  async processDailyAnalytics() {
    try {
      const analyticsStats = {
        dailyInteractions: 0,
        dailySubmissions: 0,
        dailyPinsCreated: 0,
        topPerformingPins: [],
      };

      // Get daily interaction analytics
      try {
        const interactionAnalytics = await WtfService.getInteractionAnalytics({
          days: 1,
        });
        if (interactionAnalytics.success) {
          analyticsStats.dailyInteractions =
            interactionAnalytics.data.totalInteractions || 0;
        }
      } catch (error) {
        errorLogger.error(
          { error: error.message },
          "Error getting daily interaction analytics"
        );
      }

      // Get daily submission analytics
      try {
        const submissionAnalytics = await WtfService.getSubmissionAnalytics({
          days: 1,
        });
        if (submissionAnalytics.success) {
          analyticsStats.dailySubmissions =
            submissionAnalytics.data.totalSubmissions || 0;
        }
      } catch (error) {
        errorLogger.error(
          { error: error.message },
          "Error getting daily submission analytics"
        );
      }

      // Get top performing pins for the day
      try {
        const topPinsResult = await WtfService.getTopPerformingPins({
          limit: 5,
          days: 1,
        });
        if (topPinsResult.success) {
          analyticsStats.topPerformingPins = topPinsResult.data.pins || [];
        }
      } catch (error) {
        errorLogger.error(
          { error: error.message },
          "Error getting top performing pins"
        );
      }

      logger.info({ analyticsStats }, "Daily analytics processed successfully");

      return analyticsStats;
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error processing daily analytics"
      );
      throw error;
    }
  }

  // Get job status
  getJobStatus() {
    const status = {};

    for (const [jobName, job] of this.jobs) {
      status[jobName] = {
        running: job.running,
        next: job.nextDate(),
        last: job.lastDate(),
      };
    }

    return status;
  }

  // Stop all jobs
  stopAllJobs() {
    for (const [jobName, job] of this.jobs) {
      job.stop();
      logger.info(`Stopped job: ${jobName}`);
    }

    this.isInitialized = false;
    logger.info("All WTF scheduler jobs stopped");
  }

  // Restart all jobs
  async restartAllJobs() {
    this.stopAllJobs();
    await this.initialize();
  }
}

// Create singleton instance
const schedulerService = new SchedulerService();

module.exports = schedulerService;
