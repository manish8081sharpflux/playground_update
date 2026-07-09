const Course = require('../../../models/course');
const StudentProgress = require('../../../models/StudentProgress');
const Submission = require('../../../models/Submission');
const ArtGallery = require('../../../models/ArtGallery');
const ArtCompetition = require('../../../models/ArtCompetition');
const s3Service = require('../../../services/aws/s3');
const mongoose = require('mongoose');
const fs = require('fs');
const { errorLogger } = require('../../../config/pino-config');

/**
 * Art Course Controller - Epic 01 Story 03 / Story 12.9 (FIX-014)
 * Handles Art Course with 4 modes:
 * - Workshops: Guided art lessons with instructor videos
 * - Free Sketch: Open canvas for creative expression
 * - Art Stories: Drawing based on story prompts
 * - Competition: Themed art contests with leaderboard
 *
 * Replaced mock implementations with real DB queries + S3 uploads.
 */

// ==================== GET ART COURSE DATA ====================

/**
 * @desc Get Art Course data for all modes
 * @route GET /api/v2/lms/student/:studentId/courses/art
 * @access Private
 */
exports.getArtCourseData = async (req, res) => {
  try {
    const { studentId } = req.params;

    // 1. Fetch Art Courses (with createdBy populated for instructor name)
    const artCourses = await Course.find({ category: 'Art', status: 'published' })
      .populate('createdBy', 'firstName lastName')
      .lean();

    // 2. Fetch Progress
    const progressRecords = await StudentProgress.find({
      student: studentId,
      course: { $in: artCourses.map(c => c._id) }
    }).lean();

    const progressMap = new Map(progressRecords.map(p => [p.course.toString(), p]));

    // 3. Separate courses into workshop vs story modes
    const workshops = [];
    const stories = [];

    artCourses.forEach(course => {
      const progress = progressMap.get(course._id.toString());
      const createdBy = course.createdBy;
      const instructorName = createdBy
        ? `${createdBy.firstName || ''} ${createdBy.lastName || ''}`.trim()
        : 'Coach';

      const item = {
        id: course._id,
        title: course.title,
        instructor: instructorName,
        duration: course.duration ? parseInt(course.duration, 10) : 45,
        level: course.difficultyLevel || 'Beginner',
        videoUrl: null,
        thumbnailUrl: course.thumbnail,
        instructions: course.description,
        completed: progress?.status === 'completed',
        progress: progress?.completionPercentage || 0
      };

      // Extract video URL from first video content item
      if (course.modules?.[0]?.chapters?.[0]?.contentItems?.[0]?.type === 'video') {
        item.videoUrl = course.modules[0].chapters[0].contentItems[0].fileUrl;
      }

      // Discriminator: title containing 'story' -> Art Stories, else Workshop
      if (course.title.toLowerCase().includes('story')) {
        stories.push(item);
      } else {
        workshops.push(item);
      }
    });

    // 4. Fetch student's gallery from ArtGallery collection
    const gallery = await ArtGallery.find({ student: studentId })
      .sort({ createdAt: -1 })
      .lean();

    const galleryItems = gallery.map(g => ({
      id: g._id,
      title: g.title,
      artworkUrl: g.fileUrl,
      createdAt: g.createdAt,
      canvasSize: g.canvasSize,
      sessionDuration: g.metadata?.sessionDuration || 0,
      submitted: g.submitted,
      grade: null // Would be populated if submission was graded
    }));

    // 5. Fetch active competition
    const activeCompetition = await ArtCompetition.findOne({
      status: { $in: ['active', 'upcoming'] }
    })
      .populate('entries.student', 'firstName lastName')
      .lean();

    let competitionData = null;
    if (activeCompetition) {
      // Build leaderboard with student names
      const leaderboard = (activeCompetition.entries || [])
        .sort((a, b) => b.votes - a.votes)
        .slice(0, 10)
        .map((entry, idx) => ({
          rank: idx + 1,
          studentName: entry.student
            ? `${entry.student.firstName || ''} ${entry.student.lastName || ''}`.trim()
            : 'Anonymous',
          artworkUrl: entry.fileUrl,
          artworkTitle: entry.title,
          votes: entry.votes
        }));

      competitionData = {
        id: activeCompetition._id,
        theme: activeCompetition.theme,
        description: activeCompetition.description,
        deadline: activeCompetition.deadline,
        status: activeCompetition.status,
        prize: activeCompetition.prize,
        rules: activeCompetition.rules,
        judging: activeCompetition.judging,
        totalSubmissions: activeCompetition.entries?.length || 0,
        leaderboard
      };
    }

    const artCourseData = {
      success: true,
      modes: [
        {
          mode: 'workshops',
          workshops
        },
        {
          mode: 'art_stories',
          stories
        },
        {
          mode: 'competition',
          currentCompetition: competitionData
        },
        {
          mode: 'free_sketch',
          gallery: galleryItems
        }
      ]
    };

    res.json(artCourseData);
  } catch (error) {
    errorLogger.error({ err: error }, 'Get Art Course Data Error:');
    res.status(500).json({
      success: false,
      message: 'Server error while fetching Art Course data',
      error: error.message
    });
  }
};

