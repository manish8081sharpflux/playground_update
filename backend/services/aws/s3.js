const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const fs = require("fs");
const path = require("path");
const VideoThumbnailService = require("../videoThumbnail");

const folder = (envName, fallback) => process.env[envName] || fallback;
const bucketName = () =>
  process.env.AWS_S3_BUCKET_NAME ||
  process.env.AWS_S3_BUCKET_NAME_LMS_CONTENT ||
  process.env.AWS_S3_BUCKET_NAME_TASK_ATTACHMENTS;
const trimSlashes = (value = "") => value.replace(/^\/+|\/+$/g, "");
const withFolder = (folderName, key) => {
  const prefix = trimSlashes(folderName);
  const cleanKey = trimSlashes(key);
  if (!prefix) return cleanKey;
  return cleanKey === prefix || cleanKey.startsWith(`${prefix}/`)
    ? cleanKey
    : `${prefix}/${cleanKey}`;
};
const publicUrl = (key) => {
  const endpoint = process.env.AWS_S3_ENDPOINT?.replace(/\/+$/, "");
  const encodedKey = trimSlashes(key)
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  if (endpoint) return `${endpoint}/${bucketName()}/${encodedKey}`;
  return `https://${bucketName()}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${encodedKey}`;
};
const decodeKey = (key = "") => {
  try {
    return key
      .split("/")
      .map(part => decodeURIComponent(part))
      .join("/");
  } catch (_error) {
    return key;
  }
};

const s3Client = new S3Client({
  endpoint: process.env.AWS_S3_ENDPOINT,
  region: process.env.AWS_S3_REGION,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_S3_SECRET_KEY,
  },
  requestChecksumCalculation: "WHEN_REQUIRED", // Only calculate checksums when S3 requires it (not for uploads)
});

exports.uploadFileToS3 = async (filePath, folderName, keyName) => {
  try {
    // Read the file from local filesystem
    const fileContent = fs.readFileSync(filePath);
    let contentType = getContentType(filePath);
    // Set up S3 upload parameters
    const key = withFolder(folderName, keyName);
    const params = {
      Bucket: bucketName(),
      Key: key,
      Body: fileContent,
      ContentType: contentType,
    };

    // Upload file to S3
    const command = new PutObjectCommand(params);
    await s3Client.send(command);

    // File uploaded successfully
    return {
      success: true,
      message: "Upload successful",
      url: publicUrl(key),
      key,
      contentType: contentType,
    };
  } catch (error) {
    console.error("Error uploading file:", error);
    return {
      success: false,
      message: "Upload failed",
      error: error.message,
    };
  }
};

// Helper function to determine content type
function getContentType(filePath) {
  const extension = filePath.split(".").pop().toLowerCase();
  const contentTypes = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    pdf: "application/pdf",
    txt: "text/plain",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    zip: "application/zip",
    rar: "application/x-rar-compressed",
    mp4: "video/mp4",
    mp3: "audio/mpeg",
    avi: "video/x-msvideo",
    mov: "video/quicktime",
    wmv: "video/x-ms-wmv",
    flv: "video/x-flv",
    mkv: "video/x-matroska",
    webm: "video/webm",
    ogg: "audio/ogg",
    wav: "audio/wav",
  };
  return contentTypes[extension] || "application/octet-stream";
}

// ==================== WTF-SPECIFIC METHODS ====================

// Upload WTF media (images, videos, audio)
exports.uploadWtfMedia = async (filePath, mediaType, pinId) => {
  try {
    const fileContent = fs.readFileSync(filePath);
    const contentType = getContentType(filePath);
    const fileExtension = path.extname(filePath);
    const fileName = withFolder(
      folder("AWS_S3_FOLDER_WTF", "wtfpins"),
      `${mediaType}/${pinId}_${Date.now()}${fileExtension}`,
    );

    const params = {
      Bucket: bucketName(),
      Key: fileName,
      Body: fileContent,
      ContentType: contentType,
      Metadata: {
        "wtf-pin-id": pinId,
        "media-type": mediaType,
        "upload-timestamp": new Date().toISOString(),
      },
    };

    const command = new PutObjectCommand(params);
    await s3Client.send(command);

    const url = publicUrl(fileName);
    // WTF media uploaded successfully

    return {
      success: true,
      message: "WTF media uploaded successfully",
      url: url,
      key: fileName,
      contentType: contentType,
    };
  } catch (error) {
    console.error("Error uploading WTF media:", error);
    return {
      success: false,
      message: "Failed to upload WTF media",
      error: error.message,
    };
  }
};

