const mongoose = require("mongoose");

const aiJobSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["document_index", "issue_generation", "meeting_summary", "sprint_plan", "standup", "analytics"],
      required: true,
      index: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: ["queued", "running", "completed", "failed"],
      default: "queued",
      index: true,
    },
    input: { type: mongoose.Schema.Types.Mixed, default: {} },
    output: { type: mongoose.Schema.Types.Mixed, default: null },
    error: { type: String, default: null },
    bullJobId: { type: String, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AIJob", aiJobSchema);
