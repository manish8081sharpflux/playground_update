const multer = require("multer");
const path = require("path");
const fs = require("fs");

/*
|--------------------------------------------------------------------------
| Upload Directory Configuration
|--------------------------------------------------------------------------
*/

const uploadsDir = path.join(process.cwd(), "uploads");

const ensureUploadsDir = () => {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
};

// Make sure uploads directory exists when application starts
ensureUploadsDir();

/*
|--------------------------------------------------------------------------
| Common Storage Configuration
|--------------------------------------------------------------------------
*/

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      ensureUploadsDir();
      cb(null, uploadsDir);
    } catch (error) {
      cb(error);
    }
  },

  filename: (req, file, cb) => {
    const uniqueSuffix =
      Date.now() + "-" + Math.round(Math.random() * 1e9);

    cb(
      null,
      `${file.fieldname}-${uniqueSuffix}${path.extname(
        file.originalname
      )}`
    );
  },
});

/*
|--------------------------------------------------------------------------
| General File Upload Configuration
|--------------------------------------------------------------------------
*/

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",

    "application/pdf",

    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",

    "text/plain",
    "text/csv",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Allowed: JPEG, JPG, PNG, WEBP, PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV."
      )
    );
  }
};

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter,
});

/*
|--------------------------------------------------------------------------
| General Upload Error Handling
|--------------------------------------------------------------------------
*/

const uploadAnyWithErrorHandling = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) {
      console.error("Upload error:", {
        message: err.message,
        code: err.code,
        field: err.field,
      });

      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File too large. Maximum size is 5MB.",
        });
      }

      if (err.code === "LIMIT_FILE_COUNT") {
        return res.status(400).json({
          success: false,
          message: "Too many files.",
        });
      }

      if (err.code === "LIMIT_FIELD_SIZE") {
        return res.status(400).json({
          success: false,
          message: "Field data too large.",
        });
      }

      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`,
      });
    }

    next();
  });
};

/*
|--------------------------------------------------------------------------
| WTF Media Upload Configuration
|--------------------------------------------------------------------------
*/

const wtfFileFilter = (req, file, cb) => {
  const allowedTypes = [
    // Images
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",

    // Videos
    "video/mp4",
    "video/webm",

    // Audio
    "audio/mpeg",
    "audio/mp3",
    "audio/mpeg3",
    "audio/wav",
    "audio/ogg",
    "audio/aac",
    "audio/m4a",
    "audio/webm",
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
    fileSize: 100 * 1024 * 1024,
    files: 1,
    fieldSize: 10 * 1024 * 1024,
  },

  fileFilter: wtfFileFilter,
});

/*
|--------------------------------------------------------------------------
| WTF Upload Error Handling
|--------------------------------------------------------------------------
*/

const wtfUploadWithErrorHandling = (req, res, next) => {
  wtfUpload.single("file")(req, res, (err) => {
    if (err) {
      console.error("🚨 WTF Multer Error:", {
        message: err.message,
        code: err.code,
        field: err.field,
      });

      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File too large. Maximum size is 100MB.",
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

      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`,
      });
    }

    next();
  });
};

/*
|--------------------------------------------------------------------------
| Font Upload Configuration
|--------------------------------------------------------------------------
*/

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
    cb(
      new Error(
        "Invalid font type. Only WOFF2, WOFF, TTF and OTF are allowed."
      )
    );
  }
};

const fontUpload = multer({
  storage,

  limits: {
    fileSize: 1 * 1024 * 1024,
  },

  fileFilter: fontFileFilter,
});

/*
|--------------------------------------------------------------------------
| LMS Upload Configuration
|--------------------------------------------------------------------------
*/

const lmsFileFilter = (req, file, cb) => {
  const allowedTypes = [
    // Videos
    "video/mp4",
    "video/webm",
    "video/ogg",
    "video/quicktime",

    // PDF
    "application/pdf",

    // Audio
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
    "audio/aac",
    "audio/m4a",
    "audio/webm",

    // Images
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
        `Invalid file type: ${file.mimetype}. Allowed types: video, PDF, audio and images.`
      )
    );
  }
};

const lmsUpload = multer({
  storage,

  limits: {
    fileSize: 500 * 1024 * 1024,
    files: 10,
    fieldSize: 10 * 1024 * 1024,
  },

  fileFilter: lmsFileFilter,
});

/*
|--------------------------------------------------------------------------
| LMS Upload Error Handling
|--------------------------------------------------------------------------
*/

const lmsUploadWithErrorHandling = (req, res, next) => {
  lmsUpload.array("files", 10)(req, res, (err) => {
    if (err) {
      console.error("🚨 LMS Multer Error:", {
        message: err.message,
        code: err.code,
        field: err.field,
      });

      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File too large. Maximum size is 500MB.",
        });
      }

      if (err.code === "LIMIT_FILE_COUNT") {
        return res.status(400).json({
          success: false,
          message:
            "Too many files. Maximum 10 files allowed per upload.",
        });
      }

      if (err.code === "LIMIT_FIELD_SIZE") {
        return res.status(400).json({
          success: false,
          message: "Field data too large. Maximum size is 10MB.",
        });
      }

      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`,
      });
    }

    next();
  });
};

/*
|--------------------------------------------------------------------------
| Cleanup Orphaned Files
|--------------------------------------------------------------------------
*/

const cleanupOrphanedFiles = () => {
  try {
    ensureUploadsDir();

    const files = fs.readdirSync(uploadsDir);

    const now = Date.now();

    const maxAge = 24 * 60 * 60 * 1000;

    files.forEach((file) => {
      // Ignore placeholder file
      if (file === "uploaded_files_here.txt") {
        return;
      }

      const filePath = path.join(uploadsDir, file);

      try {
        const stats = fs.statSync(filePath);

        // Skip directories
        if (!stats.isFile()) {
          return;
        }

        const age = now - stats.mtimeMs;

        if (age > maxAge) {
          fs.unlinkSync(filePath);

          console.log(`🧹 Cleaned orphaned file: ${file}`);
        }
      } catch (fileError) {
        console.error(
          `❌ Failed processing file ${file}:`,
          fileError.message
        );
      }
    });
  } catch (error) {
    console.error(
      "❌ Error during cleanup:",
      error.message
    );
  }
};

/*
|--------------------------------------------------------------------------
| Cleanup Timer
|--------------------------------------------------------------------------
*/

let cleanupTimer = null;

if (process.env.NODE_ENV !== "test") {
  // Run cleanup once when server starts
  cleanupOrphanedFiles();

  // Run cleanup every hour
  cleanupTimer = setInterval(
    cleanupOrphanedFiles,
    60 * 60 * 1000
  );

  /*
   * Do not keep Node.js alive only because of this timer.
   * Useful for graceful shutdown and CLI/test environments.
   */
  if (typeof cleanupTimer.unref === "function") {
    cleanupTimer.unref();
  }
}

/*
|--------------------------------------------------------------------------
| Stop Cleanup Timer
|--------------------------------------------------------------------------
*/

const stopCleanupTimer = () => {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);

    cleanupTimer = null;
  }
};

/*
|--------------------------------------------------------------------------
| Module Exports
|--------------------------------------------------------------------------
*/

module.exports = {
  upload,
  uploadAnyWithErrorHandling,

  wtfUpload,
  wtfUploadWithErrorHandling,

  fontUpload,

  lmsUpload,
  lmsUploadWithErrorHandling,

  cleanupOrphanedFiles,
  ensureUploadsDir,
  stopCleanupTimer,
};