const mongoose = require("mongoose");

const checklistItemSchema = new mongoose.Schema({
  text: { type: String, required: true, maxlength: 200 },
  completed: { type: Boolean, default: false },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  completedAt: { type: Date },
});

const taskCommentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, maxlength: 2000 },
  },
  { timestamps: true }
);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      maxlength: [255, "Title max 255 chars"],
    },
    description: { type: String, maxlength: 5000 },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    status: {
      type: String,
      enum: ["backlog", "todo", "in_progress", "in_review", "done", "cancelled"],
      default: "todo",
    },

    priority: {
      type: String,
      enum: ["none", "low", "medium", "high", "urgent"],
      default: "none",
    },

    order: { type: Number, default: 0 },

    labels: [
      {
        name: { type: String, required: true },
        color: { type: String, default: "#6366f1" },
      },
    ],

    dueDate: { type: Date, default: null },
    startDate: { type: Date, default: null },
    completedAt: { type: Date, default: null },

    estimate: { type: Number, default: null },
    timeSpent: { type: Number, default: 0 },

    checklist: [checklistItemSchema],
    comments: [taskCommentSchema],

    linkedIssues: [{ type: mongoose.Schema.Types.ObjectId, ref: "Issue" }],
    linkedDocuments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Document" }],

    attachments: [
      {
        name: String,
        url: String,
        size: Number,
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    sprint: { type: String, default: null },
    milestone: { type: String, default: null },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

taskSchema.virtual("checklistProgress").get(function () {
  if (!this.checklist.length) return null;
  const done = this.checklist.filter((i) => i.completed).length;
  return { done, total: this.checklist.length, pct: Math.round((done / this.checklist.length) * 100) };
});

taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignees: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ title: "text", description: "text" });

module.exports = mongoose.model("Task", taskSchema);
