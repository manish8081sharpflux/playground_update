const { logger, errorLogger } = require("../config/pino-config");
const MedicalRecord = require("../models/medical");
const User = require("../models/user");
const { deleteFileFromS3 } = require("../services/aws/s3");

// Delete specific medical history item
exports.deleteMedicalHistoryItem = async (req, res) => {
  try {
    const { userId, medicalHistoryId } = req.params;
    
    if (!userId || !medicalHistoryId) {
      return res.status(400).json({
        success: false,
        message: "User ID and medical history ID are required"
      });
    }
    
    // Find the medical record for this user
    const medicalRecord = await MedicalRecord.findOne({ studentId: userId });
    
    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message: "Medical record not found for this user"
      });
    }
    
    // Find the medical history item to delete
    const historyItemIndex = medicalRecord.medicalHistory.findIndex(
      item => item._id.toString() === medicalHistoryId
    );
    
    if (historyItemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Medical history item not found"
      });
    }
    
    const historyItem = medicalRecord.medicalHistory[historyItemIndex];
    
    // Delete associated files from S3
    const filesToDelete = [];
    
    // Collect prescription URLs
    if (historyItem.prescriptions && historyItem.prescriptions.length > 0) {
      historyItem.prescriptions.forEach(prescription => {
        if (prescription.url) {
          filesToDelete.push(prescription.url);
        }
      });
    }
    
    // Collect other attachment URLs
    if (historyItem.otherAttachments && historyItem.otherAttachments.length > 0) {
      historyItem.otherAttachments.forEach(attachment => {
        if (attachment.url) {
          filesToDelete.push(attachment.url);
        }
      });
    }
    
    // Delete files from S3
    for (const fileUrl of filesToDelete) {
      try {
        // Extract key from S3 URL
        const urlParts = fileUrl.split('/');
        const key = urlParts[urlParts.length - 1];
        await deleteFileFromS3(process.env.AWS_S3_BUCKET_NAME_MEDICAL_RECORDS, key);
      } catch (error) {
        errorLogger.error({ err: error }, `Error deleting file from S3: ${fileUrl}`);
        // Continue with deletion even if S3 deletion fails
      }
    }
    
    // Remove the medical history item from the array
    medicalRecord.medicalHistory.splice(historyItemIndex, 1);
    
    // Save the updated medical record
    await medicalRecord.save();
    
    logger.info({
      clientIP: req.socket.remoteAddress,
      method: req.method,
      api: req.originalUrl,
      userId,
      medicalHistoryId
    }, `Successfully deleted medical history item`);
    
    return res.status(200).json({
      success: true,
      message: "Medical history item deleted successfully",
      data: medicalRecord
    });
    
  } catch (error) {
    errorLogger.error({
      clientIP: req.socket.remoteAddress,
      method: req.method,
      api: req.originalUrl,
      error: error.message
    }, `Error deleting medical history item`);
    
    return res.status(500).json({
      success: false,
      message: "Error deleting medical history item",
      error: error.message
    });
  }
};

// Update specific medical history item
exports.updateMedicalHistoryItem = async (req, res) => {
  try {
    const { userId, medicalHistoryId } = req.params;
    const updateData = req.body;
    
    if (!userId || !medicalHistoryId) {
      return res.status(400).json({
        success: false,
        message: "User ID and medical history ID are required"
      });
    }
    
    // Find the medical record for this user
    const medicalRecord = await MedicalRecord.findOne({ studentId: userId });
    
    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message: "Medical record not found for this user"
      });
    }
    
    // Find the medical history item to update
    const historyItemIndex = medicalRecord.medicalHistory.findIndex(
      item => item._id.toString() === medicalHistoryId
    );
    
    if (historyItemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Medical history item not found"
      });
    }
    
    // Update the medical history item
    Object.assign(medicalRecord.medicalHistory[historyItemIndex], updateData);
    
    // Save the updated medical record
    await medicalRecord.save();
    
    logger.info({
      clientIP: req.socket.remoteAddress,
      method: req.method,
      api: req.originalUrl,
      userId,
      medicalHistoryId
    }, `Successfully updated medical history item`);
    
    return res.status(200).json({
      success: true,
      message: "Medical history item updated successfully",
      data: medicalRecord
    });
    
  } catch (error) {
    errorLogger.error({
      clientIP: req.socket.remoteAddress,
      method: req.method,
      api: req.originalUrl,
      error: error.message
    }, `Error updating medical history item`);
    
    return res.status(500).json({
      success: false,
      message: "Error updating medical history item",
      error: error.message
    });
  }
};