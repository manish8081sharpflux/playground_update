// Frontend Configuration
// This file centralizes all configuration values including API URLs

const config = {
  // API Configuration
  API_BASE_URL: process.env.REACT_APP_API_BASE_URL || (window.location.origin.includes('localhost') ? 'http://localhost:5001' : window.location.origin + '/server'),

  // App Configuration
  APP_NAME: process.env.REACT_APP_APP_NAME || "ISF Playground",
  APP_VERSION: process.env.REACT_APP_VERSION || "1.0.0",

  // Feature Flags
  ENABLE_FACE_ID: true,
  ENABLE_PIN_LOGIN: true,

  // Timeouts
  API_TIMEOUT: 30000, // 30 seconds

  // File Upload
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
};

export default config;