// Upload WTF media from buffer (for direct uploads like background images)
exports.uploadWtfMediaBuffer = async (buffer, fileName, contentType) => {
  try {
    const key = withFolder(folder("AWS_S3_FOLDER_WTF", "wtfpins"), fileName);
    const params = {
      Bucket: bucketName(),
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: {
        "upload-timestamp": new Date().toISOString(),
        "upload-type": "wtf-background",
      },
    };

    const command = new PutObjectCommand(params);
    await s3Client.send(command);

    const url = publicUrl(key);
    // WTF media uploaded successfully
    return url;
  } catch (error) {
    console.error("Error uploading WTF media buffer:", error);
    throw error;
  }
};

// Helper to generate settings file path for background image
exports.buildSettingsFileKey = (originalExt) => {
  const ext = originalExt.startsWith(".")
    ? originalExt.substring(1)
    : originalExt;
  return `settings/backgrounds/wtf-bg-${Date.now()}-${Math.random()
    .toString(36)
    .substring(7)}.${ext}`;
};

// Upload WTF voice note
exports.uploadWtfVoiceNote = async (filePath, submissionId) => {
  try {
    const fileContent = fs.readFileSync(filePath);
    const contentType = getContentType(filePath);
    const fileExtension = path.extname(filePath);
    const fileName = withFolder(
      folder("AWS_S3_FOLDER_WTF", "wtfpins"),
      `voice-notes/${submissionId}_${Date.now()}${fileExtension}`,
    );

    const params = {
      Bucket: bucketName(),
      Key: fileName,
      Body: fileContent,
      ContentType: contentType,
      Metadata: {
        "wtf-submission-id": submissionId,
        "media-type": "voice-note",
        "upload-timestamp": new Date().toISOString(),
      },
    };

    const command = new PutObjectCommand(params);
    await s3Client.send(command);

    const url = publicUrl(fileName);

    return {
      success: true,
      message: "WTF voice note uploaded successfully",
      url: url,
      key: fileName,
      contentType: contentType,
      submissionId: submissionId,
    };
  } catch (error) {
    console.error("Error uploading WTF voice note:", error);
    return {
      success: false,
      message: "WTF voice note upload failed",
      error: error.message,
    };
  }
};

// Generate thumbnail for WTF media
exports.generateWtfThumbnail = async (originalKey, thumbnailKey) => {
  try {
    originalKey = withFolder(folder("AWS_S3_FOLDER_WTF", "wtfpins"), originalKey);
    thumbnailKey = withFolder(folder("AWS_S3_FOLDER_WTF", "wtfpins"), thumbnailKey);
    // Check if the original key is a video file
    const isVideo = /\.(mp4|webm|avi|mov|mkv)$/i.test(originalKey);

    if (!isVideo) {
      // For non-video files, return the original as thumbnail
      const thumbnailUrl = publicUrl(thumbnailKey);

      return {
        success: true,
        message: "Non-video file - using original as thumbnail",
        url: thumbnailUrl,
        key: thumbnailKey,
      };
    }

    // For video files, generate actual thumbnail using FFmpeg
    try {
      const thumbnailService = new VideoThumbnailService();

      const result = await thumbnailService.generateThumbnailFromS3(
        s3Client,
        bucketName(),
        originalKey,
        thumbnailKey,
        {
          time: "00:00:01", // Extract frame at 1 second
          width: 320, // Thumbnail width
          height: 240, // Thumbnail height
          quality: 80, // JPEG quality
        }
      );

      if (result.success) {
        const thumbnailUrl = publicUrl(thumbnailKey);

        // Thumbnail service cleanup not needed

        return {
          success: true,
          message: "Video thumbnail generated successfully",
          url: thumbnailUrl,
          key: thumbnailKey,
        };
      } else {
        // Thumbnail service cleanup not needed

        console.warn(
          `Failed to generate video thumbnail for ${originalKey}: ${result.error}`
        );

        // Return a fallback response
        const thumbnailUrl = publicUrl(thumbnailKey);

        return {
          success: false,
          message: "Video thumbnail generation failed",
          url: null,
          key: thumbnailKey,
          error: result.error,
        };
      }
    } catch (ffmpegError) {
      console.error(
        `FFmpeg error during thumbnail generation for ${originalKey}: ${ffmpegError.message}`
      );

      // Return a fallback response
      const thumbnailUrl = publicUrl(thumbnailKey);

      return {
        success: false,
        message: "Video thumbnail generation failed due to FFmpeg error",
        url: null,
        key: thumbnailKey,
        error: ffmpegError.message,
      };
    }
  } catch (error) {
    console.error("Error generating WTF thumbnail:", error);
    return {
      success: false,
      message: "WTF thumbnail generation failed",
      error: error.message,
    };
  }
};

