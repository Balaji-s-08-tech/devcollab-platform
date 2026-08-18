const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [80, "Name max 80 chars"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email"],
    },
    password: {
      type: String,
      required: [
        function () {
          return !this.googleId && !this.githubId;
        },
        "Password is required",
      ],
      minlength: [8, "Password min 8 chars"],
      select: false,
    },
    avatar: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["admin", "developer", "viewer"],
      default: "developer",
    },
    bio: { type: String, maxlength: 200 },
    githubUsername: { type: String, trim: true },
    githubId: { type: String, default: null },
    githubAccessToken: { type: String, select: false, default: null },
    githubProfile: {
      login: String,
      avatarUrl: String,
      htmlUrl: String,
      name: String,
    },
    googleId: { type: String, default: null, index: true },
    googleProfile: {
      email: String,
      avatarUrl: String,
      name: String,
    },
    authProviders: {
      type: [String],
      enum: ["local", "google", "github"],
      default: ["local"],
    },
    twoFactor: {
      enabled: { type: Boolean, default: false },
      secret: { type: String, select: false, default: null },
      tempSecret: { type: String, select: false, default: null },
      backupCodes: [
        {
          codeHash: { type: String, select: false },
          usedAt: { type: Date, default: null },
        },
      ],
      enabledAt: { type: Date, default: null },
    },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    refreshToken: { type: String, select: false },
    notifications: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Notification",
      },
    ],
    preferences: {
      theme: { type: String, enum: ["dark", "light", "system"], default: "dark" },
      emailNotifications: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });
userSchema.index({ name: "text" });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.githubAccessToken;
  delete obj.twoFactor?.secret;
  delete obj.twoFactor?.tempSecret;
  delete obj.twoFactor?.backupCodes;
  obj.twoFactorEnabled = !!obj.twoFactor?.enabled;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
