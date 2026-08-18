const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "task_assigned",
        "task_comment",
        "task_due",
        "issue_assigned",
        "issue_comment",
        "issue_closed",
        "doc_shared",
        "doc_comment",
        "doc_mention",
        "project_invite",
        "project_update",
        "mention",
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String },
    link: { type: String },

    entityType: {
      type: String,
      enum: ["Task", "Issue", "Document", "Project"],
    },
    entityId: { type: mongoose.Schema.Types.ObjectId },

    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