// Extract S3 key from full S3 URL
exports.extractS3KeyFromUrl = (s3Url) => {
  try {
    if (!s3Url || typeof s3Url !== "string") {
      return null;
    }

    // Handle both formats:
    // https://bucket-name.s3.region.amazonaws.com/key
    // https://s3.region.amazonaws.com/bucket-name/key
    const url = new URL(s3Url);
    const pathname = url.pathname;

    // For https://bucket-name.s3.region.amazonaws.com/key format
    if (url.hostname.includes(".s3.")) {
      const key = pathname.startsWith("/") ? pathname.substring(1) : pathname;
      return decodeKey(key);
    }

    // For path-style URLs:
    // https://s3.region.amazonaws.com/bucket-name/key
    // https://custom-s3-endpoint/bucket-name/key
    const pathParts = pathname.split("/").filter((part) => part);
    if (pathParts.length >= 2) {
      const configuredBucketName = bucketName();
      const keyParts = pathParts[0] === configuredBucketName ? pathParts.slice(1) : pathParts;
      return decodeKey(keyParts.join("/"));
    }

    return null;
  } catch (error) {
    console.error("Error extracting S3 key from URL:", error);
    return null;
  }
};

// Delete file from S3 by bucket and key
exports.deleteFileFromS3 = async (folderName, key) => {
  try {
    const objectKey = withFolder(folderName, key);
    const params = {
      Bucket: bucketName(),
      Key: objectKey,
    };

    const command = new DeleteObjectCommand(params);
    await s3Client.send(command);

    // File deleted successfully from S3
    return {
      success: true,
      message: "File deleted successfully",
      key: objectKey,
    };
  } catch (error) {
    console.error("Error deleting file from S3:", error);
    return {
      success: false,
      message: "File deletion failed",
      error: error.message,
    };
  }
};

// Delete WTF media by URL or key
exports.deleteWtfMedia = async (keyOrUrl) => {
  try {
    let key = keyOrUrl;

    // If it's a full URL, extract the key
    if (keyOrUrl && keyOrUrl.startsWith("http")) {
      key = exports.extractS3KeyFromUrl(keyOrUrl);
      if (!key) {
        return {
          success: false,
          message: "Could not extract S3 key from URL",
          keyOrUrl: keyOrUrl,
        };
      }
    }

    if (!key) {
      return {
        success: false,
        message: "No valid S3 key or URL provided",
        keyOrUrl: keyOrUrl,
      };
    }
    key = withFolder(folder("AWS_S3_FOLDER_WTF", "wtfpins"), key);

    const params = {
      Bucket: bucketName(),
      Key: key,
    };

    const command = new DeleteObjectCommand(params);
    await s3Client.send(command);

    // WTF media deleted successfully
    return {
      success: true,
      message: "WTF media deleted successfully",
      key: key,
      originalInput: keyOrUrl,
    };
  } catch (error) {
    console.error("Error deleting WTF media:", error);
    return {
      success: false,
      message: "WTF media deletion failed",
      error: error.message,
      keyOrUrl: keyOrUrl,
    };
  }
};

