const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      select: false,
    },
    family: {
      type: String,
      required: true,
      index: true,
    },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    deviceName: { type: String, default: null },
    provider: {
      type: String,
      enum: ["local", "google", "github"],
      default: "local",
    },
    lastUsedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, default: null },
  },
  { timestamps: true }
);

sessionSchema.index({ user: 1, revokedAt: 1, expiresAt: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

sessionSchema.methods.isActive = function () {
  return !this.revokedAt && this.expiresAt > new Date();
};

module.exports = mongoose.model("Session", sessionSchema);
