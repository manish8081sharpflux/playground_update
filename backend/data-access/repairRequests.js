const RepairRequests = require("../models/repairRequests");

const repairRequestsDA = {
  create: async (repairRequestData) => {
    const newRepairRequest = new RepairRequests(repairRequestData);
    return await newRepairRequest.save();
  },

  findAll: async (query = {}, options = {}) => {
    const { limit = 10, skip = 0, sort = { createdAt: -1 } } = options;
    return await RepairRequests.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("createdBy", "name email")
      .populate("balagruhaId", "name")
      .populate("attachments.uploadedBy", "name email");
  },

  findById: async (id) => {
    return await RepairRequests.findById(id)
      .populate("createdBy", "name email")
      .populate("balagruhaId", "name")
      .populate("attachments.uploadedBy", "name email");
  },

  update: async (id, updateData) => {
    return await RepairRequests.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
  },

  delete: async (id) => {
    return await RepairRequests.findByIdAndDelete(id);
  },

  count: async (query = {}) => {
    return await RepairRequests.countDocuments(query);
  },
  findAllPendingAndInProgressCount: async () => {
    return await RepairRequests.find({
      status: { $in: ["pending", "in-progress"] },
    }).countDocuments();
  },
  findCompletedThisWeekCount: async () => {
    // Get the start of the current week (Sunday)
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Get the end of the current week (Saturday)
    const endOfWeek = new Date();
    endOfWeek.setDate(endOfWeek.getDate() + (6 - endOfWeek.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);

    return await RepairRequests.countDocuments({
      status: "completed",
      completedAt: {
        $gte: startOfWeek,
        $lte: endOfWeek,
      },
    });
  },
  // get last 10 recent repair requests
  getRecentRepairRequests: async (limit = 10) => {
    return await RepairRequests.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("createdBy", "name email")
      .populate("balagruhaId", "name")
      .populate("attachments.uploadedBy", "name email");
  },
};

module.exports = repairRequestsDA;