// Get WTF media URL
exports.getWtfMediaUrl = async (key) => {
  try {
    key = withFolder(folder("AWS_S3_FOLDER_WTF", "wtfpins"), key);
    const url = publicUrl(key);

    return {
      success: true,
      url: url,
      key: key,
    };
  } catch (error) {
    console.error("Error getting WTF media URL:", error);
    return {
      success: false,
      message: "Failed to get WTF media URL",
      error: error.message,
    };
  }
};

// ==================== SHOP-SPECIFIC METHODS ====================

// Upload shop product image
exports.uploadShopProductImage = async (filePath, productId) => {
  try {
    const fileContent = fs.readFileSync(filePath);
    const contentType = getContentType(filePath);
    const fileExtension = path.extname(filePath);
    const fileName = withFolder(
      folder("AWS_S3_FOLDER_SHOP_PRODUCTS", "balagruha-shop-product-images"),
      `${productId}_${Date.now()}${fileExtension}`,
    );

    const params = {
      Bucket: bucketName(),
      Key: fileName,
      Body: fileContent,
      ContentType: contentType,
      ACL: "public-read",
      Metadata: {
        "product-id": productId,
        "upload-timestamp": new Date().toISOString(),
      },
    };

    const command = new PutObjectCommand(params);
    await s3Client.send(command);

    const url = publicUrl(fileName);
    // Shop product image uploaded successfully

    return {
      success: true,
      message: "Shop product image uploaded successfully",
      url: url,
      key: fileName,
      contentType: contentType,
    };
  } catch (error) {
    console.error("Error uploading shop product image:", error);
    return {
      success: false,
      message: "Failed to upload shop product image",
      error: error.message,
    };
  }
};

// Delete shop product image by URL or key
exports.deleteShopProductImage = async (keyOrUrl) => {
  try {
    let key = keyOrUrl;

    // If it's a full URL, extract the key
    if (keyOrUrl && keyOrUrl.startsWith("http")) {
      key = exports.extractS3KeyFromUrl(keyOrUrl);
      if (!key) {
        return {
          success: false,
          message: "Could not extract S3 key from URL",
          keyOrUrl: keyOrUrl,
        };
      }
    }

    if (!key) {
      return {
        success: false,
        message: "No valid S3 key or URL provided",
        keyOrUrl: keyOrUrl,
      };
    }
    key = withFolder(
      folder("AWS_S3_FOLDER_SHOP_PRODUCTS", "balagruha-shop-product-images"),
      key,
    );

    const params = {
      Bucket: bucketName(),
      Key: key,
    };

    const command = new DeleteObjectCommand(params);
    await s3Client.send(command);

    // Shop product image deleted successfully
    return {
      success: true,
      message: "Shop product image deleted successfully",
      key: key,
      originalInput: keyOrUrl,
    };
  } catch (error) {
    console.error("Error deleting shop product image:", error);
    return {
      success: false,
      message: "Shop product image deletion failed",
      error: error.message,
      keyOrUrl: keyOrUrl,
    };
  }
};

// ==================== LMS CONTENT MANAGEMENT METHODS ====================

/**
 * Generate presigned URL for direct client-side upload to S3
 * Allows frontend to upload files directly to S3 without going through backend
 * @param {string} fileName - Original file name
 * @param {string} fileType - Type of file (video, pdf, audio, image)
 * @param {string} mimeType - MIME type (e.g., 'video/mp4')
 * @param {number} expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
 * @returns {Promise<object>} - Upload URL and file details
 */
exports.generateLMSContentUploadUrl = async (fileName, fileType, mimeType, expiresIn = 3600) => {
  try {
    // Generate unique S3 key with timestamp
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const fileExtension = path.extname(fileName);
    const baseName = path.basename(fileName, fileExtension);
    const s3Key = withFolder(
      folder("AWS_S3_FOLDER_LMS_CONTENT", "balagruha-lms-content"),
      `${fileType}/${baseName}_${timestamp}_${randomStr}${fileExtension}`,
    );

    // Create PutObjectCommand for presigning
    // Note: ChecksumAlgorithm must NOT be set for browser uploads
    // The AWS SDK will add checksums automatically which browsers can't compute
    const command = new PutObjectCommand({
      Bucket: bucketName(),
      Key: s3Key,
      ContentType: mimeType,
    });

    // Generate presigned URL (valid for 1 hour by default)
    // unhoistableHeaders ensures checksum headers don't get signed into the URL
    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn,
      unhoistableHeaders: new Set(['x-amz-checksum-crc32', 'x-amz-sdk-checksum-algorithm'])
    });

    // Construct CDN URL (public URL after upload completes)
    const cdnUrl = publicUrl(s3Key);

    // Generated presigned upload URL

    return {
      success: true,
      uploadUrl,
      cdnUrl,
      s3Key,
      expiresIn,
      fileName,
      fileType,
      mimeType,
    };
  } catch (error) {
    console.error('Error generating presigned upload URL:', error);
    return {
      success: false,
      message: 'Failed to generate upload URL',
      error: error.message,
    };
  }
};

