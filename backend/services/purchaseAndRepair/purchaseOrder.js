const { uploadFileToS3 } = require("../aws/s3");
const purchaseOrdersDA = require("../../data-access/purchaseOrder");
const {
  findAllPendingAndInProgressCount,
  findCompletedThisWeekCount,
  getRecentRepairRequests,
} = require("../../data-access/repairRequests");
const { getUploadedFilesFullPath } = require("../../utils/helper");
const ShopItem = require("../../models/shopItem");
const User = require("../../models/user");

class PurchaseOrder {
  constructor(obj) {
    this.balagruhaId =
      obj.balagruhaId || obj.balagruhaID || obj.balagruha || null;
    this.machineDetails = obj.machineDetails || "";
    this.vendorDetails = obj.vendorDetails || "";
    this.costEstimate = obj.costEstimate || 0;
    this.requiredParts = obj.requiredParts || "";
    this.status = obj.status || "pending";
    this.attachments = obj.attachments || [];
    this.createdBy = obj.createdBy || null;
  }
  toJSON() {
    return {
      balagruhaId: this.balagruhaId,
      machineDetails: this.machineDetails,
      vendorDetails: this.vendorDetails,
      costEstimate: this.costEstimate,
      requiredParts: this.requiredParts,
      status: this.status,
      attachments: this.attachments,
      createdBy: this.createdBy,
    };
  }

  // Process file attachments and upload to S3
  static async processAttachments(files, uploadedBy, isOfflineReq = false) {
    try {
      let processedAttachments = [];

      for (let i = 0; i < files.length; i++) {
        let file = files[i];
        let fileName = file.filename;
        let fileFullPath = getUploadedFilesFullPath(fileName);

        if (!isOfflineReq) {
          let result = await uploadFileToS3(
            file.path,
            process.env.AWS_S3_BUCKET_NAME_PURCHASE_ORDER_ATTACHMENTS,
            fileName
          );

          if (result.success) {
            let attachmentObj = {
              fileName: fileName,
              fileUrl: fileFullPath,
              fileType: result.contentType,
              uploadedBy: uploadedBy,
            };
            processedAttachments.push(attachmentObj);
          } else {
            return { success: false, message: "Failed to upload attachments." };
          }
        } else {
          let attachmentObj = {
            fileName: fileName,
            fileUrl: file.path,
            fileType: file.mimetype,
            uploadedBy: uploadedBy,
          };
          processedAttachments.push(attachmentObj);
        }
      }

      return { success: true, attachments: processedAttachments };
    } catch (error) {
      console.error("Error processing attachments:", error);
      return { success: false, message: error.message };
    }
  }

  // Create purchase order
  static async createPurchaseOrder(purchaseOrderData) {
    let isOfflineReq = purchaseOrderData.isOfflineReq || false;
    let attachments = purchaseOrderData.attachments || [];

    // Only process attachments if they exist and have length
    if (attachments && attachments.length > 0) {
      // upload the attachment if existing
      for (let i = 0; i < attachments.length; i++) {
        let file = attachments[i];
        let fileName = file.filename;
        let fileFullPath = getUploadedFilesFullPath(fileName);

        if (!isOfflineReq) {
          let result = await uploadFileToS3(
            file.path,
            process.env.AWS_S3_BUCKET_NAME_PURCHASE_ORDER_ATTACHMENTS,
            fileName
          );
          if (result.success) {
            // replace the /upload from the file name to empty string
            let attachmentObj = {
              fileName: fileName,
              fileUrl: result.url,
              fileType: result.contentType,
              uploadedBy: purchaseOrderData.createdBy,
            };
            attachments[i] = attachmentObj;
          } else {
            return {
              success: false,
              data: {},
              message: "Failed to upload attachments.",
            };
          }
        } else {
          let attachmentObj = {
            fileName: fileName,
            fileUrl: fileFullPath,
            fileType: file.mimetype,
            uploadedBy: purchaseOrderData.createdBy,
          };
          attachments[i] = attachmentObj;
        }
      }
    }

    const newPurchaseOrder = new PurchaseOrder(purchaseOrderData);
    let result = await purchaseOrdersDA.create(newPurchaseOrder.toJSON());
    if (result) {
      return {
        success: true,
        data: { purchaseOrder: result },
        message: "Purchase order created successfully",
      };
    } else {
      return {
        success: false,
        data: {},
        message: "Failed to create purchase order",
      };
    }
  }

  // Get all purchase orders
  static async getAllPurchaseOrders(query = {}, options = {}) {
    return await purchaseOrdersDA.findAll(query, options);
  }

  // Get purchase order by ID
  static async getPurchaseOrderById(id) {
    return await purchaseOrdersDA.findById(id);
  }

  // Update purchase order
  static async updatePurchaseOrder(id, updateData) {
    return await purchaseOrdersDA.update(id, updateData);
  }

  // Delete purchase order
  static async deletePurchaseOrder(id) {
    return await purchaseOrdersDA.delete(id);
  }

  // Count purchase orders
  static async countPurchaseOrders(query = {}) {
    return await purchaseOrdersDA.count(query);
  }

  // Overview details - Updated to include low stock count
  static async getPurchaseManagerOverview(userId, options = {}) {
    try {
      // Get user context for scoping (assigned balagruhas)
      const user = await User.findById(userId).select('role balagruhaIds');
      const isPm = user?.role === 'purchase-manager';
      const balagruhaIds = user?.balagruhaIds || [];

      // Calculate Low Stock Count
      // Condition: stock <= lowStockThreshold (includes out of stock)
      const lowStockQuery = {
        isActive: true,
        $or: [
          { stock: 0 },
          { $expr: { $lte: ["$stock", "$lowStockThreshold"] } }
        ]
      };

      // Scope to assigned balagruhas if PM (including shop-wide/STOCK items)
      if (isPm) {
        lowStockQuery.$and = [
          {
            $or: [
              { balagruhaId: { $in: balagruhaIds } },
              { balagruhaId: null },
              { balagruhaId: { $exists: false } }
            ]
          }
        ];
      }

      const lowStockCount = await ShopItem.countDocuments(lowStockQuery);

      // get active repair counts.
      let activeRepairs = await findAllPendingAndInProgressCount();
      // pending orders
      let pendingPurchaseOrders = await purchaseOrdersDA.countPending();
      // completed on this week
      let completedThisWeek = await findCompletedThisWeekCount();
      // budget used
      // get recent last 10 purchase orders
      let recentPurchaseOrders = await purchaseOrdersDA.getRecentPurchaseOrders(
        10
      );
      let recentRepairRequests = await getRecentRepairRequests(10);
      // merge the two arrays and sort by the createdAt key
      let mergedData = recentPurchaseOrders.concat(recentRepairRequests);
      mergedData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      // get the last 10 records
      mergedData = mergedData.slice(0, 10);

      return {
        activeRepairs: activeRepairs,
        pendingOrders: pendingPurchaseOrders,
        completedThisWeek: completedThisWeek,
        lowStockItems: lowStockCount, // New field for dashboard card
        budgetUsed: 1000 || 0,
        recentActivities: mergedData || [],
      };
    } catch (error) {
      console.error("Error getting purchase manager overview:", error);
      throw error;
    }
  }
}


module.exports = PurchaseOrder;
