const { body, validationResult } = require("express-validator");
const { errorLogger } = require("../config/pino-config");
const { HTTP_STATUS_CODE } = require("../constants/general");

// Rate limiting configuration for WTF endpoints - DISABLED
const createRateLimiter = (windowMs, max, message) => {
  // Return a no-op middleware that does nothing
  return (req, res, next) => {
    next();
  };
};

// Rate limiters for different WTF operations - ALL DISABLED
const wtfRateLimiters = {
  // Pin creation - NO LIMIT
  pinCreation: (req, res, next) => next(),

  // Pin interactions - NO LIMIT
  pinInteractions: (req, res, next) => next(),

  // Submissions - NO LIMIT
  submissions: (req, res, next) => next(),

  // General WTF endpoints - NO LIMIT
  general: (req, res, next) => next(),

  // Admin operations - NO LIMIT
  admin: (req, res, next) => next(),
};

// Content sanitization and validation for WTF submissions
const wtfContentValidation = [
  // Title validation (presence only)
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .escape()
    .customSanitizer((value) => {
      // Remove potentially dangerous HTML/script tags
      return value.replace(
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        ""
      );
    }),

  // Content validation for text pins
  body("content")
    .if(body("type").equals("text"))
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage("Text content must be between 1 and 2000 characters")
    .escape()
    .customSanitizer((value) => {
      // Remove potentially dangerous HTML/script tags
      return value.replace(
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        ""
      );
    }),

  // Link validation (accepts linkUrl or content; avoids throwing 500s)
  body("linkUrl")
    .if(body("type").equals("link"))
    .customSanitizer(
      (value, { req }) => value || req.body.link || req.body.content
    )
    .trim()
    .notEmpty()
    .withMessage("Link URL is required")
    .bail()
    .isURL({ require_protocol: true })
    .withMessage("Link must be a valid URL")
    .custom((value) => {
      try {
        const parsed = new URL(value);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          throw new Error("Only HTTP and HTTPS URLs are allowed");
        }
        return true;
      } catch (_) {
        throw new Error("Link must be a valid URL");
      }
    }),

  // Tags validation
  body("tags")
    .optional()
    .customSanitizer((value) => {
      // Handle JSON string from FormData
      if (typeof value === "string") {
        try {
          value = JSON.parse(value);
        } catch (e) {
          return [];
        }
      }
      // Ensure it's an array
      if (!Array.isArray(value)) {
        return [];
      }
      return value
        .slice(0, 10) // Limit to 10 tags
        .map((tag) => tag.toString().trim().substring(0, 50)) // Limit tag length
        .filter((tag) => tag.length > 0); // Remove empty tags
    })
    .isArray({ max: 10 })
    .withMessage("Tags must be an array with maximum 10 items"),

  // Language validation
  body("language")
    .optional()
    .isIn(["english", "hindi", "both"])
    .withMessage("Language must be english, hindi, or both"),

  // File size validation removed - pins can have variable file sizes
  // Duration validation removed - not needed for file uploads
];

// Validation for WTF submissions
const wtfSubmissionValidation = [
  // Title validation (presence only)
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .escape()
    .customSanitizer((value) => {
      return value.replace(
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        ""
      );
    }),

  // Article content validation
  body("content")
    .if(body("type").equals("article"))
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage("Article content must be between 10 and 5000 characters")
    .escape()
    .customSanitizer((value) => {
      return value.replace(
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        ""
      );
    }),

  // Audio transcription validation
  body("audioTranscription")
    .if(body("type").equals("voice"))
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Audio transcription must be less than 2000 characters")
    .escape()
    .customSanitizer((value) => {
      return value.replace(
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        ""
      );
    }),

  // Tags validation (tolerant: accept JSON string, empty string, or omit)
  body("tags")
    .optional()
    .customSanitizer((value) => {
      // Accept JSON string (e.g., "[]") coming from FormData
      if (typeof value === "string") {
        try {
          value = JSON.parse(value);
        } catch (_) {
          return [];
        }
      }
      if (!Array.isArray(value)) {
        return [];
      }
      return value
        .slice(0, 10)
        .map((tag) => tag.toString().trim().substring(0, 50))
        .filter((tag) => tag.length > 0);
    })
    .isArray({ max: 10 })
    .withMessage("Tags must be an array with maximum 10 items"),

  // Language validation
  body("language")
    .optional()
    .isIn(["english", "hindi"])
    .withMessage("Language must be english or hindi"),

  // File size validation removed - voice notes can have variable file sizes
  // Duration validation removed - not needed for file uploads
];

