const OfflineRequestQueueDA = require("../data-access/offlineRequestQueue");
const { logger } = require("../config/pino-config");
const {
  sendOfflineRequestToServer,
  getUserIdFromGeneratedIdFromServer,
  sendOfflineJSONRequestToServer,
  getMachineIdFromGeneratedIdFromServer,
  getTaskIdFromGeneratedIdFromServer,
  getBalagruhaDetailsFromGeneratedIdFromServer,
} = require("./offlineRequestToServer");
const { OfflineReqNames } = require("../constants/general");

exports.createOfflineRequest = async ({
  operation,
  apiPath,
  method,
  payload,
  attachments = [],
  attachmentString,
  token = "",
  generatedId,
}) => {
  try {
    if (!operation || !apiPath) {
      return {
        success: false,
        message: "Operation, API path, and payload are required",
      };
    }
    const offlineRequest = {
      operation,
      apiPath,
      method: method || "POST",
      payload: payload || "",
      attachments,
      attachmentString,
      status: "pending",
      token,
      generatedId,
    };
    const result = await OfflineRequestQueueDA.createOfflineRequest(
      offlineRequest
    );
    return result;
  } catch (error) {
    logger.error({ error: error.message }, "Offline request queue error");
    return {
      success: false,
      message: "Error creating offline request",
      error: error.message,
    };
  }
};

exports.getOfflineRequestById = async ({ requestId }) => {
  try {
    if (!requestId) {
      return { success: false, message: "Request ID is required" };
    }
    const result = await OfflineRequestQueueDA.getOfflineRequestById(requestId);
    return result;
  } catch (error) {
    logger.error(`Error fetching offline request by ID: ${error.message}`);
    return {
      success: false,
      message: "Error fetching offline request",
      error: error.message,
    };
  }
};

