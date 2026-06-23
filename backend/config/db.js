const mongoose = require("mongoose");

const dotenv = require("dotenv");
dotenv.config();

const connectDB = async () => {
  try {
    const mongoURI =
      process.env.NODE_ENV === "local"
        ? process.env.MONGO_URI_LOCAL
        : process.env.MONGO_URI;

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
