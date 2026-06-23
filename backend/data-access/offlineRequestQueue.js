const OfflineRequestQueue = require("../models/offlineReqQueue");

exports.createOfflineRequest = async (payload) => {
  return await OfflineRequestQueue.create(payload)
    .then((result) => ({
      success: true,
      data: result,
      message: "Offline request queued successfully",
    }))
    .catch((error) => {
      throw error;
    });
};

exports.getAllOfflineRequests = async (filter = {}) => {
  return await OfflineRequestQueue.find(filter)
    .sort({ createdAt: -1 })
    .lean()
    .then((result) => ({
      success: true,
      data: result,
      message: "Fetched all offline requests successfully",
    }))
    .catch((error) => {
      throw error;
    });
};

exports.getOfflineRequestById = async (requestId) => {
  return await OfflineRequestQueue.findById(requestId)
    .lean()
    .then((result) => {
      if (!result) {
        return {
          success: false,
          data: null,
          message: "Offline request not found",
        };
      }
      return {
        success: true,
        data: result,
        message: "Fetched offline request successfully",
      };
    })
    .catch((error) => {
      throw error;
    });
};

exports.updateOfflineRequest = async (requestId, payload) => {
  return await OfflineRequestQueue.findByIdAndUpdate(
    requestId,
    { $set: payload },
    { new: true }
  )
    .then((result) => {
      if (!result) {
        return {
          success: false,
          data: null,
          message: "Offline request not found",
        };
      }
      return {
        success: true,
        data: result,
        message: "Updated offline request successfully",
      };
    })
    .catch((error) => {
      throw error;
    });
};

exports.updateOfflineRequestStatus = async (requestId, status, error = "") => {
  const updateData = { status, updatedAt: Date.now() };
  if (error) updateData.error = error;
  return await OfflineRequestQueue.findByIdAndUpdate(
    requestId,
    { $set: updateData },
    { new: true }
  )
    .then((result) => {
      if (!result) {
        return {
          success: false,
          data: null,
          message: "Offline request not found",
        };
      }
      return {
        success: true,
        data: result,
        message: `Offline request status updated to ${status} successfully`,
      };
    })
    .catch((error) => {
      throw error;
    });
};

exports.deleteOfflineRequest = async (requestId) => {
  return await OfflineRequestQueue.findByIdAndDelete(requestId)
    .then((result) => {
      if (!result) {
        return {
          success: false,
          data: null,
          message: "Offline request not found",
        };
      }
      return {
        success: true,
        data: result,
        message: "Deleted offline request successfully",
      };
    })
    .catch((error) => {
      throw error;
    });
};

exports.getPendingOfflineRequests = async () => {
  return await OfflineRequestQueue.find({ status: "pending" })
    .sort({ createdAt: 1 })
    .lean()
    .then((result) => ({
      success: true,
      data: result,
      message: "Fetched pending offline requests successfully",
    }))
    .catch((error) => {
      throw error;
    });
};
