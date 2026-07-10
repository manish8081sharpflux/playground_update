const CourseDataAccess = require("../data-access/course");
const mongoose = require("mongoose");
const { uploadFileToS3 } = require("./aws/s3");
const { cleanupLocalFile } = require("../utils/fileCleanup");

class CourseService {
  static async createCourse(data, files, userId) {
    try {
      let modules = [];
      if (data.modules) {
        modules =
          typeof data.modules === "string"
            ? JSON.parse(data.modules)
            : data.modules;
      }
      if (modules.length > 0 && Array.isArray(files) && files.length > 0) {
        for (let modIdx = 0; modIdx < modules.length; modIdx++) {
          const mod = modules[modIdx];
          if (mod.chapters && mod.chapters.length > 0) {
            for (let chapIdx = 0; chapIdx < mod.chapters.length; chapIdx++) {
              const chap = mod.chapters[chapIdx];
              const chapterFiles = files.filter(
                (f) =>
                  f.fieldname === `module_${modIdx}_chapter_${chapIdx}_file`
              );

              chap.files = [];
              for (const file of chapterFiles) {
                const uploadResult = await uploadFileToS3(
                  file.path,
                  process.env.AWS_S3_FOLDER_LMS_CONTENT,
                  file.filename,
                );
                if (!uploadResult.success) {
                  return { success: false, message: "Failed to upload course file to S3." };
                }
                cleanupLocalFile(file.path, file.filename);
                chap.files.push({
                  fileName: file.originalname,
                  fileType: uploadResult.contentType || file.mimetype,
                  fileUrl: uploadResult.url,
                  s3Key: uploadResult.key,
                });
              }
            }
          }
        }
      }

      let thumbnailUrl = "";
      if (Array.isArray(files)) {
        const thumbnailFile = files.find((f) => f.fieldname === "thumbnail");
        if (thumbnailFile) {
          const uploadResult = await uploadFileToS3(
            thumbnailFile.path,
            process.env.AWS_S3_FOLDER_LMS_CONTENT,
            thumbnailFile.filename,
          );
          if (!uploadResult.success) {
            return { success: false, message: "Failed to upload course thumbnail to S3." };
          }
          cleanupLocalFile(thumbnailFile.path, thumbnailFile.filename);
          thumbnailUrl = uploadResult.url;
        }
      }
      const coursePayload = {
        title: data.title,
        description: data.description,
        category: data.category,
        duration: data.duration,
        difficultyLevel: data.difficultyLevel,
        thumbnail: thumbnailUrl,
        enableCoinReward:
          data.enableCoinReward === "true" || data.enableCoinReward === true,
        coinsOnCompletion: Number(data.coinsOnCompletion) || 0,
        modules: modules,
        status: data.status || "draft",
        assignedBalagruha: data.assignedBalagruha
          ? Array.isArray(data.assignedBalagruha)
            ? data.assignedBalagruha
            : [data.assignedBalagruha]
          : [],
        createdBy: userId,
      };
      const result = await CourseDataAccess.createCourse(coursePayload);
      if (result.success) {
        return {
          success: true,
          data: result.data,
          message: "Course created successfully.",
        };
      }
      return { success: false, message: result.message };
    } catch (error) {
      console.error("Error in CourseService.createCourse:", error);
      return { success: false, message: error.message };
    }
  }
}

module.exports = CourseService;
