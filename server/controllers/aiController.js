const AIJob = require("../models/AIJob");
const { aiQueue } = require("../config/aiQueue");
const ragService = require("../services/ai/ragService");

const enqueue = async (req, type, input) => {
  const aiJob = await AIJob.create({ type, user: req.user._id, input });
  const bullJob = await aiQueue.add(type, { aiJobId: aiJob._id.toString() });
  aiJob.bullJobId = bullJob.id;
  await aiJob.save();
  return aiJob;
};

exports.enqueueDocumentIndex = async (req, res, next) => {
  try {
    const job = await enqueue(req, "document_index", { documentId: req.params.id });
    res.status(202).json({ success: true, job });
  } catch (err) {
    next(err);
  }
};

exports.streamDocumentQuestion = async (req, res, next) => {
  try {
    const { question } = req.body;
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    for await (const delta of ragService.streamDocumentAnswer({ documentId: req.params.id, question })) {
      res.write(`data: ${JSON.stringify({ delta })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    next(err);
  }
};

exports.generateIssues = async (req, res, next) => {
  try {
    const job = await enqueue(req, "issue_generation", { description: req.body.description, project: req.body.project });
    res.status(202).json({ success: true, job });
  } catch (err) {
    next(err);
  }
};

exports.summarizeMeeting = async (req, res, next) => {
  try {
    const job = await enqueue(req, "meeting_summary", { transcript: req.body.transcript, project: req.body.project });
    res.status(202).json({ success: true, job });
  } catch (err) {
    next(err);
  }
};

exports.planSprint = async (req, res, next) => {
  try {
    const job = await enqueue(req, "sprint_plan", { backlog: req.body.backlog, velocity: req.body.velocity, project: req.body.project });
    res.status(202).json({ success: true, job });
  } catch (err) {
    next(err);
  }
};

exports.generateStandup = async (req, res, next) => {
  try {
    const job = await enqueue(req, "standup", { activity: req.body.activity });
    res.status(202).json({ success: true, job });
  } catch (err) {
    next(err);
  }
};

exports.summarizeAnalytics = async (req, res, next) => {
  try {
    const job = await enqueue(req, "analytics", { metrics: req.body.metrics, project: req.body.project });
    res.status(202).json({ success: true, job });
  } catch (err) {
    next(err);
  }
};

exports.getJob = async (req, res, next) => {
  try {
    const job = await AIJob.findOne({ _id: req.params.id, user: req.user._id }).lean();
    if (!job) return res.status(404).json({ success: false, message: "AI job not found" });
    res.json({ success: true, job });
  } catch (err) {
    next(err);
  }
};
