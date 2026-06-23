/**
 * Life Skills Routes - Epic 01 Story 05
 * Voice recording + MCQ quiz routes for Life Skills course
 */

const express = require('express');
const router = express.Router({ mergeParams: true }); // Enables access to :studentId from parent route

const lifeSkillsController = require('../../../../controllers/lms/student/lifeSkillsController');
const { authenticate } = require('../../../../middleware/auth');
const verifyStudentOwnership = require('../../../../middleware/verifyStudentOwnership');
const { lmsUpload } = require('../../../../middleware/upload');

// Get all Life Skills tasks (voice questions + quiz)
router.get('/', authenticate, verifyStudentOwnership, lifeSkillsController.getLifeSkillsTasks);

// Voice Recording Routes
router.get('/voice/:taskId', authenticate, verifyStudentOwnership, lifeSkillsController.getVoiceTask);
router.post('/voice/submit', authenticate, verifyStudentOwnership, lmsUpload.single('file'), lifeSkillsController.submitVoiceRecording);
router.post('/mark-complete', authenticate, verifyStudentOwnership, lifeSkillsController.markItemComplete);

// MCQ Quiz Routes
router.get('/quiz/:quizId', authenticate, verifyStudentOwnership, lifeSkillsController.getQuiz);
router.post('/quiz/submit', authenticate, verifyStudentOwnership, lifeSkillsController.submitQuiz);

// Submission History
router.get('/submissions', authenticate, verifyStudentOwnership, lifeSkillsController.getSubmissionHistory);

module.exports = router;
