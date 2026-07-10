/**
 * Facial Recognition Service
 *
 * Core FR logic using @vladmandic/human library.
 * Handles face detection, embedding extraction, registration, and recognition.
 *
 * @module frService
 */

const { Canvas, Image } = require('canvas');
let tf;
try {
  tf = require('@tensorflow/tfjs-node');
} catch (error) {
  console.warn('tfjs-node failed to load; falling back to @tensorflow/tfjs:', error.message);
  tf = require('@tensorflow/tfjs');
}
const FaceEmbedding = require('../models/FaceEmbedding');
const FRSession = require('../models/FRSession');
const frCacheService = require('./frCacheService');

// Human instance will be injected from server.js
let humanInstance = null;

/**
 * Initialize FR service with Human instance
 * Called from server.js after Human is loaded and warmed up
 *
 * @param {Object} human - Initialized Human instance
 */
function initializeFRService(human) {
  if (!human) {
    throw new Error('Human instance is required to initialize FR service');
  }
  humanInstance = human;
  // FR Service initialized
}

/**
 * Get Human instance (throws if not initialized)
 *
 * @returns {Object} Human instance
 * @throws {Error} If FR service not initialized
 */
function getHuman() {
  if (!humanInstance) {
    throw new Error('FR Service not initialized. Call initializeFRService() first.');
  }
  return humanInstance;
}

/**
 * Decode an image buffer into a TF tensor that Human's Node API accepts.
 * Human v3 on Node only recognizes Tensors / specific DOM types as input;
 * passing a node-canvas Image throws "input error: type not recognized".
 *
 * @param {Buffer} imageBuffer - Image data (JPEG, PNG, etc.)
 * @returns {Promise<Object>} Object with { tensor, width, height }.
 *   Caller MUST dispose the tensor after use (`tensor.dispose()`).
 * @throws {Error} If image cannot be decoded
 */
async function bufferToImage(imageBuffer) {
  if (!Buffer.isBuffer(imageBuffer)) {
    throw new Error('bufferToImage expects a Buffer');
  }
  if (!tf.node || typeof tf.node.decodeImage !== 'function') {
    throw new Error(
      'TensorFlow Node image decoder is unavailable. Reinstall backend dependencies so @tensorflow/tfjs-node loads correctly.'
    );
  }

  // decodeImage returns shape [h, w, channels]; channels=3 forces RGB so
  // Human's BlazeFace input pipeline gets a consistent tensor.
  const tensor = tf.node.decodeImage(imageBuffer, 3);
  const [height, width] = tensor.shape;
  // Human expects a 4D batch tensor [1, h, w, 3].
  const batched = tf.expandDims(tensor, 0);
  tensor.dispose();
  // Decorate so callers that read .width/.height (validateQuality) still work.
  batched.width = width;
  batched.height = height;
  return batched;
}

/**
 * Validate image quality
 *
 * @param {Object} face - Face object from Human detection
 * @param {Object} image - Image object with width/height
 * @returns {Object} Quality assessment { overall, detection, landmarks, image, warnings }
 */
function validateQuality(face, image) {
  const quality = {
    overall: 0,
    detection: face.score || 0,
    landmarks: 0,
    image: 0,
    warnings: [],
  };

  // Check face detection confidence
  if (face.score < 0.8) {
    quality.warnings.push('Low face detection confidence');
  }

  // Check landmarks quality
  if (face.mesh && face.mesh.length > 0) {
    // Human provides face mesh points, check if they're well-defined
    quality.landmarks = Math.min(1, face.mesh.length / 468); // 468 is full mesh
  } else {
    quality.warnings.push('Face landmarks not detected');
    quality.landmarks = 0;
  }

  // Check face size (should be reasonable portion of image)
  if (face.box) {
    const faceArea = face.box.width * face.box.height;
    const imageArea = image.width * image.height;
    const faceRatio = faceArea / imageArea;

    if (faceRatio < 0.05) {
      quality.warnings.push('Face is too small in the image');
      quality.image = 0.5;
    } else if (faceRatio > 0.8) {
      quality.warnings.push('Face is too close/large in the image');
      quality.image = 0.7;
    } else {
      quality.image = 0.9;
    }
  }

  // Check image resolution
  if (image.width < 640 || image.height < 480) {
    quality.warnings.push('Image resolution is low (recommend ≥640x480)');
    quality.image = Math.min(quality.image, 0.7);
  }

  // Calculate overall quality (weighted average)
  quality.overall = (
    quality.detection * 0.4 +
    quality.landmarks * 0.3 +
    quality.image * 0.3
  );

  return quality;
}

