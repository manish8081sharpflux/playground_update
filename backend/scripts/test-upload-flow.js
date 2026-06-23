const { uploadWtfMedia, generateWtfThumbnail } = require("../services/aws/s3");
const path = require("path");
const fs = require("fs");

async function testUploadFlow() {
  console.log("🧪 Testing Complete Upload Flow with Thumbnail Generation...");

  try {
    // Test 1: Test uploadWtfMedia function
    console.log("\n📤 Test 1: Testing uploadWtfMedia function...");

    // Create a dummy file for testing
    const tempDir = require("os").tmpdir();
    const testFilePath = path.join(tempDir, `test_video_${Date.now()}.mp4`);

    // Create a dummy video file (just some bytes)
    const dummyVideoContent = Buffer.from("fake video content for testing");
    fs.writeFileSync(testFilePath, dummyVideoContent);

    console.log("📁 Created test file:", testFilePath);

    try {
      // Test upload (this will fail since it's not a real video, but we can test the function structure)
      console.log("🚀 Attempting upload...");

      const uploadResult = await uploadWtfMedia(
        testFilePath,
        "video",
        "test_pin_123"
      );

      console.log("📊 Upload result:", {
        success: uploadResult.success,
        message: uploadResult.message,
        hasUrl: !!uploadResult.url,
        hasKey: !!uploadResult.key,
        hasContentType: !!uploadResult.contentType,
      });

      if (uploadResult.success) {
        console.log("✅ Upload successful!");
        console.log("🔗 URL:", uploadResult.url);
        console.log("🔑 Key:", uploadResult.key);

        // Test 2: Test thumbnail generation
        console.log("\n🖼️ Test 2: Testing thumbnail generation...");

        const thumbnailKey = `wtf/video-thumbnails/test_pin_123_thumb_${Date.now()}.jpg`;
        const thumbnailResult = await generateWtfThumbnail(
          uploadResult.key,
          thumbnailKey
        );

        console.log("📊 Thumbnail result:", {
          success: thumbnailResult.success,
          message: thumbnailResult.message,
          hasUrl: !!thumbnailResult.url,
          hasKey: !!thumbnailResult.key,
        });

        if (thumbnailResult.success) {
          console.log("✅ Thumbnail generation successful!");
          console.log("🖼️ Thumbnail URL:", thumbnailResult.url);
        } else {
          console.log(
            "⚠️ Thumbnail generation failed (expected for dummy file):",
            thumbnailResult.error
          );
        }
      } else {
        console.log(
          "❌ Upload failed (expected for dummy file):",
          uploadResult.message
        );
      }
    } catch (error) {
      console.log("⚠️ Expected error for dummy file:", error.message);
    }

    // Clean up test file
    try {
      fs.unlinkSync(testFilePath);
      console.log("🧹 Test file cleaned up");
    } catch (cleanupError) {
      console.log("⚠️ Could not clean up test file:", cleanupError.message);
    }

    console.log("\n🎯 Upload flow test completed!");
    console.log("\n💡 To test with real videos:");
    console.log("   1. Place a real video file in the uploads directory");
    console.log("   2. Update the test script to use the real file path");
    console.log("   3. Run the test again");
  } catch (error) {
    console.error("💥 Test failed:", error.message);
  }
}

// Run the test
testUploadFlow();
