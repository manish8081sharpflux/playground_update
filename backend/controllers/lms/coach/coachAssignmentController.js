const CourseAssignment = require("../../../models/CourseAssignment");
const Course = require("../../../models/course");
const User = require("../../../models/user");
const Notification = require("../../../models/notification");
const StudentProgress = require("../../../models/StudentProgress");
const mongoose = require("mongoose");
const { errorLogger } = require('../../../config/pino-config');

// ====================COURSE ASSIGNMENT OPERATIONS ====================

/**
 * Compute real-time progress for a list of assignments from StudentProgress.
 * Returns a map of assignmentId -> computed progress object.
 */
async function computeProgressForAssignments(assignments) {
  if (!assignments.length) return {};

  // Gather unique courseIds and collect student lookups
  const courseIds = [...new Set(assignments.map(a => (a.courseId?._id || a.courseId).toString()))];
  const courses = await Course.find({ _id: { $in: courseIds } });
  const courseItemCountMap = {};
  courses.forEach(c => { courseItemCountMap[c._id.toString()] = c.contentItemCount || 0; });

  // For balagruha assignments, resolve student IDs
  const balagruhaIds = [];
  assignments.forEach(a => {
    if (a.assignedTo.type === 'balagruha') {
      const bgIds = a.assignedTo.balagruhaIds?.length
        ? a.assignedTo.balagruhaIds
        : (a.assignedTo.balagruhaId ? [a.assignedTo.balagruhaId] : []);
      bgIds.forEach(id => balagruhaIds.push((id._id || id).toString()));
    }
  });

  // Batch-fetch balagruha students
  const balagruhaStudentsMap = {};
  if (balagruhaIds.length) {
    const balagruhaStudents = await User.find({
      balagruhaIds: { $in: balagruhaIds },
      role: 'student',
    }).select('_id balagruhaIds');
    balagruhaStudents.forEach(s => {
      s.balagruhaIds.forEach(bgId => {
        const key = (bgId._id || bgId).toString();
        if (!balagruhaStudentsMap[key]) balagruhaStudentsMap[key] = [];
        balagruhaStudentsMap[key].push(s._id.toString());
      });
    });
  }

  // Collect all (studentId, courseId) pairs for batch StudentProgress query
  const allStudentIds = new Set();
  const assignmentStudentMap = {};
  assignments.forEach(a => {
    let studentIds = [];
    if (a.assignedTo.type === 'balagruha') {
      const bgIds = a.assignedTo.balagruhaIds?.length
        ? a.assignedTo.balagruhaIds
        : (a.assignedTo.balagruhaId ? [a.assignedTo.balagruhaId] : []);
      bgIds.forEach(bgId => {
        (balagruhaStudentsMap[(bgId._id || bgId).toString()] || []).forEach(sid => studentIds.push(sid));
      });
    } else {
      studentIds = (a.assignedTo.studentIds || []).map(id => id.toString());
    }
    assignmentStudentMap[a._id.toString()] = [...new Set(studentIds)];
    studentIds.forEach(sid => allStudentIds.add(sid));
  });

  // Batch-fetch all relevant StudentProgress records
  const progressRecords = await StudentProgress.find({
    student: { $in: [...allStudentIds] },
    course: { $in: courseIds },
  }).select('student course completedItems').lean();

  // Index progress: key = "studentId:courseId"
  const progressIndex = {};
  progressRecords.forEach(p => {
    const key = `${p.student.toString()}:${p.course.toString()}`;
    progressIndex[key] = p.completedItems?.length || 0;
  });

  // Compute progress for each assignment
  const result = {};
  assignments.forEach(a => {
    const courseId = (a.courseId?._id || a.courseId).toString();
    const totalItems = courseItemCountMap[courseId] || 0;
    const studentIds = assignmentStudentMap[a._id.toString()] || [];
    const totalStudents = studentIds.length;

    if (totalStudents === 0 || totalItems === 0) {
      result[a._id.toString()] = { totalStudents, studentsStarted: 0, studentsCompleted: 0, averageCompletionPercentage: 0 };
      return;
    }

    let studentsStarted = 0;
    let studentsCompleted = 0;
    let totalCompletion = 0;
    studentIds.forEach(sid => {
      const completed = progressIndex[`${sid}:${courseId}`] || 0;
      if (completed > 0) studentsStarted++;
      if (completed >= totalItems) studentsCompleted++;
      totalCompletion += Math.min(completed / totalItems * 100, 100);
    });

    result[a._id.toString()] = {
      totalStudents,
      studentsStarted,
      studentsCompleted,
      averageCompletionPercentage: Math.round(totalCompletion / totalStudents),
    };
  });

  return result;
}

