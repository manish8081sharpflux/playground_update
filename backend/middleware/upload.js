const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`
    );
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
    "text/plain",
    "text/csv",
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Allowed: JPEG, JPG, PNG, WEBP, PDF, DOCX, XLSX, PPTX, TXT, CSV."
      )
    );
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limited to 5MB max for the time being
  fileFilter,
});

// WTF-specific upload configuration with support for media files
const wtfFileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "video/mp4",
    "video/webm",
    "audio/mpeg", // Standard MP3 MIME type
    "audio/mp3", // Alternative MP3 MIME type
    "audio/mpeg3", // Legacy MP3 MIME type
    "audio/wav",
    "audio/ogg",
    "audio/aac", // AAC audio support
    "audio/m4a", // M4A audio support
    "audio/webm", // Browser MediaRecorder default for many setups
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type: ${
          file.mimetype
        }. Allowed types: ${allowedTypes.join(", ")}`
      )
    );
  }
};

const wtfUpload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // Increased to 100MB for WTF media files
    files: 1, // Allow only 1 file at a time
    fieldSize: 10 * 1024 * 1024, // 10MB for field data
  },
  fileFilter: wtfFileFilter,
});

// Font-specific upload configuration
const fontFileFilter = (req, file, cb) => {
  const allowedTypes = [
    "font/woff2",
    "font/woff",
    "application/x-font-ttf",
    "font/ttf",
    "application/x-font-otf",
    "font/otf",
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid font type. Only WOFF2/WOFF/TTF/OTF are allowed."));
  }
};

const fontUpload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB max font size
  fileFilter: fontFileFilter,
});

// LMS Content-specific upload configuration with support for large media files
const lmsFileFilter = (req, file, cb) => {
  const allowedTypes = [
    // Video files
    "video/mp4",
    "video/webm",
    "video/ogg",
    "video/quicktime", // .mov files
    // PDF documents
    "application/pdf",
    // Audio files
    "audio/mpeg", // MP3
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
    "audio/aac",
    "audio/m4a",
    "audio/webm",
    // Image files
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type: ${file.mimetype}. Allowed types: video (mp4, webm, ogg, mov), pdf, audio (mp3, wav, ogg, aac, m4a), image (jpeg, png, gif, webp, svg)`
      )
    );
  }
};

const lmsUpload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max for LMS content (mainly for videos)
    files: 10, // Allow up to 10 files at a time
    fieldSize: 10 * 1024 * 1024, // 10MB for field data
  },
  fileFilter: lmsFileFilter,
});

// Wrap the LMS multer middleware with error handling
const lmsUploadWithErrorHandling = (req, res, next) => {
  lmsUpload.array("files", 10)(req, res, (err) => {
    if (err) {
      console.error("🚨 LMS Multer Error:", {
        message: err.message,
        code: err.code,
        field: err.field,
        files: req.files,
        body: req.body,
      });

      // Handle specific multer errors
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: `File too large. Maximum size is 500MB.`,
        });
      }

      if (err.code === "LIMIT_FILE_COUNT") {
        return res.status(400).json({
          success: false,
          message: "Too many files. Maximum 10 files allowed per upload.",
        });
      }

      if (err.code === "LIMIT_FIELD_SIZE") {
        return res.status(400).json({
          success: false,
          message: "Field data too large. Maximum size is 10MB.",
        });
      }

      // Generic multer error
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`,
      });
    }

    // Log successful file upload for debugging
    // No error, continue
    next();
  });
};

// Wrap the multer middleware to add error handling
const wtfUploadWithErrorHandling = (req, res, next) => {
  wtfUpload.single("file")(req, res, (err) => {
    if (err) {
      console.error("🚨 Multer Error:", {
        message: err.message,
        code: err.code,
        field: err.field,
        file: req.file,
        body: req.body,
      });

      // Handle specific multer errors
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: `File too large. Maximum size is 100MB. Received: ${
            req.file
              ? (req.file.size / (1024 * 1024)).toFixed(2) + "MB"
              : "Unknown"
          }`,
        });
      }

      if (err.code === "LIMIT_FILE_COUNT") {
        return res.status(400).json({
          success: false,
          message: "Too many files. Only 1 file allowed.",
        });
      }

      if (err.code === "LIMIT_FIELD_SIZE") {
        return res.status(400).json({
          success: false,
          message: "Field data too large. Maximum size is 10MB.",
        });
      }

      // Generic multer error
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`,
      });
    }

    // No error, continue
    next();
  });
};

// Cleanup function to remove orphaned files
const cleanupOrphanedFiles = () => {
  const uploadsDir = "uploads/";

  try {
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      files.forEach((file) => {
        if (file === "uploaded_files_here.txt") return; // Skip the placeholder file

        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        const age = now - stats.mtime.getTime();

        // Remove files older than 24 hours
        if (age > maxAge) {
          try {
            fs.unlinkSync(filePath);
            // Cleaned up orphaned file
          } catch (error) {
            console.error(`❌ Failed to clean up file ${file}:`, error.message);
          }
        }
      });
    }
  } catch (error) {
    console.error("❌ Error during cleanup:", error.message);
  }
};

// Run cleanup every hour (skip in test environment to avoid open handles)
let cleanupTimer = null;
if (process.env.NODE_ENV !== "test") {
  cleanupTimer = setInterval(cleanupOrphanedFiles, 60 * 60 * 1000);
  // Run initial cleanup
  cleanupOrphanedFiles();
}

// Stop the cleanup timer (useful for graceful shutdown)
const stopCleanupTimer = () => {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
};

module.exports = {
  upload,
  wtfUpload,
  wtfUploadWithErrorHandling,
  fontUpload,
  lmsUpload,
  lmsUploadWithErrorHandling,
  cleanupOrphanedFiles,
  stopCleanupTimer,
};
