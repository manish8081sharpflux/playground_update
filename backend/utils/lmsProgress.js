const mongoose = require('mongoose');
const StudentProgress = require('../models/StudentProgress');
const { errorLogger } = require('../config/pino-config');

const VIEWABLE_CONTENT_TYPES = new Set(['video', 'audio', 'pdf', 'image', 'text', 'link']);

const markContentItemComplete = async ({ studentId, courseId, itemId, itemType }) => {
  try {
    if (
      !mongoose.Types.ObjectId.isValid(studentId) ||
      !mongoose.Types.ObjectId.isValid(courseId) ||
      !mongoose.Types.ObjectId.isValid(itemId)
    ) {
      return null;
    }

    const safeItemType = VIEWABLE_CONTENT_TYPES.has(itemType) ? itemType : 'text';

    let progress = await StudentProgress.findOne({ student: studentId, course: courseId });

    if (!progress) {
      progress = new StudentProgress({
        student: studentId,
        course: courseId,
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
      existingItem.itemType = safeItemType;
    } else {
      progress.completedItems.push({
        itemId,
        itemType: safeItemType,
        completedAt: new Date()
      });
    }

    progress.lastAccessedAt = new Date();
    if (progress.status === 'not_started') {
      progress.status = 'in_progress';
    }

    await progress.save();
    return progress;
  } catch (error) {
    errorLogger.error({ err: error }, 'Error marking LMS content item complete');
    return null;
  }
};

const markContentItemViewed = async (studentId, course, contentItem) => {
  if (!course?._id || !contentItem?._id || !VIEWABLE_CONTENT_TYPES.has(contentItem.type)) {
    return null;
  }

  return markContentItemComplete({
    studentId,
    courseId: course._id,
    itemId: contentItem._id,
    itemType: contentItem.type
  });
};

module.exports = {
  VIEWABLE_CONTENT_TYPES,
  markContentItemComplete,
  markContentItemViewed
};
