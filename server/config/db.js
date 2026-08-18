const mongoose = require("mongoose");
const logger = require("./logger");

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/devcollab";

  try {
    const conn = await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on("error", (err) => {
      logger.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected — attempting reconnect...");
    });

    return conn;
  } catch (err) {
    logger.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