/**
 * Detect face in image
 *
 * @param {Buffer} imageBuffer - Image data
 * @returns {Promise<Object>} Detection result
 * @returns {Object.success} Boolean - Detection successful
 * @returns {Object.face} Object - Face data (if detected)
 * @returns {Object.faces} Array - All detected faces
 * @returns {Object.quality} Object - Quality metrics
 * @returns {Object.error} String - Error message (if failed)
 * @returns {Object.failureReason} String - Failure reason enum
 * @returns {Object.detectionTimeMs} Number - Detection time in milliseconds
 */
async function detectFace(imageBuffer) {
  const startTime = Date.now();
  const human = getHuman();
  let image = null;

  try {
    // Convert buffer to tensor (Human v3 Node requires a tf tensor as input)
    image = await bufferToImage(imageBuffer);

    // Detect faces
    const result = await human.detect(image);
    const detectionTimeMs = Date.now() - startTime;

    // Check if any faces detected
    if (!result.face || result.face.length === 0) {
      return {
        success: false,
        faces: [],
        error: 'No face detected in the image',
        failureReason: 'no_face_detected',
        detectionTimeMs,
      };
    }

    // Check for multiple faces
    if (result.face.length > 1) {
      return {
        success: false,
        faces: result.face,
        error: `Multiple faces detected (${result.face.length}). Please ensure only one face is visible.`,
        failureReason: 'multiple_faces_detected',
        detectionTimeMs,
      };
    }

    // Get the single detected face
    const face = result.face[0];

    // Validate quality
    const quality = validateQuality(face, image);

    // Check if quality is acceptable (threshold: 0.6)
    if (quality.overall < 0.6) {
      return {
        success: false,
        face,
        faces: result.face,
        quality,
        error: `Image quality too low (${(quality.overall * 100).toFixed(0)}%). ${quality.warnings.join('. ')}`,
        failureReason: 'poor_image_quality',
        detectionTimeMs,
      };
    }

    // Success
    return {
      success: true,
      face,
      faces: result.face,
      quality,
      detectionTimeMs,
      imageDimensions: {
        width: image.width,
        height: image.height,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Face detection failed: ${error.message}`,
      failureReason: 'server_error',
      detectionTimeMs: Date.now() - startTime,
    };
  } finally {
    // Always free the GPU/CPU tensor backing the decoded image, even on failure.
    if (image && typeof image.dispose === 'function') {
      try { image.dispose(); } catch (_) { /* noop */ }
    }
  }
}

/**
 * Extract face embedding (128-d descriptor)
 *
 * @param {Buffer} imageBuffer - Image data
 * @returns {Promise<Object>} Extraction result
 * @returns {Object.success} Boolean - Extraction successful
 * @returns {Object.embedding} Array<number> - 128-d face descriptor
 * @returns {Object.face} Object - Face detection data
 * @returns {Object.quality} Object - Quality metrics
 * @returns {Object.error} String - Error message (if failed)
 * @returns {Object.extractionTimeMs} Number - Extraction time in milliseconds
 */
async function extractEmbedding(imageBuffer) {
  const startTime = Date.now();

  try {
    // First detect face
    const detection = await detectFace(imageBuffer);

    if (!detection.success) {
      return {
        success: false,
        error: detection.error,
        failureReason: detection.failureReason,
        extractionTimeMs: Date.now() - startTime,
      };
    }

    // Extract embedding from detected face
    const face = detection.face;

    // Human library provides embedding in face.embedding property
    if (!face.embedding || !Array.isArray(face.embedding)) {
      return {
        success: false,
        error: 'Failed to extract face embedding',
        failureReason: 'server_error',
        extractionTimeMs: Date.now() - startTime,
      };
    }

    // Normalize embedding (convert to unit vector for cosine similarity)
    const embedding = normalizeEmbedding(face.embedding);

    return {
      success: true,
      embedding,
      face: {
        score: face.score,
        box: face.box,
        mesh: face.mesh?.length || 0,
      },
      quality: detection.quality,
      extractionTimeMs: Date.now() - startTime,
      imageDimensions: detection.imageDimensions,
    };
  } catch (error) {
    return {
      success: false,
      error: `Embedding extraction failed: ${error.message}`,
      failureReason: 'server_error',
      extractionTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Normalize embedding to unit vector (for cosine similarity)
 *
 * @param {Array<number>} embedding - Raw embedding
 * @returns {Array<number>} Normalized embedding
 */
function normalizeEmbedding(embedding) {
  const magnitude = Math.sqrt(
    embedding.reduce((sum, val) => sum + val * val, 0)
  );

  if (magnitude === 0) {
    return embedding;
  }

  return embedding.map(val => val / magnitude);
}

/**
 * Calculate cosine similarity between two embeddings
 *
 * @param {Array<number>} embedding1 - First embedding (normalized)
 * @param {Array<number>} embedding2 - Second embedding (normalized)
 * @returns {number} Similarity score (0-1, higher = more similar)
 */
function calculateSimilarity(embedding1, embedding2) {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have same length');
  }

  // Cosine similarity of normalized vectors = dot product
  const dotProduct = embedding1.reduce(
    (sum, val, i) => sum + val * embedding2[i],
    0
  );

  // Convert from [-1, 1] to [0, 1]
  return (dotProduct + 1) / 2;
}

/**
 * Register face for a student
 *
 * @param {ObjectId} studentId - Student ID
 * @param {Buffer} imageBuffer - Face image data
 * @param {ObjectId} registeredBy - User ID who is registering
 * @param {String} registrationMethod - Method (admin_upload, self_registration, etc.)
 * @returns {Promise<Object>} Registration result
 */
async function registerFace(studentId, imageBuffer, registeredBy, registrationMethod = 'admin_upload') {
  const sessionStart = Date.now();

  try {
    // Extract embedding
    const extraction = await extractEmbedding(imageBuffer);

    if (!extraction.success) {
      // Log failed registration session
      await FRSession.createRegistrationSession({
        studentId,
        initiatedBy: registeredBy,
        success: false,
        failureReason: extraction.failureReason,
        failureDetails: extraction.error,
        faceDetection: {
          facesDetected: 0,
          detectionTimeMs: extraction.extractionTimeMs,
        },
        performance: {
          totalTimeMs: Date.now() - sessionStart,
        },
        timestamp: new Date(),
      });

      return {
        success: false,
        error: extraction.error,
        failureReason: extraction.failureReason,
      };
    }

    // Check liveness — but skip it for admin uploads. Admins enrolling a
    // student from a saved photo are a trusted source; requiring liveness here
    // would make admin enrollment impossible (a saved photo never blinks).
    // Login-time liveness is still enforced in recognizeFace.
    const livenessResult = registrationMethod === 'admin_upload'
      ? { passed: true, score: null, threshold: null, details: { skipped: true, reason: 'admin_upload' } }
      : await checkBasicLiveness(extraction.face, extraction.quality);

    if (!livenessResult.passed) {
      // Log failed registration session
      await FRSession.createRegistrationSession({
        studentId,
        initiatedBy: registeredBy,
        success: false,
        failureReason: 'liveness_failed',
        failureDetails: livenessResult.recommendation || 'Image failed liveness check',
        faceDetection: {
          facesDetected: 1,
          detectionConfidence: extraction.face.score,
          detectionTimeMs: extraction.extractionTimeMs,
        },
        liveness: {
          score: livenessResult.score,
          threshold: livenessResult.threshold,
          passed: false,
          details: livenessResult.details, // Enhanced liveness details (Task 5)
          warnings: livenessResult.details?.warnings || [],
        },
        imageQuality: {
          overall: extraction.quality.overall,
          lighting: extraction.quality.image,
          sharpness: extraction.quality.landmarks,
          width: extraction.imageDimensions.width,
          height: extraction.imageDimensions.height,
        },
        performance: {
          totalTimeMs: Date.now() - sessionStart,
        },
        timestamp: new Date(),
      });

      return {
        success: false,
        error: 'Image failed liveness check. Please use a live photo, not a screenshot or printed photo.',
        failureReason: 'liveness_failed',
        livenessScore: livenessResult.score,
        livenessDetails: livenessResult.details, // Provide detailed feedback
        recommendation: livenessResult.recommendation,
      };
    }

    // Replace existing embedding (deactivate old, create new)
    const faceEmbedding = await FaceEmbedding.replaceEmbedding(
      studentId,
      extraction.embedding,
      {
        confidence: extraction.face.score,
        quality: {
          detection: extraction.face.score,
          landmarks: extraction.quality.landmarks,
          image: extraction.quality.image,
        },
        livenessScore: livenessResult.score,
        boundingBox: extraction.face.box,
        imageDimensions: extraction.imageDimensions,
      },
      registeredBy
    );

    // Cache the new embedding
    await frCacheService.cacheEmbedding(studentId.toString(), extraction.embedding);

    // Log successful registration session
    await FRSession.createRegistrationSession({
      studentId,
      initiatedBy: registeredBy,
      success: true,
      faceDetection: {
        facesDetected: 1,
        detectionConfidence: extraction.face.score,
        boundingBox: extraction.face.box,
        detectionTimeMs: extraction.extractionTimeMs,
      },
      liveness: {
        score: livenessResult.score,
        threshold: livenessResult.threshold,
        passed: true,
        details: livenessResult.details, // Enhanced liveness details (Task 5)
      },
      imageQuality: {
        overall: extraction.quality.overall,
        lighting: extraction.quality.image,
        sharpness: extraction.quality.landmarks,
        width: extraction.imageDimensions.width,
        height: extraction.imageDimensions.height,
      },
      performance: {
        totalTimeMs: Date.now() - sessionStart,
        backend: 'tensorflow',
      },
      timestamp: new Date(),
    });

    return {
      success: true,
      message: 'Face registered successfully',
      faceEmbeddingId: faceEmbedding._id,
      confidence: extraction.face.score,
      quality: extraction.quality,
      livenessScore: livenessResult.score,
    };
  } catch (error) {
    // Log error session
    try {
      await FRSession.createRegistrationSession({
        studentId,
        initiatedBy: registeredBy,
        success: false,
        failureReason: 'server_error',
        failureDetails: error.message,
        performance: {
          totalTimeMs: Date.now() - sessionStart,
        },
        timestamp: new Date(),
      });
    } catch (logError) {
      console.error('Failed to log FR session:', logError);
    }

    return {
      success: false,
      error: `Registration failed: ${error.message}`,
      failureReason: 'server_error',
    };
  }
}

/**
 * Enhanced liveness detection with Human library anti-spoofing
 *
 * Sprint 1.1 Epic 02 Story 01 Task 5: Implement Liveness Detection
 *
 * Detects spoofing attempts (printed photos, phone screens, masks) using:
 * - Human library's native liveness detection (depth analysis)
 * - 3D face mesh quality analysis (468-point landmarks)
 * - Face detection confidence
 * - Image quality heuristics
 *
 * @param {Object} face - Face detection data from Human library
 * @param {Object} quality - Quality metrics
 * @returns {Object} Liveness result { passed, score, threshold, details }
 */
async function checkLiveness(face, quality) {
  // Configurable threshold. Default lowered from 0.6 → 0.4 because real-world
  // 720p webcams in indoor light score ~0.5–0.7 — 0.6 produced false rejects
  // on genuinely live captures. Tighten in prod via FR_LIVENESS_THRESHOLD env.
  const threshold = parseFloat(process.env.FR_LIVENESS_THRESHOLD) || 0.4;

  let livenessScore = 0;
  const details = {
    checks: {},
    warnings: [],
  };

  // === 1. Human Library Native Liveness Detection ===
  // Human's liveness detection analyzes face depth and 3D characteristics
  if (face.liveness) {
    const humanLivenessScore = face.liveness;
    livenessScore += humanLivenessScore * 0.4; // 40% weight
    details.checks.humanLiveness = {
      score: humanLivenessScore,
      weight: 0.4,
      passed: humanLivenessScore > 0.6,
    };

    if (humanLivenessScore < 0.4) {
      details.warnings.push('Low liveness score from Human library - possible photo/screen');
    }
  } else {
    // If Human liveness not available, use conservative estimate
    livenessScore += 0.2; // 50% of max weight
    details.checks.humanLiveness = {
      score: 0.5,
      weight: 0.4,
      passed: true,
      note: 'Human liveness data not available',
    };
  }

  // === 2. 3D Face Mesh Quality Analysis ===
  // Real faces have high-quality 468-point 3D mesh
  // Printed photos/screens have poor mesh quality
  if (face.mesh && face.mesh.length) {
    const meshQuality = face.mesh.length / 468; // Normalize to [0,1]
    livenessScore += meshQuality * 0.25; // 25% weight
    details.checks.meshQuality = {
      meshPoints: face.mesh.length,
      maxPoints: 468,
      quality: meshQuality,
      weight: 0.25,
      passed: meshQuality > 0.85,
    };

    if (meshQuality < 0.7) {
      details.warnings.push('Poor 3D face mesh quality - possible 2D image');
    }
  } else {
    details.checks.meshQuality = {
      meshPoints: 0,
      quality: 0,
      weight: 0.25,
      passed: false,
      note: 'No mesh data available',
    };
    details.warnings.push('Face mesh not detected - liveness cannot be verified');
  }

  // === 3. Face Detection Confidence ===
  // Real faces have very high detection confidence
  // Printed photos may have lower confidence due to artifacts
  const detectionConfidence = face.score || 0;
  const confidenceScore = Math.min(1, detectionConfidence);
  livenessScore += confidenceScore * 0.20; // 20% weight
  details.checks.detectionConfidence = {
    score: confidenceScore,
    weight: 0.20,
    passed: confidenceScore > 0.9,
  };

  if (confidenceScore < 0.8) {
    details.warnings.push('Low face detection confidence - image quality may be poor');
  }

  // === 4. Overall Image Quality ===
  // Real-time camera captures have good overall quality
  // Photos of photos have degraded quality
  const overallQuality = quality.overall || 0;
  livenessScore += overallQuality * 0.15; // 15% weight
  details.checks.imageQuality = {
    score: overallQuality,
    weight: 0.15,
    passed: overallQuality > 0.7,
  };

  if (overallQuality < 0.6) {
    details.warnings.push('Poor image quality - may indicate secondary capture');
  }

  // === 5. Face Size and Resolution ===
  // Photos of photos tend to have unusual face sizes
  if (face.box) {
    const faceWidth = face.box[2] - face.box[0];
    const faceHeight = face.box[3] - face.box[1];
    const faceArea = faceWidth * faceHeight;

    // Expect face to be reasonably sized (not too small/large)
    const minArea = 10000; // px²
    const maxArea = 400000; // px²
    const sizeScore = faceArea >= minArea && faceArea <= maxArea ? 1 : 0.5;

    livenessScore += sizeScore * 0.10; // 10% weight (bonus check)
    details.checks.faceSize = {
      width: faceWidth,
      height: faceHeight,
      area: faceArea,
      score: sizeScore,
      weight: 0.10,
      passed: sizeScore === 1,
    };

    if (faceArea < minArea) {
      details.warnings.push('Face too small - may be photo at a distance');
    } else if (faceArea > maxArea) {
      details.warnings.push('Face unusually large - verify capture distance');
    }
  }

  // Normalize and clamp final score to [0, 1]
  livenessScore = Math.min(1, Math.max(0, livenessScore));

  return {
    passed: livenessScore >= threshold,
    score: livenessScore,
    threshold,
    details,
    recommendation: livenessScore >= threshold
      ? 'Face appears to be a live person'
      : livenessScore >= (threshold * 0.8)
      ? 'Liveness uncertain - consider manual verification'
      : 'High risk of spoofing - likely printed photo or screen',
  };
}

// Alias for backward compatibility
const checkBasicLiveness = checkLiveness;

/**
 * Recognize face (identify who it is)
 *
 * @param {Buffer} imageBuffer - Face image data
 * @param {Number} threshold - Confidence threshold (default 0.5)
 * @returns {Promise<Object>} Recognition result
 */
async function recognizeFace(imageBuffer, threshold = 0.5) {
  const sessionStart = Date.now();
  const recognitionStart = Date.now();

  try {
    // Extract embedding from uploaded image
    const extraction = await extractEmbedding(imageBuffer);

    if (!extraction.success) {
      // Log failed recognition session
      await FRSession.createLoginSession({
        success: false,
        failureReason: extraction.failureReason,
        failureDetails: extraction.error,
        faceDetection: {
          facesDetected: 0,
          detectionTimeMs: extraction.extractionTimeMs,
        },
        performance: {
          totalTimeMs: Date.now() - sessionStart,
        },
        timestamp: new Date(),
      });

      return {
        success: false,
        error: extraction.error,
        failureReason: extraction.failureReason,
      };
    }

    // Check liveness (Enhanced - Task 5)
    // Prevents spoofing attempts with photos/screens during login
    const livenessResult = await checkLiveness(extraction.face, extraction.quality);

    if (!livenessResult.passed) {
      // Log failed recognition session (liveness failed)
      await FRSession.createLoginSession({
        success: false,
        failureReason: 'liveness_failed',
        failureDetails: livenessResult.recommendation || 'Liveness check failed',
        faceDetection: {
          facesDetected: 1,
          detectionConfidence: extraction.face.score,
          detectionTimeMs: extraction.extractionTimeMs,
        },
        liveness: {
          score: livenessResult.score,
          threshold: livenessResult.threshold,
          passed: false,
          details: livenessResult.details,
          warnings: livenessResult.details?.warnings || [],
        },
        imageQuality: {
          overall: extraction.quality.overall,
          width: extraction.imageDimensions.width,
          height: extraction.imageDimensions.height,
        },
        performance: {
          totalTimeMs: Date.now() - sessionStart,
        },
        timestamp: new Date(),
      });

      return {
        success: false,
        error: 'Liveness check failed. Please use a live camera, not a photo or screen.',
        failureReason: 'liveness_failed',
        livenessScore: livenessResult.score,
        livenessDetails: livenessResult.details,
        recommendation: livenessResult.recommendation,
      };
    }

    // Get all active embeddings from cache (with fallback to database)
    const allEmbeddings = await frCacheService.getAllCachedEmbeddings();
    const cacheHit = frCacheService.isCacheEnabled();

    if (allEmbeddings.length === 0) {
      return {
        success: false,
        error: 'No registered faces in the system',
        failureReason: 'no_matching_embedding',
      };
    }

    // Compare against all embeddings
    let bestMatch = {
      studentId: null,
      confidence: 0,
    };

    const topMatches = [];

    for (const { studentId, embedding } of allEmbeddings) {
      const similarity = calculateSimilarity(extraction.embedding, embedding);

      topMatches.push({ studentId, confidence: similarity });

      if (similarity > bestMatch.confidence) {
        bestMatch = { studentId, confidence: similarity };
      }
    }

    // Sort top matches by confidence
    topMatches.sort((a, b) => b.confidence - a.confidence);
    const top3Matches = topMatches.slice(0, 3);

    const recognitionTimeMs = Date.now() - recognitionStart;

    // Check if best match meets threshold
    if (bestMatch.confidence >= threshold) {
      // Success - recognized
      await FRSession.createLoginSession({
        studentId: bestMatch.studentId,
        success: true,
        recognition: {
          matchedStudentId: bestMatch.studentId,
          confidence: bestMatch.confidence,
          threshold,
          thresholdMet: true,
          topMatches: top3Matches,
          comparisonsCount: allEmbeddings.length,
          recognitionTimeMs,
        },
        faceDetection: {
          facesDetected: 1,
          detectionConfidence: extraction.face.score,
          boundingBox: extraction.face.box,
          detectionTimeMs: extraction.extractionTimeMs,
        },
        liveness: {
          score: livenessResult.score,
          threshold: livenessResult.threshold,
          passed: true,
          details: livenessResult.details, // Enhanced liveness details (Task 5)
        },
        imageQuality: {
          overall: extraction.quality.overall,
          width: extraction.imageDimensions.width,
          height: extraction.imageDimensions.height,
        },
        performance: {
          totalTimeMs: Date.now() - sessionStart,
          backend: 'tensorflow',
          cacheHit: cacheHit,
        },
        timestamp: new Date(),
      });

      // Update usage stats for matched embedding
      const matchedEmbedding = await FaceEmbedding.findOne({
        studentId: bestMatch.studentId,
        isActive: true,
      });

      if (matchedEmbedding) {
        await matchedEmbedding.recordUsage();
      }

      return {
        success: true,
        studentId: bestMatch.studentId,
        confidence: bestMatch.confidence,
        threshold,
        quality: extraction.quality,
        livenessScore: livenessResult.score, // Enhanced liveness (Task 5)
        topMatches: top3Matches,
      };
    } else {
      // Failed - not recognized (below threshold)
      await FRSession.createLoginSession({
        success: false,
        failureReason: 'low_confidence',
        failureDetails: `Best match confidence ${bestMatch.confidence.toFixed(3)} below threshold ${threshold}`,
        recognition: {
          matchedStudentId: bestMatch.studentId,
          confidence: bestMatch.confidence,
          threshold,
          thresholdMet: false,
          topMatches: top3Matches,
          comparisonsCount: allEmbeddings.length,
          recognitionTimeMs,
        },
        faceDetection: {
          facesDetected: 1,
          detectionConfidence: extraction.face.score,
          detectionTimeMs: extraction.extractionTimeMs,
        },
        imageQuality: {
          overall: extraction.quality.overall,
          width: extraction.imageDimensions.width,
          height: extraction.imageDimensions.height,
        },
        performance: {
          totalTimeMs: Date.now() - sessionStart,
          backend: 'tensorflow',
          cacheHit: cacheHit,
        },
        timestamp: new Date(),
      });

      return {
        success: false,
        error: 'Face not recognized. Please try again or register your face first.',
        failureReason: 'low_confidence',
        confidence: bestMatch.confidence,
        threshold,
        topMatches: top3Matches,
      };
    }
  } catch (error) {
    // Log error session
    try {
      await FRSession.createLoginSession({
        success: false,
        failureReason: 'server_error',
        failureDetails: error.message,
        performance: {
          totalTimeMs: Date.now() - sessionStart,
        },
        timestamp: new Date(),
      });
    } catch (logError) {
      console.error('Failed to log FR session:', logError);
    }

    return {
      success: false,
      error: `Recognition failed: ${error.message}`,
      failureReason: 'server_error',
    };
  }
}

module.exports = {
  initializeFRService,
  detectFace,
  extractEmbedding,
  registerFace,
  recognizeFace,
  calculateSimilarity,
  normalizeEmbedding,
  checkLiveness, // Enhanced liveness detection (Task 5)
};
