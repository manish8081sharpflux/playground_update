const Course = require('../../../models/course');
const StudentProgress = require('../../../models/StudentProgress');
const Submission = require('../../../models/Submission');
const ArtGallery = require('../../../models/ArtGallery');
const ArtCompetition = require('../../../models/ArtCompetition');
const ContentLibrary = require('../../../models/ContentLibrary');
const s3Service = require('../../../services/aws/s3');
const mongoose = require('mongoose');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { errorLogger } = require('../../../config/pino-config');

const formatGalleryItem = (galleryItem) => {
  const submission = galleryItem.submissionId && galleryItem.submissionId.status
    ? galleryItem.submissionId
    : null;

  return {
    id: galleryItem._id,
    title: galleryItem.title,
    artworkUrl: galleryItem.fileUrl,
    createdAt: galleryItem.createdAt,
    canvasSize: galleryItem.canvasSize,
    sessionDuration: galleryItem.metadata?.sessionDuration || 0,
    submitted: galleryItem.submitted,
    submissionId: submission?._id || galleryItem.submissionId || null,
    reviewStatus: submission?.status || (galleryItem.submitted ? 'pending' : null),
    grade: submission?.grade || null,
  };
};

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

const mapContentItemForStudent = (contentItem, module, chapter, courseId, completedItemIds, gradedTaskIds) => {
  const itemId = contentItem._id?.toString();
  return {
    id: contentItem._id,
    courseId,
    chapterId: chapter._id,
    type: contentItem.type,
    title: contentItem.title,
    description: contentItem.description || '',
    order: contentItem.order || 0,
    fileUrl: contentItem.fileUrl || null,
    externalUrl: contentItem.externalUrl || contentItem.fileUrl || null,
    textContent: contentItem.textContent || '',
    metadata: contentItem.metadata || {},
    quizData: contentItem.quizData || null,
    quizRef: contentItem.quizRef || null,
    taskData: contentItem.taskData || null,
    moduleTitle: module.title,
    chapterTitle: chapter.title,
    completed:
      (itemId && completedItemIds.has(itemId)) ||
      (contentItem.type === 'task' && gradedTaskIds.includes(itemId))
  };
};

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findContentItemById = (course, contentItemId) => {
  for (const module of course.modules || []) {
    for (const chapter of module.chapters || []) {
      const contentItem = (chapter.contentItems || []).find(item =>
        String(item._id) === String(contentItemId)
      );
      if (contentItem) {
        return { module, chapter, contentItem };
      }
    }
  }

  return null;
};

const contentTypeForItem = (item) => {
  if (item.type === 'pdf') return 'application/pdf';
  if (item.type === 'video') return 'video/mp4';
  if (item.type === 'audio') return 'audio/mpeg';
  if (item.type === 'image') return 'image/png';
  return 'application/octet-stream';
};

const decodeUrlPart = (value = '') => {
  try {
    return decodeURIComponent(value);
  } catch (_error) {
    return value;
  }
};

const markContentItemViewed = async (studentId, course, contentItem) => {
  if (!studentId || !course?._id || !contentItem?._id) return;

  const itemId = contentItem._id;
  const itemType = contentItem.type || 'text';
  let progress = await StudentProgress.findOne({ student: studentId, course: course._id });

  if (!progress) {
    progress = new StudentProgress({
      student: studentId,
      course: course._id,
      startedAt: new Date(),
      status: 'in_progress',
      completedItems: []
    });
  }

  const existingItem = (progress.completedItems || []).find(item =>
    item.itemId?.toString() === itemId.toString()
  );

  if (existingItem) {
    existingItem.completedAt = new Date();
    existingItem.itemType = itemType;
  } else {
    progress.completedItems.push({
      itemId,
      itemType,
      completedAt: new Date()
    });
  }

  const visibleItemIds = [];
  course.modules?.forEach(module => module.chapters?.forEach(chapter =>
    (chapter.contentItems || []).forEach(item => {
      if (item?._id) visibleItemIds.push(item._id.toString());
    })
  ));

  const completedItemIds = new Set(
    (progress.completedItems || [])
      .map(item => item.itemId?.toString())
      .filter(Boolean)
  );
  const completedVisibleItems = visibleItemIds.filter(id => completedItemIds.has(id)).length;

  progress.completionPercentage = visibleItemIds.length > 0
    ? Math.round((completedVisibleItems / visibleItemIds.length) * 100)
    : 0;
  progress.status = progress.completionPercentage >= 100 ? 'completed' : 'in_progress';
  if (progress.status === 'completed' && !progress.completedAt) {
    progress.completedAt = new Date();
  }
  progress.lastAccessedAt = new Date();

  await progress.save();
};

