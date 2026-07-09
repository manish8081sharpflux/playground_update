const express = require("express");
const router = express.Router();
const taskController = require("../controllers/taskController");
const { upload } = require("../middleware/upload"); // Multer middleware for file uploads
const { authenticate, authorize } = require("../middleware/auth"); // Authentication and authorization middleware
const { validateBalagruhaAccess } = require("../middleware/checkPermission");

// Destructure methods from taskController
const { createTask, updateTask, getAllTasks } = taskController;

// Create a new task (with file upload)
router.post(
  "/",
  authenticate, // Ensure the user is authenticated
  authorize("Task Management", "Create"), // Ensure the user has permission to create tasks
  upload.array("attachments", 5), // Allow up to 5 file uploads
  taskController.createTaskV1
);

// Update an existing task
router.put(
  "/:id",
  authenticate, // Ensure the user is authenticated
  authorize("Task Management", "Update"), // Ensure the user has permission to update tasks
  updateTask
);

// Get all tasks (with optional filters and pagination)
router.get(
  "/",
  authenticate, // Ensure the user is authenticated
  authorize("Task Management", "Read"), // Ensure the user has permission to read tasks
  // getAllTasks
  taskController.getAllTasksV1
);

// // Add a comment to a task
// router.post(
// '/:id/comments',
// authenticate, // Ensure the user is authenticated
// authorize('Task Management', 'Update'), // Ensure the user has permission to update tasks
// addCommentToTask
// );

// API for fetch all tasks for the user
router.get(
  "/user/:userId",
  authenticate,
  authorize("Task Management", "Read"),
  taskController.getAllTasksForUser
);
// API for task management page
router.get(
  "/overview",
  authenticate,
  authorize("Task Management", "Read"),
  taskController.getTaskOverview
);
router.get(
  "/assignable-users",
  authenticate,
  authorize("Task Management", "Read"),
  taskController.getAssignableTaskUsers
);
// API for fetch the task list by balagruha id and filter
router.post(
  "/all/list",
  authenticate,
  authorize("Task Management", "Read"),
  taskController.getTaskListByBalagruhaIdAndFilter
);
// API for fetch the task overview details by balagruha id
router.get(
  "/overview/details/:balagruhaId",
  authenticate,
  authorize("Task Management", "Read"),
  validateBalagruhaAccess,
  taskController.getTaskOverviewDetailsByBalagruhaId
);
// API for update task status
router.put(
  "/status/:id",
  authenticate,
  authorize("Task Management", "Update"),
  taskController.updateTaskStatus
);
// API for add comments on task
router.post(
  "/comment/:taskId",
  authenticate,
  authorize("Task Management", "Update"),
  upload.fields([
    { name: "attachments", maxCount: 5 }, // Up to 5 files for facialData
  ]),
  taskController.addCommentToTask
);
// API for update/ set the task attachment
router.put(
  "/attachments/:taskId",
  authenticate,
  authorize("Task Management", "Update"),
  upload.fields([
    { name: "attachments", maxCount: 5 }, // Up to 5 files for facialData
  ]),
  taskController.addOrUpdateTaskAttachment
);
// API for delete the task attachment
router.delete(
  "/attachments/:taskId/:attachmentId",
  authenticate,
  authorize("Task Management", "Update"),
  taskController.deleteTaskAttachment
);
// API for delete the task comment
router.delete(
  "/comment/:taskId/:commentId",
  authenticate,
  authorize("Task Management", "Update"),
  taskController.deleteTaskComment
);
// API for fetch task details by task id
router.get(
  "/:taskId",
  authenticate,
  authorize("Task Management", "Read"),
  taskController.getTaskDetailsById
);

module.exports = router;
