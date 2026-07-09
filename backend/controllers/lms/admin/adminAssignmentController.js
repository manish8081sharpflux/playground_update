const CourseAssignment = require("../../../models/CourseAssignment");
const Course = require("../../../models/course");
const User = require("../../../models/user");
const Notification = require("../../../models/notification");
const mongoose = require("mongoose");
const { errorLogger } = require('../../../config/pino-config');

/**
 * POST /api/v2/lms/admin/assignments
 * Admin assigns course to Balagruhas or specific students
 */
exports.createAdminAssignment = async (req, res) => {
  try {
    const { courseId, assignedTo, dueDate } = req.body;

    // Validation
    if (!courseId || !assignedTo) {
      return res.status(400).json({
        error: "Missing required fields: courseId, assignedTo",
      });
    }

    // Verify course exists and is published
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    if (course.status !== "published") {
      return res.status(400).json({ error: "Can only assign published courses" });
    }

    // Get admin user from request
    const adminId = req.user._id;

    // Get students to assign
    let studentIds = [];
    let assignedBalagruhaIds = [];

    if (assignedTo.type === "balagruha") {
      // Assign to multiple Balagruhas
      assignedBalagruhaIds = assignedTo.balagruhaIds || [];
      
      if (assignedBalagruhaIds.length === 0) {
        return res.status(400).json({ error: "No Balagruhas selected" });
      }

      // Get all students in the selected Balagruhas
      const students = await User.find({
        balagruhaIds: { $in: assignedBalagruhaIds },
        role: "student",
      });
      studentIds = students.map((s) => s._id.toString());
    } else if (assignedTo.type === "students") {
      // Assign to specific students
      studentIds = assignedTo.studentIds;

      if (!studentIds || studentIds.length === 0) {
        return res.status(400).json({ error: "No students selected" });
      }
    } else {
      return res.status(400).json({ error: "Invalid assignedTo.type" });
    }

    if (studentIds.length === 0) {
      return res.status(400).json({ error: "No students to assign" });
    }

    // Check for existing active assignments
    const existingAssignments = await CourseAssignment.find({
      courseId,
      "assignedTo.studentIds": { $in: studentIds },
      status: { $in: ["active", "pending"] },
    });

    if (existingAssignments.length > 0) {
      // Get already assigned student IDs
      const alreadyAssignedIds = new Set();
      existingAssignments.forEach((assignment) => {
        assignment.assignedTo.studentIds.forEach((id) =>
          alreadyAssignedIds.add(id.toString())
        );
      });

      // Filter out already assigned students
      studentIds = studentIds.filter((id) => !alreadyAssignedIds.has(id));

      if (studentIds.length === 0) {
        return res.status(400).json({
          error: "All selected students already have this course assigned",
        });
      }
    }

    // Create assignment
    const assignment = new CourseAssignment({
      courseId,
      assignedBy: adminId,
      assignedTo: {
        type: assignedTo.type,
        balagruhaIds: assignedBalagruhaIds.map(id => new mongoose.Types.ObjectId(id)),
        balagruhaId: assignedBalagruhaIds.length > 0 ? assignedBalagruhaIds[0] : null,
        studentIds: studentIds.map((id) => new mongoose.Types.ObjectId(id)),
      },
      dueDate: dueDate ? new Date(dueDate) : null,
      status: "active",
      notifications: {
        inApp: true,
        email: false,
        sent: true,
        sentAt: new Date(),
        recipientCount: studentIds.length,
      },
      progress: {
        totalStudents: studentIds.length,
        studentsStarted: 0,
        studentsCompleted: 0,
        averageCompletionPercentage: 0,
      },
    });

    await assignment.save();

    // Send notifications to students
    const notificationPromises = studentIds.map((studentId) => {
      return Notification.create({
        userId: studentId,
        type: "PERSONAL",
        category: "TASK_ASSIGNED",
        title: "New Course Assigned",
        message: `You have been assigned to "${course.title}"`,
        data: {
          courseId: course._id,
          assignmentId: assignment._id,
          dueDate: dueDate || null,
        },
      });
    });

    await Promise.all(notificationPromises);

    res.status(201).json({
      success: true,
      message: "Course assigned successfully",
      data: {
        assignmentId: assignment._id,
        studentsAssigned: studentIds.length,
        courseTitle: course.title,
      },
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error creating admin assignment:");
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/v2/lms/admin/assignments
 * Admin gets all course assignments across all coaches/Balagruhas
 */
exports.getAllAssignments = async (req, res) => {
  try {
    const { status, courseId, search } = req.query;

    const filter = {};

    // Apply filters
    if (status && ["active", "completed", "expired", "cancelled"].includes(status)) {
      filter.status = status;
    }
    if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
      filter.courseId = courseId;
    }

    const assignments = await CourseAssignment.find(filter)
      .populate("courseId", "title category thumbnail difficultyLevel")
      .populate("assignedTo.balagruhaIds", "name")
      .populate("assignedBy", "name firstName lastName role")
      .populate("assignedTo.studentIds", "name userId")
      .sort({ createdAt: -1 });

    // Filter by search if provided
    let filteredAssignments = assignments;
    if (search) {
      filteredAssignments = assignments.filter((assignment) => {
        const courseTitle = assignment.courseId?.title || "";
        const searchLower = search.toLowerCase();
        return courseTitle.toLowerCase().includes(searchLower);
      });
    }

    res.status(200).json({
      success: true,
      count: filteredAssignments.length,
      data: filteredAssignments,
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error fetching all assignments:");
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * PUT /api/v2/lms/admin/courses/assignments/:assignmentId
 * Admin updates an assignment (due date, status)
 */
exports.updateAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { courseId, assignedTo, dueDate, status, notifications } = req.body;

    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      return res.status(400).json({ error: "Invalid assignment ID" });
    }

    const assignment = await CourseAssignment.findById(assignmentId);

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    if (courseId) {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({ error: "Invalid course ID" });
      }
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }
      if (course.status !== "published") {
        return res.status(400).json({ error: "Can only assign published courses" });
      }
      assignment.courseId = courseId;
    }

    if (assignedTo) {
      if (!assignedTo.type || !["balagruha", "students"].includes(assignedTo.type)) {
        return res.status(400).json({ error: "Invalid assignedTo.type" });
      }

      let studentIds = [];
      let balagruhaIds = [];

      if (assignedTo.type === "balagruha") {
        balagruhaIds = assignedTo.balagruhaIds || [];
        if (!Array.isArray(balagruhaIds) || balagruhaIds.length === 0) {
          return res.status(400).json({ error: "No Balagruhas selected" });
        }

        const studentsInBalagruhas = await User.find({
          balagruhaIds: { $in: balagruhaIds },
          role: "student",
        });
        studentIds = studentsInBalagruhas.map((s) => s._id.toString());

        assignment.assignedTo = {
          type: "balagruha",
          balagruhaIds: balagruhaIds.map((id) => new mongoose.Types.ObjectId(id)),
          balagruhaId: balagruhaIds[0] ? new mongoose.Types.ObjectId(balagruhaIds[0]) : null,
          studentIds: studentIds.map((id) => new mongoose.Types.ObjectId(id)),
        };
      } else {
        studentIds = assignedTo.studentIds || [];
        if (!Array.isArray(studentIds) || studentIds.length === 0) {
          return res.status(400).json({ error: "No students selected" });
        }

        assignment.assignedTo = {
          type: "students",
          balagruhaIds: [],
          balagruhaId: null,
          studentIds: studentIds.map((id) => new mongoose.Types.ObjectId(id)),
        };
      }

      assignment.progress.totalStudents = studentIds.length;
      assignment.progress.studentsStarted = 0;
      assignment.progress.studentsCompleted = 0;
      assignment.progress.averageCompletionPercentage = 0;
    }

    if (dueDate !== undefined) {
      if (dueDate === null) {
        assignment.dueDate = null;
      } else {
        const dueDateObj = new Date(dueDate);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        if (dueDateObj < todayStart) {
          return res.status(400).json({ error: "Due date must be today or in the future" });
        }
        assignment.dueDate = dueDateObj;
      }
    }

    if (status) {
      if (!["active", "completed", "expired", "cancelled"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      assignment.status = status;
    }

    if (notifications) {
      if (typeof notifications.inApp !== 'undefined') {
        assignment.notifications.inApp = !!notifications.inApp;
      }
      if (typeof notifications.email !== 'undefined') {
        assignment.notifications.email = !!notifications.email;
      }
    }

    await assignment.save();

    res.status(200).json({
      success: true,
      message: "Assignment updated successfully",
      data: assignment,
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error updating admin assignment:");
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * DELETE /api/v2/lms/admin/courses/assignments/:assignmentId
 * Admin permanently deletes an assignment
 */
exports.deleteAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      return res.status(400).json({ error: "Invalid assignment ID" });
    }

    const assignment = await CourseAssignment.findById(assignmentId);

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    await CourseAssignment.findByIdAndDelete(assignmentId);

    res.status(200).json({
      success: true,
      message: "Assignment deleted successfully",
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error deleting admin assignment:");
    res.status(500).json({ error: "Internal server error" });
  }
};
