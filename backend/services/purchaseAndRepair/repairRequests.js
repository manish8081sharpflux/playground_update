const repairRequestsDA = require("../../data-access/repairRequests");
const { uploadFileToS3 } = require("../aws/s3");
const { cleanupLocalFile } = require("../../utils/fileCleanup");

class RepairRequest {
  constructor(obj) {
    this.balagruhaId =
      obj.balagruhaId || obj.balagruhaID || obj.balagruha || null;
    this.issueName = obj.issueName || "";
    this.description = obj.description || "";
    this.dateReported = obj.dateReported || null;
    this.urgency = obj.urgency || "";
    this.estimatedCost = obj.estimatedCost || 0;
    this.attachments = obj.attachments || [];
    this.repairDetails = obj.repairDetails || "";
    this.createdBy = obj.createdBy || null;
  }

  toJSON() {
    return {
      balagruhaId: this.balagruhaId,
      issueName: this.issueName,
      description: this.description,
      dateReported: this.dateReported,
      urgency: this.urgency,
      estimatedCost: this.estimatedCost,
      attachments: this.attachments,
      repairDetails: this.repairDetails,
      createdBy: this.createdBy,
    };
  }

  static async createRepairRequest(repairRequestData) {
    let isOfflineReq = repairRequestData.isOfflineReq || false;
    let attachments = repairRequestData.attachments || [];

    // Only process attachments if they exist and have length
    if (attachments && attachments.length > 0) {
      // upload the attachment if existing
      for (let i = 0; i < attachments.length; i++) {
        let file = attachments[i];

        if (file.fileUrl || file.url) {
          attachments[i] = {
            fileName: file.fileName || file.name || "Attachment",
            fileUrl: file.fileUrl || file.url,
            s3Key: file.s3Key,
            fileType: file.fileType || file.mimetype,
            uploadedBy: file.uploadedBy || repairRequestData.createdBy,
            uploadedAt: file.uploadedAt || new Date(),
          };
          continue;
        }

        let fileName = file.filename;
        if (!isOfflineReq) {
          try {
            let result = await uploadFileToS3(
              file.path,
              process.env.AWS_S3_FOLDER_REPAIR_REQUEST_ATTACHMENTS,
              fileName
            );
            if (result.success) {
              let attachmentObj = {
                fileName: file.originalname || fileName,
                fileUrl: result.url,
                s3Key: result.key,
                fileType: result.contentType || file.mimetype,
                uploadedBy: repairRequestData.createdBy,
                uploadedAt: new Date(),
              };
              attachments[i] = attachmentObj;
            } else {
              return {
                success: false,
                data: {},
                message: "Failed to upload attachments.",
              };
            }
          } finally {
            cleanupLocalFile(file.path, file.filename);
          }
        } else {
          return {
            success: false,
            data: {},
            message: "S3 upload is required for attachments.",
          };
        }
      }
    }

    const newRepairRequest = new RepairRequest(repairRequestData);
    let result = await repairRequestsDA.create(newRepairRequest.toJSON());
    if (result) {
      return {
        success: true,
        data: { repairRequest: result },
        message: "Repair request created successfully",
      };
    } else {
      return {
        success: false,
        data: {},
        message: "Failed to create repair request",
      };
    }
  }

  static async getAllRepairRequests(query = {}, options = {}) {
    return await repairRequestsDA.findAll(query, options);
  }

  static async getRepairRequestById(id) {
    return await repairRequestsDA.findById(id);
  }

  static async updateRepairRequest(id, updateData) {
    return await repairRequestsDA.update(id, updateData);
  }

  static async deleteRepairRequest(id) {
    return await repairRequestsDA.delete(id);
  }

  // Add the missing countRepairRequests function
  static async countRepairRequests(query = {}) {
    return await repairRequestsDA.count(query);
  }
}

module.exports = RepairRequest;

