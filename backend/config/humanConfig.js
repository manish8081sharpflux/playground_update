/**
 * Human Library Configuration
 *
 * @vladmandic/human v3.3.6
 * Modern face recognition with liveness detection
 *
 * Task 2: FR Rebuild - Human Configuration
 * Created: 2025-10-22
 */

const path = require('path');

/**
 * Human Configuration Object
 *
 * Models are bundled with @vladmandic/human package
 * Location: node_modules/@vladmandic/human/models/
 */
const humanConfig = {
  // Backend: Use TensorFlow for Node.js (Node v18 required)
  // Note: Node v20/v22 have compatibility issues with tfjs-node
  backend: 'tensorflow',

  // Model base path - models are bundled with the package
  // Use file:// protocol for local file loading in Node.js
  modelBasePath: 'file://' + path.join(__dirname, '../node_modules/@vladmandic/human/models').replace(/\\/g, '/'),

  // Enable async processing for better performance
  async: true,

  // Warmup: Load and initialize models on startup
  // Options: 'none', 'face', 'full'
  warmup: 'face', // Only warmup face-related models (faster startup)

  // Face detection and recognition configuration
  face: {
    enabled: true,

    // Detector: Use BlazeFace for fast detection
    detector: {
      enabled: true,
      rotation: true, // Handle rotated faces
      maxDetected: 1, // For login, we expect only 1 face
      minConfidence: 0.5, // Minimum confidence for face detection
      iouThreshold: 0.3, // Intersection over union threshold
      return: true,
    },

    // Mesh: 3D face landmarks (468 points)
    mesh: {
      enabled: true,
      return: true,
    },

    // Iris: Eye tracking (optional, can disable for performance)
    iris: {
      enabled: false, // Disable for now (not needed for recognition)
    },

    // Description: Face embeddings/descriptors (128-d vector)
    // This is the core of face recognition
    description: {
      enabled: true,
      return: true,
    },

    // Emotion recognition (optional)
    emotion: {
      enabled: false, // Disable for now (not needed)
    },

    // Anti-spoofing / Liveness detection
    // CRITICAL: Prevents photo/video spoofing
    liveness: {
      enabled: true,
      return: true,
    },

    // Age and gender prediction (optional)
    age: {
      enabled: false,
    },
    gender: {
      enabled: false,
    },
  },

  // Body pose detection (not needed for FR)
  body: {
    enabled: false,
  },

  // Hand tracking (not needed for FR)
  hand: {
    enabled: false,
  },

  // Object detection (not needed for FR)
  object: {
    enabled: false,
  },

  // Gesture recognition (not needed for FR)
  gesture: {
    enabled: false,
  },

  // Segmentation (not needed for FR)
  segmentation: {
    enabled: false,
  },

  // Filter configuration
  filter: {
    enabled: true,
    equalization: false,
    flip: false,
  },

  // Performance settings
  deallocate: true, // Deallocate tensors after use
  scoped: true, // Use tensor scoping for memory management

  // Caching
  cacheSensitivity: 0.7,
  skipFrame: false,
};

/**
 * Recognition thresholds
 * These are separate from the Human config and used in application logic
 */
const recognitionThresholds = {
  // Cosine similarity threshold for face matching
  // Range: 0-1 (higher = more similar)
  // 0.5 = moderate match, 0.6 = good match, 0.7 = strong match
  faceMatch: 0.5, // Default threshold (configurable)

  // Liveness detection threshold
  // Range: 0-1 (higher = more confident it's a real person)
  liveness: 0.7, // Default threshold

  // Minimum face detection confidence
  faceDetection: 0.5,
};

/**
 * Performance targets
 */
const performanceTargets = {
  faceRegistration: 5000, // ms - Target: < 5 seconds
  faceRecognition: 3000, // ms - Target: < 3 seconds
  classPhoto30Students: 10000, // ms - Target: < 10 seconds
  cacheHitRate: 0.95, // Target: > 95%
};

module.exports = {
  humanConfig,
  recognitionThresholds,
  performanceTargets,
};
