const mongoose = require("mongoose");

const gitRepoSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    repoUrl: {
      type: String,
      required: [true, "Repository URL is required"],
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },

    localPath: {
      type: String,
      required: true,
    },
    remoteName: {
      type: String,
      default: "origin",
    },
    defaultBranch: {
      type: String,
      default: "main",
    },
    currentBranch: {
      type: String,
      default: "main",
    },

    authToken: {
      type: String,
      select: false,
    },
    lastSynced: {
      type: Date,
      default: null,
    },
    lastCommit: {
      hash: String,
      message: String,
      author: String,
      date: Date,
    },
    cloneStatus: {
      type: String,
      enum: ["pending", "cloning", "ready", "error"],
      default: "pending",
    },
    cloneError: String,
  },
  { timestamps: true }
);

gitRepoSchema.index({ owner: 1, project: 1 });
gitRepoSchema.index({ project: 1 });

module.exports = mongoose.model("GitRepo", gitRepoSchema);