// ==================== SUBMIT ARTWORK ====================

/**
 * @desc Submit artwork for grading or competition
 * @route POST /api/v2/lms/student/:studentId/submissions
 * @access Private
 */
exports.submitArtwork = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { type, mode, courseId, taskId, taskTitle, title } = req.body;
    let metadata = req.body.metadata;
    if (typeof metadata === 'string') {
      try { metadata = JSON.parse(metadata); } catch (_e) { metadata = {}; }
    }
    const file = req.file;

    // Validate required fields
    if (!type || type !== 'art') {
      return res.status(400).json({
        success: false,
        message: 'Invalid submission type. Must be "art".'
      });
    }

    if (!mode || !['workshop', 'free_sketch', 'art_story', 'competition'].includes(mode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mode. Must be one of: workshop, free_sketch, art_story, competition'
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No artwork file provided. Please upload an image.'
      });
    }

    // Upload to S3
    const uploadResult = await s3Service.uploadLMSContent(
      file.path,
      file.originalname,
      'image',
      file.mimetype
    );

    // Cleanup local temp file
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload artwork to storage',
        error: uploadResult.error
      });
    }

    // Handle competition entry separately
    if (mode === 'competition') {
      const competitionId = metadata?.competitionId || courseId;
      if (!competitionId) {
        return res.status(400).json({
          success: false,
          message: 'competitionId is required for competition submissions'
        });
      }

      const competition = await ArtCompetition.findById(competitionId);
      if (!competition) {
        return res.status(404).json({
          success: false,
          message: 'Competition not found'
        });
      }

      // Check if student already submitted
      const alreadyEntered = competition.entries.some(
        e => e.student.toString() === studentId
      );
      if (alreadyEntered) {
        return res.status(409).json({
          success: false,
          message: 'You have already submitted an entry to this competition'
        });
      }

      competition.entries.push({
        student: studentId,
        fileUrl: uploadResult.url,
        s3Key: uploadResult.s3Key,
        title: title || 'Untitled Entry',
        votes: 0,
        submittedAt: new Date()
      });
      await competition.save();

      return res.json({
        success: true,
        message: 'Competition entry submitted successfully!',
        fileUrl: uploadResult.url,
        metadata: { mode, competitionId, submittedAt: new Date().toISOString() }
      });
    }

    // For workshop / art_story / free_sketch modes, create a Submission record
    const resolvedCourseId = courseId || metadata?.workshopId || metadata?.storyId;

    const submission = await Submission.create({
      studentId,
      courseId: resolvedCourseId || new mongoose.Types.ObjectId(), // placeholder if no course
      taskId: taskId || `art-${mode}-${Date.now()}`,
      taskTitle: taskTitle || title || `Art ${mode} submission`,
      submissionType: 'art',
      fileUrl: uploadResult.url,
      thumbnailUrl: null,
      metadata: {
        fileSize: file.size,
        mimeType: file.mimetype,
        dimensions: metadata?.dimensions || null,
      },
      status: 'pending',
      offlineSubmission: false,
    });

    res.json({
      success: true,
      submissionId: submission._id,
      fileUrl: uploadResult.url,
      message: 'Artwork submitted successfully! Your coach will review it soon.',
      metadata: {
        mode,
        submittedAt: submission.submittedAt,
        ...metadata
      }
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Submit Artwork Error:');
    res.status(500).json({
      success: false,
      message: 'Server error while submitting artwork',
      error: error.message
    });
  }
};

// ==================== SAVE TO GALLERY ====================

/**
 * @desc Save artwork to student's personal gallery (Free Sketch mode)
 * @route POST /api/v2/lms/student/:studentId/gallery
 * @access Private
 */
