const CourseService = require("../services/course");
const { errorLogger } = require('../config/pino-config');

exports.createCourse = async (req, res) => {
  try {
    const data = req.body;
    const files = req.files || [];
    const userId = req.user._id;
    const result = await CourseService.createCourse(data, files, userId);
    if (result.success) {
      res
        .status(201)
        .json({
          success: true,
          data: result.data,
          message: "Course created successfully.",
        });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    errorLogger.error({ err: error }, "Error creating course:");
    res
      .status(500)
      .json({
        success: false,
        message: "Internal server error.",
        error: error.message,
      });
  }
};
