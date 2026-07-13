const CourseAssignment = require('../models/CourseAssignment');

const TERMINAL_STATUSES = ['completed', 'expired', 'cancelled'];

const getIdString = (value) => {
  if (!value) return null;
  return value._id?.toString() || value.toString();
};

const statusLabels = {
  active: 'Active',
  completed: 'Completed',
  expired: 'Expired',
  cancelled: 'Course Cancelled',
};

const unsubmittedStatusByCourseStatus = {
  active: null,
  completed: 'not_submitted',
  expired: 'missed',
  cancelled: 'cancelled',
};

const findCourseAssignmentForStudent = async (student, courseId) => {
  if (!student || !courseId) return null;

  const studentId = getIdString(student);
  const balagruhaIds = (student.balagruhaIds || []).map(getIdString).filter(Boolean);

  return CourseAssignment.findOne({
    courseId,
    $or: [
      { 'assignedTo.studentIds': studentId },
      { 'assignedTo.balagruhaIds': { $in: balagruhaIds } },
      { 'assignedTo.balagruhaId': { $in: balagruhaIds } },
    ],
  }).sort({ assignedAt: -1, createdAt: -1 }).lean();
};

const getStudentCourseAccess = async (student, courseId) => {
  const assignment = await findCourseAssignmentForStudent(student, courseId);
  const normalizedStatus = (assignment?.status || 'active').toLowerCase();
  const courseAssignmentStatus = statusLabels[normalizedStatus] ? normalizedStatus : 'active';

  return {
    assignmentId: assignment?._id || null,
    courseAssignmentStatus,
    courseStatus: statusLabels[courseAssignmentStatus],
    isCourseReadOnly: TERMINAL_STATUSES.includes(courseAssignmentStatus),
    canSubmitAssignments: courseAssignmentStatus === 'active',
    unsubmittedAssignmentStatus: unsubmittedStatusByCourseStatus[courseAssignmentStatus],
    dueDate: assignment?.dueDate || null,
  };
};

const decorateAssignmentStatus = ({ baseStatus, hasSubmission, courseAccess }) => {
  if (hasSubmission) return baseStatus;
  return courseAccess?.unsubmittedAssignmentStatus || baseStatus;
};

const assertStudentCanSubmitForCourse = async ({ student, courseId }) => {
  const access = await getStudentCourseAccess(student, courseId);
  if (!access.canSubmitAssignments) {
    const error = new Error(`${access.courseStatus} courses are read-only. Submissions and uploads are disabled.`);
    error.statusCode = 403;
    error.courseAccess = access;
    throw error;
  }
  return access;
};

module.exports = {
  decorateAssignmentStatus,
  getStudentCourseAccess,
  assertStudentCanSubmitForCourse,
};