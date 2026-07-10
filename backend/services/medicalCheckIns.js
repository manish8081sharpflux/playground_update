const { default: mongoose } = require("mongoose");
const { errorLogger } = require("../config/pino-config");
const {
  createMedicalCheckIn,
  getAllMedicalCheckIns,
  getMedicalCheckInById,
  getMedicalCheckInsByStudentId,
  updateMedicalCheckIn,
  deleteMedicalCheckIn,
  updateMedicalCheckInAttachments,
  deleteAttachment,
} = require("../data-access/medicalCheckIns");
const { uploadFileToS3 } = require("./aws/s3");
const {
  getFileContentType,
  getUploadedFilesFullPath,
} = require("../utils/helper");
const User = require("../models/user");
const {
  getStudentMedicalCheckInsByBalagruhaIds,
} = require("../data-access/User");

class MedicalCheckIns {
  constructor(obj) {
    this.studentId = obj.studentId || null;
    // Sprint6-Story-3-AC1: Temperature is optional, use null for empty values
    this.temperature = obj.temperature && obj.temperature !== "" ? Number(obj.temperature) : null;
    this.date = obj.date || null;
    // Sprint6-Story-3-BugFix: Ensure healthStatus is lowercase to match enum validation
    this.healthStatus = obj.healthStatus ? obj.healthStatus.toLowerCase() : "normal";
    this.notes = obj.notes || "";
    this.attachments = obj.attachments || [];
    this.createdBy = obj.createdBy || null;
    // New fields
    this.symptoms = obj.symptoms || [];
    this.customSymptom = obj.customSymptom || "";
    // Sprint6-Story-3: Support both old and new formats
    this.doctorVisit = obj.doctorVisit || null;
    this.followUp = obj.followUp || null;
    this.doctorVisits = obj.doctorVisits || [];
    this.followUps = obj.followUps || [];
  }

  toJSON() {
    return {
      studentId: this.studentId,
      temperature: this.temperature,
      date: this.date,
      healthStatus: this.healthStatus,
      notes: this.notes,
      attachments: this.attachments,
      createdBy: this.createdBy,
      symptoms: this.symptoms,
      customSymptom: this.customSymptom,
      // Sprint6-Story-3: Support both old and new formats
      doctorVisit: this.doctorVisit,
      followUp: this.followUp,
      doctorVisits: this.doctorVisits,
      followUps: this.followUps,
    };
  }

