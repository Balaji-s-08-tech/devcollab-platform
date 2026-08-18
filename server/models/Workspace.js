const mongoose = require("mongoose");
const { ROLES } = require("../constants/roles");

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.MEMBER,
    },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const workspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", default: null },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [memberSchema],
    settings: {
      inheritOrganizationPermissions: { type: Boolean, default: true },
      defaultProjectRole: { type: String, enum: Object.values(ROLES), default: ROLES.MEMBER },
    },
  },
  { timestamps: true }
);

workspaceSchema.pre("save", function (next) {
  if (this.isModified("name") && !this.slug) {
    this.slug = `${this.name.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "-").slice(0, 60)}-${Date.now().toString(36)}`;
  }
  next();
});

workspaceSchema.index({ organization: 1 });
workspaceSchema.index({ owner: 1 });
workspaceSchema.index({ "members.user": 1 });

module.exports = mongoose.model("Workspace", workspaceSchema);
