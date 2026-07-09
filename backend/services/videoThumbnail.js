const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const fs = require("fs");
const path = require("path");
const os = require("os");
const { GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

class VideoThumbnailService {
  constructor() {
    this.isAvailable = this.checkFFmpegAvailability();
  }

  checkFFmpegAvailability() {
    try {
      // Check if FFmpeg is available
      ffmpeg.ffprobe(ffmpegPath, (err) => {
        if (err) {
          console.warn("FFmpeg not available:", err.message);
          return false;
        }
      });
      return true;
    } catch (error) {
      console.warn("FFmpeg check failed:", error.message);
      return false;
    }
  }

  async generateThumbnail(videoPath, outputPath, options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.isAvailable) {
        return resolve({ success: false, error: "FFmpeg not available" });
      }

      const {
        time = "00:00:01", // Extract frame at 1 second
        width = 320,
        height = 240,
        quality = 80,
      } = options;

      ffmpeg(videoPath)
        .seekInput(time)
        .frames(1)
        .size(`${width}x${height}`)
        .outputOptions([
          "-q:v",
          "2", // High quality
          "-f",
          "image2", // Output format
        ])
        .output(outputPath)
        .on("end", () => {
          // Video thumbnail generated successfully
          resolve({ success: true, outputPath });
        })
        .on("error", (err) => {
          console.error("Error generating thumbnail:", err.message);
          resolve({ success: false, error: err.message });
        })
        .run();
    });
  }

  async generateThumbnailFromBuffer(videoBuffer, options = {}) {
    try {
      const {
        time = "00:00:01",
        width = 320,
        height = 240,
        quality = 80,
      } = options;

      // Create temporary file paths
      const tempDir = os.tmpdir();
      const tempVideoPath = path.join(tempDir, `temp_video_${Date.now()}.mp4`);
      const tempThumbnailPath = path.join(
        tempDir,
        `temp_thumb_${Date.now()}.jpg`
      );

      try {
        // Write video buffer to temp file
        fs.writeFileSync(tempVideoPath, videoBuffer);

        // Generate thumbnail
        const result = await this.generateThumbnail(
          tempVideoPath,
          tempThumbnailPath,
          options
        );

        if (result.success) {
          // Read thumbnail buffer
          const thumbnailBuffer = fs.readFileSync(tempThumbnailPath);

          // Clean up temp files
          fs.unlinkSync(tempVideoPath);
          fs.unlinkSync(tempThumbnailPath);

          return { success: true, thumbnailBuffer };
        } else {
          // Clean up temp files
          if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
          if (fs.existsSync(tempThumbnailPath))
            fs.unlinkSync(tempThumbnailPath);

          return result;
        }
      } catch (error) {
        // Clean up temp files on error
        if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
        if (fs.existsSync(tempThumbnailPath)) fs.unlinkSync(tempThumbnailPath);
        throw error;
      }
    } catch (error) {
      console.error("Failed to generate thumbnail from buffer:", error.message);
      return { success: false, error: error.message };
    }
  }

  async generateThumbnailFromS3(
    s3Client,
    bucketName,
    videoKey,
    thumbnailKey,
    options = {}
  ) {
    try {
      const {
        time = "00:00:01",
        width = 320,
        height = 240,
        quality = 80,
      } = options;

      // Create temporary file paths
      const tempDir = os.tmpdir();
      const tempVideoPath = path.join(tempDir, `temp_video_${Date.now()}.mp4`);
      const tempThumbnailPath = path.join(
        tempDir,
        `temp_thumb_${Date.now()}.jpg`
      );

      try {
        // Download video from S3
        const videoResponse = await s3Client.send(
          new GetObjectCommand({
            Bucket: bucketName,
            Key: videoKey,
          })
        );

        const videoBuffer = await this.streamToBuffer(videoResponse.Body);
        fs.writeFileSync(tempVideoPath, videoBuffer);

        // Generate thumbnail
        const result = await this.generateThumbnail(
          tempVideoPath,
          tempThumbnailPath,
          options
        );

        if (result.success) {
          // Upload thumbnail to S3
          const thumbnailBuffer = fs.readFileSync(tempThumbnailPath);

          await s3Client.send(
            new PutObjectCommand({
              Bucket: bucketName,
              Key: thumbnailKey,
              Body: thumbnailBuffer,
              ContentType: "image/jpeg",
              Metadata: {
                "thumbnail-generated": new Date().toISOString(),
                "original-video": videoKey,
              },
            })
          );

          // Clean up temp files
          fs.unlinkSync(tempVideoPath);
          fs.unlinkSync(tempThumbnailPath);

          return { success: true, thumbnailKey };
        } else {
          // Clean up temp files
          if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
          if (fs.existsSync(tempThumbnailPath))
            fs.unlinkSync(tempThumbnailPath);

          return result;
        }
      } catch (error) {
        // Clean up temp files on error
        if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
        if (fs.existsSync(tempThumbnailPath)) fs.unlinkSync(tempThumbnailPath);
        throw error;
      }
    } catch (error) {
      console.error("Failed to generate thumbnail from S3:", error.message);
      return { success: false, error: error.message };
    }
  }

  async streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
    });
  }

  // Alternative method: generate thumbnail from local file path
  async generateThumbnailFromPath(videoPath, options = {}) {
    try {
      const {
        time = "00:00:01",
        width = 320,
        height = 240,
        quality = 80,
      } = options;

      // Create temporary output path
      const tempDir = os.tmpdir();
      const tempThumbnailPath = path.join(
        tempDir,
        `temp_thumb_${Date.now()}.jpg`
      );

      const result = await this.generateThumbnail(
        videoPath,
        tempThumbnailPath,
        options
      );

      if (result.success) {
        // Read thumbnail buffer
        const thumbnailBuffer = fs.readFileSync(tempThumbnailPath);

        // Clean up temp file
        fs.unlinkSync(tempThumbnailPath);

        return { success: true, thumbnailBuffer };
      } else {
        // Clean up temp file
        if (fs.existsSync(tempThumbnailPath)) fs.unlinkSync(tempThumbnailPath);

        return result;
      }
    } catch (error) {
      console.error("Failed to generate thumbnail from path:", error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = VideoThumbnailService;