  static async createMedicalCheckIn(payload, fileGroups) {
    try {
      const {
        studentId,
        temperature,
        date,
        healthStatus,
        notes,
        createdBy,
        symptoms,
        customSymptom,
        doctorVisit,
        followUp,
        // Sprint6-Story-3-AC5-AC6: New array fields
        doctorVisits,
        followUps,
      } = payload;

      // Sprint6-Story-3-AC1: Temperature is optional
      if (!studentId || !date || !createdBy) {
        return {
          success: false,
          data: {},
          message: "Student ID, date, and creator are required.",
        };
      }
      if (
        !mongoose.Types.ObjectId.isValid(studentId) ||
        !mongoose.Types.ObjectId.isValid(createdBy)
      ) {
        return {
          success: false,
          data: {},
          message: "Invalid student or createdBy ID.",
        };
      }
      const creatorExists = await User.findById(createdBy);
      if (!creatorExists) {
        return {
          success: false,
          data: {},
          message: "Student or creator not found.",
        };
      }

      // Process general attachments
      let processedAttachments = [];
      if (fileGroups?.attachments && fileGroups.attachments.length > 0) {
        for (let i = 0; i < fileGroups.attachments.length; i++) {
          let file = fileGroups.attachments[i];
          let fileName = file.replace("uploads/", "");
          let result = await uploadFileToS3(
            file,
            process.env.AWS_S3_FOLDER_MEDICAL_RECORDS,
            fileName
          );
          if (result.success) {
            let attachmentObj = {
              fileName: fileName,
              fileUrl: result.url,
              fileType: result.contentType,
              fileSize: result.size,
              uploadedBy: createdBy,
            };
            processedAttachments.push(attachmentObj);
          } else {
            return {
              success: false,
              data: {},
              message: "Failed to upload attachments.",
            };
          }
        }
      }

      // Process prescription files
      let processedPrescriptions = [];
      if (fileGroups?.prescriptions && fileGroups.prescriptions.length > 0) {
        for (let i = 0; i < fileGroups.prescriptions.length; i++) {
          let file = fileGroups.prescriptions[i];
          let fileName = file.replace("uploads/", "");
          let result = await uploadFileToS3(
            file,
            process.env.AWS_S3_FOLDER_MEDICAL_RECORDS,
            fileName
          );
          if (result.success) {
            let prescriptionObj = {
              fileName: fileName,
              fileUrl: result.url,
              fileType: result.contentType,
              fileSize: result.size,
              uploadedBy: createdBy,
            };
            processedPrescriptions.push(prescriptionObj);
          } else {
            return {
              success: false,
              data: {},
              message: "Failed to upload prescription files.",
            };
          }
        }
      }

      // Process test result files
      let processedTestResults = [];
      if (fileGroups?.testResults && fileGroups.testResults.length > 0) {
        for (let i = 0; i < fileGroups.testResults.length; i++) {
          let file = fileGroups.testResults[i];
          let fileName = file.replace("uploads/", "");
          let result = await uploadFileToS3(
            file,
            process.env.AWS_S3_FOLDER_MEDICAL_RECORDS,
            fileName
          );
          if (result.success) {
            let testResultObj = {
              fileName: fileName,
              fileUrl: result.url,
              fileType: result.contentType,
              fileSize: result.size,
              uploadedBy: createdBy,
            };
            processedTestResults.push(testResultObj);
          } else {
            return {
              success: false,
              data: {},
              message: "Failed to upload test result files.",
            };
          }
        }
      }

      // Sprint6-Story-3-AC7: Process follow-up description files
      let processedFollowUpDescriptions = [];
      if (fileGroups?.followUpDescriptions && fileGroups.followUpDescriptions.length > 0) {
        for (let i = 0; i < fileGroups.followUpDescriptions.length; i++) {
          let file = fileGroups.followUpDescriptions[i];
          let fileName = file.replace("uploads/", "");
          let result = await uploadFileToS3(
            file,
            process.env.AWS_S3_FOLDER_MEDICAL_RECORDS,
            fileName
          );
          if (result.success) {
            let descriptionObj = {
              fileName: fileName,
              fileUrl: result.url,
              fileType: result.contentType,
              fileSize: result.size,
              uploadedBy: createdBy,
            };
            processedFollowUpDescriptions.push(descriptionObj);
          } else {
            return {
              success: false,
              data: {},
              message: "Failed to upload follow-up description files.",
            };
          }
        }
      }

      // Sprint6-Story-3-AC7: Process follow-up test result files
      let processedFollowUpTestResults = [];
      if (fileGroups?.followUpTestResults && fileGroups.followUpTestResults.length > 0) {
        for (let i = 0; i < fileGroups.followUpTestResults.length; i++) {
          let file = fileGroups.followUpTestResults[i];
          let fileName = file.replace("uploads/", "");
          let result = await uploadFileToS3(
            file,
            process.env.AWS_S3_FOLDER_MEDICAL_RECORDS,
            fileName
          );
          if (result.success) {
            let testResultObj = {
              fileName: fileName,
              fileUrl: result.url,
              fileType: result.contentType,
              fileSize: result.size,
              uploadedBy: createdBy,
            };
            processedFollowUpTestResults.push(testResultObj);
          } else {
            return {
              success: false,
              data: {},
              message: "Failed to upload follow-up test result files.",
            };
          }
        }
      }

      // Sprint6-Story-3-AC5: Handle both old and new doctor visit formats
      let doctorVisitData = null;
      let doctorVisitsData = [];

      if (doctorVisits && Array.isArray(doctorVisits) && doctorVisits.length > 0) {
        // New format: multiple visits.
        // Uploaded prescription/test files have no per-visit association in the
        // current form payload, so we attach them all to the most recent visit
        // (last entry). Otherwise the files upload to S3 but never make it into
        // any visit subdocument and become unviewable.
        doctorVisitsData = doctorVisits.map(visit => ({
          ...visit,
          prescriptionFiles: visit.prescriptionFiles || [],
          testResultFiles: visit.testResultFiles || [],
        }));
        const lastVisit = doctorVisitsData[doctorVisitsData.length - 1];
        if (processedPrescriptions.length > 0) {
          lastVisit.prescriptionFiles = [
            ...(lastVisit.prescriptionFiles || []),
            ...processedPrescriptions,
          ];
        }
        if (processedTestResults.length > 0) {
          lastVisit.testResultFiles = [
            ...(lastVisit.testResultFiles || []),
            ...processedTestResults,
          ];
        }
      } else if (doctorVisit) {
        // Old format: single visit (backward compatibility)
        doctorVisitData = {
          ...doctorVisit,
          prescriptionFiles: processedPrescriptions,
          testResultFiles: processedTestResults,
        };
      }

      // Sprint6-Story-3-AC6-AC7: Handle both old and new follow-up formats
      let followUpData = null;
      let followUpsData = [];

      if (followUps && Array.isArray(followUps) && followUps.length > 0) {
        // New format: multiple follow-ups. Same handling as doctorVisits — attach
        // uploaded files to the most recent entry so they don't vanish.
        followUpsData = followUps.map(followUp => ({
          ...followUp,
          descriptionFiles: followUp.descriptionFiles || [],
          testResultFiles: followUp.testResultFiles || [],
        }));
        const lastFollowUp = followUpsData[followUpsData.length - 1];
        if (processedFollowUpDescriptions.length > 0) {
          lastFollowUp.descriptionFiles = [
            ...(lastFollowUp.descriptionFiles || []),
            ...processedFollowUpDescriptions,
          ];
        }
        if (processedFollowUpTestResults.length > 0) {
          lastFollowUp.testResultFiles = [
            ...(lastFollowUp.testResultFiles || []),
            ...processedFollowUpTestResults,
          ];
        }
      } else if (followUp) {
        // Old format: single follow-up (backward compatibility)
        followUpData = followUp;
      }

      const medicalCheckIn = new MedicalCheckIns({
        studentId,
        temperature,
        date: new Date(date),
        healthStatus: healthStatus || "Normal",
        notes,
        attachments: processedAttachments,
        createdBy,
        symptoms: symptoms || [],
        customSymptom: customSymptom || "",
        // Sprint6-Story-3: Support both old and new formats
        doctorVisit: doctorVisitData,
        followUp: followUpData,
        doctorVisits: doctorVisitsData,
        followUps: followUpsData,
      });

      const result = await createMedicalCheckIn(medicalCheckIn);
      if (result && result.success) {
        return {
          success: true,
          data: { medicalCheckIn: result.data[0] },
          message: "Medical check-in created successfully",
        };
      } else {
        return {
          success: false,
          data: {},
          message: "Failed to create medical check-in",
        };
      }
    } catch (error) {
      errorLogger.error(
        { data: { error: error } },
        `Error occurred during creating medical check-in: ${error.message}`
      );
      throw error;
    }
  }

