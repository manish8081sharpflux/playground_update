const PurchaseOrder = require("../models/purchaseOrders");

const purchaseOrdersDA = {
  create: async (repairRequestData) => {
    const newRepairRequest = new PurchaseOrder(repairRequestData);
    return await newRepairRequest.save();
  },

  findAll: async (query = {}, options = {}) => {
    const { limit = 10, skip = 0, sort = { createdAt: -1 } } = options;
    return await PurchaseOrder.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("createdBy", "name email")
      .populate("balagruhaId", "name")
      .populate("attachments.uploadedBy", "name email");
  },

  findById: async (id) => {
    return await PurchaseOrder.findById(id)
      .populate("createdBy", "name email")
      .populate("balagruhaId", "name")
      .populate("attachments.uploadedBy", "name email");
  },

  update: async (id, updateData) => {
    return await PurchaseOrder.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
  },

  delete: async (id) => {
    return await PurchaseOrder.findByIdAndDelete(id);
  },

  count: async (query = {}) => {
    return await PurchaseOrder.countDocuments(query);
  },
  countPending: async () => {
    return await PurchaseOrder.countDocuments({ status: "pending" });
  },
  // get last 10 recent purchase orders
  getRecentPurchaseOrders: async (limit = 10) => {
    return await PurchaseOrder.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("createdBy", "name email")
      .populate("balagruhaId", "name")
      .populate("attachments.uploadedBy", "name email");
  },
};

module.exports = purchaseOrdersDA;
