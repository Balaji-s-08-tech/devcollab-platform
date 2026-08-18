require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const logger = require("../config/logger");

const migrations = [
  require("./migrations/20260511000000-security-foundation"),
  require("./migrations/20260603000000-rbac-search-ai"),
];

const migrationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    appliedAt: { type: Date, default: Date.now },
  },
  { collection: "migrations" }
);

const Migration = mongoose.model("Migration", migrationSchema);

const run = async () => {
  await connectDB();

  for (const migration of migrations) {
    const alreadyApplied = await Migration.findOne({ id: migration.id }).lean();
    if (alreadyApplied) {
      logger.info(`Migration ${migration.id} already applied`);
      continue;
    }

    logger.info(`Applying migration ${migration.id}`);
    await migration.up({ mongoose });
    await Migration.create({ id: migration.id });
  }

  await mongoose.connection.close();
  logger.info("Migrations complete");
};

run().catch(async (err) => {
  logger.error(`Migration failed: ${err.stack || err.message}`);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
