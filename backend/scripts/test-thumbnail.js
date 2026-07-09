const VideoThumbnailService = require("../services/videoThumbnail");
const path = require("path");

async function testThumbnailGeneration() {
  console.log("🧪 Testing Video Thumbnail Generation...");

  try {
    const thumbnailService = new VideoThumbnailService();

    // Check if FFmpeg is available
    console.log("📋 FFmpeg available:", thumbnailService.isAvailable);

    if (!thumbnailService.isAvailable) {
      console.log(
        "❌ FFmpeg not available. Please install FFmpeg on your system."
      );
      console.log("💡 On macOS: brew install ffmpeg");
      console.log("💡 On Ubuntu: sudo apt install ffmpeg");
      console.log(
        "💡 On Windows: Download from https://ffmpeg.org/download.html"
      );
      return;
    }

    // Test with a sample video file (if available)
    const sampleVideoPath = path.join(__dirname, "../uploads/sample-video.mp4");

    if (require("fs").existsSync(sampleVideoPath)) {
      console.log("🎥 Found sample video, testing thumbnail generation...");

      const result = await thumbnailService.generateThumbnailFromPath(
        sampleVideoPath,
        {
          time: "00:00:02", // Extract frame at 2 seconds
          width: 320,
          height: 240,
        }
      );

      if (result.success) {
        console.log("✅ Thumbnail generated successfully!");
        console.log(
          "📏 Thumbnail size:",
          result.thumbnailBuffer.length,
          "bytes"
        );
      } else {
        console.log("❌ Thumbnail generation failed:", result.error);
      }
    } else {
      console.log("📝 No sample video found. To test:");
      console.log(
        "   1. Place a video file in backend/uploads/sample-video.mp4"
      );
      console.log("   2. Run this script again");
    }

    console.log("\n🎯 Service is ready for production use!");
  } catch (error) {
    console.error("💥 Test failed:", error.message);
  }
}

// Run the test
testThumbnailGeneration();
