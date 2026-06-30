/**
 * FR Cache Service
 *
 * Redis caching layer for face embeddings to improve recognition performance.
 * Cache hit rate target: >95%
 *
 * @module frCacheService
 */

const Redis = require('ioredis');
const FaceEmbedding = require('../models/FaceEmbedding');

// Redis client
let redisClient = null;
let cacheEnabled = false;

/**
 * Initialize Redis connection
 */
function initializeCache() {
  try {
    const cacheFlag = String(process.env.FR_CACHE_ENABLED || '').toLowerCase();
    const redisUrl = process.env.REDIS_URL;

    if (cacheFlag === 'false' || (!redisUrl && cacheFlag !== 'true')) {
      console.log('FR Cache: Redis disabled. Running without cache.');
      cacheEnabled = false;
      return null;
    }

    redisClient = new Redis(redisUrl, {
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn('⚠️  FR Cache: Redis connection failed after 3 retries. Running without cache.');
          return null; // Stop retrying
        }
        return Math.min(times * 100, 3000); // Retry after delay
      },
      maxRetriesPerRequest: 3,
    });

    redisClient.on('connect', () => {
      // FR Cache: Redis connected successfully
      cacheEnabled = true;
    });

    redisClient.on('error', (error) => {
      console.error('❌ FR Cache: Redis error:', error.message);
      cacheEnabled = false;
    });

    redisClient.on('close', () => {
      console.warn('⚠️  FR Cache: Redis connection closed');
      cacheEnabled = false;
    });

    return redisClient;
  } catch (error) {
    console.error('❌ FR Cache: Failed to initialize Redis:', error.message);
    cacheEnabled = false;
    return null;
  }
}

/**
 * Check if cache is enabled and connected
 *
 * @returns {boolean} Cache status
 */
function isCacheEnabled() {
  return cacheEnabled && redisClient && redisClient.status === 'ready';
}

/**
 * Generate cache key for embedding
 *
 * @param {string} studentId - Student ID
 * @returns {string} Cache key
 */
function getCacheKey(studentId) {
  return `fr:embedding:${studentId}`;
}

/**
 * Warm cache with all active embeddings
 * Call this on server startup or periodically
 *
 * @returns {Promise<Object>} Cache warming result
 */
