const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to access :studentId from parent router
const artCourseController = require('../../../../controllers/lms/student/artCourseController');
const computerAppsController = require('../../../../controllers/lms/student/computerAppsController');
const { authenticate } = require('../../../../middleware/auth');
const verifyStudentOwnership = require('../../../../middleware/verifyStudentOwnership');
const { lmsUpload } = require('../../../../middleware/upload');

// Single file upload middleware for art submissions (field name: 'artwork')
const artUpload = lmsUpload.single('artwork');

/**
 * Art Course Routes - Epic 01 Story 03 / Story 12.9 (FIX-014)
 * Base path: /api/v2/lms/student/:studentId/courses/art
 */

// Get Art Course data (all modes: workshops, free_sketch, art_stories, competition)
router.get('/', authenticate, verifyStudentOwnership, artCourseController.getArtCourseData);

// Get active competition
router.get('/competition', authenticate, verifyStudentOwnership, artCourseController.getActiveCompetition);

// Get student's gallery
router.get('/gallery', authenticate, verifyStudentOwnership, artCourseController.getGallery);

// Get and submit quizzes linked inside Art course content items
router.get('/quiz/:quizId', authenticate, verifyStudentOwnership, computerAppsController.getQuiz);
router.post('/quiz/submit', authenticate, verifyStudentOwnership, computerAppsController.submitQuiz);

// Stream a chapter content file (PDF/video/audio/image) for the student Art page
router.get('/content/:contentItemId/file', authenticate, verifyStudentOwnership, artCourseController.getContentItemFile);

// Submit artwork for grading or competition (with file upload)
router.post('/submissions', authenticate, verifyStudentOwnership, artUpload, artCourseController.submitArtwork);

// Save artwork to personal gallery (with file upload)
router.post('/gallery', authenticate, verifyStudentOwnership, artUpload, artCourseController.saveToGallery);

// Delete gallery item
router.delete('/gallery/:artworkId', authenticate, verifyStudentOwnership, artCourseController.deleteGalleryItem);

module.exports = router;
