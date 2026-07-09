const VideoThumbnailService = require("../services/videoThumbnail");
const path = require("path");
const fs = require("fs");

async function testThumbnailLogic() {
  console.log("🧪 Testing Video Thumbnail Generation Logic...");

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

    // Test 1: Test thumbnail generation from local file path
    console.log("\n🎥 Test 1: Testing thumbnail generation from local file...");

    // Create a dummy video file for testing
    const tempDir = require("os").tmpdir();
    const testVideoPath = path.join(tempDir, `test_video_${Date.now()}.mp4`);
    const testThumbnailPath = path.join(
      tempDir,
      `test_thumb_${Date.now()}.jpg`
    );

    // Create a dummy video file (just some bytes)
    const dummyVideoContent = Buffer.from("fake video content for testing");
    fs.writeFileSync(testVideoPath, dummyVideoContent);

    console.log("📁 Created test video file:", testVideoPath);

    try {
      // Test thumbnail generation (this will fail since it's not a real video, but we can test the function structure)
      const result = await thumbnailService.generateThumbnail(
        testVideoPath,
        testThumbnailPath,
        {
          time: "00:00:01",
          width: 320,
          height: 240,
        }
      );

      console.log("📊 Thumbnail generation result:", {
        success: result.success,
        error: result.error || "None",
        outputPath: result.outputPath,
      });

      if (result.success) {
        console.log("✅ Thumbnail generated successfully!");
        console.log("🖼️ Output path:", result.outputPath);
      } else {
        console.log(
          "⚠️ Thumbnail generation failed (expected for dummy file):",
          result.error
        );
      }
    } catch (error) {
      console.log("⚠️ Expected error for dummy file:", error.message);
    }

    // Test 2: Test thumbnail generation from buffer
    console.log("\n💾 Test 2: Testing thumbnail generation from buffer...");

    try {
      const bufferResult = await thumbnailService.generateThumbnailFromBuffer(
        dummyVideoContent,
        {
          time: "00:00:01",
          width: 320,
          height: 240,
        }
      );

      console.log("📊 Buffer thumbnail result:", {
        success: bufferResult.success,
        error: bufferResult.error || "None",
        hasThumbnailBuffer: !!bufferResult.thumbnailBuffer,
      });

      if (bufferResult.success) {
        console.log("✅ Buffer thumbnail generated successfully!");
        console.log(
          "📏 Thumbnail size:",
          bufferResult.thumbnailBuffer.length,
          "bytes"
        );
      } else {
        console.log(
          "⚠️ Buffer thumbnail generation failed (expected for dummy file):",
          bufferResult.error
        );
      }
    } catch (error) {
      console.log("⚠️ Expected error for dummy file:", error.message);
    }

    // Test 3: Test thumbnail generation from path
    console.log("\n🛤️ Test 3: Testing thumbnail generation from path...");

    try {
      const pathResult = await thumbnailService.generateThumbnailFromPath(
        testVideoPath,
        {
          time: "00:00:01",
          width: 320,
          height: 240,
        }
      );

      console.log("📊 Path thumbnail result:", {
        success: pathResult.success,
        error: pathResult.error || "None",
        hasThumbnailBuffer: !!pathResult.thumbnailBuffer,
      });

      if (pathResult.success) {
        console.log("✅ Path thumbnail generated successfully!");
        console.log(
          "📏 Thumbnail size:",
          pathResult.thumbnailBuffer.length,
          "bytes"
        );
      } else {
        console.log(
          "⚠️ Path thumbnail generation failed (expected for dummy file):",
          pathResult.error
        );
      }
    } catch (error) {
      console.log("⚠️ Expected error for dummy file:", error.message);
    }

    // Clean up test files
    try {
      fs.unlinkSync(testVideoPath);
      if (fs.existsSync(testThumbnailPath)) {
        fs.unlinkSync(testThumbnailPath);
      }
      console.log("🧹 Test files cleaned up");
    } catch (cleanupError) {
      console.log("⚠️ Could not clean up test files:", cleanupError.message);
    }

    console.log("\n🎯 Thumbnail logic test completed!");
    console.log("\n💡 The system is working correctly if:");
    console.log("   1. FFmpeg is available");
    console.log("   2. All test functions execute without crashing");
    console.log("   3. Error messages are appropriate for dummy files");
    console.log("\n🚀 To test with real videos:");
    console.log("   1. Place a real video file in the uploads directory");
    console.log("   2. Update the test script to use the real file path");
    console.log("   3. Run the test again");
  } catch (error) {
    console.error("💥 Test failed:", error.message);
  }
}

// Run the test
testThumbnailLogic();