// Validation for WTF interactions
const wtfInteractionValidation = [
  // Like type validation
  body("likeType")
    .optional()
    .isIn(["thumbs_up", "green_heart"])
    .withMessage("Like type must be thumbs_up or green_heart"),

  // View duration validation
  body("viewDuration")
    .optional()
    .isInt({ min: 0, max: 3600 }) // Max 1 hour
    .withMessage("View duration must be between 0 and 3600 seconds"),
];

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    errorLogger.warn(
      {
        clientIP: req.ip,
        userAgent: req.get("User-Agent"),
        endpoint: req.originalUrl,
        userId: req.user?.id,
        errors: errors.array(),
      },
      "WTF validation errors"
    );

    return res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
      })),
    });
  }
  next();
};

// Content size limits middleware
const contentSizeLimits = {
  // Pin content limits
  pin: {
    title: 200,
    content: 2000,
    tags: 10,
  },
  // Submission content limits
  submission: {
    title: 200,
    content: 5000,
    transcription: 2000,
    tags: 10,
  },
};

// Middleware to check content size limits
const checkContentSizeLimits = (type) => {
  return (req, res, next) => {
    const limits = contentSizeLimits[type];
    if (!limits) {
      return next();
    }

    const violations = [];

    // Title length is not limited (presence checked in validators only)

    // Check content length
    if (req.body.content && req.body.content.length > limits.content) {
      violations.push(`Content exceeds ${limits.content} character limit`);
    }

    // Check tags count
    if (
      req.body.tags &&
      Array.isArray(req.body.tags) &&
      req.body.tags.length > limits.tags
    ) {
      violations.push(`Tags exceed ${limits.tags} item limit`);
    }

    // Check transcription length
    if (
      req.body.audioTranscription &&
      req.body.audioTranscription.length > limits.transcription
    ) {
      violations.push(
        `Transcription exceeds ${limits.transcription} character limit`
      );
    }

    if (violations.length > 0) {
      errorLogger.warn(
        {
          clientIP: req.ip,
          userAgent: req.get("User-Agent"),
          endpoint: req.originalUrl,
          userId: req.user?.id,
          violations,
        },
        "WTF content size limit violations"
      );

      return res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
        success: false,
        message: "Content size limits exceeded",
        violations,
      });
    }

    next();
  };
};

// Security headers middleware for WTF endpoints
const wtfSecurityHeaders = (req, res, next) => {
  // Content Security Policy for WTF content
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; media-src 'self' https:; connect-src 'self' https:;"
  );

  // XSS Protection
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Frame options to prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");

  // Referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  next();
};

// File upload security middleware
const wtfFileUploadSecurity = (req, res, next) => {
  // Check file size limits
  if (req.file) {
    const maxSize = 100 * 1024 * 1024; // Increased to 100MB
    if (req.file.size > maxSize) {
      errorLogger.warn(
        {
          clientIP: req.ip,
          userAgent: req.get("User-Agent"),
          endpoint: req.originalUrl,
          userId: req.user?.id,
          fileSize: req.file.size,
          maxSize,
        },
        "WTF file upload size limit exceeded"
      );

      return res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
        success: false,
        message: "File size exceeds the maximum limit of 100MB",
      });
    }

    // Check file type
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
      "audio/webm", // MediaRecorder default for many browsers
    ];

    if (!allowedTypes.includes(req.file.mimetype)) {
      errorLogger.warn(
        {
          clientIP: req.ip,
          userAgent: req.get("User-Agent"),
          endpoint: req.originalUrl,
          userId: req.user?.id,
          fileType: req.file.mimetype,
        },
        "WTF file upload invalid file type"
      );

      return res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
        success: false,
        message:
          "Invalid file type. Only images, videos, and audio files are allowed",
      });
    }
  }

  next();
};

module.exports = {
  wtfRateLimiters,
  wtfContentValidation,
  wtfSubmissionValidation,
  wtfInteractionValidation,
  handleValidationErrors,
  checkContentSizeLimits,
  wtfSecurityHeaders,
  wtfFileUploadSecurity,
};
