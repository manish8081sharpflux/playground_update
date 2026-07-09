const VideoThumbnailService = require("../services/videoThumbnail");
const path = require("path");
const fs = require("fs");

async function testLocalThumbnail() {
  console.log("🧪 Testing Local Video Thumbnail Generation...");

  try {
    const thumbnailService = new VideoThumbnailService();

    // Check if FFmpeg is available
    console.log("📋 FFmpeg available:", thumbnailService.isAvailable);

    if (!thumbnailService.isAvailable) {
      console.log(
        "❌ FFmpeg not available. Please install FFmpeg on your system."
      );
      return;
    }

    // Test with a dummy video file
    console.log("\n🎥 Testing thumbnail generation from local file...");

    const tempDir = require("os").tmpdir();
    const testVideoPath = path.join(tempDir, `test_video_${Date.now()}.mp4`);

    // Create a dummy video file (just some bytes)
    const dummyVideoContent = Buffer.from("fake video content for testing");
    fs.writeFileSync(testVideoPath, dummyVideoContent);

    console.log("📁 Created test video file:", testVideoPath);

    try {
      // Test thumbnail generation (this will fail since it's not a real video, but we can test the function structure)
      const result = await thumbnailService.generateThumbnailFromPath(
        testVideoPath,
        {
          time: "00:00:01",
          width: 320,
          height: 240,
        }
      );

      console.log("📊 Thumbnail generation result:", {
        success: result.success,
        error: result.error || "None",
        hasThumbnailBuffer: !!result.thumbnailBuffer,
      });

      if (result.success) {
        console.log("✅ Thumbnail generated successfully!");
        console.log(
          "📏 Thumbnail size:",
          result.thumbnailBuffer.length,
          "bytes"
        );

        // Test writing to temp file
        const tempThumbnailPath = path.join(
          tempDir,
          `test_thumb_${Date.now()}.jpg`
        );
        fs.writeFileSync(tempThumbnailPath, result.thumbnailBuffer);
        console.log("💾 Thumbnail written to temp file:", tempThumbnailPath);

        // Clean up
        fs.unlinkSync(tempThumbnailPath);
        console.log("🧹 Temp thumbnail file cleaned up");
      } else {
        console.log(
          "⚠️ Thumbnail generation failed (expected for dummy file):",
          result.error
        );
      }
    } catch (error) {
      console.log("⚠️ Expected error for dummy file:", error.message);
    }

    // Clean up test video file
    try {
      fs.unlinkSync(testVideoPath);
      console.log("🧹 Test video file cleaned up");
    } catch (cleanupError) {
      console.log(
        "⚠️ Could not clean up test video file:",
        cleanupError.message
      );
    }

    console.log("\n🎯 Local thumbnail generation test completed!");
    console.log("\n💡 The system is working correctly if:");
    console.log("   1. FFmpeg is available");
    console.log(
      "   2. generateThumbnailFromPath function executes without crashing"
    );
    console.log("   3. Error messages are appropriate for dummy files");
  } catch (error) {
    console.error("💥 Test failed:", error.message);
  }
}

// Run the test
testLocalThumbnail();
