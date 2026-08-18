const mongoose = require("mongoose");

const shareLinkSchema = new mongoose.Schema(
  {
    resourceType: {
      type: String,
      enum: ["document", "project", "issue", "board"],
      required: true,
      index: true,
    },
    resource: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, select: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    permission: { type: String, enum: ["read"], default: "read" },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    lastUsedAt: { type: Date, default: null },
    useCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

shareLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("ShareLink", shareLinkSchema);
