const PurchaseOrder = require("../services/purchaseAndRepair/purchaseOrder");
const RepairRequest = require("../services/purchaseAndRepair/repairRequests");
const { isRequestFromLocalhost } = require("../utils/helper");
const { errorLogger } = require('../config/pino-config');
const { uploadFileToS3 } = require('../services/aws/s3');
const { cleanupLocalFile } = require('../utils/fileCleanup');

async function uploadRepairAttachmentsToS3(files = [], uploadedBy) {
  const attachments = [];

  for (const file of files) {
    try {
      const result = await uploadFileToS3(
        file.path,
        process.env.AWS_S3_FOLDER_REPAIR_REQUEST_ATTACHMENTS,
        file.filename,
      );

      if (!result.success) {
        throw new Error(result.error || result.message || `Failed to upload ${file.originalname} to S3`);
      }

      attachments.push({
        fileName: file.originalname || file.filename,
        fileUrl: result.url,
        s3Key: result.key,
        fileType: result.contentType || file.mimetype,
        uploadedBy,
        uploadedAt: new Date(),
      });
    } finally {
      cleanupLocalFile(file.path, file.filename);
    }
  }

  return attachments;
}

function validateRepairPayload(data, { isUpdate = false } = {}) {
  const errors = [];
  const allowedUrgency = ["low", "medium", "high"];
  const allowedStatus = ["pending", "in-progress", "completed"];

  const requiredFields = [
    ["balagruhaId", "Balagruha is required"],
    ["issueName", "Issue name is required"],
    ["description", "Description is required"],
    ["dateReported", "Date reported is required"],
    ["urgency", "Urgency is required"],
    ["estimatedCost", "Estimated cost is required"],
  ];

  requiredFields.forEach(([field, message]) => {
    if (data[field] === undefined || data[field] === null || data[field].toString().trim() === "") {
      errors.push(message);
    }
  });

  if (data.issueName && data.issueName.trim().length < 3) {
    errors.push("Issue name must be at least 3 characters");
  }

  if (data.description && data.description.trim().length < 10) {
    errors.push("Description must be at least 10 characters");
  }

  if (data.urgency && !allowedUrgency.includes(data.urgency)) {
    errors.push("Urgency must be low, medium, or high");
  }

  if (isUpdate && data.status && !allowedStatus.includes(data.status)) {
    errors.push("Status must be pending, in-progress, or completed");
  }

  if (data.dateReported) {
    const reportedDate = new Date(data.dateReported);
    if (Number.isNaN(reportedDate.getTime())) {
      errors.push("Date reported is invalid");
    } else if (reportedDate.getTime() > Date.now()) {
      errors.push("Date reported cannot be in the future");
    }
  }

  const estimatedCost = Number(data.estimatedCost);
  if (data.estimatedCost !== undefined && data.estimatedCost !== "") {
    if (Number.isNaN(estimatedCost) || estimatedCost <= 0) {
      errors.push("Estimated cost must be greater than 0");
    } else if (estimatedCost > 100000) {
      errors.push("Estimated cost cannot exceed Rs. 100,000");
    }
  }

  return errors;
}
const repairRequestController = {
  // Create a new repair request
  createRepairRequest: async (req, res) => {
    try {
      const repairData = {
        ...req.body,
        createdBy: req.user._id,
      };

      const validationErrors = validateRepairPayload(repairData);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: validationErrors[0],
          errors: validationErrors,
        });
      }

      // Handle file attachments if any
      if (req.files && req.files.length > 0) {
        repairData.attachments = await uploadRepairAttachmentsToS3(req.files, req.user._id);
      }
      let isOfflineReq = isRequestFromLocalhost(req);
      repairData.isOfflineReq = isOfflineReq || false;
      const newRepairRequest = await RepairRequest.createRepairRequest(
        repairData
      );

      if (!newRepairRequest.success) {
        return res.status(400).json({
          success: false,
          message: newRepairRequest.message || "Failed to create repair request",
          data: newRepairRequest.data || {},
        });
      }

      return res.status(201).json({
        success: true,
        message: "Repair request created successfully",
        data: newRepairRequest.data,
      });
    } catch (error) {
      errorLogger.error({ err: error }, "Error creating repair request:");
      return res.status(500).json({
        success: false,
        message: "Failed to create repair request",
        error: error.message,
      });
    }
  },

  // Get all repair requests with pagination
  getAllRepairRequests: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        sort = "createdAt",
        order = "desc",
        urgency,
      } = req.query;

      // RBAC: Apply scope filter from authorize middleware
      const query = { ...(req.scopeFilter || {}) };
      if (urgency) query.urgency = urgency;

      const options = {
        skip: (parseInt(page) - 1) * parseInt(limit),
        limit: parseInt(limit),
        sort: { [sort]: order === "desc" ? -1 : 1 },
      };

      const repairRequests = await RepairRequest.getAllRepairRequests(
        query,
        options
      );
      const total = await RepairRequest.countRepairRequests(query);

      return res.status(200).json({
        success: true,
        data: { repairRequests: repairRequests },
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      errorLogger.error({ err: error }, "Error fetching repair requests:");
      return res.status(500).json({
        success: false,
        message: "Failed to fetch repair requests",
        error: error.message,
      });
    }
  },

  // Get a single repair request by ID
  getRepairRequestById: async (req, res) => {
    try {
      const { id } = req.params;
      const repairRequest = await RepairRequest.getRepairRequestById(id);

      if (!repairRequest) {
        return res.status(404).json({
          success: false,
          data: {},
          message: "Repair request not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: { repairRequest: repairRequest },
        msg: "Repair request fetched successfully",
      });
    } catch (error) {
      errorLogger.error({ err: error }, "Error fetching repair request:");
      return res.status(500).json({
        success: false,
        message: "Failed to fetch repair request",
        error: error.message,
      });
    }
  },

  // Update a repair request
  updateRepairRequest: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };
      let isOfflineReq = isRequestFromLocalhost(req);

      const validationErrors = validateRepairPayload(updateData, { isUpdate: true });
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: validationErrors[0],
          errors: validationErrors,
        });
      }

      if (updateData.existingAttachments) {
        try {
          const parsed = JSON.parse(updateData.existingAttachments);
          if (Array.isArray(parsed)) {
            updateData.attachments = parsed;
          }
        } catch (parseError) {
          // ignore invalid JSON and fall back to current attachments
        }
        delete updateData.existingAttachments;
      }

      // Handle file attachments if any
      if (req.files && req.files.length > 0) {
        const newAttachments = await uploadRepairAttachmentsToS3(req.files, req.user._id);

        // Append new attachments to existing ones
        if (!updateData.attachments) {
          const existingRequest = await RepairRequest.getRepairRequestById(id);
          updateData.attachments = [
            ...(existingRequest.attachments || []),
            ...newAttachments,
          ];
        } else {
          updateData.attachments = [
            ...updateData.attachments,
            ...newAttachments,
          ];
        }
      }

      const updatedRequest = await RepairRequest.updateRepairRequest(
        id,
        updateData
      );

      if (!updatedRequest) {
        return res.status(404).json({
          success: false,
          message: "Repair request not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Repair request updated successfully",
        data: { repairRequest: updatedRequest },
      });
    } catch (error) {
      errorLogger.error({ err: error }, "Error updating repair request:");
      return res.status(500).json({
        success: false,
        message: "Failed to update repair request",
        error: error.message,
      });
    }
  },

  // Delete a repair request
  deleteRepairRequest: async (req, res) => {
    try {
      const { id } = req.params;
      const deletedRequest = await RepairRequest.deleteRepairRequest(id);

      if (!deletedRequest) {
        return res.status(404).json({
          success: false,
          data: {},
          message: "Repair request not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: {},
        message: "Repair request deleted successfully",
      });
    } catch (error) {
      errorLogger.error({ err: error }, "Error deleting repair request:");
      return res.status(500).json({
        success: false,
        message: "Failed to delete repair request",
        error: error.message,
      });
    }
  },
  // Function for toggling repair request status
  toggleRepairRequestStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const repairRequest = await RepairRequest.getRepairRequestById(id);

      if (!repairRequest) {
        return res.status(404).json({
          success: false,
          message: "Repair request not found",
        });
      }

      const updatedRequest = await RepairRequest.updateRepairRequest(id, {
        status: status,
      });

      return res.status(200).json({
        success: true,
        message: "Repair request status updated successfully",
        data: { repairRequest: updatedRequest },
      });
    } catch (error) {
      errorLogger.error({ err: error }, "Error toggling repair request status:");
      return res.status(500).json({
        success: false,
        message: "Failed to toggle repair request status",
        error: error.message,
      });
    }
  },
  // Function for creating purchase orders
  createPurchaseOrder: async (req, res) => {
    try {
      const purchaseOrderData = {
        ...req.body,
        createdBy: req.user._id,
      };

      // Handle file attachments if any
      if (req.files && req.files.length > 0) {
        purchaseOrderData.attachments = req.files;
      }
      let isOfflineReq = isRequestFromLocalhost(req);
      purchaseOrderData.isOfflineReq = isOfflineReq || false;
      const newPurchaseOrder = await PurchaseOrder.createPurchaseOrder(
        purchaseOrderData
      );

      return res.status(201).json({
        success: true,
        message: "Purchase order created successfully",
        data: newPurchaseOrder.data,
      });
    } catch (error) {
      errorLogger.error({ err: error }, "Error creating purchase order:");
      return res.status(500).json({
        success: false,
        message: "Failed to create purchase order",
        error: error.message,
      });
    }
  },

  // Get all purchase orders with pagination
  getAllPurchaseOrders: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        sort = "createdAt",
        order = "desc",
        status,
      } = req.query;

      // RBAC: Apply scope filter from authorize middleware
      const query = { ...(req.scopeFilter || {}) };
      if (status) query.status = status;

      const options = {
        skip: (parseInt(page) - 1) * parseInt(limit),
        limit: parseInt(limit),
        sort: { [sort]: order === "desc" ? -1 : 1 },
      };

      const purchaseOrders = await PurchaseOrder.getAllPurchaseOrders(
        query,
        options
      );
      const total = await PurchaseOrder.countPurchaseOrders(query);

      return res.status(200).json({
        success: true,
        data: { purchaseOrders: purchaseOrders },
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      errorLogger.error({ err: error }, "Error fetching purchase orders:");
      return res.status(500).json({
        success: false,
        message: "Failed to fetch purchase orders",
        error: error.message,
      });
    }
  },

  // Get a single purchase order by ID
  getPurchaseOrderById: async (req, res) => {
    try {
      const { id } = req.params;
      const purchaseOrder = await PurchaseOrder.getPurchaseOrderById(id);

      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          data: {},
          message: "Purchase order not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: { purchaseOrder: purchaseOrder },
        msg: "Purchase order fetched successfully",
      });
    } catch (error) {
      errorLogger.error({ err: error }, "Error fetching purchase order:");
      return res.status(500).json({
        success: false,
        message: "Failed to fetch purchase order",
        error: error.message,
      });
    }
  },

  // Update a purchase order
  updatePurchaseOrder: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      let isOfflineReq = isRequestFromLocalhost(req);
      // Handle file attachments if any
      if (req.files && req.files.length > 0) {
        const result = await PurchaseOrder.processAttachments(
          req.files,
          req.user._id,
          isOfflineReq
        );

        if (!result.success) {
          return res.status(500).json({
            success: false,
            message: "Failed to process attachments",
            error: result.message,
          });
        }

        // Append new attachments to existing ones
        const existingOrder = await PurchaseOrder.getPurchaseOrderById(id);
        updateData.attachments = [
          ...(existingOrder.attachments || []),
          ...result.attachments,
        ];
      }

      const updatedOrder = await PurchaseOrder.updatePurchaseOrder(
        id,
        updateData
      );

      if (!updatedOrder) {
        return res.status(404).json({
          success: false,
          message: "Purchase order not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Purchase order updated successfully",
        data: { purchaseOrder: updatedOrder },
      });
    } catch (error) {
      errorLogger.error({ err: error }, "Error updating purchase order:");
      return res.status(500).json({
        success: false,
        message: "Failed to update purchase order",
        error: error.message,
      });
    }
  },

  // Delete a purchase order
  deletePurchaseOrder: async (req, res) => {
    try {
      const { id } = req.params;
      const deletedOrder = await PurchaseOrder.deletePurchaseOrder(id);

      if (!deletedOrder) {
        return res.status(404).json({
          success: false,
          data: {},
          message: "Purchase order not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: {},
        message: "Purchase order deleted successfully",
      });
    } catch (error) {
      errorLogger.error({ err: error }, "Error deleting purchase order:");
      return res.status(500).json({
        success: false,
        message: "Failed to delete purchase order",
        error: error.message,
      });
    }
  },

  // Update purchase order status
  updatePurchaseOrderStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!["pending", "in-progress", "completed"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status value",
        });
      }

      const purchaseOrder = await PurchaseOrder.getPurchaseOrderById(id);

      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: "Purchase order not found",
        });
      }

      const updatedOrder = await PurchaseOrder.updatePurchaseOrder(id, {
        status,
      });

      return res.status(200).json({
        success: true,
        message: "Purchase order status updated successfully",
        data: { purchaseOrder: updatedOrder },
      });
    } catch (error) {
      errorLogger.error({ err: error }, "Error updating purchase order status:");
      return res.status(500).json({
        success: false,
        message: "Failed to update purchase order status",
        error: error.message,
      });
    }
  },
  getPurchaseManagerOverview: async (req, res) => {
    try {
      const overviewData = await PurchaseOrder.getPurchaseManagerOverview(
        req.user._id
      );

      return res.status(200).json({
        success: true,
        data: overviewData,
        message: "Purchase manager overview fetched successfully",
      });
    } catch (error) {
      errorLogger.error({ err: error }, "Error fetching purchase manager overview:");
      return res.status(500).json({
        success: false,
        message: "Failed to fetch purchase manager overview",
        error: error.message,
      });
    }
  },
};

module.exports = repairRequestController;

