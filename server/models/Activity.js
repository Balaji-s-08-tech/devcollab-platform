const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    action: {
      type: String,
      required: true,

    },
    entityType: {
      type: String,
      enum: ["Task", "Issue", "Document", "Project", "User"],
    },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    entityTitle: { type: String },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },

  },
  { timestamps: true }
);

activitySchema.index({ project: 1, createdAt: -1 });
activitySchema.index({ actor: 1 });

module.exports = mongoose.model("Activity", activitySchema);