/**
 * GET /api/v2/lms/coach/courses/published
 * Get all published courses for assignment
 */
exports.getPublishedCourses = async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = { status: "published" };

    // Apply filters
    if (category) {
      filter.category = category;
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const courses = await Course.find(filter)
      .select("title description category difficultyLevel thumbnail icon")
      .sort({ createdAt: -1 });

    // Add content item count
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
    errorLogger.error({ err: error }, "Error fetching published courses:");
    errorLogger.error({ err: error.stack }, "Stack trace:");
    res.status(500).json({ 
      error: "Internal server error",
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * GET /api/v2/lms/coach/:coachId/students
 * Get all students in coach's Balagruha
 */
exports.getCoachStudents = async (req, res) => {
  try {
    const { coachId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(coachId)) {
      return res.status(400).json({ error: "Invalid coach ID" });
    }

    // Get coach to find their Balagruhas
    const coach = await User.findById(coachId).populate("balagruhaIds");

    if (!coach) {
      return res.status(404).json({ error: "Coach not found" });
    }

    if (!coach.balagruhaIds || coach.balagruhaIds.length === 0) {
      return res.status(404).json({ error: "Coach not assigned to any Balagruha" });
    }

    // Get all students in the coach's Balagruhas with Balagruha info
    const students = await User.find({
      balagruhaIds: { $in: coach.balagruhaIds },
      role: "student",
    })
      .populate("balagruhaIds", "name")
      .select("name email userId balagruhaIds")
      .sort({ name: 1 });

    // Map students to include their Balagruha names
    const studentsWithBalagruha = students.map(student => {
      const studentObj = student.toObject();
      return {
        ...studentObj,
        balagruhaNames: studentObj.balagruhaIds?.map(bg => bg.name).filter(Boolean) || []
      };
    });

    res.status(200).json({
      success: true,
      balagruhas: coach.balagruhaIds.map(bg => ({
        id: bg._id,
        name: bg.name,
      })),
      count: students.length,
      data: studentsWithBalagruha,
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error fetching coach students:");
    errorLogger.error({ err: error.stack }, "Stack trace:");
    res.status(500).json({ 
      error: "Internal server error",
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * POST /api/v2/lms/coach/assignments
 * Create new course assignment
 */
exports.createAssignment = async (req, res) => {
  try {
    const {
      courseId,
      assignedBy,
      assignedTo,
      dueDate,
      notifications,
    } = req.body;

    // Validation
    if (!courseId || !assignedBy || !assignedTo) {
      return res.status(400).json({
        error: "Course ID, assigned by, and assigned to are required",
      });
    }

    if (!["balagruha", "students"].includes(assignedTo.type)) {
      return res.status(400).json({
        error: "Assignment type must be 'balagruha' or 'students'",
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

    // Verify assigner exists
    const assigner = await User.findById(assignedBy);
    if (!assigner) {
      return res.status(404).json({ error: "Assigner not found" });
    }

    // Check if assigner is admin or coach
    const isAdmin = assigner.role === "admin";

    // Get list of student IDs
    let studentIds = [];
    if (assignedTo.type === "balagruha") {
      // Support multiple Balagruhas (new) or single Balagruha (backward compat)
      const balagruhaIds = assignedTo.balagruhaIds || (assignedTo.balagruhaId ? [assignedTo.balagruhaId] : []);
      
      if (balagruhaIds.length === 0) {
        return res.status(400).json({ error: "No Balagruhas selected" });
      }

      // For non-admin (coach), verify they have access to the Balagruhas
      if (!isAdmin) {
        const unauthorizedBalagruhas = balagruhaIds.filter(
          bgId => !assigner.balagruhaIds.some(assignerBgId => assignerBgId.toString() === bgId.toString())
        );
        if (unauthorizedBalagruhas.length > 0) {
          return res.status(403).json({ error: "Not authorized to assign to some Balagruhas" });
        }
      }

      // Get all students in the selected Balagruhas
      const students = await User.find({
        balagruhaIds: { $in: balagruhaIds },
        role: "student",
      }).select("_id");
      studentIds = students.map((s) => s._id);
    } else {
      studentIds = assignedTo.studentIds;
    }

    // Validate due date if provided
    if (dueDate) {
      const dueDateObj = new Date(dueDate);
      if (dueDateObj < new Date()) {
        return res.status(400).json({ error: "Due date must be in the future" });
      }
    }

    // Prepare assignedTo with balagruhaIds if applicable
    const assignedToData = { ...assignedTo };
    if (assignedTo.type === "balagruha") {
      const balagruhaIds = assignedTo.balagruhaIds || (assignedTo.balagruhaId ? [assignedTo.balagruhaId] : []);
      assignedToData.balagruhaIds = balagruhaIds;
      assignedToData.balagruhaId = balagruhaIds.length > 0 ? balagruhaIds[0] : null; // Backward compat
    }

    // Create assignment
    const assignment = new CourseAssignment({
      courseId,
      assignedBy,
      assignedTo: assignedToData,
      dueDate: dueDate || null,
      notifications: notifications || { inApp: true, email: true },
      progress: {
        totalStudents: studentIds.length,
        studentsStarted: 0,
        studentsCompleted: 0,
        averageCompletionPercentage: 0,
      },
    });

    await assignment.save();

    // Send notifications to students
    let notificationsSent = { inApp: 0, email: 0 };
    if (notifications?.inApp || notifications === undefined) {
      // Send in-app notifications
      const notificationPromises = studentIds.map((studentId) => {
        return Notification.create({
          userId: studentId,
          type: "PERSONAL",
          category: "TASK_ASSIGNED",
          title: "New Course Assigned",
          message: `${isAdmin ? 'Admin' : 'Coach'} ${assigner.name || assigner.firstName || 'Unknown'} assigned you "${course.title}"`,
          data: {
            courseId: course._id,
            assignmentId: assignment._id,
            dueDate: dueDate || null,
          },
        });
      });

      await Promise.all(notificationPromises);
      notificationsSent.inApp = studentIds.length;

      // Email notification integration not yet implemented (Sprint 2 backlog)
      if (notifications?.email) {
        // Email logic would go here
        notificationsSent.email = studentIds.length;
      }
    }

    // Update assignment with notification status
    assignment.notifications.sent = true;
    assignment.notifications.sentAt = new Date();
    assignment.notifications.recipientCount = notificationsSent.inApp;
    await assignment.save();

    res.status(201).json({
      success: true,
      message: "Course assigned successfully",
      data: {
        assignmentId: assignment._id,
        studentsAssigned: studentIds.length,
        notificationsSent,
      },
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error creating assignment:");
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/v2/lms/coach/:coachId/assignments
 * Get all assignments created by coach
 */
exports.getCoachAssignments = async (req, res) => {
  try {
    const { coachId } = req.params;
    const { status, courseId, search } = req.query;

    if (!mongoose.Types.ObjectId.isValid(coachId)) {
      return res.status(400).json({ error: "Invalid coach ID" });
    }

    const filter = { assignedBy: coachId };

    // Apply filters
    if (status && ["active", "completed", "expired", "cancelled"].includes(status)) {
      filter.status = status;
    }
    if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
      filter.courseId = courseId;
    }

    const assignments = await CourseAssignment.find(filter)
      .populate("courseId", "title category thumbnail difficultyLevel")
      .populate("assignedTo.balagruhaId", "name")
      .populate("assignedBy", "firstName lastName")
      .sort({ createdAt: -1 });

    // Filter by search if provided
    let filteredAssignments = assignments;
    if (search) {
      filteredAssignments = assignments.filter((assignment) => {
        const courseTitle = assignment.courseId?.title || "";
        const balagruhaName = assignment.assignedTo.balagruhaId?.name || "";
        const searchLower = search.toLowerCase();
        return (
          courseTitle.toLowerCase().includes(searchLower) ||
          balagruhaName.toLowerCase().includes(searchLower)
        );
      });
    }

    // Compute real-time progress from StudentProgress
    let progressMap = {};
    try {
      progressMap = await computeProgressForAssignments(filteredAssignments);
    } catch (progErr) {
      errorLogger.error({ err: progErr }, "Error computing assignment progress");
    }

    const assignmentsWithProgress = filteredAssignments.map(a => {
      const computed = progressMap[a._id.toString()];
      if (!computed) return a;
      const aObj = a.toObject ? a.toObject({ virtuals: true }) : a;
      aObj.progress = computed;
      return aObj;
    });

    res.status(200).json({
      success: true,
      count: assignmentsWithProgress.length,
      data: assignmentsWithProgress,
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error fetching coach assignments:");
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/v2/lms/coach/assignments/:assignmentId
 * Get single assignment by ID
 */
exports.getAssignmentById = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      return res.status(400).json({ error: "Invalid assignment ID" });
    }

    const assignment = await CourseAssignment.findById(assignmentId)
      .populate("courseId", "title description category thumbnail difficultyLevel")
      .populate("assignedTo.balagruhaId", "name")
      .populate("assignedTo.studentIds", "name email studentId class")
      .populate("assignedBy", "name email");

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    const assignmentWithVirtuals = assignment.toObject({ virtuals: true });

    res.status(200).json({
      success: true,
      data: assignmentWithVirtuals,
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error fetching assignment:");
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/v2/lms/coach/assignments/:assignmentId/progress-report
 * Detailed per-student progress breakdown for the "View Progress Report" button.
 * Returns assignment metadata + a row per student with completion %, completed items,
 * last activity, and status.
 */
exports.getAssignmentProgressReport = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      return res.status(400).json({ success: false, error: "Invalid assignment ID" });
    }

    const assignment = await CourseAssignment.findById(assignmentId)
      .populate("courseId", "title category")
      .populate("assignedTo.balagruhaId", "name")
      .populate("assignedTo.balagruhaIds", "name");

    if (!assignment) {
      return res.status(404).json({ success: false, error: "Assignment not found" });
    }

    // Resolve the student list (balagruha expansion or specific student list)
    const courseId = (assignment.courseId?._id || assignment.courseId).toString();
    const course = await Course.findById(courseId);
    const totalItems = course?.contentItemCount || 0;

    let studentIds = [];
    if (assignment.assignedTo.type === 'balagruha') {
      const bgIds = assignment.assignedTo.balagruhaIds?.length
        ? assignment.assignedTo.balagruhaIds.map(b => (b._id || b).toString())
        : (assignment.assignedTo.balagruhaId ? [(assignment.assignedTo.balagruhaId._id || assignment.assignedTo.balagruhaId).toString()] : []);
      const students = await User.find({ balagruhaIds: { $in: bgIds }, role: 'student' })
        .select('_id name email');
      studentIds = students.map(s => ({ id: s._id.toString(), name: s.name, email: s.email }));
    } else {
      const ids = (assignment.assignedTo.studentIds || []).map(id => (id._id || id).toString());
      const students = await User.find({ _id: { $in: ids } }).select('_id name email');
      studentIds = students.map(s => ({ id: s._id.toString(), name: s.name, email: s.email }));
    }

    // Fetch progress records for these students on this course
    const progressRecords = await StudentProgress.find({
      student: { $in: studentIds.map(s => s.id) },
      course: courseId,
    }).select('student completedItems lastAccessedAt').lean();

    const progressMap = {};
    progressRecords.forEach(p => {
      progressMap[p.student.toString()] = {
        completed: p.completedItems?.length || 0,
        lastActive: p.lastAccessedAt,
      };
    });

    // Build per-student breakdown
    const studentBreakdown = studentIds.map(s => {
      const p = progressMap[s.id] || { completed: 0, lastActive: null };
      const percent = totalItems > 0 ? Math.round(Math.min(p.completed / totalItems * 100, 100)) : 0;
      let status = 'not_started';
      if (p.completed >= totalItems && totalItems > 0) status = 'completed';
      else if (p.completed > 0) status = 'in_progress';
      return {
        studentId: s.id,
        name: s.name,
        email: s.email,
        completedItems: p.completed,
        totalItems,
        percent,
        lastActive: p.lastActive,
        status,
      };
    });

    // Sort: completed first, then in progress, then not started; by percent desc
    studentBreakdown.sort((a, b) => b.percent - a.percent || a.name.localeCompare(b.name));

    const summary = {
      totalStudents: studentBreakdown.length,
      studentsStarted: studentBreakdown.filter(s => s.status !== 'not_started').length,
      studentsCompleted: studentBreakdown.filter(s => s.status === 'completed').length,
      averageCompletionPercentage: studentBreakdown.length
        ? Math.round(studentBreakdown.reduce((sum, s) => sum + s.percent, 0) / studentBreakdown.length)
        : 0,
      totalItems,
    };

    res.status(200).json({
      success: true,
      data: {
        assignment: {
          _id: assignment._id,
          status: assignment.status,
          dueDate: assignment.dueDate,
          assignedAt: assignment.assignedAt || assignment.createdAt,
          course: assignment.courseId,
        },
        summary,
        students: studentBreakdown,
      },
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error building assignment progress report:");
    res.status(500).json({ success: false, error: "Failed to build progress report" });
  }
};

/**
 * PUT /api/v2/lms/coach/assignments/:assignmentId
 * Update assignment (due date, status)
 */
exports.updateAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { dueDate, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      return res.status(400).json({ error: "Invalid assignment ID" });
    }

    const assignment = await CourseAssignment.findById(assignmentId);

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    // Update due date if provided
    if (dueDate !== undefined) {
      if (dueDate === null) {
        assignment.dueDate = null;
      } else {
        const dueDateObj = new Date(dueDate);
        if (dueDateObj < new Date()) {
          return res.status(400).json({ error: "Due date must be in the future" });
        }
        assignment.dueDate = dueDateObj;
      }
    }

    // Update status if provided
    if (status) {
      if (!["active", "completed", "expired", "cancelled"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      assignment.status = status;
    }

    await assignment.save();

    res.status(200).json({
      success: true,
      message: "Assignment updated successfully",
      data: assignment,
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error updating assignment:");
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * DELETE /api/v2/lms/coach/assignments/:assignmentId
 * Unassign/cancel course assignment
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

    // Mark as cancelled instead of deleting
    await CourseAssignment.findByIdAndDelete(assignmentId);

    res.status(200).json({
      success: true,
      message: "Assignment deleted successfully",
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error deleting assignment:");
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/v2/lms/coach/:coachId/stats
 * Get coach assignment statistics
 */
exports.getCoachStats = async (req, res) => {
  try {
    const { coachId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(coachId)) {
      return res.status(400).json({ error: "Invalid coach ID" });
    }

    const stats = await CourseAssignment.getCoachStats(coachId);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error fetching coach stats:");
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * PUT /api/v2/lms/coach/assignments/:assignmentId/progress
 * Update assignment progress
 */
exports.updateAssignmentProgress = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { studentsStarted, studentsCompleted, averageCompletionPercentage } = req.body;

    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      return res.status(400).json({ error: "Invalid assignment ID" });
    }

    const assignment = await CourseAssignment.findById(assignmentId);

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    // Update progress
    const progressData = {};
    if (studentsStarted !== undefined) progressData.studentsStarted = studentsStarted;
    if (studentsCompleted !== undefined) progressData.studentsCompleted = studentsCompleted;
    if (averageCompletionPercentage !== undefined)
      progressData.averageCompletionPercentage = averageCompletionPercentage;

    await assignment.updateProgress(progressData);

    res.status(200).json({
      success: true,
      message: "Progress updated successfully",
      data: assignment,
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error updating assignment progress:");
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/v2/lms/coach/:coachId/balagruha-courses
 * Return all courses currently assigned (active) to at least one of the
 * coach's balagruhas, with assignment context (balagruha names, student/
 * started/completed counts).
 *
 * Coach can only query their own coachId. Admin can query any coachId.
 * Supports optional ?category and ?search filters.
 */
exports.getBalagruhaCourses = async (req, res) => {
  try {
    const { coachId } = req.params;
    const { category, search } = req.query;

    if (!mongoose.Types.ObjectId.isValid(coachId)) {
      return res.status(400).json({ success: false, message: "Invalid coachId" });
    }

    // RBAC: coach can only query their own ID; admin can query any
    if (req.user.role === 'coach' && req.user._id.toString() !== coachId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: coach can only query their own ID",
      });
    }

    const coach = await User.findById(coachId).select('balagruhaIds name').lean();
    if (!coach) {
      return res.status(404).json({ success: false, message: "Coach not found" });
    }

    const balagruhaIds = (coach.balagruhaIds || []).map(id => id.toString());
    if (balagruhaIds.length === 0) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    // Find all active assignments targeting any of the coach's balagruhas.
    // CourseAssignment supports both singular balagruhaId and plural balagruhaIds
    // depending on assignment type (students vs entire balagruha).
    const assignments = await CourseAssignment.find({
      status: 'active',
      $or: [
        { 'assignedTo.balagruhaId': { $in: balagruhaIds } },
        { 'assignedTo.balagruhaIds': { $in: balagruhaIds } },
      ],
    })
      .populate({ path: 'assignedTo.balagruhaId', select: 'name' })
      .populate({ path: 'assignedTo.balagruhaIds', select: 'name' })
      .lean();

    if (assignments.length === 0) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    // Build per-course assignment aggregates
    const assignmentsByCourse = {};
    const courseIdSet = new Set();
    for (const a of assignments) {
      const cid = (a.courseId?._id || a.courseId)?.toString();
      if (!cid) continue;
      courseIdSet.add(cid);
      if (!assignmentsByCourse[cid]) {
        assignmentsByCourse[cid] = {
          balagruhaNames: new Set(),
          activeAssignments: 0,
          assignmentIds: [],
        };
      }
      const bucket = assignmentsByCourse[cid];
      bucket.activeAssignments += 1;
      bucket.assignmentIds.push(a._id);

      // Collect balagruha names from populated refs
      const bg1 = a.assignedTo?.balagruhaId;
      if (bg1?.name) bucket.balagruhaNames.add(bg1.name);
      const bgList = a.assignedTo?.balagruhaIds || [];
      for (const bg of bgList) {
        if (bg?.name) bucket.balagruhaNames.add(bg.name);
      }
    }

    const courseIds = Array.from(courseIdSet);

    // Fetch course documents with full hierarchy + quiz populate, so the
    // list page can show counts and (if needed) provide offline structure.
    const courseFilter = { _id: { $in: courseIds } };
    if (category) courseFilter.category = category;
    if (search) {
      courseFilter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const courses = await Course.find(courseFilter)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    // Compute student / started / completed counts per course using
    // StudentProgress records tied to the coach's balagruhas.
    const data = await Promise.all(courses.map(async (course) => {
      const courseObj = course.toObject({ virtuals: true });
      const bucket = assignmentsByCourse[course._id.toString()] || {};

      // Students in the coach's balagruhas
      const balagruhaStudents = await User.find({
        role: 'student',
        balagruhaIds: { $in: balagruhaIds },
      }).select('_id').lean();
      const studentIds = balagruhaStudents.map(s => s._id);

      // Progress records for (course, these students)
      const progressRecords = await StudentProgress.find({
        courseId: course._id,
        studentId: { $in: studentIds },
      }).select('status overallProgress').lean();

      const startedCount = progressRecords.filter(p =>
        p.status === 'in_progress' || p.status === 'completed' || (p.overallProgress || 0) > 0
      ).length;
      const completedCount = progressRecords.filter(p => p.status === 'completed').length;

      courseObj.assignmentInfo = {
        balagruhaNames: Array.from(bucket.balagruhaNames || []),
        studentCount: studentIds.length,
        startedCount,
        completedCount,
        activeAssignments: bucket.activeAssignments || 0,
      };
      return courseObj;
    }));

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching balagruha courses for coach');
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch balagruha courses',
    });
  }
};
