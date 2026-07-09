const fs = require('fs');
const path = require('path');

/**
 * Clean up a local file after successful S3 upload
 * @param {string} filePath - Path to the file to be deleted
 * @param {string} fileName - Name of the file (for logging)
 */
exports.cleanupLocalFile = (filePath, fileName = 'file') => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🧹 Cleaned up local file after S3 upload: ${fileName}`);
      return true;
    } else {
      console.log(`⚠️ File not found for cleanup: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Failed to cleanup ${fileName}:`, error.message);
    return false;
  }
};

/**
 * Clean up multiple local files
 * @param {Array} files - Array of file paths to be deleted
 */
exports.cleanupMultipleFiles = (files) => {
  let cleanedCount = 0;
  let failedCount = 0;
  
  files.forEach(filePath => {
    if (exports.cleanupLocalFile(filePath)) {
      cleanedCount++;
    } else {
      failedCount++;
    }
  });
  
  console.log(`📊 Cleanup complete: ${cleanedCount} cleaned, ${failedCount} failed`);
  return { cleanedCount, failedCount };
};

/**
 * Schedule cleanup of uploads folder (removes files older than specified hours)
 * @param {number} hoursOld - Delete files older than this many hours (default 24)
 */
exports.scheduleUploadsCleanup = (hoursOld = 24) => {
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  const maxAge = hoursOld * 60 * 60 * 1000; // Convert hours to milliseconds
  
  setInterval(() => {
    console.log(`🔍 Running scheduled cleanup for files older than ${hoursOld} hours...`);
    
    try {
      const files = fs.readdirSync(uploadsDir);
      let cleanedCount = 0;
      
      files.forEach(file => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        const age = Date.now() - stats.mtimeMs;
        
        if (age > maxAge) {
          try {
            fs.unlinkSync(filePath);
            cleanedCount++;
            console.log(`🧹 Cleaned up old file: ${file}`);
          } catch (error) {
            console.error(`❌ Failed to clean up ${file}:`, error.message);
          }
        }
      });
      
      if (cleanedCount > 0) {
        console.log(`✅ Cleanup complete: ${cleanedCount} old files removed`);
      } else {
        console.log(`✅ No old files to clean up`);
      }
    } catch (error) {
      console.error('❌ Error during scheduled cleanup:', error.message);
    }
  }, hoursOld * 60 * 60 * 1000); // Run every X hours
  
  console.log(`⏰ Scheduled cleanup initialized (will run every ${hoursOld} hours)`);
};