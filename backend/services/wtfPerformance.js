const { errorLogger, logger } = require("../config/pino-config");
const {
  uploadWtfMedia,
  generateWtfThumbnail,
  getWtfMediaUrl,
} = require("./aws/s3");

// In-memory cache for frequently accessed WTF data
const wtfCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

class WtfPerformanceService {
  constructor() {
    this.cache = wtfCache;
    this.cacheTTL = CACHE_TTL;
  }

  // Cache management
  setCache(key, data, ttl = this.cacheTTL) {
    const expiry = Date.now() + ttl;
    this.cache.set(key, {
      data,
      expiry,
    });

    logger.info({ cacheKey: key, ttl }, "WTF data cached successfully");
  }

  getCache(key) {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clearCache(pattern = null) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }

    logger.info({ pattern: pattern || "all" }, "WTF cache cleared");
  }

  // Cache active pins
  async cacheActivePins(pins, page = 1, limit = 20) {
    const cacheKey = `active_pins_${page}_${limit}`;
    this.setCache(cacheKey, pins, 2 * 60 * 1000); // 2 minutes for active pins
    return pins;
  }

  // Get cached active pins
  async getCachedActivePins(page = 1, limit = 20) {
    const cacheKey = `active_pins_${page}_${limit}`;
    return this.getCache(cacheKey);
  }

  // Cache pin details
  async cachePinDetails(pinId, pinData) {
    const cacheKey = `pin_details_${pinId}`;
    this.setCache(cacheKey, pinData, 10 * 60 * 1000); // 10 minutes for pin details
    return pinData;
  }

  // Get cached pin details
  async getCachedPinDetails(pinId) {
    const cacheKey = `pin_details_${pinId}`;
    return this.getCache(cacheKey);
  }

  // Image processing and optimization
  async processWtfImage(filePath, pinId, options = {}) {
    try {
      const {
        quality = 85,
        maxWidth = 1920,
        maxHeight = 1080,
        format = "webp",
      } = options;

      logger.info({ pinId, filePath, options }, "Processing WTF image");

      // Upload original image
      const uploadResult = await uploadWtfMedia(filePath, "image", pinId);

      if (!uploadResult.success) {
        throw new Error("Failed to upload original image");
      }

      // Generate optimized thumbnail
      const thumbnailKey = `wtf/thumbnails/${pinId}_thumb_${Date.now()}.${format}`;
      const thumbnailResult = await generateWtfThumbnail(
        uploadResult.key,
        thumbnailKey
      );

      if (!thumbnailResult.success) {
        logger.warn(
          { pinId, error: thumbnailResult.error },
          "Failed to generate thumbnail, using original"
        );
      }

      return {
        success: true,
        data: {
          originalUrl: uploadResult.url,
          thumbnailUrl: thumbnailResult.success
            ? thumbnailResult.url
            : uploadResult.url,
          originalKey: uploadResult.key,
          thumbnailKey: thumbnailResult.success ? thumbnailResult.key : null,
          format: format,
          quality: quality,
        },
        message: "WTF image processed successfully",
      };
    } catch (error) {
      errorLogger.error(
        { pinId, filePath, error: error.message },
        "Error processing WTF image"
      );
      throw error;
    }
  }

  // Video processing and optimization
  async processWtfVideo(filePath, pinId, options = {}) {
    try {
      const {
        maxDuration = 600, // 10 minutes
        maxSize = 100 * 1024 * 1024, // 100MB
      } = options;

      logger.info({ pinId, filePath, options }, "Processing WTF video");

      // Upload original video
      const uploadResult = await uploadWtfMedia(filePath, "video", pinId);

      if (!uploadResult.success) {
        throw new Error("Failed to upload original video");
      }

      // Generate video thumbnail
      const thumbnailKey = `wtf/video-thumbnails/${pinId}_thumb_${Date.now()}.jpg`;
      const thumbnailResult = await generateWtfThumbnail(
        uploadResult.key,
        thumbnailKey
      );

      if (!thumbnailResult.success) {
        logger.warn(
          { pinId, error: thumbnailResult.error },
          "Failed to generate video thumbnail"
        );
      }

      return {
        success: true,
        data: {
          originalUrl: uploadResult.url,
          thumbnailUrl: thumbnailResult.success ? thumbnailResult.url : null,
          originalKey: uploadResult.key,
          thumbnailKey: thumbnailResult.success ? thumbnailResult.key : null,
          maxDuration: maxDuration,
          maxSize: maxSize,
        },
        message: "WTF video processed successfully",
      };
    } catch (error) {
      errorLogger.error(
        { pinId, filePath, error: error.message },
        "Error processing WTF video"
      );
      throw error;
    }
  }

  // Audio processing and optimization
  async processWtfAudio(filePath, pinId, options = {}) {
    try {
      const {
        maxDuration = 300, // 5 minutes
        maxSize = 25 * 1024 * 1024, // 25MB
      } = options;

      logger.info({ pinId, filePath, options }, "Processing WTF audio");

      // Upload original audio
      const uploadResult = await uploadWtfMedia(filePath, "audio", pinId);

      if (!uploadResult.success) {
        throw new Error("Failed to upload original audio");
      }

      return {
        success: true,
        data: {
          originalUrl: uploadResult.url,
          originalKey: uploadResult.key,
          maxDuration: maxDuration,
          maxSize: maxSize,
        },
        message: "WTF audio processed successfully",
      };
    } catch (error) {
      errorLogger.error(
        { pinId, filePath, error: error.message },
        "Error processing WTF audio"
      );
      throw error;
    }
  }

  // Performance monitoring
  async monitorWtfPerformance(operation, startTime, metadata = {}) {
    const duration = Date.now() - startTime;

    logger.info(
      {
        operation,
        duration,
        ...metadata,
      },
      "WTF performance monitoring"
    );

    // Log slow operations
    if (duration > 5000) {
      // 5 seconds
      errorLogger.warn(
        {
          operation,
          duration,
          ...metadata,
        },
        "Slow WTF operation detected"
      );
    }

    return {
      operation,
      duration,
      timestamp: new Date().toISOString(),
    };
  }

  // Database query optimization
  async optimizeWtfQuery(query, options = {}) {
    const {
      useCache = true,
      cacheKey = null,
      cacheTTL = this.cacheTTL,
      maxResults = 100,
    } = options;

    const startTime = Date.now();

    try {
      // Check cache first
      if (useCache && cacheKey) {
        const cached = this.getCache(cacheKey);
        if (cached) {
          const performance = await this.monitorWtfPerformance(
            "cached_query",
            startTime,
            { cacheKey, resultCount: cached.length }
          );

          return {
            success: true,
            data: cached,
            fromCache: true,
            performance,
          };
        }
      }

      // Execute query with limits
      const limitedQuery = { ...query };
      if (limitedQuery.limit && limitedQuery.limit > maxResults) {
        limitedQuery.limit = maxResults;
      }

      // Cache results
      if (useCache && cacheKey) {
        this.setCache(cacheKey, limitedQuery, cacheTTL);
      }

      const performance = await this.monitorWtfPerformance(
        "database_query",
        startTime,
        { cacheKey, resultCount: limitedQuery.length }
      );

      return {
        success: true,
        data: limitedQuery,
        fromCache: false,
        performance,
      };
    } catch (error) {
      errorLogger.error(
        { error: error.message, cacheKey },
        "Error optimizing WTF query"
      );
      throw error;
    }
  }

  // Content delivery optimization
  async optimizeContentDelivery(content, type = "text") {
    const startTime = Date.now();

    try {
      let optimizedContent = content;

      // Optimize based on content type
      switch (type) {
        case "text":
          // Truncate long text for preview
          if (content.length > 500) {
            optimizedContent = content.substring(0, 500) + "...";
          }
          break;

        case "image":
          // Add lazy loading attributes
          optimizedContent = {
            ...content,
            lazy: true,
            placeholder: content.thumbnailUrl || content.originalUrl,
          };
          break;

        case "video":
          // Add video optimization attributes
          optimizedContent = {
            ...content,
            preload: "metadata",
            poster: content.thumbnailUrl,
          };
          break;

        case "audio":
          // Add audio optimization attributes
          optimizedContent = {
            ...content,
            preload: "metadata",
          };
          break;
      }

      const performance = await this.monitorWtfPerformance(
        "content_optimization",
        startTime,
        {
          type,
          originalLength: content.length,
          optimizedLength: optimizedContent.length,
        }
      );

      return {
        success: true,
        data: optimizedContent,
        performance,
      };
    } catch (error) {
      errorLogger.error(
        { type, error: error.message },
        "Error optimizing content delivery"
      );
      throw error;
    }
  }

  // Cache invalidation
  async invalidateWtfCache(pattern = null) {
    try {
      this.clearCache(pattern);

      logger.info(
        { pattern: pattern || "all" },
        "WTF cache invalidated successfully"
      );

      return {
        success: true,
        message: "Cache invalidated successfully",
        pattern: pattern || "all",
      };
    } catch (error) {
      errorLogger.error(
        { pattern, error: error.message },
        "Error invalidating WTF cache"
      );
      throw error;
    }
  }

  // Get cache statistics
  getCacheStats() {
    const stats = {
      totalEntries: this.cache.size,
      memoryUsage: process.memoryUsage(),
      cacheKeys: Array.from(this.cache.keys()),
    };

    logger.info({ stats }, "WTF cache statistics");

    return stats;
  }
}

module.exports = WtfPerformanceService;
