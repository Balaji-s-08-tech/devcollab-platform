const mongoose = require("mongoose");
const { ROLES } = require("../constants/roles");

const inviteSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    tokenHash: { type: String, required: true, unique: true, select: false },
    role: { type: String, enum: Object.values(ROLES), required: true },
    scopeType: {
      type: String,
      enum: ["organization", "workspace", "project", "document"],
      required: true,
    },
    scope: { type: mongoose.Schema.Types.ObjectId, required: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, maxlength: 1000, default: "" },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date, default: null },
    acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

inviteSchema.index({ scopeType: 1, scope: 1, email: 1, acceptedAt: 1, revokedAt: 1 });
inviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Invite", inviteSchema);
