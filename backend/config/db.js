const mongoose = require("mongoose");

const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
dotenv.config();

const connectDB = async () => {
  try {
    const remoteUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    const localUri = process.env.MONGO_URI_LOCAL || remoteUri;
    const mongoURI =
      process.env.NODE_ENV === "local"
        ? localUri || "mongodb://localhost:27017/isfplayground"
        : remoteUri || localUri || "mongodb://localhost:27017/isfplayground";

    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(
      `MongoDB connected: ${conn.connection.host} (${
        process.env.NODE_ENV || "development"
      } environment)`
    );
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
