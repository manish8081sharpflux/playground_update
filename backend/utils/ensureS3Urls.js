const fs = require("fs");
const path = require("path");
const User = require("../models/user");
const MedicalRecord = require("../models/medical");
const { uploadFileToS3 } = require("../services/aws/s3");
const { cleanupLocalFile } = require("./fileCleanup");

const uploadsDir = path.resolve(__dirname, "..", "uploads");

const isS3Url = (value = "") =>
  typeof value === "string" &&
  (/\.s3[.-][a-z0-9-]+\.amazonaws\.com\//i.test(value) ||
    value.includes("amazonaws.com/") ||
    value.includes(process.env.AWS_S3_ENDPOINT || "__NO_ENDPOINT__"));

const getLocalUploadFileName = (value = "") => {
  if (typeof value !== "string" || !value) return "";
  if (isS3Url(value)) return "";

  const normalized = value.replace(/\\/g, "/");
  const marker = "/uploads/";
  const markerIndex = normalized.lastIndexOf(marker);

  if (markerIndex !== -1) {
    return decodeURIComponent(normalized.slice(markerIndex + marker.length).split(/[?#]/)[0]);
  }

  if (normalized.startsWith("uploads/")) {
    return decodeURIComponent(normalized.slice("uploads/".length).split(/[?#]/)[0]);
  }

  if (normalized.startsWith("/uploads/")) {
    return decodeURIComponent(normalized.slice("/uploads/".length).split(/[?#]/)[0]);
  }

  return "";
};

const uploadLocalUrlToS3 = async (value, folderName) => {
  const fileName = getLocalUploadFileName(value);
  if (!fileName) return value;

  const filePath = path.join(uploadsDir, path.basename(fileName));
  if (!fs.existsSync(filePath)) {
    return "";
  }

  const result = await uploadFileToS3(filePath, folderName, path.basename(fileName));
  if (!result.success) {
    console.warn(
      `Skipping S3 URL upgrade for ${fileName}: ${result.error || result.message || "upload failed"}`
    );
    return value;
  }

  cleanupLocalFile(filePath, path.basename(fileName));
  return result.url;
};

const ensureFileObjectUrl = async (fileObject, folderName) => {
  if (!fileObject || typeof fileObject !== "object") return false;
  const currentUrl = fileObject.url || fileObject.fileUrl;
  const upgradedUrl = await uploadLocalUrlToS3(currentUrl, folderName);

  if (upgradedUrl !== currentUrl) {
    if (Object.prototype.hasOwnProperty.call(fileObject, "url")) {
      fileObject.url = upgradedUrl;
    }
    if (Object.prototype.hasOwnProperty.call(fileObject, "fileUrl")) {
      fileObject.fileUrl = upgradedUrl;
    }
    return true;
  }

  return false;
};

const ensureMedicalRecordUrls = async (medicalRecord, folderName) => {
  if (!medicalRecord || !Array.isArray(medicalRecord.medicalHistory)) return false;
  let changed = false;

  for (const history of medicalRecord.medicalHistory) {
    if (!history) continue;

    if (Array.isArray(history.prescriptions)) {
      for (const prescription of history.prescriptions) {
        changed = (await ensureFileObjectUrl(prescription, folderName)) || changed;
      }
    }

    if (Array.isArray(history.otherAttachments)) {
      for (const attachment of history.otherAttachments) {
        changed = (await ensureFileObjectUrl(attachment, folderName)) || changed;
      }
    }
  }

  if (changed && medicalRecord._id) {
    await MedicalRecord.updateOne(
      { _id: medicalRecord._id },
      { $set: { medicalHistory: medicalRecord.medicalHistory } }
    );
  }

  return changed;
};

exports.ensureUserEditFilesUseS3 = async (user) => {
  if (!user) return user;

  const userPhotoFolder =
    process.env.AWS_S3_FOLDER_USER_PHOTOS ||
    process.env.AWS_S3_FOLDER_MEDICAL_RECORDS ||
    "student-medical-records";
  const medicalFolder =
    process.env.AWS_S3_FOLDER_MEDICAL_RECORDS || "student-medical-records";

  if (user.facialDataUrl) {
    const upgradedPhotoUrl = await uploadLocalUrlToS3(user.facialDataUrl, userPhotoFolder);
    if (upgradedPhotoUrl !== user.facialDataUrl) {
      user.facialDataUrl = upgradedPhotoUrl;
      if (user._id) {
        await User.updateOne({ _id: user._id }, { $set: { facialDataUrl: upgradedPhotoUrl } });
      }
    }
  }

  if (Array.isArray(user.medicalRecords)) {
    for (const record of user.medicalRecords) {
      await ensureMedicalRecordUrls(record, medicalFolder);
    }
  }

  if (Array.isArray(user.medicalHistory)) {
    const syntheticRecord = { medicalHistory: user.medicalHistory };
    await ensureMedicalRecordUrls(syntheticRecord, medicalFolder);
  }

  return user;
};