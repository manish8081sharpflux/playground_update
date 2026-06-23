// backend/routes/v2/lms/student/spokenEnglish.js
// Epic 01 Story 04: Spoken English Video Recording Routes

const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to access :studentId from parent router

const spokenEnglishController = require('../../../../controllers/lms/student/spokenEnglishController');
const { authenticate } = require('../../../../middleware/auth');
const verifyStudentOwnership = require('../../../../middleware/verifyStudentOwnership');
const { lmsUpload } = require('../../../../middleware/upload');

/**
 * Spoken English Course Routes
 * Base path: /api/v2/lms/student/:studentId/courses/spoken-english
 */

// GET all tasks for spoken English course
router.get('/', authenticate, verifyStudentOwnership, spokenEnglishController.getSpokenEnglishTasks);

// GET specific task details
router.get('/:taskId', authenticate, verifyStudentOwnership, spokenEnglishController.getSpokenEnglishTask);

// GET student's submissions
router.get('/submissions/history', authenticate, verifyStudentOwnership, spokenEnglishController.getStudentSubmissions);

// POST submit video recording
router.post('/submissions', authenticate, verifyStudentOwnership, lmsUpload.single('file'), spokenEnglishController.submitVideoRecording);

module.exports = router;
