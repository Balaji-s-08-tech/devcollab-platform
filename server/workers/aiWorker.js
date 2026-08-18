require("dotenv").config();
const { Worker } = require("bullmq");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const { connection } = require("../config/aiQueue");
const AIJob = require("../models/AIJob");
const aiService = require("../services/ai/aiService");
const ragService = require("../services/ai/ragService");
const logger = require("../config/logger");

const handlers = {
  document_index: (input) => ragService.indexDocument(input.documentId),
  issue_generation: (input) => aiService.generateIssues(input.description),
  meeting_summary: (input) => aiService.summarizeMeeting(input.transcript),
  sprint_plan: (input) => aiService.planSprint({ backlog: input.backlog, velocity: input.velocity }),
  standup: (input) => aiService.generateStandup(input.activity),
  analytics: (input) => aiService.summarizeAnalytics(input.metrics),
};

const start = async () => {
  await connectDB();
  const worker = new Worker(
    "ai-jobs",
    async (job) => {
      const aiJob = await AIJob.findById(job.data.aiJobId);
      if (!aiJob) throw new Error("AI job record not found");
      aiJob.status = "running";
      aiJob.startedAt = new Date();
      await aiJob.save();

      try {
        const output = await handlers[aiJob.type](aiJob.input);
        aiJob.status = "completed";
        aiJob.output = output;
        aiJob.completedAt = new Date();
        await aiJob.save();
        return output;
      } catch (err) {
        aiJob.status = "failed";
        aiJob.error = err.message;
        aiJob.completedAt = new Date();
        await aiJob.save();
        throw err;
      }
    },
    { connection, concurrency: Number(process.env.AI_WORKER_CONCURRENCY || 2) }
  );

  worker.on("completed", (job) => logger.info(`AI job completed: ${job.id}`));
  worker.on("failed", (job, err) => logger.error(`AI job failed ${job?.id}: ${err.message}`));
};

start().catch(async (err) => {
  logger.error(`AI worker startup failed: ${err.stack || err.message}`);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