exports.saveToGallery = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { title, sessionDuration } = req.body;
    let canvasSize = req.body.canvasSize;
    if (typeof canvasSize === 'string') {
      try { canvasSize = JSON.parse(canvasSize); } catch (_e) { canvasSize = null; }
    }
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No artwork file provided. Please upload an image.'
      });
    }

    // Upload to S3
    const uploadResult = await s3Service.uploadLMSContent(
      file.path,
      file.originalname,
      'image',
      file.mimetype
    );

    // Cleanup local temp file
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload artwork to storage',
        error: uploadResult.error
      });
    }

    // Save gallery record to DB
    const galleryItem = await ArtGallery.create({
      student: studentId,
      title: title || 'Untitled Sketch',
      fileUrl: uploadResult.url,
      s3Key: uploadResult.s3Key,
      canvasSize: canvasSize || { width: 1024, height: 768 },
      metadata: {
        fileSize: file.size,
        mimeType: file.mimetype,
        sessionDuration: sessionDuration ? parseInt(sessionDuration, 10) : 0,
      },
      submitted: false,
    });

    res.json({
      success: true,
      artwork: {
        id: galleryItem._id,
        title: galleryItem.title,
        artworkUrl: galleryItem.fileUrl,
        createdAt: galleryItem.createdAt,
        canvasSize: galleryItem.canvasSize,
        sessionDuration: galleryItem.metadata.sessionDuration,
        submitted: false,
      },
      message: 'Artwork saved to your gallery!'
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Save to Gallery Error:');
    res.status(500).json({
      success: false,
      message: 'Server error while saving artwork',
      error: error.message
    });
  }
};

// ==================== GET GALLERY ====================

/**
 * @desc Get student's art gallery
 * @route GET /api/v2/lms/student/:studentId/gallery
 * @access Private
 */
exports.getGallery = async (req, res) => {
  try {
    const { studentId } = req.params;

    const gallery = await ArtGallery.find({ student: studentId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      gallery: gallery.map(g => ({
        id: g._id,
        title: g.title,
        artworkUrl: g.fileUrl,
        createdAt: g.createdAt,
        canvasSize: g.canvasSize,
        sessionDuration: g.metadata?.sessionDuration || 0,
        submitted: g.submitted,
      }))
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Get Gallery Error:');
    res.status(500).json({
      success: false,
      message: 'Server error while fetching gallery',
      error: error.message
    });
  }
};

// ==================== DELETE GALLERY ITEM ====================

/**
 * @desc Delete artwork from gallery
 * @route DELETE /api/v2/lms/student/:studentId/gallery/:artworkId
 * @access Private
 */
exports.deleteGalleryItem = async (req, res) => {
  try {
    const { studentId, artworkId } = req.params;

    const item = await ArtGallery.findOne({ _id: artworkId, student: studentId });
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Gallery item not found'
      });
    }

    // Delete from S3
    if (item.s3Key) {
      await s3Service.deleteLMSContent(item.s3Key);
    }

    await ArtGallery.deleteOne({ _id: artworkId });

    res.json({
      success: true,
      message: 'Artwork deleted from gallery'
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Delete Gallery Item Error:');
    res.status(500).json({
      success: false,
      message: 'Server error while deleting gallery item',
      error: error.message
    });
  }
};

// ==================== COMPETITION CRUD ====================

/**
 * @desc Get active competition
 * @route GET /api/v2/lms/student/:studentId/courses/art/competition
 * @access Private
 */
exports.getActiveCompetition = async (req, res) => {
  try {
    const competition = await ArtCompetition.findOne({
      status: { $in: ['active', 'upcoming'] }
    })
      .populate('entries.student', 'firstName lastName')
      .lean();

    if (!competition) {
      return res.json({ success: true, competition: null });
    }

    const leaderboard = (competition.entries || [])
      .sort((a, b) => b.votes - a.votes)
      .slice(0, 10)
      .map((entry, idx) => ({
        rank: idx + 1,
        studentName: entry.student
          ? `${entry.student.firstName || ''} ${entry.student.lastName || ''}`.trim()
          : 'Anonymous',
        artworkUrl: entry.fileUrl,
        artworkTitle: entry.title,
        votes: entry.votes
      }));

    res.json({
      success: true,
      competition: {
        id: competition._id,
        theme: competition.theme,
        description: competition.description,
        deadline: competition.deadline,
        status: competition.status,
        prize: competition.prize,
        rules: competition.rules,
        judging: competition.judging,
        totalSubmissions: competition.entries?.length || 0,
        leaderboard
      }
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Get Active Competition Error:');
    res.status(500).json({
      success: false,
      message: 'Server error while fetching competition',
      error: error.message
    });
  }
};
