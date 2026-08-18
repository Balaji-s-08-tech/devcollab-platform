const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, maxlength: 2000 },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

const documentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "Untitled",
      maxlength: [255, "Title max 255 chars"],
    },
    content: {

      type: mongoose.Schema.Types.Mixed,
      default: { type: "doc", content: [{ type: "paragraph" }] },
    },
    contentText: {

      type: String,
      default: "",
    },
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
    parent: {

      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      default: null,
    },
    icon: { type: String, default: "📄" },
    coverImage: { type: String, default: null },
    isPublished: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
    order: { type: Number, default: 0 },

    activeEditors: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        cursor: { type: Number, default: 0 },
        lastActiveAt: { type: Date, default: Date.now },
      },
    ],

    comments: [commentSchema],

    version: { type: Number, default: 1 },

    lastEditedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    lastEditedAt: { type: Date, default: Date.now },

    tags: [{ type: String, trim: true }],
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

documentSchema.index({ project: 1, isArchived: 1 });
documentSchema.index({ parent: 1 });
documentSchema.index({ title: "text", contentText: "text" });

module.exports = mongoose.model("Document", documentSchema);
