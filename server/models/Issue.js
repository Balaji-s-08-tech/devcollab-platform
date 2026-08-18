const mongoose = require("mongoose");

let _counter = 0;

const issueCommentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, maxlength: 10000 },
    isEdited: { type: Boolean, default: false },
    reactions: [
      {
        emoji: String,
        users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      },
    ],
  },
  { timestamps: true }
);

const issueSchema = new mongoose.Schema(
  {
    number: { type: Number },
    title: {
      type: String,
      required: [true, "Issue title is required"],
      trim: true,
      maxlength: [255, "Title max 255 chars"],
    },
    body: { type: String, maxlength: 65535 },
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

    state: {
      type: String,
      enum: ["open", "closed", "in_progress"],
      default: "open",
    },

    type: {
      type: String,
      enum: ["bug", "feature", "enhancement", "documentation", "question", "task", "other"],
      default: "other",
    },

    priority: {
      type: String,
      enum: ["none", "low", "medium", "high", "critical"],
      default: "none",
    },

    labels: [
      {
        name: String,
        color: { type: String, default: "#6366f1" },
        description: String,
      },
    ],

    milestone: { type: String, default: null },
    dueDate: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    comments: [issueCommentSchema],

    linkedTasks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
    linkedIssues: [{ type: mongoose.Schema.Types.ObjectId, ref: "Issue" }],

    prRef: { type: String, default: null },

    reactions: [
      {
        emoji: String,
        users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      },
    ],

    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    isLocked: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },

    githubId: { type: Number, default: null },
    githubUrl: { type: String, default: null },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

issueSchema.pre("save", async function (next) {
  if (this.isNew) {
    const lastIssue = await this.constructor
      .findOne({ project: this.project })
      .sort({ number: -1 })
      .lean();
    this.number = lastIssue ? lastIssue.number + 1 : 1;
  }
  next();
});

issueSchema.virtual("commentCount").get(function () {
  return this.comments?.length || 0;
});

issueSchema.index({ project: 1, state: 1 });
issueSchema.index({ project: 1, number: 1 }, { unique: true });
issueSchema.index({ assignees: 1 });
issueSchema.index({ title: "text", body: "text" });

module.exports = mongoose.model("Issue", issueSchema);