async function warmCache() {
  const startTime = Date.now();

  try {
    if (!isCacheEnabled()) {
      return {
        success: false,
        message: 'Cache not enabled',
      };
    }

    // Warming cache with active embeddings

    // Get all active embeddings
    const embeddings = await FaceEmbedding.getAllActiveEmbeddings();

    if (embeddings.length === 0) {
      // No active embeddings to cache
      return {
        success: true,
        cached: 0,
        message: 'No embeddings to cache',
      };
    }

    // Store in Redis with pipeline for efficiency
    const pipeline = redisClient.pipeline();

    for (const { studentId, embedding } of embeddings) {
      const key = getCacheKey(studentId);
      const value = JSON.stringify(embedding);

      // Cache for 24 hours (configurable)
      const ttl = 24 * 60 * 60; // 86400 seconds
      pipeline.setex(key, ttl, value);
    }

    await pipeline.exec();

    const duration = Date.now() - startTime;

    // Cache warmed successfully

    return {
      success: true,
      cached: embeddings.length,
      duration,
    };
  } catch (error) {
    console.error('❌ FR Cache: Failed to warm cache:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get embedding from cache
 *
 * @param {string} studentId - Student ID
 * @returns {Promise<Array<number>|null>} Cached embedding or null if not found
 */
async function getCachedEmbedding(studentId) {
  try {
    if (!isCacheEnabled()) {
      return null; // Cache miss, will fallback to DB
    }

    const key = getCacheKey(studentId);
    const value = await redisClient.get(key);

    if (!value) {
      return null; // Cache miss
    }

    // Parse and return embedding
    return JSON.parse(value);
  } catch (error) {
    console.error(`❌ FR Cache: Failed to get cached embedding for ${studentId}:`, error.message);
    return null; // Fallback to DB
  }
}

/**
 * Store embedding in cache
 *
 * @param {string} studentId - Student ID
 * @param {Array<number>} embedding - Face embedding
 * @returns {Promise<boolean>} Success status
 */
async function cacheEmbedding(studentId, embedding) {
  try {
    if (!isCacheEnabled()) {
      return false; // Cache disabled
    }

    const key = getCacheKey(studentId);
    const value = JSON.stringify(embedding);
    const ttl = 24 * 60 * 60; // 24 hours

    await redisClient.setex(key, ttl, value);
    return true;
  } catch (error) {
    console.error(`❌ FR Cache: Failed to cache embedding for ${studentId}:`, error.message);
    return false;
  }
}

/**
 * Invalidate cache for a student
 * Call this when embedding is updated or deleted
 *
 * @param {string} studentId - Student ID
 * @returns {Promise<boolean>} Success status
 */
async function invalidateCache(studentId) {
  try {
    if (!isCacheEnabled()) {
      return false;
    }

    const key = getCacheKey(studentId);
    await redisClient.del(key);

    // Cache invalidated for student
    return true;
  } catch (error) {
    console.error(`❌ FR Cache: Failed to invalidate cache for ${studentId}:`, error.message);
    return false;
  }
}

/**
 * Get all cached embeddings (for recognition)
 * Much faster than loading from database
 *
 * @returns {Promise<Array>} Array of {studentId, embedding} objects
 */
async function getAllCachedEmbeddings() {
  try {
    if (!isCacheEnabled()) {
      // Fallback to database
      return await FaceEmbedding.getAllActiveEmbeddings();
    }

    // Get all embedding keys
    const keys = await redisClient.keys('fr:embedding:*');

    if (keys.length === 0) {
      // Cache cold, warm it up
      // Cache is cold, warming up
      await warmCache();
      // Retry after warming
      const retryKeys = await redisClient.keys('fr:embedding:*');
      if (retryKeys.length === 0) {
        // Still empty, fallback to DB
        return await FaceEmbedding.getAllActiveEmbeddings();
      }
      keys.length = 0;
      keys.push(...retryKeys);
    }

    // Get all values with pipeline
    const pipeline = redisClient.pipeline();
    keys.forEach(key => pipeline.get(key));
    const results = await pipeline.exec();

    // Parse results
    const embeddings = [];
    keys.forEach((key, index) => {
      const [err, value] = results[index];
      if (!err && value) {
        const studentId = key.replace('fr:embedding:', '');
        const embedding = JSON.parse(value);
        embeddings.push({ studentId, embedding });
      }
    });

    // Cache hit - embeddings retrieved

    return embeddings;
  } catch (error) {
    console.error('❌ FR Cache: Failed to get all cached embeddings:', error.message);
    // Fallback to database
    // Falling back to database
    return await FaceEmbedding.getAllActiveEmbeddings();
  }
}

/**
 * Get cache statistics
 *
 * @returns {Promise<Object>} Cache stats
 */
async function getCacheStats() {
  try {
    if (!isCacheEnabled()) {
      return {
        enabled: false,
        message: 'Cache not enabled',
      };
    }

    const keys = await redisClient.keys('fr:embedding:*');
    const info = await redisClient.info('stats');

    // Parse Redis info for hit rate
    const hitsMatch = info.match(/keyspace_hits:(\d+)/);
    const missesMatch = info.match(/keyspace_misses:(\d+)/);

    const hits = hitsMatch ? parseInt(hitsMatch[1]) : 0;
    const misses = missesMatch ? parseInt(missesMatch[1]) : 0;
    const total = hits + misses;
    const hitRate = total > 0 ? (hits / total) * 100 : 0;

    return {
      enabled: true,
      cachedEmbeddings: keys.length,
      hits,
      misses,
      hitRate: hitRate.toFixed(2) + '%',
      targetHitRate: '95%',
    };
  } catch (error) {
    console.error('❌ FR Cache: Failed to get cache stats:', error.message);
    return {
      enabled: false,
      error: error.message,
    };
  }
}

/**
 * Clear all FR cache
 * Use with caution!
 *
 * @returns {Promise<boolean>} Success status
 */
async function clearCache() {
  try {
    if (!isCacheEnabled()) {
      return false;
    }

    const keys = await redisClient.keys('fr:embedding:*');
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }

    // Cache cleared
    return true;
  } catch (error) {
    console.error('❌ FR Cache: Failed to clear cache:', error.message);
    return false;
  }
}

module.exports = {
  initializeCache,
  isCacheEnabled,
  warmCache,
  getCachedEmbedding,
  cacheEmbedding,
  invalidateCache,
  getAllCachedEmbeddings,
  getCacheStats,
  clearCache,
};
