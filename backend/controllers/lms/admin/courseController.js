const Course = require("../../../models/course");
const Notification = require("../../../models/notification");
const CourseAssignment = require("../../../models/CourseAssignment");
const User = require("../../../models/user");
const mongoose = require("mongoose");
const { errorLogger } = require('../../../config/pino-config');

/**
 * Helper: Return the set of course IDs a coach may access via an active
 * CourseAssignment to one of their balagruhas. Returns an array of string IDs.
 * Used for scope filtering on the admin read endpoints when role === 'coach'.
 */
async function _getCoachAccessibleCourseIds(coachUser) {
  try {
    const user = await User.findById(coachUser._id).select('balagruhaIds').lean();
    const balagruhaIds = (user?.balagruhaIds || []).map(id => id.toString());
    if (balagruhaIds.length === 0) return [];

    const assignments = await CourseAssignment.find({
      status: 'active',
      $or: [
        { 'assignedTo.balagruhaId': { $in: balagruhaIds } },
        { 'assignedTo.balagruhaIds': { $in: balagruhaIds } },
      ],
    }).select('courseId').lean();

    const ids = assignments
      .map(a => (a.courseId?._id || a.courseId))
      .filter(Boolean)
      .map(id => id.toString());
    return [...new Set(ids)];
  } catch (err) {
    errorLogger.error({ err }, 'Error computing coach accessible course IDs');
    return [];
  }
}

/**
 * Helper: Create audit log entry for course status changes and notify assigned coaches
 * @param {Object} course - The course document
 * @param {string} action - 'published', 'unpublished', 'archived'
 * @param {Object} req - Express request object (for user info)
 * @param {string} reason - Optional reason for the change
 */
async function _auditAndNotifyCoaches(course, action, req, reason) {
  try {
    // Find coaches assigned to this course
    const assignments = await CourseAssignment.find({
      courseId: course._id,
      status: 'active'
    }).select('assignedBy').lean();

    const coachIds = [...new Set(assignments.map(a => a.assignedBy.toString()))];

    // Create notification for each assigned coach
    if (coachIds.length > 0) {
      const notifications = coachIds.map(coachId => ({
        userId: coachId,
        title: `Course ${action}: ${course.title}`,
        message: reason
          ? `Course "${course.title}" has been ${action}. Reason: ${reason}`
          : `Course "${course.title}" has been ${action} by an administrator.`,
        type: 'PERSONAL',
        category: 'GENERAL',
        metadata: {
          courseId: course._id,
          action,
          changedBy: req.user?._id,
          reason: reason || null,
          changedAt: new Date().toISOString()
        }
      }));

      await Notification.insertMany(notifications);
    }
  } catch (error) {
    // Log but do not fail the main operation
    errorLogger.error({ err: error }, 'Error creating audit notifications for course status change');
  }
}

// ==================== COURSE CRUD OPERATIONS ====================

/**
 * GET /api/v2/lms/admin/courses
 * Get all courses with optional filters
 */
