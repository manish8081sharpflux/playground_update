const ContentLibrary = require('../models/ContentLibrary');
const s3Service = require('../services/aws/s3');
const fs = require('fs');
const { errorLogger } = require('../config/pino-config');

/**
 * Helper function to determine file type from MIME type
 */
const getFileTypeFromMimeType = (mimeType) => {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('image/')) return 'image';
  return null;
};

/**
 * Create a presigned S3 upload URL so large LMS files can go straight from
 * the browser to object storage instead of passing through the API server.
 * POST /api/v2/lms/admin/content/upload-url
 */
exports.createUploadUrl = async (req, res) => {
  try {
    const { fileName, fileType, mimeType, fileSize } = req.body;

    if (!fileName || !fileType || !mimeType || !fileSize) {
      return res.status(400).json({
        success: false,
        message: 'fileName, fileType, mimeType, and fileSize are required',
      });
    }

    const resolvedFileType = getFileTypeFromMimeType(mimeType);
    if (!resolvedFileType || resolvedFileType !== fileType) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported or mismatched file type',
      });
    }

    const result = await s3Service.generateLMSContentUploadUrl(
      fileName,
      fileType,
      mimeType
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message || 'Failed to create upload URL',
        error: result.error,
      });
    }

    res.status(200).json({
      success: true,
      uploadUrl: result.uploadUrl,
      cdnUrl: result.cdnUrl,
      s3Key: result.s3Key,
      expiresIn: result.expiresIn,
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Create LMS upload URL error:');
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Record a file after direct browser-to-S3 upload completes.
 * POST /api/v2/lms/admin/content/complete-upload
 */
exports.completeDirectUpload = async (req, res) => {
  try {
    const {
      fileName,
      fileType,
      fileUrl,
      s3Key,
      fileSize,
      mimeType,
      tags,
      description,
    } = req.body;

    if (!fileName || !fileType || !fileUrl || !s3Key || !fileSize || !mimeType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required uploaded file metadata',
      });
    }

    const resolvedFileType = getFileTypeFromMimeType(mimeType);
    if (!resolvedFileType || resolvedFileType !== fileType) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported or mismatched file type',
      });
    }

    const contentLibraryEntry = new ContentLibrary({
      fileName,
      fileType,
      fileUrl,
      s3Key,
      fileSize,
      mimeType,
      uploadedBy: req.user._id,
      uploadStatus: 'complete',
      uploadedAt: new Date(),
      description: description || '',
      tags: Array.isArray(tags) ? tags : [],
    });

    await contentLibraryEntry.save();

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      file: {
        id: contentLibraryEntry._id,
        fileName: contentLibraryEntry.fileName,
        fileType: contentLibraryEntry.fileType,
        fileUrl: contentLibraryEntry.fileUrl,
        fileSize: contentLibraryEntry.fileSize,
        mimeType: contentLibraryEntry.mimeType,
        s3Key: contentLibraryEntry.s3Key,
      },
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Complete direct LMS upload error:');
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Upload files directly to S3 via backend (backend proxy pattern)
 * POST /api/v2/lms/admin/content/upload
 * Expects multipart/form-data with files field
 */
exports.uploadFiles = async (req, res) => {
  try {
    const files = req.files;
    const { tags, description } = req.body;

    // Validation: Check if files exist
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files provided. Please select at least one file.',
      });
    }

    const uploadedFiles = [];
    const failedUploads = [];

    // Upload each file to S3
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        // Determine file type from MIME type
        const fileType = getFileTypeFromMimeType(file.mimetype);

        if (!fileType) {
          failedUploads.push({
            filename: file.originalname,
            error: 'Unsupported file type',
          });

          // Cleanup temp file
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          continue;
        }

        // Upload to S3
        const result = await s3Service.uploadLMSContent(
          file.path,  // File path from multer
          file.originalname,
          fileType,
          file.mimetype
        );

        if (result.success) {
          // Parse tags if provided as JSON string
          let parsedTags = [];
          if (tags) {
            try {
              parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
            } catch (e) {
              console.warn('Failed to parse tags:', e);
            }
          }

          // Create ContentLibrary entry
          const contentLibraryEntry = new ContentLibrary({
            fileName: file.originalname,
            fileType: result.fileType,
            fileUrl: result.url,
            s3Key: result.s3Key,
            fileSize: file.size,
            mimeType: result.mimeType,
            uploadedBy: req.user._id,
            uploadStatus: 'complete',
            uploadedAt: new Date(),
            description: description || '',
            tags: parsedTags,
          });

          await contentLibraryEntry.save();

          uploadedFiles.push({
            id: contentLibraryEntry._id,
            fileName: contentLibraryEntry.fileName,
            fileType: contentLibraryEntry.fileType,
            fileUrl: contentLibraryEntry.fileUrl,
            s3Key: contentLibraryEntry.s3Key,
            fileSize: contentLibraryEntry.fileSize,
            mimeType: contentLibraryEntry.mimeType,
          });

          // Cleanup local file after successful S3 upload
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } else {
          failedUploads.push({
            filename: file.originalname,
            error: result.message,
          });

          // Cleanup failed file
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        }
      } catch (uploadError) {
        errorLogger.error({ err: uploadError }, 'Upload error:');

        failedUploads.push({
          filename: file.originalname,
          error: uploadError.message,
        });

        // Cleanup failed file
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }

    // Check if at least one file uploaded successfully
    if (uploadedFiles.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload any files',
        failedUploads,
      });
    }

    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
      files: uploadedFiles,
      ...(failedUploads.length > 0 && {
        warning: `${failedUploads.length} file(s) failed to upload`,
        failedUploads,
      }),
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Content upload controller error:');

    // Cleanup any remaining files
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get all files with filtering, search, and sorting
 * GET /api/v2/lms/admin/content/library
 */
