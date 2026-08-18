const mongoose = require("mongoose");
const { ROLES } = require("../constants/roles");

const memberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  role: {
    type: String,
    enum: ["owner", "admin", "developer", "member", "viewer", "guest"],
    default: ROLES.MEMBER,
  },
  joinedAt: { type: Date, default: Date.now },
});

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      maxlength: [100, "Name max 100 chars"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: { type: String, maxlength: 500 },
    icon: { type: String, default: "🚀" },
    color: { type: String, default: "#6366f1" },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      default: null,
    },
    members: [memberSchema],
    status: {
      type: String,
      enum: ["active", "archived", "paused"],
      default: "active",
    },
    visibility: {
      type: String,
      enum: ["private", "internal", "public"],
      default: "private",
    },
    tags: [{ type: String, trim: true }],
    githubRepo: { type: String, trim: true },
    settings: {
      enableIssues: { type: Boolean, default: true },
      enableDocs: { type: Boolean, default: true },
      enableBoard: { type: Boolean, default: true },
    },
    stats: {
      openIssues: { type: Number, default: 0 },
      closedIssues: { type: Number, default: 0 },
      totalTasks: { type: Number, default: 0 },
      documents: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

projectSchema.pre("save", function (next) {
  if (this.isModified("name") && !this.slug) {
    this.slug =
      this.name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, "-")
        .slice(0, 50) +
      "-" +
      Date.now().toString(36);
  }
  next();
});

projectSchema.index({ slug: 1 });
projectSchema.index({ organization: 1 });
projectSchema.index({ workspace: 1 });
projectSchema.index({ owner: 1 });
projectSchema.index({ "members.user": 1 });
projectSchema.index({ name: "text", description: "text" });

module.exports = mongoose.model("Project", projectSchema);