exports.getAllCourses = async (req, res) => {
  try {
    const { status, category, search } = req.query;
    const filter = {};

    // Apply filters
    if (status && ["draft", "published", "archived"].includes(status)) {
      filter.status = status;
    }
    if (category) {
      filter.category = category;
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Coach scope filter: restrict to courses assigned to the coach's balagruhas.
    // Admin receives the unfiltered set.
    if (req.user?.role === 'coach') {
      const accessibleIds = await _getCoachAccessibleCourseIds(req.user);
      if (accessibleIds.length === 0) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
      filter._id = { $in: accessibleIds };
    }

    const courses = await Course.find(filter)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    // Add virtual counts to response
    const coursesWithCounts = courses.map((course) => {
      const courseObj = course.toObject({ virtuals: true });
      return courseObj;
    });

    res.status(200).json({
      success: true,
      count: courses.length,
      data: coursesWithCounts,
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error fetching courses:");
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/v2/lms/admin/courses/:id
 * Get single course by ID
 */
exports.getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid course ID" });
    }

    const course = await Course.findById(id)
      .populate("createdBy", "name email")
      .populate({
        path: "modules.chapters.contentItems.quizRef",
        model: "Quiz",
        select: "title questions status description"
      });

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Coach scope guard: verify an active CourseAssignment targets one of
    // the coach's balagruhas. Admin bypasses this check.
    if (req.user?.role === 'coach') {
      const accessibleIds = await _getCoachAccessibleCourseIds(req.user);
      if (!accessibleIds.includes(course._id.toString())) {
        return res.status(403).json({
          success: false,
          message: 'Course not available for your balagruhas',
        });
      }
    }

    const courseWithCounts = course.toObject({ virtuals: true });

    res.status(200).json({
      success: true,
      data: courseWithCounts,
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error fetching course:");
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * POST /api/v2/lms/admin/courses
 * Create new course
 */
exports.createCourse = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      difficultyLevel,
      thumbnail,
      icon,
    } = req.body;

    // Validation
    if (!title || !description || !category || !difficultyLevel) {
      return res.status(400).json({
        error: "Title, description, category, and difficulty level are required",
      });
    }

    // Validate category
    const validCategories = [
      "Computer Apps",
      "Art",
      "Spoken English",
      "Life Skills",
    ];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        error: `Category must be one of: ${validCategories.join(", ")}`,
      });
    }

    // Validate difficulty level
    const validDifficulties = ["Beginner", "Intermediate", "Advanced"];
    if (!validDifficulties.includes(difficultyLevel)) {
      return res.status(400).json({
        error: `Difficulty level must be one of: ${validDifficulties.join(", ")}`,
      });
    }

    const course = new Course({
      title: title.trim(),
      description: description.trim(),
      category,
      difficultyLevel,
      thumbnail,
      icon: icon || "📚",
      createdBy: req.user._id, // From auth middleware
      status: "draft",
      modules: [],
    });

    await course.save();

    res.status(201).json({
      success: true,
      courseId: course._id,
      message: "Course created successfully with Draft status",
      data: course,
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error creating course:");
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

/**
 * PUT /api/v2/lms/admin/courses/:id
 * Update course metadata
 */
exports.updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid course ID" });
    }

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Allowed fields for update
    const allowedUpdates = [
      "title",
      "description",
      "category",
      "difficultyLevel",
      "thumbnail",
      "icon",
      "enableCoinReward",
      "coinsOnCompletion",
      "translations",
    ];

    // Apply updates
    Object.keys(updates).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        course[key] = updates[key];
      }
    });

    await course.save();

    res.status(200).json({
      success: true,
      message: "Course updated successfully",
      data: course,
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error updating course:");
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * DELETE /api/v2/lms/admin/courses/:id
 * Delete course permanently
 */
exports.deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid course ID" });
    }

    const course = await Course.findByIdAndDelete(id);

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    res.status(200).json({
      success: true,
      message: "Course deleted permanently",
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error deleting course:");
    res.status(500).json({ error: "Internal server error" });
  }
};

// ==================== STRUCTURE MANAGEMENT ====================

/**
 * POST /api/v2/lms/admin/courses/:courseId/modules
 * Add module to course
 */
exports.addModule = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Module title is required" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Calculate order (append to end)
    const order = course.modules.length;

    course.modules.push({
      title: title.trim(),
      description: description?.trim() || "",
      order,
      chapters: [],
    });

    await course.save();

    const addedModule = course.modules[course.modules.length - 1];

    res.status(201).json({
      success: true,
      moduleId: addedModule._id,
      message: "Module added successfully",
      data: addedModule,
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error adding module:");
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * PUT /api/v2/lms/admin/courses/:courseId/modules/:moduleId
 * Update module
 */
exports.updateModule = async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;
    const { title, description } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const module = course.modules.id(moduleId);
    if (!module) {
      return res.status(404).json({ error: "Module not found" });
    }

    if (title) module.title = title.trim();
    if (description !== undefined) module.description = description.trim();

    await course.save();

    res.status(200).json({
      success: true,
      message: "Module updated successfully",
      data: module,
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error updating module:");
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * DELETE /api/v2/lms/admin/courses/:courseId/modules/:moduleId
 * Delete module
 */
exports.deleteModule = async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const module = course.modules.id(moduleId);
    if (!module) {
      return res.status(404).json({ error: "Module not found" });
    }

    module.deleteOne();
    await course.save();

    res.status(200).json({
      success: true,
      message: "Module deleted successfully",
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error deleting module:");
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * POST /api/v2/lms/admin/courses/:courseId/modules/:moduleId/chapters
 * Add chapter to module
 */
exports.addChapter = async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Chapter title is required" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const module = course.modules.id(moduleId);
    if (!module) {
      return res.status(404).json({ error: "Module not found" });
    }

    // Calculate order (append to end)
    const order = module.chapters.length;

    module.chapters.push({
      title: title.trim(),
      description: description?.trim() || "",
      order,
      contentItems: [],
    });

    await course.save();

    const addedChapter = module.chapters[module.chapters.length - 1];

    res.status(201).json({
      success: true,
      chapterId: addedChapter._id,
      message: "Chapter added successfully",
      data: addedChapter,
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error adding chapter:");
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * PUT /api/v2/lms/admin/courses/:courseId/modules/:moduleId/chapters/:chapterId
 * Update chapter
 */
exports.updateChapter = async (req, res) => {
  try {
    const { courseId, moduleId, chapterId } = req.params;
    const { title, description } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const module = course.modules.id(moduleId);
    if (!module) {
      return res.status(404).json({ error: "Module not found" });
    }

    const chapter = module.chapters.id(chapterId);
    if (!chapter) {
      return res.status(404).json({ error: "Chapter not found" });
    }

    if (title) chapter.title = title.trim();
    if (description !== undefined) chapter.description = description.trim();

    await course.save();

    res.status(200).json({
      success: true,
      message: "Chapter updated successfully",
      data: chapter,
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error updating chapter:");
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * DELETE /api/v2/lms/admin/courses/:courseId/modules/:moduleId/chapters/:chapterId
 * Delete chapter
 */
exports.deleteChapter = async (req, res) => {
  try {
    const { courseId, moduleId, chapterId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const module = course.modules.id(moduleId);
    if (!module) {
      return res.status(404).json({ error: "Module not found" });
    }

    const chapter = module.chapters.id(chapterId);
    if (!chapter) {
      return res.status(404).json({ error: "Chapter not found" });
    }

    chapter.deleteOne();
    await course.save();

    res.status(200).json({
      success: true,
      message: "Chapter deleted successfully",
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error deleting chapter:");
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * POST /api/v2/lms/admin/courses/:courseId/modules/:moduleId/chapters/:chapterId/content
 * Add content item to chapter
 */
exports.addContentItem = async (req, res) => {
  try {
    const { courseId, moduleId, chapterId } = req.params;
    const {
      type,
      title,
      description,
      fileUrl,
      metadata,
      quizData,
      quizRef, // Add quizRef
      textContent,
      externalUrl,
      taskData,
    } = req.body;

    if (!type || !title) {
      return res.status(400).json({ error: "Type and title are required" });
    }

    const validTypes = [
      "video",
      "pdf",
      "audio",
      "image",
      "text",
      "link",
      "quiz",
      "task",
    ];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: `Type must be one of: ${validTypes.join(", ")}`,
      });
    }

    const fileContentTypes = ["video", "pdf", "audio", "image"];
    if (fileContentTypes.includes(type) && !fileUrl?.trim()) {
      return res.status(400).json({
        error: `A file URL is required for ${type} content`,
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const module = course.modules.id(moduleId);
    if (!module) {
      return res.status(404).json({ error: "Module not found" });
    }

    const chapter = module.chapters.id(chapterId);
    if (!chapter) {
      return res.status(404).json({ error: "Chapter not found" });
    }

    // Calculate order (append to end)
    const order = chapter.contentItems?.length || 0;

    const contentItem = {
      type,
      title: title.trim(),
      description: description?.trim() || "",
      order,
      fileUrl,
      metadata,
      quizData,
      quizRef: quizRef || undefined, // Sanitize quizRef: prevent empty string CastError
      textContent,
      externalUrl,
      taskData,
    };

    if (!chapter.contentItems) {
      chapter.contentItems = [];
    }
    chapter.contentItems.push(contentItem);

    await course.save();

    const addedContentItem =
      chapter.contentItems[chapter.contentItems.length - 1];

    res.status(201).json({
      success: true,
      contentItemId: addedContentItem._id,
      message: "Content item added successfully",
      data: addedContentItem,
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error adding content item:");
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * PUT /api/v2/lms/admin/courses/:courseId/modules/:moduleId/chapters/:chapterId/content/:contentId
 * Update content item
 */
exports.updateContentItem = async (req, res) => {
  try {
    const { courseId, moduleId, chapterId, contentId } = req.params;
    const updates = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const module = course.modules.id(moduleId);
    if (!module) {
      return res.status(404).json({ error: "Module not found" });
    }

    const chapter = module.chapters.id(chapterId);
    if (!chapter) {
      return res.status(404).json({ error: "Chapter not found" });
    }

    const contentItem = chapter.contentItems.id(contentId);
    if (!contentItem) {
      return res.status(404).json({ error: "Content item not found" });
    }

    // Allowed updates
    const allowed = [
      "title",
      "description",
      "fileUrl",
      "metadata",
      "quizData",
      "textContent",
      "externalUrl",
      "taskData",
      "quizRef",
    ];

    Object.keys(updates).forEach((key) => {
      if (allowed.includes(key) && updates[key] !== undefined) {
        // Sanitize quizRef
        if (key === 'quizRef' && !updates[key]) {
          contentItem[key] = undefined;
        } else {
          contentItem[key] = updates[key];
        }
      }
    });

    if (
      ["video", "pdf", "audio", "image"].includes(contentItem.type) &&
      !contentItem.fileUrl?.trim()
    ) {
      return res.status(400).json({
        error: `A file URL is required for ${contentItem.type} content`,
      });
    }

    await course.save();

    res.status(200).json({
      success: true,
      message: "Content item updated successfully",
      data: contentItem,
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error updating content item:");
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * DELETE /api/v2/lms/admin/courses/:courseId/modules/:moduleId/chapters/:chapterId/content/:contentId
 * Delete content item
 */
exports.deleteContentItem = async (req, res) => {
  try {
    const { courseId, moduleId, chapterId, contentId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const module = course.modules.id(moduleId);
    if (!module) {
      return res.status(404).json({ error: "Module not found" });
    }

    const chapter = module.chapters.id(chapterId);
    if (!chapter) {
      return res.status(404).json({ error: "Chapter not found" });
    }

    const contentItem = chapter.contentItems.id(contentId);
    if (!contentItem) {
      return res.status(404).json({ error: "Content item not found" });
    }

    contentItem.deleteOne();
    await course.save();

    res.status(200).json({
      success: true,
      message: "Content item deleted successfully",
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error deleting content item:");
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * PUT /api/v2/lms/admin/courses/:courseId/reorder
 * Reorder modules, chapters, or content items
 */
exports.reorderItems = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { level, parentId, orderedIds } = req.body;

    if (!level || !orderedIds || !Array.isArray(orderedIds)) {
      return res.status(400).json({
        error: "Level and orderedIds array are required",
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    if (level === "module") {
      // Reorder modules
      const moduleMap = new Map(
        course.modules.map((m) => [m._id.toString(), m])
      );
      course.modules = orderedIds
        .map((id, index) => {
          const module = moduleMap.get(id);
          if (module) {
            module.order = index;
            return module;
          }
          return null;
        })
        .filter(Boolean);
    } else if (level === "chapter" && parentId) {
      // Reorder chapters within a module
      const module = course.modules.id(parentId);
      if (!module) {
        return res.status(404).json({ error: "Module not found" });
      }

      const chapterMap = new Map(
        module.chapters.map((c) => [c._id.toString(), c])
      );
      module.chapters = orderedIds
        .map((id, index) => {
          const chapter = chapterMap.get(id);
          if (chapter) {
            chapter.order = index;
            return chapter;
          }
          return null;
        })
        .filter(Boolean);
    } else if (level === "content_item" && parentId) {
      // Reorder content items within a chapter
      // parentId is chapterId in this case, need to find module first
      let targetChapter = null;
      for (const module of course.modules) {
        const chapter = module.chapters.id(parentId);
        if (chapter) {
          targetChapter = chapter;
          break;
        }
      }

      if (!targetChapter) {
        return res.status(404).json({ error: "Chapter not found" });
      }

      if (!targetChapter.contentItems) {
        targetChapter.contentItems = [];
      }

      const contentItemMap = new Map(
        targetChapter.contentItems.map((c) => [c._id.toString(), c])
      );
      targetChapter.contentItems = orderedIds
        .map((id, index) => {
          const contentItem = contentItemMap.get(id);
          if (contentItem) {
            contentItem.order = index;
            return contentItem;
          }
          return null;
        })
        .filter(Boolean);
    } else {
      return res.status(400).json({ error: "Invalid level or missing parentId" });
    }

    await course.save();

    res.status(200).json({
      success: true,
      message: "Order updated successfully",
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error reordering items:");
    res.status(500).json({ error: "Internal server error" });
  }
};

// ==================== PUBLISHING WORKFLOW ====================

/**
 * Validate course before publishing
 */
const validateCourseForPublish = (course) => {
  const errors = [];

  if (!course.title) errors.push("Course title is required — edit the course to add a title");
  if (!course.description) errors.push("Course description is required — edit the course to add a description");
  if (!course.category) errors.push("Category is required — edit the course to select a category");
  if (!course.difficultyLevel) errors.push("Difficulty level is required — edit the course to set difficulty");
  if (!course.thumbnail) errors.push("Thumbnail image is required — go back to course list, click ⋮ on this course → \"Edit Metadata\" → upload a thumbnail");

  if (!course.modules || course.modules.length === 0) {
    errors.push("Add at least one module to the course before publishing");
  } else {
    course.modules.forEach((module, mIndex) => {
      const moduleName = module.title || `Module ${mIndex + 1}`;
      if (!module.chapters || module.chapters.length === 0) {
        errors.push(`"${moduleName}" has no chapters — add at least one chapter`);
      } else {
        module.chapters.forEach((chapter, cIndex) => {
          const chapterName = chapter.title || `Chapter ${cIndex + 1}`;
          if (!chapter.contentItems || chapter.contentItems.length === 0) {
            errors.push(
              `"${moduleName}" → "${chapterName}" has no content — add at least one content item`
            );
          }
        });
      }
    });
  }

  return errors;
};

/**
 * GET /api/v2/lms/admin/courses/:courseId/validate
 * Get detailed validation results for publishing
 * Epic 02 Story 05
 */
exports.validateCourseDetailed = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Calculate structure stats
    const moduleCount = course.modules?.length || 0;
    const chapterCount = course.modules?.reduce((sum, m) => sum + (m.chapters?.length || 0), 0) || 0;
    const contentItemCount = course.modules?.reduce((sum, m) => {
      return sum + m.chapters?.reduce((chSum, ch) => chSum + (ch.contentItems?.length || 0), 0);
    }, 0) || 0;

    // Build validation results
    const checks = [
      {
        id: 'title',
        label: 'Course Title',
        status: course.title ? 'pass' : 'fail',
        message: course.title || 'Missing',
        required: true
      },
      {
        id: 'description',
        label: 'Course Description',
        status: course.description ? 'pass' : 'fail',
        message: course.description ? `Present (${course.description.length} characters)` : 'Missing',
        required: true
      },
      {
        id: 'category',
        label: 'Category',
        status: course.category ? 'pass' : 'fail',
        message: course.category || 'Missing',
        required: true
      },
      {
        id: 'difficulty',
        label: 'Difficulty',
        status: course.difficultyLevel ? 'pass' : 'fail',
        message: course.difficultyLevel || 'Missing',
        required: true
      },
      {
        id: 'thumbnail',
        label: 'Thumbnail',
        status: course.thumbnail ? 'pass' : 'fail',
        message: course.thumbnail ? 'Uploaded' : 'Missing (required for publish)',
        required: true
      },
      {
        id: 'structure',
        label: 'Structure',
        status: (moduleCount > 0 && chapterCount > 0 && contentItemCount > 0) ? 'pass' : 'fail',
        message: `${moduleCount} Modules, ${chapterCount} Chapters, ${contentItemCount} Content Items`,
        required: true
      }
    ];

    // Add warnings for optional fields
    const teluguTranslated = course.translations?.telugu?.title ? 1 : 0;
    checks.push({
      id: 'translations',
      label: 'Translations',
      status: teluguTranslated > 0 ? 'warning' : 'warning',
      message: teluguTranslated > 0 ? 'Telugu translations available (optional)' : 'No translations yet (optional)',
      required: false
    });

    // Check for validation errors
    const validationErrors = validateCourseForPublish(course);
    const canPublish = validationErrors.length === 0;

    res.status(200).json({
      success: true,
      canPublish,
      checks,
      errors: validationErrors,
      stats: {
        moduleCount,
        chapterCount,
        contentItemCount
      }
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error validating course:");
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * PUT /api/v2/lms/admin/courses/:courseId/publish
 * Publish course
 */
exports.publishCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Validate course
    const validationErrors = validateCourseForPublish(course);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        errors: validationErrors,
        message: "Cannot publish: Missing required fields or content",
      });
    }

    // Publish course
    await course.publish();

    // Audit log + notify assigned coaches
    await _auditAndNotifyCoaches(course, 'published', req, null);

    res.status(200).json({
      success: true,
      publishedAt: course.publishedAt,
      message: "Course published successfully",
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error publishing course:");
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * PUT /api/v2/lms/admin/courses/:courseId/archive
 * Archive course - Epic 02 Story 05
 */
exports.archiveCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { reason, notifyCoaches } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Archive course
    await course.archive();

    // Audit log + notify assigned coaches (FIX-034)
    await _auditAndNotifyCoaches(course, 'archived', req, reason);

    res.status(200).json({
      success: true,
      archivedAt: course.archivedAt,
      message: "Course archived successfully",
      reason: reason || null,
      notifiedCoaches: true
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error archiving course:");
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * PUT /api/v2/lms/admin/courses/:courseId/restore
 * Restore archived course
 */
exports.restoreCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { restoreToStatus } = req.body;

    if (
      restoreToStatus &&
      !["published", "draft"].includes(restoreToStatus)
    ) {
      return res.status(400).json({
        error: "restoreToStatus must be 'published' or 'draft'",
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Restore course
    await course.restore(restoreToStatus || "published");

    res.status(200).json({
      success: true,
      message: `Course restored to ${course.status} status`,
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error restoring course:");
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * PUT /api/v2/lms/admin/courses/:courseId/unpublish
 * Unpublish course (change from published to draft)
 * Epic 02 Story 05 - Unpublishing Workflow
 */
exports.unpublishCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { reason, notifyCoaches } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    if (course.status !== "published") {
      return res.status(400).json({
        error: "Only published courses can be unpublished",
      });
    }

    // Change status to draft
    course.status = "draft";
    await course.save();

    // Audit log + notify assigned coaches (FIX-034)
    await _auditAndNotifyCoaches(course, 'unpublished', req, reason);

    res.status(200).json({
      success: true,
      message: "Course unpublished successfully",
      status: course.status,
      reason: reason || null,
      notifiedCoaches: true,
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error unpublishing course:");
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * PUT /api/v2/lms/admin/courses/:courseId/duplicate
 * Duplicate course (bonus feature)
 */
exports.duplicateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const originalCourse = await Course.findById(courseId);
    if (!originalCourse) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Create duplicate
    const duplicateData = originalCourse.toObject();
    delete duplicateData._id;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;
    duplicateData.title = `${duplicateData.title} (Copy)`;
    duplicateData.status = "draft";
    duplicateData.publishedAt = null;
    duplicateData.archivedAt = null;
    duplicateData.createdBy = req.user._id;

    // Remove _id from nested documents
    duplicateData.modules = duplicateData.modules.map((module) => {
      delete module._id;
      module.chapters = module.chapters.map((chapter) => {
        delete chapter._id;
        if (chapter.contentItems) {
          chapter.contentItems = chapter.contentItems.map((item) => {
            delete item._id;
            return item;
          });
        }
        return chapter;
      });
      return module;
    });

    const duplicateCourse = new Course(duplicateData);
    await duplicateCourse.save();

    res.status(201).json({
      success: true,
      courseId: duplicateCourse._id,
      message: "Course duplicated successfully",
      data: duplicateCourse,
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error duplicating course:");
    res.status(500).json({ error: "Internal server error" });
  }
};

// ==================== STRUCTURE QUERY HELPERS ====================

/**
 * GET /api/v2/lms/admin/courses/:courseId/modules
 * Get all modules for a specific course
 */
exports.getModulesByCourseId = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ error: "Invalid course ID" });
    }

    const course = await Course.findById(courseId).select('modules');

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    res.status(200).json({
      success: true,
      modules: course.modules || [],
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error fetching modules:");
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/v2/lms/admin/courses/audit-log
 * Admin-queryable audit log for course lifecycle changes (publish/unpublish/archive).
 * Queries Notification records created by _auditAndNotifyCoaches().
 * Supports pagination and optional courseId filter.
 */
exports.getCourseAuditLog = async (req, res) => {
  try {
    const { courseId, page = 1, limit = 25 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const skip = (pageNum - 1) * limitNum;

    // Course lifecycle notifications have metadata.action in [published, unpublished, archived]
    // and metadata.courseId set
    const filter = {
      'metadata.action': { $in: ['published', 'unpublished', 'archived'] },
      'metadata.courseId': { $exists: true, $ne: null },
    };

    if (courseId) {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({ error: 'Invalid courseId' });
      }
      filter['metadata.courseId'] = new mongoose.Types.ObjectId(courseId);
    }

    const [entries, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select('title message metadata createdAt')
        .lean(),
      Notification.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: entries.map(e => ({
        id: e._id,
        action: e.metadata?.action,
        courseId: e.metadata?.courseId,
        changedBy: e.metadata?.changedBy,
        reason: e.metadata?.reason || null,
        title: e.title,
        message: e.message,
        timestamp: e.metadata?.changedAt || e.createdAt,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching course audit log');
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/v2/lms/admin/modules/:moduleId/chapters
 * Get all chapters for a specific module
 */
exports.getChaptersByModuleId = async (req, res) => {
  try {
    const { moduleId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      return res.status(400).json({ error: "Invalid module ID" });
    }

    const course = await Course.findOne({ "modules._id": moduleId });

    if (!course) {
      return res.status(404).json({ error: "Module not found" });
    }

    const module = course.modules.id(moduleId);

    if (!module) {
      return res.status(404).json({ error: "Module not found" });
    }

    res.status(200).json({
      success: true,
      chapters: module.chapters || [],
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error fetching chapters:");
    res.status(500).json({ error: "Internal server error" });
  }
};
