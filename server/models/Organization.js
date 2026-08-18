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

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [memberSchema],
    settings: {
      defaultWorkspaceRole: { type: String, enum: Object.values(ROLES), default: ROLES.MEMBER },
      guestsAllowed: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

organizationSchema.pre("save", function (next) {
  if (this.isModified("name") && !this.slug) {
    this.slug = `${this.name.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "-").slice(0, 60)}-${Date.now().toString(36)}`;
  }
  next();
});

organizationSchema.index({ owner: 1 });
organizationSchema.index({ "members.user": 1 });

module.exports = mongoose.model("Organization", organizationSchema);