  static async getAllMedicalCheckIns(filters = {}, pagination = {}) {
    try {
      const result = await getAllMedicalCheckIns(filters, pagination);
      if (result.success) {
        return {
          success: true,
          data: {
            medicalCheckIns: result.data,
            count: result.count,
            totalPages: result.totalPages,
            currentPage: result.currentPage,
          },
          message: "Fetched all medical check-ins successfully",
        };
      } else {
        return {
          success: false,
          data: {},
          message: "Failed to fetch medical check-ins",
        };
      }
    } catch (error) {
      errorLogger.error(
        { data: { error: error } },
        `Error occurred during fetching medical check-ins: ${error.message}`
      );
      throw error;
    }
  }

  static async getMedicalCheckInsByStudentId(studentId, pagination = {}) {
    try {
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return { success: false, data: {}, message: "Invalid student ID." };
      }
      const result = await getMedicalCheckInsByStudentId(studentId, pagination);
      if (result.success) {
        return {
          success: true,
          data: {
            medicalCheckIns: result.data,
            count: result.count,
            totalPages: result.totalPages,
            currentPage: result.currentPage,
          },
          message: "Fetched student's medical check-ins successfully",
        };
      } else {
        return {
          success: false,
          data: {},
          message: "Failed to fetch student's medical check-ins",
        };
      }
    } catch (error) {
      errorLogger.error(
        { data: { error: error } },
        `Error occurred during fetching student's medical check-ins: ${error.message}`
      );
      throw error;
    }
  }

  static async getMedicalCheckInById(checkInId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(checkInId)) {
        return { success: false, data: {}, message: "Invalid check-in ID." };
      }
      const result = await getMedicalCheckInById(checkInId);
      if (result.success && result.data) {
        return {
          success: true,
          data: { medicalCheckIn: result.data },
          message: "Fetched medical check-in successfully",
        };
      } else {
        return {
          success: false,
          data: {},
          message: "Failed to fetch medical check-in or not found",
        };
      }
    } catch (error) {
      errorLogger.error(
        { data: { error: error } },
        `Error occurred during fetching medical check-in: ${error.message}`
      );
      throw error;
    }
  }

  static async updateMedicalCheckIn(checkInId, payload) {
    try {
      if (!mongoose.Types.ObjectId.isValid(checkInId)) {
        return { success: false, data: {}, message: "Invalid check-in ID." };
      }
      const checkInExists = await getMedicalCheckInById(checkInId);
      if (!checkInExists.success || !checkInExists.data) {
        return {
          success: false,
          data: {},
          message: "Medical check-in not found.",
        };
      }
      const result = await updateMedicalCheckIn(checkInId, payload);
      if (result.success) {
        return {
          success: true,
          data: { medicalCheckIn: result.data },
          message: "Updated medical check-in successfully",
        };
      } else {
        return {
          success: false,
          data: {},
          message: "Failed to update medical check-in",
        };
      }
    } catch (error) {
      errorLogger.error(
        { data: { error: error } },
        `Error occurred during updating medical check-in: ${error.message}`
      );
      throw error;
    }
  }

  static async deleteMedicalCheckIn(checkInId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(checkInId)) {
        return { success: false, data: {}, message: "Invalid check-in ID." };
      }
      const checkInExists = await getMedicalCheckInById(checkInId);
      if (!checkInExists.success || !checkInExists.data) {
        return {
          success: false,
          data: {},
          message: "Medical check-in not found.",
        };
      }
      const result = await deleteMedicalCheckIn(checkInId);
      if (result.success) {
        return {
          success: true,
          data: { medicalCheckIn: result.data },
          message: "Deleted medical check-in successfully",
        };
      } else {
        return {
          success: false,
          data: {},
          message: "Failed to delete medical check-in",
        };
      }
    } catch (error) {
      errorLogger.error(
        { data: { error: error } },
        `Error occurred during deleting medical check-in: ${error.message}`
      );
      throw error;
    }
  }

  static async addOrUpdateAttachments(checkInId, fileGroups, createdById) {
    try {
      if (
        !mongoose.Types.ObjectId.isValid(checkInId) ||
        !mongoose.Types.ObjectId.isValid(createdById)
      ) {
        return {
          success: false,
          data: {},
          message: "Invalid check-in ID or creator ID.",
        };
      }
      const checkInExists = await getMedicalCheckInById(checkInId);
      if (!checkInExists.success || !checkInExists.data) {
        return {
          success: false,
          data: {},
          message: "Medical check-in not found.",
        };
      }

      // Process general attachments
      let processedAttachments = checkInExists.data.attachments || [];
      if (fileGroups.attachments && fileGroups.attachments.length > 0) {
        for (let i = 0; i < fileGroups.attachments.length; i++) {
          let file = fileGroups.attachments[i];
          let fileName = file.replace("uploads/", "");
          let result = await uploadFileToS3(
            file,
            process.env.AWS_S3_FOLDER_MEDICAL_ATTACHMENTS,
            fileName
          );
          if (result.success) {
            let attachmentObj = {
              fileName: fileName,
              fileUrl: result.url,
              fileType: result.contentType,
              fileSize: result.size,
              uploadedBy: createdById,
            };
            processedAttachments.push(attachmentObj);
          } else {
            return {
              success: false,
              data: {},
              message: "Failed to upload attachments.",
            };
          }
        }
      }

      // Upload prescription files to S3 (we'll attach them to the right place below)
      let newPrescriptions = [];
      if (fileGroups.prescriptions && fileGroups.prescriptions.length > 0) {
        for (let i = 0; i < fileGroups.prescriptions.length; i++) {
          let file = fileGroups.prescriptions[i];
          let fileName = file.replace("uploads/", "");
          let result = await uploadFileToS3(
            file,
            process.env.AWS_S3_FOLDER_MEDICAL_RECORDS,
            fileName
          );
          if (result.success) {
            newPrescriptions.push({
              fileName,
              fileUrl: result.url,
              fileType: result.contentType,
              fileSize: result.size,
              uploadedBy: createdById,
            });
          }
        }
      }

      // Upload test result files to S3
      let newTestResults = [];
      if (fileGroups.testResults && fileGroups.testResults.length > 0) {
        for (let i = 0; i < fileGroups.testResults.length; i++) {
          let file = fileGroups.testResults[i];
          let fileName = file.replace("uploads/", "");
          let result = await uploadFileToS3(
            file,
            process.env.AWS_S3_FOLDER_MEDICAL_RECORDS,
            fileName
          );
          if (result.success) {
            newTestResults.push({
              fileName,
              fileUrl: result.url,
              fileType: result.contentType,
              fileSize: result.size,
              uploadedBy: createdById,
            });
          }
        }
      }

      // Decide where to write files: new-format doctorVisits[] if present,
      // otherwise legacy doctorVisit (back-compat). When using new format,
      // append uploads to the most recent visit — matches the create flow.
      const existingDoctorVisits = Array.isArray(checkInExists.data.doctorVisits)
        ? checkInExists.data.doctorVisits
        : [];
      const useNewFormat = existingDoctorVisits.length > 0;

      const updateData = { attachments: processedAttachments };

      if (useNewFormat) {
        const updatedVisits = existingDoctorVisits.map((v, idx) => {
          if (idx !== existingDoctorVisits.length - 1) return v;
          return {
            ...v,
            prescriptionFiles: [...(v.prescriptionFiles || []), ...newPrescriptions],
            testResultFiles: [...(v.testResultFiles || []), ...newTestResults],
          };
        });
        updateData.doctorVisits = updatedVisits;
      } else {
        // Legacy single-visit fallback
        const legacyDoctorVisit = checkInExists.data.doctorVisit || {};
        updateData.doctorVisit = {
          doctorName: legacyDoctorVisit.doctorName || "",
          hospitalName: legacyDoctorVisit.hospitalName || "",
          visitDate: legacyDoctorVisit.visitDate || undefined,
          testDetails: legacyDoctorVisit.testDetails || "",
          conclusion: legacyDoctorVisit.conclusion || "",
          prescriptionFiles: [
            ...(legacyDoctorVisit.prescriptionFiles || []),
            ...newPrescriptions,
          ],
          testResultFiles: [
            ...(legacyDoctorVisit.testResultFiles || []),
            ...newTestResults,
          ],
        };
      }

      const result = await updateMedicalCheckInAttachments(
        checkInId,
        updateData
      );
      if (result.success) {
        return {
          success: true,
          data: { medicalCheckIn: result.data },
          message: "Updated attachments successfully",
        };
      } else {
        return {
          success: false,
          data: {},
          message: "Failed to update attachments",
        };
      }
    } catch (error) {
      errorLogger.error(
        { data: { error: error } },
        `Error occurred during adding/updating attachments: ${error.message}`
      );
      throw error;
    }
  }

  static async deleteAttachment(checkInId, attachmentId) {
    try {
      if (
        !mongoose.Types.ObjectId.isValid(checkInId) ||
        !mongoose.Types.ObjectId.isValid(attachmentId)
      ) {
        return {
          success: false,
          data: {},
          message: "Invalid check-in ID or attachment ID.",
        };
      }
      const checkInExists = await getMedicalCheckInById(checkInId);
      if (!checkInExists.success || !checkInExists.data) {
        return {
          success: false,
          data: {},
          message: "Medical check-in not found.",
        };
      }
      const result = await deleteAttachment(checkInId, attachmentId);
      if (result.success) {
        return {
          success: true,
          data: { medicalCheckIn: result.data },
          message: "Deleted attachment successfully",
        };
      } else {
        return {
          success: false,
          data: {},
          message: "Failed to delete attachment",
        };
      }
    } catch (error) {
      errorLogger.error(
        { data: { error: error } },
        `Error occurred during deleting attachment: ${error.message}`
      );
      throw error;
    }
  }

  static async getMedicalCheckInsByBalagruhaIds(balagruhaIds, options = {}) {
    try {
      const isEmpty = !balagruhaIds || !Array.isArray(balagruhaIds) || balagruhaIds.length === 0;
      if (isEmpty) {
        if (options.scopeApplied) {
          // RBAC narrowed the caller to zero balagruhas — honor that, do not widen.
          return {
            success: true,
            data: { medicalCheckIns: [] },
            message: "No balagruhas in scope for this user",
          };
        }
        // No scope and no IDs supplied (admin path): default to all balagruhas.
        const Balagruha = require("../models/balagruha");
        balagruhaIds = await Balagruha.find({}).select("_id").lean();
        balagruhaIds = balagruhaIds.map((item) => item._id.toString());
      }
      const result = await getStudentMedicalCheckInsByBalagruhaIds({
        balagruhaIds,
        coachId: options.coachId || null,
      });
      if (result.success) {
        // Data structure changed - now returns flat array of medical check-ins with student info
        return {
          success: true,
          data: { medicalCheckIns: result.data },
          message: "Fetched medical check-ins by balagruha Ids successfully",
        };
      }
      return result;
    } catch (error) {
      errorLogger.error(
        { data: { error: error } },
        `Error occurred during getting medical check-ins by balagruha Ids: ${error.message}`
      );
      throw error;
    }
  }
}

module.exports = MedicalCheckIns;