exports.syncOfflineRequestToServer = async () => {
  try {
    let pendingReq = await OfflineRequestQueueDA.getPendingOfflineRequests();
    if (pendingReq && pendingReq.data && pendingReq.data.length > 0) {
      for (let i = 0; i < pendingReq.data.length; i++) {
        let requestName = pendingReq.data[i].operation;
        let exeResult = null;
        let reqInfo = await this.getOfflineRequestById({
          requestId: pendingReq.data[i]._id,
        });
        if (reqInfo && reqInfo.data && reqInfo.data.status !== "pending") {
          continue;
        }
        switch (requestName) {
          case OfflineReqNames.CREATE_USER:
            {
              let generatedId = pendingReq.data[i].generatedId;
              let payload = JSON.parse(pendingReq.data[i].payload);
              payload.generatedId = generatedId;
              payload = JSON.stringify(payload);
              pendingReq.data[i].payload = payload;
              exeResult = await sendOfflineRequestToServer({
                reqData: pendingReq.data[i],
              });
            }
            break;
          case OfflineReqNames.EDIT_USER:
            {
              let generatedId = pendingReq.data[i].generatedId;
              let userId = await getUserIdFromGeneratedIdFromServer({
                generatedId: generatedId,
                token: pendingReq.data[i].token,
              });
              if (userId.success && userId.data) {
                userId = userId.data.id;
              }
              let userEditAPI = pendingReq.data[i].apiPath;
              let userEditAPIPath = userEditAPI.replace(
                /\/[0-9a-fA-F]{24}/,
                `/${userId}`
              );
              exeResult = await sendOfflineRequestToServer({
                reqData: { ...pendingReq.data[i], apiPath: userEditAPIPath },
              });
            }
            break;
          case OfflineReqNames.DELETE_USER:
            {
              let generatedId = pendingReq.data[i].generatedId;
              let userId = await getUserIdFromGeneratedIdFromServer({
                generatedId: generatedId,
                token: pendingReq.data[i].token,
              });
              if (userId.success && userId.data) {
                userId = userId.data.id;
              }
              let userDeleteAPI = pendingReq.data[i].apiPath;
              let userDeleteAPIPath = userDeleteAPI.replace(
                /\/[0-9a-fA-F]{24}/,
                `/${userId}`
              );
              exeResult = await sendOfflineRequestToServer({
                reqData: { ...pendingReq.data[i], apiPath: userDeleteAPIPath },
              });
            }
            break;
          case OfflineReqNames.CREATE_MACHINE:
            {
              let generatedId = pendingReq.data[i].generatedId;
              let payload = JSON.parse(pendingReq.data[i].payload);
              payload.generatedId = generatedId;
              payload = JSON.stringify(payload);
              pendingReq.data[i].payload = payload;
              exeResult = await sendOfflineJSONRequestToServer({
                reqData: pendingReq.data[i],
              });
            }
            break;
          case OfflineReqNames.UPDATE_MACHINE_TOGGLE_STATUS:
            {
              let generatedId = pendingReq.data[i].generatedId;
              let machineId = await getMachineIdFromGeneratedIdFromServer({
                generatedId: generatedId,
                token: pendingReq.data[i].token,
              });
              if (machineId.success && machineId.data) {
                machineId = machineId.data.machine._id;
              }
              let machineEditAPI = pendingReq.data[i].apiPath;
              let machineEditAPIPath = machineEditAPI.replace(
                /\/[0-9a-fA-F]{24}/,
                `/${machineId}`
              );
              exeResult = await sendOfflineJSONRequestToServer({
                reqData: { ...pendingReq.data[i], apiPath: machineEditAPIPath },
              });
            }
            break;
          case OfflineReqNames.ASSIGN_MACHINE:
            {
              let generatedId = pendingReq.data[i].generatedId;
              let machineId = await getMachineIdFromGeneratedIdFromServer({
                generatedId: generatedId,
                token: pendingReq.data[i].token,
              });
              if (machineId.success && machineId.data) {
                machineId = machineId.data.machine._id;
              }
              let machineEditAPI = pendingReq.data[i].apiPath;
              let machineEditAPIPath = machineEditAPI.replace(
                /\/[0-9a-fA-F]{24}/,
                `/${machineId}`
              );
              exeResult = await sendOfflineJSONRequestToServer({
                reqData: { ...pendingReq.data[i], apiPath: machineEditAPIPath },
              });
            }
            break;
          case OfflineReqNames.DELETE_MACHINE:
            {
              let generatedId = pendingReq.data[i].generatedId;
              let machineId = await getMachineIdFromGeneratedIdFromServer({
                generatedId: generatedId,
                token: pendingReq.data[i].token,
              });
              if (machineId.success && machineId.data) {
                machineId = machineId.data.machine._id;
              }
              let machineDeleteAPI = pendingReq.data[i].apiPath;
              let machineDeleteAPIPath = machineDeleteAPI.replace(
                /\/[0-9a-fA-F]{24}/,
                `/${machineId}`
              );
              exeResult = await sendOfflineJSONRequestToServer({
                reqData: {
                  ...pendingReq.data[i],
                  apiPath: machineDeleteAPIPath,
                },
              });
            }
            break;
          case OfflineReqNames.CREATE_TASK:
            {
              let generatedId = pendingReq.data[i].generatedId;
              let payload = JSON.parse(pendingReq.data[i].payload);
              payload.generatedId = generatedId;
              payload = JSON.stringify(payload);
              pendingReq.data[i].payload = payload;
              exeResult = await sendOfflineRequestToServer({
                reqData: pendingReq.data[i],
              });
            }
            break;
          case OfflineReqNames.UPDATE_TASK_STATUS:
            {
              let generatedId = pendingReq.data[i].generatedId;
              let taskId = await getTaskIdFromGeneratedIdFromServer({
                generatedId: generatedId,
                token: pendingReq.data[i].token,
              });
              if (taskId.success && taskId.data) {
                taskId = taskId.data._id;
              }
              let taskEditAPI = pendingReq.data[i].apiPath;
              let taskEditAPIPath = taskEditAPI.replace(
                /\/[0-9a-fA-F]{24}/,
                `/${taskId}`
              );
              exeResult = await sendOfflineJSONRequestToServer({
                reqData: { ...pendingReq.data[i], apiPath: taskEditAPIPath },
              });
            }
            break;
          case OfflineReqNames.UPDATE_COMMENT_TO_TASK:
            {
              let generatedId = pendingReq.data[i].generatedId;
              let taskId = await getTaskIdFromGeneratedIdFromServer({
                generatedId: generatedId,
                token: pendingReq.data[i].token,
              });
              if (taskId.success && taskId.data) {
                taskId = taskId.data._id;
              }
              let taskEditAPI = pendingReq.data[i].apiPath;
              let taskEditAPIPath = taskEditAPI.replace(
                /\/[0-9a-fA-F]{24}/,
                `/${taskId}`
              );
              exeResult = await sendOfflineRequestToServer({
                reqData: { ...pendingReq.data[i], apiPath: taskEditAPIPath },
              });
            }
            break;
          case OfflineReqNames.ADD_UPDATE_TASK_ATTACHMENTS:
            {
              let generatedId = pendingReq.data[i].generatedId;
              let taskId = await getTaskIdFromGeneratedIdFromServer({
                generatedId: generatedId,
                token: pendingReq.data[i].token,
              });
              if (taskId.success && taskId.data) {
                taskId = taskId.data._id;
              }
              let taskEditAPI = pendingReq.data[i].apiPath;
              let taskEditAPIPath = taskEditAPI.replace(
                /\/[0-9a-fA-F]{24}/,
                `/${taskId}`
              );
              exeResult = await sendOfflineRequestToServer({
                reqData: { ...pendingReq.data[i], apiPath: taskEditAPIPath },
              });
            }
            break;
          case OfflineReqNames.CREATE_BALAGRUHA:
            {
              let generatedId = pendingReq.data[i].generatedId;
              let payload = JSON.parse(pendingReq.data[i].payload);
              payload.generatedId = generatedId;
              payload = JSON.stringify(payload);
              pendingReq.data[i].payload = payload;
              exeResult = await sendOfflineJSONRequestToServer({
                reqData: pendingReq.data[i],
              });
            }
            break;
          case OfflineReqNames.UPDATE_BALAGRUHA:
            {
              let generatedId = pendingReq.data[i].generatedId;
              let balagruhaId =
                await getBalagruhaDetailsFromGeneratedIdFromServer({
                  generatedId: generatedId,
                  token: pendingReq.data[i].token,
                });
              if (balagruhaId.success && balagruhaId.data) {
                balagruhaId = balagruhaId.data.id;
              }
              let balagruhaEditAPI = pendingReq.data[i].apiPath;
              let balagruhaEditAPIPath = balagruhaEditAPI.replace(
                /\/[0-9a-fA-F]{24}/,
                `/${balagruhaId}`
              );
              exeResult = await sendOfflineJSONRequestToServer({
                reqData: {
                  ...pendingReq.data[i],
                  apiPath: balagruhaEditAPIPath,
                },
              });
            }
            break;
          case OfflineReqNames.DELETE_BALAGRUHA:
            {
              let generatedId = pendingReq.data[i].generatedId;
              let balagruhaId =
                await getBalagruhaDetailsFromGeneratedIdFromServer({
                  generatedId: generatedId,
                  token: pendingReq.data[i].token,
                });
              if (balagruhaId.success && balagruhaId.data) {
                balagruhaId = balagruhaId.data.id;
              }
              let balagruhaDeleteAPI = pendingReq.data[i].apiPath;
              let balagruhaDeleteAPIPath = balagruhaDeleteAPI.replace(
                /\/[0-9a-fA-F]{24}/,
                `/${balagruhaId}`
              );
              exeResult = await sendOfflineJSONRequestToServer({
                reqData: {
                  ...pendingReq.data[i],
                  apiPath: balagruhaDeleteAPIPath,
                },
              });
            }
            break;
          default:
            logger.warn(`Unhandled request type: ${requestName}`);
            break;
        }
        if (exeResult) {
          await OfflineRequestQueueDA.updateOfflineRequestStatus(
            pendingReq.data[i]._id,
            "synced",
            null
          );
        }
      }
      return {
        success: true,
        data: pendingReq,
        message: "Pending offline requests fetched successfully",
      };
    } else {
      // No pending offline requests found
      return {
        success: true,
        data: {},
        message: "No pending offline requests found",
      };
    }
  } catch (error) {
    logger.error({ error: error.message }, "Offline request queue error");
    logger.error(`Error fetching pending offline requests: ${error.message}`);
    return {
      success: false,
      message: "Error fetching pending offline requests",
      error: error.message,
    };
  }
};

exports.syncRemoteDBToLocalDB = async () => {
  try {
    // Remote DB sync not yet implemented (deferred — no current requirement)
  } catch (error) {
    logger.error({ error: error.message }, "Offline request queue error");
    logger.error(`Error syncing offline request to server: ${error.message}`);
    return {
      success: false,
      message: "Error syncing offline request to server",
      error: error.message,
    };
  }
};