/**
 * Generate presigned URL for downloading/viewing LMS content
 * @param {string} s3Key - S3 object key
 * @param {number} expiresIn - URL expiration time in seconds (default: 3600)
 * @returns {Promise<object>} - Download URL
 */
exports.generateLMSContentDownloadUrl = async (s3Key, expiresIn = 3600) => {
  try {
    s3Key = withFolder(
      folder("AWS_S3_FOLDER_LMS_CONTENT", "balagruha-lms-content"),
      s3Key,
    );
    const command = new GetObjectCommand({
      Bucket: bucketName(),
      Key: s3Key,
    });

    const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn });

    // Generated presigned download URL

    return {
      success: true,
      downloadUrl,
      s3Key,
      expiresIn,
    };
  } catch (error) {
    console.error('Error generating presigned download URL:', error);
    return {
      success: false,
      message: 'Failed to generate download URL',
      error: error.message,
    };
  }
};

/**
 * Fetch LMS content as a stream for authenticated backend proxying.
 * @param {string} keyOrUrl - S3 object key or stored public URL
 * @returns {Promise<object>} - Stream and object metadata
 */
exports.getLMSContentObject = async (keyOrUrl) => {
  try {
    let s3Key = keyOrUrl;
    if (keyOrUrl && keyOrUrl.startsWith('http')) {
      s3Key = exports.extractS3KeyFromUrl(keyOrUrl);
    }

    if (!s3Key) {
      return {
        success: false,
        message: 'No valid S3 key or URL provided',
      };
    }

    const cleanKey = trimSlashes(s3Key);
    const decodedKey = decodeKey(cleanKey);
    const contentFolder = folder("AWS_S3_FOLDER_LMS_CONTENT", "balagruha-lms-content");
    const cleanFolder = trimSlashes(contentFolder);
    const unprefixedKey = cleanFolder && decodedKey.startsWith(`${cleanFolder}/`)
      ? decodedKey.substring(cleanFolder.length + 1)
      : null;
    const defaultKey = withFolder(
      contentFolder,
      decodedKey,
    );

    const candidateKeys = Array.from(
      new Set([cleanKey, decodedKey, unprefixedKey, defaultKey].filter(Boolean))
    );
    const legacyBuckets = [
      process.env.AWS_S3_BUCKET_NAME_LMS_CONTENT,
      cleanFolder,
      "balagruha-lms-content",
    ].filter(bucket => bucket && bucket !== bucketName());
    const bucketKeyPairs = [
      ...candidateKeys.map(Key => ({ Bucket: bucketName(), Key })),
      ...legacyBuckets.flatMap(Bucket =>
        candidateKeys.map(Key => ({
          Bucket,
          Key: cleanFolder && Key.startsWith(`${cleanFolder}/`)
            ? Key.substring(cleanFolder.length + 1)
            : Key,
        }))
      ),
    ];
    let lastError = null;

    for (const candidate of bucketKeyPairs) {
      try {
        const command = new GetObjectCommand({
          Bucket: candidate.Bucket,
          Key: candidate.Key,
        });

        const response = await s3Client.send(command);

        return {
          success: true,
          stream: response.Body,
          contentType: response.ContentType,
          contentLength: response.ContentLength,
          bucket: candidate.Bucket,
          s3Key: candidate.Key,
        };
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError;
  } catch (error) {
    console.error('Error fetching LMS content object:', error);
    return {
      success: false,
      message: 'Failed to fetch content object',
      error: error.message,
    };
  }
};

/**
 * Upload LMS content from backend (for server-side uploads)
 * @param {Buffer|string} fileContent - File content (buffer or file path)
 * @param {string} fileName - Original file name
 * @param {string} fileType - Type of file (video, pdf, audio, image)
 * @param {string} mimeType - MIME type
 * @returns {Promise<object>} - Upload result with CDN URL
 */
exports.uploadLMSContent = async (fileContent, fileName, fileType, mimeType) => {
  try {
    const isFilePath = typeof fileContent === 'string';
    const content = isFilePath ? fs.readFileSync(fileContent) : fileContent;
    const contentLength = isFilePath
      ? fs.statSync(fileContent).size
      : Buffer.isBuffer(fileContent)
        ? fileContent.length
        : undefined;

    // Generate S3 key
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const fileExtension = path.extname(fileName);
    const baseName = path.basename(fileName, fileExtension);
    const s3Key = withFolder(
      folder("AWS_S3_FOLDER_LMS_CONTENT", "balagruha-lms-content"),
      `${fileType}/${baseName}_${timestamp}_${randomStr}${fileExtension}`,
    );

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: bucketName(),
      Key: s3Key,
      Body: content,
      ContentType: mimeType,
      ...(contentLength ? { ContentLength: contentLength } : {}),
      Metadata: {
        'original-filename': fileName,
        'file-type': fileType,
        'upload-timestamp': new Date().toISOString(),
      },
    });

    // Starting S3 upload

    await s3Client.send(command);

    // Construct CDN URL
    const cdnUrl = publicUrl(s3Key);

    // LMS content uploaded successfully

    return {
      success: true,
      message: 'LMS content uploaded successfully',
      url: cdnUrl,
      s3Key,
      fileName,
      fileType,
      mimeType,
    };
  } catch (error) {
    console.error('❌ Error uploading LMS content:', error.message);
    if (error.$metadata) console.error('AWS Metadata:', error.$metadata);
    return {
      success: false,
      message: 'LMS content upload failed',
      error: error.message,
    };
  }
};

