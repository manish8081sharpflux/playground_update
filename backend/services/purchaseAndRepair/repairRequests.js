const repairRequestsDA = require("../../data-access/repairRequests");
const { getUploadedFilesFullPath } = require("../../utils/helper");
const { uploadFileToS3 } = require("../aws/s3");

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
        let fileName = file.filename;
        let fileFullPath = getUploadedFilesFullPath(fileName);
        if (!isOfflineReq) {
          let result = await uploadFileToS3(
            file.path,
            process.env.AWS_S3_FOLDER_REPAIR_REQUEST_ATTACHMENTS,
            fileName
          );
          if (result.success) {
            // replace the /upload from the file name to empty string
            let attachmentObj = {
              fileName: fileName,
              fileUrl: result.url,
              fileType: result.contentType,
              uploadedBy: repairRequestData.createdBy,
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
            uploadedBy: repairRequestData.createdBy,
          };
          attachments[i] = attachmentObj;
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
