const mongoose = require("mongoose");
const { ROLES } = require("../constants/roles");

const permissionGrantSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: Object.values(ROLES), required: true },
    resourceType: {
      type: String,
      enum: ["organization", "workspace", "project", "document", "board", "issue"],
      required: true,
      index: true,
    },
    resource: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

permissionGrantSchema.index({ user: 1, resourceType: 1, resource: 1 }, { unique: true });
permissionGrantSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $type: "date" } } });

module.exports = mongoose.model("PermissionGrant", permissionGrantSchema);