exports.getAllFiles = async (req, res) => {
  try {
    const {
      fileType,
      search,
      sort = 'newest',
      limit = 20,
      offset = 0,
    } = req.query;

    // Build query
    let query = { uploadStatus: 'complete' };

    // Filter by file type
    if (fileType && fileType !== 'all') {
      query.fileType = fileType;
    }

    // Search filter
    if (search) {
      query.$or = [
        { fileName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    // Sort options
    let sortOption = {};
    switch (sort) {
      case 'newest':
        sortOption = { uploadedAt: -1 };
        break;
      case 'oldest':
        sortOption = { uploadedAt: 1 };
        break;
      case 'largest':
        sortOption = { fileSize: -1 };
        break;
      case 'smallest':
        sortOption = { fileSize: 1 };
        break;
      case 'a-z':
        sortOption = { fileName: 1 };
        break;
      case 'z-a':
        sortOption = { fileName: -1 };
        break;
      default:
        sortOption = { uploadedAt: -1 };
    }

    // Execute query with pagination
    const files = await ContentLibrary.find(query)
      .sort(sortOption)
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .populate('uploadedBy', 'name email')
      .populate('usedInCourses.courseId', 'title');

    // Get total count for pagination
    const totalFiles = await ContentLibrary.countDocuments(query);

    res.status(200).json({
      success: true,
      files,
      totalFiles,
      hasMore: totalFiles > parseInt(offset) + parseInt(limit),
      offset: parseInt(offset),
      limit: parseInt(limit),
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching files:');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch files',
      error: error.message,
    });
  }
};

/**
 * Get single file details
 * GET /api/v2/lms/admin/content/library/:id
 */
exports.getFileById = async (req, res) => {
  try {
    const { id } = req.params;

    const file = await ContentLibrary.findById(id)
      .populate('uploadedBy', 'name email')
      .populate('usedInCourses.courseId', 'title');

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    // Update lastAccessedAt
    file.lastAccessedAt = new Date();
    await file.save();

    res.status(200).json({
      success: true,
      file,
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching file:');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch file',
      error: error.message,
    });
  }
};

/**
 * Update file metadata (description, tags)
 * PUT /api/v2/lms/admin/content/library/:id
 */
exports.updateFileMetadata = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, tags } = req.body;

    const file = await ContentLibrary.findById(id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    // Update metadata
    if (description !== undefined) file.description = description;
    if (tags !== undefined) file.tags = tags;

    await file.save();

    res.status(200).json({
      success: true,
      message: 'File metadata updated successfully',
      file,
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error updating file metadata:');
    res.status(500).json({
      success: false,
      message: 'Failed to update file metadata',
      error: error.message,
    });
  }
};

/**
 * Delete file from S3 and MongoDB
 * DELETE /api/v2/lms/admin/content/library/:id
 */
exports.deleteFile = async (req, res) => {
  try {
    const { id } = req.params;

    const file = await ContentLibrary.findById(id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    // Check if file is used in any courses
    if (file.usedInCourses && file.usedInCourses.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete file: it is used in one or more courses',
        usedInCourses: file.usedInCourses,
      });
    }

    // Delete from S3
    const deleteResult = await s3Service.deleteLMSContent(file.s3Key);

    if (!deleteResult.success) {
      errorLogger.error({ err: deleteResult.error }, 'S3 deletion failed:');
      // Continue with MongoDB deletion even if S3 fails
    }

    // Delete from MongoDB
    await ContentLibrary.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'File deleted successfully from S3 and database',
      deletedFile: {
        id: file._id,
        fileName: file.fileName,
        s3Key: file.s3Key,
      },
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error deleting file:');
    res.status(500).json({
      success: false,
      message: 'Failed to delete file',
      error: error.message,
    });
  }
};

/**
 * Get file statistics
 * GET /api/v2/lms/admin/content/stats
 */
exports.getContentStats = async (req, res) => {
  try {
    const stats = await ContentLibrary.aggregate([
      {
        $match: { uploadStatus: 'complete' },
      },
      {
        $group: {
          _id: '$fileType',
          count: { $sum: 1 },
          totalSize: { $sum: '$fileSize' },
        },
      },
    ]);

    const totalFiles = await ContentLibrary.countDocuments({ uploadStatus: 'complete' });
    const totalSize = await ContentLibrary.aggregate([
      {
        $match: { uploadStatus: 'complete' },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$fileSize' },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalFiles,
        totalSizeBytes: totalSize[0]?.total || 0,
        byType: stats,
      },
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching content stats:');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch content statistics',
      error: error.message,
    });
  }
};
