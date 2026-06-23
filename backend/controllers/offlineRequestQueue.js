const { logger } = require("../config/pino-config");
const { HTTP_STATUS_CODE } = require("../constants/general");
const OfflineRequestQueueService = require("../services/offlineRequestQueue");
const { isRequestFromLocalhost } = require("../utils/helper");
const { copyDatabase } = require("../services/database");

exports.createOfflineRequest = async (req, res) => {
  try {
    const { operation, apiPath, method, payload, attachments } = req.body;
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Request received to create offline request for operation: ${operation}`
    );
    const result = await OfflineRequestQueueService.createOfflineRequest({
      operation,
      apiPath,
      method,
      payload,
      attachments,
    });
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Successfully created offline request`
      );
      res
        .status(HTTP_STATUS_CODE.OK)
        .json({ success: true, data: result.data, message: result.message });
    } else {
      logger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Failed to create offline request. Error: ${result.message}`
      );
      res
        .status(HTTP_STATUS_CODE.BAD_REQUEST)
        .json({ success: false, message: result.message });
    }
  } catch (error) {
    logger.error(`Error in createOfflineRequest controller: ${error.message}`);
    res.status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getOfflineRequestById = async (req, res) => {
  try {
    const { requestId } = req.params;
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Request received to fetch offline request with ID: ${requestId}`
    );
    const result = await OfflineRequestQueueService.getOfflineRequestById({
      requestId,
    });
    if (result.success) {
      logger.info(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Successfully fetched offline request with ID: ${requestId}`
      );
      res
        .status(HTTP_STATUS_CODE.OK)
        .json({ success: true, data: result.data, message: result.message });
    } else {
      logger.error(
        {
          clientIP: req.socket.remoteAddress,
          method: req.method,
          api: req.originalUrl,
        },
        `Failed to fetch offline request with ID: ${requestId}. Error: ${result.message}`
      );
      res
        .status(HTTP_STATUS_CODE.BAD_REQUEST)
        .json({ success: false, message: result.message });
    }
  } catch (error) {
    logger.error(`Error in getOfflineRequestById controller: ${error.message}`);
    res.status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.syncOfflineRequestToServer = async (req, res) => {
  try {
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Request received to sync offline requests to the main server`
    );
    let isOfflineRequest = isRequestFromLocalhost(req);
    if (isOfflineRequest) {
      const result =
        await OfflineRequestQueueService.syncOfflineRequestToServer();
      if (result.success) {
        copyDatabase();
        logger.info(
          {
            clientIP: req.socket.remoteAddress,
            method: req.method,
            api: req.originalUrl,
          },
          `Successfully synced offline requests to the main server`
        );
        res
          .status(HTTP_STATUS_CODE.OK)
          .json({ success: true, data: result.data, message: result.message });
      } else {
        logger.error(
          {
            clientIP: req.socket.remoteAddress,
            method: req.method,
            api: req.originalUrl,
          },
          `Failed to sync offline requests to the main server. Error: ${result.message}`
        );
        res
          .status(HTTP_STATUS_CODE.BAD_REQUEST)
          .json({ success: false, message: result.message });
      }
    } else {
      return res.status(HTTP_STATUS_CODE.UNAUTHORIZED).json({
        success: false,
        message: "Offline request can only be synced from localhost",
      });
    }
  } catch (error) {
    logger.error(
      `Error in syncOfflineRequestToServer controller: ${error.message}`
    );
    res.status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.syncRemoteDBToLocalDB = async (req, res) => {
  try {
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      `Request received to sync remote database to local database`
    );
    let isOfflineRequest = isRequestFromLocalhost(req);
    if (isOfflineRequest) {
      const result = await OfflineRequestQueueService.syncRemoteDBToLocalDB();
      if (result.success) {
        logger.info(
          {
            clientIP: req.socket.remoteAddress,
            method: req.method,
            api: req.originalUrl,
          },
          `Successfully synced remote database to local database`
        );
        res
          .status(HTTP_STATUS_CODE.OK)
          .json({ success: true, data: result.data, message: result.message });
      } else {
        logger.error(
          {
            clientIP: req.socket.remoteAddress,
            method: req.method,
            api: req.originalUrl,
          },
          `Failed to sync remote database to local database. Error: ${result.message}`
        );
        res
          .status(HTTP_STATUS_CODE.BAD_REQUEST)
          .json({ success: false, message: result.message });
      }
    } else {
      return res.status(HTTP_STATUS_CODE.UNAUTHORIZED).json({
        success: false,
        message: "Offline request can only be synced from localhost",
      });
    }
  } catch (error) {
    logger.error(`Error in syncRemoteDBToLocalDB controller: ${error.message}`);
    res.status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