const resolveSubmissionFileUrl = async (submission, req) => {
  if (!submission?.fileUrl) return submission?.fileUrl || null;

  if (submission.fileUrl.startsWith('/uploads/')) {
    return `${req.protocol}://${req.get('host')}${submission.fileUrl}`;
  }

  if (submission.fileUrl.includes('/uploads/')) {
    return submission.fileUrl;
  }

  const s3Key = submission.s3Key || s3Service.extractS3KeyFromUrl(submission.fileUrl);
  if (!s3Key) return submission.fileUrl;

  const signedUrl = await s3Service.generateLMSContentDownloadUrl(s3Key, 60 * 60);
  return signedUrl.success ? signedUrl.downloadUrl : submission.fileUrl;
};

const formatTaskSubmission = async (submission, req) => {
  if (!submission) return null;
  const fileUrl = await resolveSubmissionFileUrl(submission, req);
  return {
    id: submission._id,
    submissionId: submission._id,
    taskId: submission.taskId,
    chapterId: submission.chapterId || null,
    submissionType: submission.submissionType,
    fileUrl,
    thumbnailUrl: submission.thumbnailUrl || fileUrl,
    originalFileUrl: submission.fileUrl,
    status: submission.status,
    grade: submission.grade || null,
    submittedAt: submission.submittedAt,
    metadata: submission.metadata || {},
  };
};

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
    const gradedSubmissionQuery = Submission.find({
      studentId,
      courseId: { $in: artCourses.map(c => c._id) },
      submissionType: 'art',
      status: 'graded'
    });
    const gradedSubmissions = gradedSubmissionQuery?.select
      ? await gradedSubmissionQuery.select('courseId taskId').lean()
      : [];

    const gradedSubmissionMap = new Map();
    gradedSubmissions.forEach(submission => {
      const courseKey = submission.courseId?.toString();
      const taskKey = submission.taskId?.toString();
      if (!courseKey || !taskKey) return;
      if (!gradedSubmissionMap.has(courseKey)) {
        gradedSubmissionMap.set(courseKey, []);
      }
      gradedSubmissionMap.get(courseKey).push(taskKey);
    });

    const artSubmissionQuery = Submission.find({
      studentId,
      courseId: { $in: artCourses.map(c => c._id) },
      submissionType: 'art',
      status: { $in: ['pending', 'graded', 'flagged', 'skipped'] }
    });
    const artSubmissions = artSubmissionQuery?.sort
      ? await artSubmissionQuery.sort({ submittedAt: -1 }).lean()
      : [];

    const latestSubmissionMap = new Map();
    artSubmissions.forEach(submission => {
      const courseKey = submission.courseId?.toString();
      const taskKey = submission.taskId?.toString();
      if (!courseKey || !taskKey) return;
      const key = `${courseKey}:${taskKey}`;
      if (!latestSubmissionMap.has(key)) {
        latestSubmissionMap.set(key, submission);
      }
    });

    const formattedSubmissionEntries = await Promise.all(
      Array.from(latestSubmissionMap.entries()).map(async ([key, submission]) => [
        key,
        await formatTaskSubmission(submission, req)
      ])
    );
    const formattedSubmissionMap = new Map(formattedSubmissionEntries);

    // 3. Separate courses into workshop vs story modes
    const workshops = [];
    const stories = [];

    artCourses.forEach(course => {
      const progress = progressMap.get(course._id.toString());
      const completedItemIds = new Set(
        (progress?.completedItems || []).map(item => item.itemId?.toString())
      );
      const gradedTaskIds = gradedSubmissionMap.get(course._id.toString()) || [];
      const createdBy = course.createdBy;
      const instructorName = createdBy
        ? `${createdBy.firstName || ''} ${createdBy.lastName || ''}`.trim()
        : 'Coach';

      const tasks = [];
      let firstVideoUrl = null;
      const courseTaskIds = new Set();
      const modules = (course.modules || []).map(module => ({
        id: module._id,
        title: module.title,
        description: module.description || '',
        order: module.order || 0,
        chapters: (module.chapters || []).map(chapter => ({
          id: chapter._id,
          title: chapter.title,
          description: chapter.description || '',
          order: chapter.order || 0,
          contentItems: (chapter.contentItems || []).map(contentItem =>
            mapContentItemForStudent(contentItem, module, chapter, course._id, completedItemIds, gradedTaskIds)
          )
        }))
      }));

      (course.modules || []).forEach(module => {
        (module.chapters || []).forEach(chapter => {
          (chapter.contentItems || []).forEach(contentItem => {
            if (!firstVideoUrl && contentItem.type === 'video') {
              firstVideoUrl = contentItem.fileUrl || null;
            }
            if (contentItem.type === 'task') {
              courseTaskIds.add(contentItem._id.toString());
              tasks.push({
                id: contentItem._id,
                title: contentItem.title,
                description: contentItem.description || '',
                instructions: contentItem.taskData?.instructions || contentItem.description || '',
                submissionType: contentItem.taskData?.submissionType || 'file',
                maxFileSize: contentItem.taskData?.maxFileSize || null,
                moduleTitle: module.title,
                chapterTitle: chapter.title,
                chapterId: chapter._id,
                submission: formattedSubmissionMap.get(`${course._id.toString()}:${contentItem._id.toString()}`) || null,
                completed:
                  completedItemIds.has(contentItem._id.toString()) ||
                  gradedTaskIds.includes(contentItem._id.toString())
              });
            }
          });
        });
      });

      let unmatchedGradedArtCompletions = gradedTaskIds
        .filter(taskId => !courseTaskIds.has(taskId)).length;
      tasks.forEach(task => {
        if (!task.completed && unmatchedGradedArtCompletions > 0) {
          task.completed = true;
          unmatchedGradedArtCompletions -= 1;
        }
      });

      const completedTaskCount = tasks.filter(task => task.completed).length;
      const item = {
        id: course._id,
        title: course.title,
        instructor: instructorName,
        duration: course.duration ? parseInt(course.duration, 10) : 45,
        level: course.difficultyLevel || 'Beginner',
        videoUrl: firstVideoUrl,
        thumbnailUrl: course.thumbnail,
        instructions: course.description,
        modules,
        completed: tasks.length > 0
          ? completedTaskCount === tasks.length
          : progress?.status === 'completed',
        progress: tasks.length > 0
          ? Math.round((completedTaskCount / tasks.length) * 100)
          : progress?.completionPercentage || 0,
        tasks
      };

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
      .populate('submissionId', 'status grade submittedAt')
      .lean();

    const galleryItems = gallery.map(formatGalleryItem);

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

/**
 * @desc Stream a course content file for the student Art page
 * @route GET /api/v2/lms/student/:studentId/courses/art/content/:contentItemId/file
 * @access Private
 */
exports.getContentItemFile = async (req, res) => {
  try {
    const { contentItemId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(contentItemId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid content item id'
      });
    }

    const course = await Course.findOne({
      category: 'Art',
      status: 'published',
      'modules.chapters.contentItems._id': contentItemId
    }).lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Content item not found'
      });
    }

    const match = findContentItemById(course, contentItemId);
    const contentItem = match?.contentItem;

    if (!contentItem || !contentItem.fileUrl) {
      return res.status(404).json({
        success: false,
        message: 'Content file not found'
      });
    }

    if (req.query.signed === '1') {
      if (contentItem.fileUrl.startsWith('/uploads/')) {
        await markContentItemViewed(req.params.studentId, course, contentItem);
        return res.json({
          success: true,
          fileUrl: `${req.protocol}://${req.get('host')}${contentItem.fileUrl}`
        });
      }

      if (contentItem.fileUrl.includes('/uploads/')) {
        await markContentItemViewed(req.params.studentId, course, contentItem);
        return res.json({
          success: true,
          fileUrl: contentItem.fileUrl
        });
      }

      const s3Key = s3Service.extractS3KeyFromUrl(contentItem.fileUrl) || contentItem.fileUrl;
      const signedUrl = await s3Service.generateLMSContentDownloadUrl(s3Key, 60 * 60);

      if (signedUrl.success) {
        await markContentItemViewed(req.params.studentId, course, contentItem);
      }

      return res.json({
        success: signedUrl.success,
        fileUrl: signedUrl.success ? signedUrl.downloadUrl : contentItem.fileUrl
      });
    }

    let objectResult = await s3Service.getLMSContentObject(contentItem.fileUrl);

    if (!objectResult.success) {
      const extractedKey = s3Service.extractS3KeyFromUrl(contentItem.fileUrl);
      const fileName = extractedKey?.split('/').pop();
      const decodedFileName = decodeUrlPart(fileName || '');
      const lookupConditions = [{ fileUrl: contentItem.fileUrl }];

      if (extractedKey) {
        lookupConditions.push({ s3Key: extractedKey });
      }
      if (fileName) {
        lookupConditions.push({ s3Key: new RegExp(`${escapeRegex(fileName)}$`) });
        lookupConditions.push({ fileUrl: new RegExp(`${escapeRegex(fileName)}$`) });
      }
      if (decodedFileName && decodedFileName !== fileName) {
        lookupConditions.push({ s3Key: new RegExp(`${escapeRegex(decodedFileName)}$`) });
        lookupConditions.push({ fileUrl: new RegExp(`${escapeRegex(decodedFileName)}$`) });
        lookupConditions.push({ fileName: decodedFileName });
      }

      const libraryFile = await ContentLibrary.findOne({
        fileType: contentItem.type,
        $or: lookupConditions
      }).sort({ uploadedAt: -1 }).lean();
      if (libraryFile?.s3Key || libraryFile?.fileUrl) {
        objectResult = await s3Service.getLMSContentObject(libraryFile.s3Key || libraryFile.fileUrl);
      }
    }

    if (!objectResult.success || !objectResult.stream) {
      return res.status(404).json({
        success: false,
        message: 'Content file not found in storage'
      });
    }

    await markContentItemViewed(req.params.studentId, course, contentItem);

    const filename = encodeURIComponent(contentItem.title || 'content-file');
    res.setHeader('Content-Type', objectResult.contentType || contentTypeForItem(contentItem));
    if (objectResult.contentLength) {
      res.setHeader('Content-Length', objectResult.contentLength);
    }
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    objectResult.stream.on('error', (error) => {
      errorLogger.error({ err: error }, 'Art content stream error:');
      if (!res.headersSent) {
        res.status(500).end();
      } else {
        res.destroy(error);
      }
    });

    objectResult.stream.pipe(res);
  } catch (error) {
    errorLogger.error({ err: error }, 'Get Art Content File Error:');
    res.status(500).json({
      success: false,
      message: 'Server error while loading content file',
      error: error.message
    });
  }
};

