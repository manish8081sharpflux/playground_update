// backend/routes/v2/lms/student/spokenEnglish.js
// Epic 01 Story 04: Spoken English Video Recording Routes

const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to access :studentId from parent router

const spokenEnglishController = require('../../../../controllers/lms/student/spokenEnglishController');
const computerAppsController = require('../../../../controllers/lms/student/computerAppsController');
const { authenticate } = require('../../../../middleware/auth');
const verifyStudentOwnership = require('../../../../middleware/verifyStudentOwnership');
const { lmsUpload } = require('../../../../middleware/upload');

/**
 * Spoken English Course Routes
 * Base path: /api/v2/lms/student/:studentId/courses/spoken-english
 */

// GET all tasks for spoken English course
router.get('/', authenticate, verifyStudentOwnership, spokenEnglishController.getSpokenEnglishTasks);

// Stream a content file used by Spoken English task instructions
router.get('/content/:contentItemId/file', authenticate, verifyStudentOwnership, spokenEnglishController.getContentItemFile);
router.post('/mark-complete', authenticate, verifyStudentOwnership, spokenEnglishController.markContentComplete);

// GET student's submissions
router.get('/submissions/history', authenticate, verifyStudentOwnership, spokenEnglishController.getStudentSubmissions);

// Reuse the generic student quiz flow for quiz content added to Spoken English courses
router.get('/quiz/:quizId', authenticate, verifyStudentOwnership, computerAppsController.getQuiz);
router.post('/quiz/submit', authenticate, verifyStudentOwnership, computerAppsController.submitQuiz);

// GET specific task details
router.get('/:taskId', authenticate, verifyStudentOwnership, spokenEnglishController.getSpokenEnglishTask);

// POST submit video recording
router.post('/submissions', authenticate, verifyStudentOwnership, lmsUpload.single('file'), spokenEnglishController.submitVideoRecording);

module.exports = router;
