const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["success", "failure"],
      default: "success",
      index: true,
    },
    targetType: { type: String, default: null },
    targetId: { type: String, default: null },
    ip: { type: String, default: null },
    device: { type: String, default: null },
    userAgent: { type: String, default: null },
    method: { type: String, default: null },
    path: { type: String, default: null },
    requestId: { type: String, default: null },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
