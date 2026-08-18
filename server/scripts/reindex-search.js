require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const { reindexAll } = require("../services/searchIndexService");
const logger = require("../config/logger");

const run = async () => {
  await connectDB();
  await reindexAll();
  logger.info("Search reindex complete");
  await mongoose.connection.close();
};

run().catch(async (err) => {
  logger.error(`Search reindex failed: ${err.stack || err.message}`);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
