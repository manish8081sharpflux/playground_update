const CourseDataAccess = require("../data-access/course");
const mongoose = require("mongoose");

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
        modules.forEach((mod, modIdx) => {
          if (mod.chapters && mod.chapters.length > 0) {
            mod.chapters.forEach((chap, chapIdx) => {
              chap.files = files
                .filter(
                  (f) =>
                    f.fieldname === `module_${modIdx}_chapter_${chapIdx}_file`
                )
                .map((f) => ({
                  fileName: f.originalname,
                  fileType: f.mimetype,
                  fileUrl: f.path,
                }));
            });
          }
        });
      }
      const coursePayload = {
        title: data.title,
        description: data.description,
        category: data.category,
        duration: data.duration,
        difficultyLevel: data.difficultyLevel,
        thumbnail:
          (Array.isArray(files)
            ? files.find((f) => f.fieldname === "thumbnail")?.path
            : "") || "",
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
