const mongoose = require('mongoose');
const Course = require('../models/course');
const ContentLibrary = require('../models/ContentLibrary');
const s3Service = require('../services/aws/s3');
const { errorLogger } = require('../config/pino-config');

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const decodeUrlPart = (value = '') => {
  try {
    return decodeURIComponent(value);
  } catch (_error) {
    return value;
  }
};

const contentTypeForItem = (item) => {
  if (item.type === 'pdf') return 'application/pdf';
  if (item.type === 'video') return 'video/mp4';
  if (item.type === 'audio') return 'audio/mpeg';
  if (item.type === 'image') return 'image/png';
  return 'application/octet-stream';
};

const findContentItemById = (course, contentItemId) => {
  for (const module of course.modules || []) {
    for (const chapter of module.chapters || []) {
      const contentItem = (chapter.contentItems || []).find(item =>
        String(item._id) === String(contentItemId)
      );
      if (contentItem) return contentItem;
    }
  }

  return null;
};

const streamCourseContentFile = async (req, res, { category } = {}) => {
  try {
    const { contentItemId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(contentItemId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid content item id'
      });
    }

    const query = {
      status: 'published',
      'modules.chapters.contentItems._id': contentItemId
    };
    if (category) query.category = category;

    const course = await Course.findOne(query).lean();
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Content item not found'
      });
    }

    const contentItem = findContentItemById(course, contentItemId);
    if (!contentItem || !contentItem.fileUrl) {
      return res.status(404).json({
        success: false,
        message: 'Content file not found'
      });
    }

    if (req.query.signed === '1') {
      if (contentItem.fileUrl.startsWith('/uploads/')) {
        return res.json({
          success: true,
          fileUrl: `${req.protocol}://${req.get('host')}${contentItem.fileUrl}`
        });
      }

      if (contentItem.fileUrl.includes('/uploads/')) {
        return res.json({
          success: true,
          fileUrl: contentItem.fileUrl
        });
      }

      const s3Key = s3Service.extractS3KeyFromUrl(contentItem.fileUrl) || contentItem.fileUrl;
      const signedUrl = await s3Service.generateLMSContentDownloadUrl(s3Key, 60 * 60);

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

      if (extractedKey) lookupConditions.push({ s3Key: extractedKey });
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

    const filename = encodeURIComponent(contentItem.title || 'content-file');
    res.setHeader('Content-Type', objectResult.contentType || contentTypeForItem(contentItem));
    if (objectResult.contentLength) {
      res.setHeader('Content-Length', objectResult.contentLength);
    }
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    objectResult.stream.on('error', (error) => {
      errorLogger.error({ err: error }, 'LMS content stream error:');
      if (!res.headersSent) {
        res.status(500).end();
      } else {
        res.destroy(error);
      }
    });

    objectResult.stream.pipe(res);
  } catch (error) {
    errorLogger.error({ err: error }, 'Get LMS Content File Error:');
    res.status(500).json({
      success: false,
      message: 'Server error while loading content file',
      error: error.message
    });
  }
};

module.exports = {
  streamCourseContentFile
};
