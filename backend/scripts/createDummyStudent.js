/*
  Usage:
  NODE_ENV=local node scripts/createDummyStudent.js

  This script creates a student user:
  email: dummystudent@gmail.com
  password: Rockstar3d
  role: student
*/

const mongoose = require("mongoose");
require("dotenv").config();

const User = require("../models/user");

async function run() {
  try {
    const mongoUri =
      process.env.NODE_ENV === "local"
        ? process.env.MONGO_URI_LOCAL
        : process.env.MONGO_URI;

    if (!mongoUri) {
      console.error("Missing MONGO_URI or MONGO_URI_LOCAL in env");
      process.exit(1);
    }

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const email = "dummystudent@gmail.com";

    const existing = await User.findOne({ email });
    if (existing) {
      console.log("User already exists:", email);
      await mongoose.disconnect();
      process.exit(0);
    }

    const user = new User({
      name: "Dummy Student",
      email,
      password: "Rockstar3d",
      role: "student",
      status: "active",
      // Minimum required student props
      age: 12,
      gender: "male",
    });

    await user.save();
    console.log("Created user:", {
      id: user._id.toString(),
      email: user.email,
    });
  } catch (err) {
    console.error("Failed to create dummy student:", err.message);
    process.exit(1);
  } finally {
    try {
      await mongoose.disconnect();
    } catch {}
  }
}

run();