/**
 * Delete LMS content by S3 key or URL
 * @param {string} keyOrUrl - S3 key or full URL
 * @returns {Promise<object>} - Deletion result
 */
exports.deleteLMSContent = async (keyOrUrl) => {
  try {
    let key = keyOrUrl;

    // Extract key from URL if needed
    if (keyOrUrl && keyOrUrl.startsWith('http')) {
      key = exports.extractS3KeyFromUrl(keyOrUrl);
      if (!key) {
        return {
          success: false,
          message: 'Could not extract S3 key from URL',
          keyOrUrl,
        };
      }
    }

    if (!key) {
      return {
        success: false,
        message: 'No valid S3 key or URL provided',
        keyOrUrl,
      };
    }
    key = withFolder(
      folder("AWS_S3_FOLDER_LMS_CONTENT", "balagruha-lms-content"),
      key,
    );

    const command = new DeleteObjectCommand({
      Bucket: bucketName(),
      Key: key,
    });

    await s3Client.send(command);

    // LMS content deleted successfully

    return {
      success: true,
      message: 'LMS content deleted successfully',
      key,
      originalInput: keyOrUrl,
    };
  } catch (error) {
    console.error('Error deleting LMS content:', error);
    return {
      success: false,
      message: 'LMS content deletion failed',
      error: error.message,
      keyOrUrl,
    };
  }
};

/**
 * Get public CDN URL for LMS content (without presigning)
 * For public content that doesn't require signed URLs
 * @param {string} s3Key - S3 object key
 * @returns {Promise<object>} - CDN URL
 */
exports.getLMSContentUrl = async (s3Key) => {
  try {
    s3Key = withFolder(
      folder("AWS_S3_FOLDER_LMS_CONTENT", "balagruha-lms-content"),
      s3Key,
    );
    const url = publicUrl(s3Key);

    return {
      success: true,
      url,
      s3Key,
    };
  } catch (error) {
    console.error('Error getting LMS content URL:', error);
    return {
      success: false,
      message: 'Failed to get LMS content URL',
      error: error.message,
    };
  }
};