exports.markContentComplete = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { itemId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid content item id'
      });
    }

    const course = await Course.findOne({
      category: 'Art',
      status: 'published',
      'modules.chapters.contentItems._id': itemId
    }).lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Content item not found'
      });
    }

    const match = findContentItemById(course, itemId);
    if (!match?.contentItem) {
      return res.status(404).json({
        success: false,
        message: 'Content item not found'
      });
    }

    await markContentItemViewed(studentId, course, match.contentItem);
    res.json({ success: true });
  } catch (error) {
    errorLogger.error({ err: error }, 'Mark Art Content Complete Error:');
    res.status(500).json({
      success: false,
      message: 'Server error marking content complete'
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
    const { type, mode, courseId, taskId, taskTitle, title, chapterId } = req.body;
    let metadata = req.body.metadata;
    if (typeof metadata === 'string') {
      try { metadata = JSON.parse(metadata); } catch (_e) { metadata = {}; }
    }
    const file = req.file;
    let courseTask = null;
    let courseChapter = null;

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

    if (taskId) {
      if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({
          success: false,
          message: 'A valid courseId is required for task submissions'
        });
      }

      const taskCourse = await Course.findById(courseId);
      if (!taskCourse) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      for (const module of taskCourse.modules || []) {
        for (const chapter of module.chapters || []) {
          const matchedTask = (chapter.contentItems || []).find(
            item => item.type === 'task' && item._id.toString() === taskId.toString()
          );
          if (matchedTask) {
            courseTask = matchedTask;
            courseChapter = chapter;
            break;
          }
        }
        if (courseTask) break;
      }

      if (!courseTask) {
        return res.status(404).json({
          success: false,
          message: 'Task not found in this Art course'
        });
      }
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
    const resolvedTaskId = taskId || `art-${mode}-${Date.now()}`;
    const priorSubmission = await Submission.exists({
      studentId,
      courseId: resolvedCourseId,
      taskId: resolvedTaskId
    });

    const submission = await Submission.create({
      studentId,
      courseId: resolvedCourseId || new mongoose.Types.ObjectId(), // placeholder if no course
      chapterId: courseChapter?._id?.toString() || chapterId || metadata?.chapterId || null,
      taskId: resolvedTaskId,
      taskTitle: courseTask?.title || taskTitle || title || `Art ${mode} submission`,
      submissionType: 'art',
      fileUrl: uploadResult.url,
      s3Key: uploadResult.s3Key,
      thumbnailUrl: null,
      metadata: {
        fileSize: file.size,
        mimeType: file.mimetype,
        dimensions: metadata?.dimensions || null,
      },
      status: 'pending',
      offlineSubmission: false,
      isFirstAttempt: !priorSubmission,
    });

    if (!priorSubmission && resolvedCourseId && taskId) {
      await StudentProgress.findOneAndUpdate(
        { student: studentId, course: resolvedCourseId },
        {
          $push: {
            completedItems: {
              itemId: taskId,
              itemType: 'task',
              completedAt: new Date()
            }
          },
          $set: { lastAccessedAt: new Date(), status: 'in_progress' },
          $setOnInsert: { startedAt: new Date() }
        },
        { upsert: true, new: true }
      );
    }

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

exports.submitArtweaverDrawing = async (req, res) => {
  let tempFilePath = null;

  try {
    const { studentId } = req.params;
    const { imageData, title, description, sessionDuration } = req.body;

    if (!imageData || typeof imageData !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'imageData is required'
      });
    }

    const match = imageData.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/);
    if (!match) {
      return res.status(400).json({
        success: false,
        message: 'Only PNG, JPG, and WebP drawings are supported'
      });
    }

    const mimeType = match[1] === 'image/jpg' ? 'image/jpeg' : match[1];
    const extension = mimeType === 'image/png'
      ? 'png'
      : mimeType === 'image/webp'
        ? 'webp'
        : 'jpg';
    const buffer = Buffer.from(match[2], 'base64');

    if (!buffer.length) {
      return res.status(400).json({
        success: false,
        message: 'Drawing file is empty'
      });
    }

    tempFilePath = path.join(os.tmpdir(), `artweaver-${studentId}-${Date.now()}.${extension}`);
    fs.writeFileSync(tempFilePath, buffer);

    const fileName = `${title || 'ArtWeaver Drawing'}.${extension}`;
    const uploadResult = await s3Service.uploadLMSContent(
      tempFilePath,
      fileName,
      'image',
      mimeType
    );

    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload ArtWeaver drawing',
        error: uploadResult.error
      });
    }

    const galleryItem = await ArtGallery.create({
      student: studentId,
      title: title || 'ArtWeaver Drawing',
      fileUrl: uploadResult.url,
      s3Key: uploadResult.s3Key,
      canvasSize: { width: 1024, height: 768 },
      metadata: {
        fileSize: buffer.length,
        mimeType,
        sessionDuration: sessionDuration ? parseInt(sessionDuration, 10) : 0,
        source: 'artweaver',
        description: description || ''
      },
      submitted: false,
    });

    const artCourse = await Course.findOne({ category: 'Art', status: 'published' })
      .select('_id')
      .lean();
    const parsedSessionDuration = parseInt(sessionDuration, 10);
    const submission = await Submission.create({
      studentId,
      courseId: artCourse?._id || new mongoose.Types.ObjectId(),
      taskId: `artweaver-${galleryItem._id}`,
      taskTitle: galleryItem.title || 'ArtWeaver Drawing',
      submissionType: 'art',
      fileUrl: uploadResult.url,
      s3Key: uploadResult.s3Key,
      thumbnailUrl: null,
      metadata: {
        fileSize: buffer.length,
        mimeType,
      },
      timeSpent: Number.isFinite(parsedSessionDuration)
        ? Math.max(0, Math.round(parsedSessionDuration / 60))
        : 0,
      status: 'pending',
      offlineSubmission: false,
      isFirstAttempt: true,
    });

    galleryItem.submitted = true;
    galleryItem.submissionId = submission._id;
    await galleryItem.save();

    res.status(201).json({
      success: true,
      artwork: {
        id: galleryItem._id,
        title: galleryItem.title,
        artworkUrl: galleryItem.fileUrl,
        createdAt: galleryItem.createdAt,
        canvasSize: galleryItem.canvasSize,
        sessionDuration: galleryItem.metadata.sessionDuration,
        submitted: true,
        submissionId: submission._id,
        reviewStatus: submission.status,
        grade: null,
      },
      message: 'ArtWeaver drawing saved to your gallery and submitted for coach review!'
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Submit ArtWeaver Drawing Error:');
    res.status(500).json({
      success: false,
      message: 'Server error while saving ArtWeaver drawing',
      error: error.message
    });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
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
      .populate('submissionId', 'status grade submittedAt')
      .lean();

    res.json({
      success: true,
      gallery: gallery.map(formatGalleryItem)
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
