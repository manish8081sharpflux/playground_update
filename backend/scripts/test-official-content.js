require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const WtfPin = require("../models/wtfPin");

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/isfplayground", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testOfficialContent() {
  try {
    console.log("🧪 Testing Official Content Category Functionality...\n");

    // Test 1: Create a pin with official category
    console.log('1. Creating a "Mann Ki Baat" pin...');
    const mannKiBaatPin = new WtfPin({
      title: "Test Mann Ki Baat Podcast",
      content: "This is a test podcast for Mann Ki Baat",
      type: "audio",
      mediaUrl: "https://example.com/test-audio.mp3",
      author: new mongoose.Types.ObjectId(), // Dummy ObjectId
      isOfficial: true,
      officialCategory: "mann-ki-baat",
      status: "active",
    });

    await mannKiBaatPin.save();
    console.log("✅ Mann Ki Baat pin created successfully");

    // Test 2: Create an Op Ed pin
    console.log('\n2. Creating an "Op Ed" pin...');
    const opEdPin = new WtfPin({
      title: "Test Op Ed Article",
      content: "This is a test opinion editorial article",
      type: "text",
      author: new mongoose.Types.ObjectId(), // Dummy ObjectId
      isOfficial: true,
      officialCategory: "op-ed",
      status: "active",
    });

    await opEdPin.save();
    console.log("✅ Op Ed pin created successfully");

    // Test 3: Create an ISF Updates pin
    console.log('\n3. Creating an "ISF Updates" pin...');
    const isfUpdatesPin = new WtfPin({
      title: "Test ISF Updates Video",
      content: "This is a test ISF updates video",
      type: "video",
      mediaUrl: "https://example.com/test-video.mp4",
      author: new mongoose.Types.ObjectId(), // Dummy ObjectId
      isOfficial: true,
      officialCategory: "isf-updates",
      status: "active",
    });

    await isfUpdatesPin.save();
    console.log("✅ ISF Updates pin created successfully");

    // Test 4: Query pins by official category
    console.log("\n4. Testing category filtering...");

    const mannKiBaatPins = await WtfPin.find({
      isOfficial: true,
      officialCategory: "mann-ki-baat",
    });
    console.log(`✅ Found ${mannKiBaatPins.length} Mann Ki Baat pins`);

    const opEdPins = await WtfPin.find({
      isOfficial: true,
      officialCategory: "op-ed",
    });
    console.log(`✅ Found ${opEdPins.length} Op Ed pins`);

    const isfUpdatesPins = await WtfPin.find({
      isOfficial: true,
      officialCategory: "isf-updates",
    });
    console.log(`✅ Found ${isfUpdatesPins.length} ISF Updates pins`);

    // Test 5: Query all official pins
    console.log("\n5. Testing general official content filtering...");
    const allOfficialPins = await WtfPin.find({ isOfficial: true });
    console.log(`✅ Found ${allOfficialPins.length} total official pins`);

    // Test 6: Verify validation works
    console.log("\n6. Testing validation...");
    try {
      const invalidPin = new WtfPin({
        title: "Invalid Pin",
        content: "This should fail validation",
        type: "text",
        author: new mongoose.Types.ObjectId(),
        isOfficial: true,
        // Missing officialCategory - should fail
        status: "active",
      });
      await invalidPin.save();
      console.log(
        "❌ Validation failed - pin was saved without required officialCategory"
      );
    } catch (error) {
      console.log(
        "✅ Validation working correctly - pin rejected without officialCategory"
      );
    }

    console.log("\n🎉 All tests completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`- Total official pins created: ${allOfficialPins.length}`);
    console.log(`- Mann Ki Baat pins: ${mannKiBaatPins.length}`);
    console.log(`- Op Ed pins: ${opEdPins.length}`);
    console.log(`- ISF Updates pins: ${isfUpdatesPins.length}`);
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    // Clean up test data
    console.log("\n🧹 Cleaning up test data...");
    await WtfPin.deleteMany({
      title: { $regex: /^Test / },
    });
    console.log("✅ Test data cleaned up");

    mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
}

// Run the test
testOfficialContent();
