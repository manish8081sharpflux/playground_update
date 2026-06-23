const express = require("express");
const { authorize, authenticate } = require("../../middleware/auth");
const { validateBalagruhaAccess } = require("../../middleware/checkPermission");
const {
  createUserV1,
  createStudentMedicalRecords,
  getUserManagementOverviewDetails,
  createStudentAttendance,
  createManualAttendance,
  getStudentListByBalagruhaIdWithAttendance,
  getUsersByRoleAndBalagruhaId,
  getUserById,
  getUserInfo,
  updateUserPassword,
  assignBalagruhaToUser,
  updateUserDetails,
  deleteUserById,
  getUserListByAssignedBalagruhaByRole,
} = require("../../controllers/userController");
const { getStudentProfile } = require("../../controllers/profileController");
// const upload = require('../../middleware/upload'); // Multer middleware for file uploads
const router = express.Router();
const { upload } = require("../../middleware/upload");
// API for create USER
router.post(
  "/",
  authenticate,
  authorize("User Management", "Create"),
  // upload.fields([
  //     { name: 'facialData', maxCount: 5 }, // Up to 5 files for facialData
  //     // { name: 'medicalHistory', maxCount:  } // 1 file for medicalHistory
  // ]),
  // faceDataUpload.single("facialData"),
  // upload.single('image'),
  upload.any(),
  createUserV1
);
// API for create the medical record for the student
router.put(
  "/medical-records",
  authenticate,
  authorize("User Management", "Create"),
  createStudentMedicalRecords
);
// API for fetch the user management details
router.get(
  "/management/overview",
  authenticate,
  authorize("User Management", "Read"),
  getUserManagementOverviewDetails
);
// API for fetch the list of students by balagruha id
router.get(
  "/students/:balagruhaId",
  authenticate,
  authorize("User Management", "Read"),
  validateBalagruhaAccess,
  getUserManagementOverviewDetails
);
// API for create attendance for the student
router.post(
  "/students/attendance",
  authenticate,
  authorize("User Management", "Create"),
  createStudentAttendance
);
// API for create manual attendance (manual override when FR fails or unavailable)
// Sprint 1.1 Epic 02 Story 01 Task 9: Manual Override Workflow
// Ensures FR is an enhancement, not a blocker for attendance workflow
router.post(
  "/students/attendance/manual",
  authenticate,
  authorize("User Management", "Create"),
  createManualAttendance
);
// API for fetch the student list in balagruha with the attendance by given date (pass date as query )
router.get(
  "/students/attendance/:balagruhaId",
  authenticate,
  authorize("User Management", "Read"),
  validateBalagruhaAccess,
  getStudentListByBalagruhaIdWithAttendance
);
// API for find users by role and balagruha id (pass balagruhaId as query parameter)
router.get(
  "/role/:role",
  authenticate,
  authorize("User Management", "Read"),
  getUsersByRoleAndBalagruhaId
);
// API for fetch detailed user information by userId
router.get(
  "/info/:userId",
  authenticate,
  authorize("User Management", "Read"),
  getUserInfo
);
// API for reset the user password by admin
router.put(
  "/password/reset",
  authenticate,
  authorize("User Management", "Update"),
  updateUserPassword
);
// API for assign balagruha to the user
router.put(
  "/assign/balagruha",
  authenticate,
  authorize("User Management", "Update"),
  assignBalagruhaToUser
);
// API for get student profile with aggregated data (Sprint5-Story-16)
// IMPORTANT: Must be BEFORE generic /:userId routes to avoid route shadowing
router.get(
  "/:userId/profile",
  authenticate,
  getStudentProfile
);
// API for update user details by userId
router.put(
  "/:userId",
  authenticate,
  authorize("User Management", "Update"),
  upload.any(),
  updateUserDetails
);

// API for delete user by userId
router.delete(
  "/:userId",
  authenticate,
  authorize("User Management", "Delete"),
  deleteUserById
);
// API for fetch the user list by role with assigned balagruhaIds
router.get(
  "/assigned/users",
  authenticate,
  authorize("User Management", "Read"),
  getUserListByAssignedBalagruhaByRole
);
module.exports = router;
