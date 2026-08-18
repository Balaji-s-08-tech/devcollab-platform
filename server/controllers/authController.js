const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const User = require("../models/User");
const Session = require("../models/Session");
const { deleteCache } = require("../config/redis");
const logger = require("../config/logger");
const { issueCsrfToken } = require("../middleware/csrf");
const { recordAudit } = require("../middleware/audit");
const {
  REFRESH_COOKIE_NAME,
  clearRefreshCookie,
  createSession,
  revokeSession,
  rotateRefreshToken,
  setRefreshCookie,
  signTwoFactorChallenge,
  verifyTwoFactorChallenge,
} = require("../services/authTokens");
const {
  consumeBackupCode,
  decryptSecret,
  encryptSecret,
  generateBackupCodes,
  hashBackupCodes,
} = require("../services/twoFactorService");
const searchIndex = require("../services/searchIndexService");

const publishLogin = async ({ req, res, user, provider = "local" }) => {
  const { session, refreshToken, accessToken } = await createSession(user, req, provider);
  setRefreshCookie(res, refreshToken);

  user.isOnline = true;
  user.lastSeen = new Date();
  await user.save({ validateBeforeSave: false });
  await deleteCache(`user:${user._id}`);

  return { session, token: accessToken };
};

const getRefreshToken = (req) => req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;

const verifyTotp = (secret, token) =>
  speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token: String(token || "").replace(/\s/g, ""),
    window: 1,
  });

exports.getCsrfToken = (req, res) => {
  const csrfToken = issueCsrfToken(req, res);
  res.json({ success: true, csrfToken });
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const exists = await User.findOne({ email }).lean();
    if (exists) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }

    const user = await User.create({ name, email, password, authProviders: ["local"] });
    const { session, token } = await publishLogin({ req, res, user });

    logger.info(`New user registered: ${email}`);
    await recordAudit({ req, userId: user._id, action: "register", metadata: { sessionId: session._id } });
    searchIndex.indexUser(user._id).catch(() => {});

    res.status(201).json({
      success: true,
      token,
      user: user.toJSON(),
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user || !user.password || !(await user.comparePassword(password))) {
      await recordAudit({
        req,
        action: "login",
        status: "failure",
        metadata: { email },
      });
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    if (user.twoFactor?.enabled) {
      await recordAudit({ req, userId: user._id, action: "login_2fa_required" });
      return res.json({
        success: true,
        requiresTwoFactor: true,
        challengeId: signTwoFactorChallenge(user._id),
      });
    }

    const { session, token } = await publishLogin({ req, res, user });

    await recordAudit({ req, userId: user._id, action: "login", metadata: { sessionId: session._id } });

    res.json({
      success: true,
      token,
      user: user.toJSON(),
    });
  } catch (err) {
    next(err);
  }
};

exports.verifyTwoFactorLogin = async (req, res, next) => {
  try {
    const { challengeId, token, backupCode } = req.body;
    const decoded = verifyTwoFactorChallenge(challengeId);
    if (decoded.purpose !== "2fa") {
      return res.status(401).json({ success: false, message: "Invalid 2FA challenge" });
    }

    const user = await User.findById(decoded.id).select("+twoFactor.secret +twoFactor.backupCodes.codeHash");
    if (!user?.twoFactor?.enabled) {
      return res.status(401).json({ success: false, message: "2FA is not enabled" });
    }

    const secret = decryptSecret(user.twoFactor.secret);
    const validToken = token ? verifyTotp(secret, token) : false;
    const validBackup = !validToken && backupCode ? await consumeBackupCode(user, backupCode) : false;

    if (!validToken && !validBackup) {
      await recordAudit({ req, userId: user._id, action: "2fa_verify", status: "failure" });
      return res.status(401).json({ success: false, message: "Invalid 2FA code" });
    }

    const { session, token: accessToken } = await publishLogin({ req, res, user });
    await recordAudit({
      req,
      userId: user._id,
      action: validBackup ? "backup_code_used" : "2fa_verify",
      metadata: { sessionId: session._id },
    });

    res.json({
      success: true,
      token: accessToken,
      user: user.toJSON(),
      backupCodeUsed: validBackup,
    });
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "2FA challenge expired" });
    }
    next(err);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const refreshToken = getRefreshToken(req);
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: "No refresh session" });
    }

    const rotated = await rotateRefreshToken(refreshToken, req);
    setRefreshCookie(res, rotated.refreshToken);

    await recordAudit({
      req,
      userId: rotated.session.user,
      action: "refresh_token_rotated",
      metadata: { sessionId: rotated.session._id },
    });

    res.json({ success: true, token: rotated.accessToken });
  } catch (err) {
    clearRefreshCookie(res);
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const sessionId = req.auth?.sid || String(getRefreshToken(req) || "").split(".")[0];
    await revokeSession(sessionId, req.user._id, "logout");

    const user = await User.findById(req.user._id);
    if (user) {
      user.refreshToken = null;
      user.isOnline = false;
      user.lastSeen = new Date();
      await user.save({ validateBeforeSave: false });
      await deleteCache(`user:${user._id}`);
    }

    clearRefreshCookie(res);
    await recordAudit({ req, userId: req.user._id, action: "logout", metadata: { sessionId } });
    res.json({ success: true, message: "Logged out" });
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

exports.updateMe = async (req, res, next) => {
  try {
    const { name, bio, githubUsername, preferences, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { name, bio, githubUsername, preferences, avatar } },
      { new: true, runValidators: true }
    );
    await deleteCache(`user:${user._id}`);
    await recordAudit({ req, userId: user._id, action: "profile_update" });
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

exports.oauthLogin = async (req, res, next) => {
  try {
    const provider = req.params.provider;
    const { session, token } = await publishLogin({ req, res, user: req.user, provider });

    await recordAudit({
      req,
      userId: req.user._id,
      action: "oauth_login",
      metadata: { provider, sessionId: session._id },
    });

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    res.redirect(`${clientUrl}/oauth/callback#token=${encodeURIComponent(token)}`);
  } catch (err) {
    next(err);
  }
};

exports.enrollTwoFactor = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("+twoFactor.tempSecret");
    const secret = speakeasy.generateSecret({
      name: `DevCollab (${user.email})`,
      issuer: "DevCollab",
      length: 32,
    });

    user.twoFactor.tempSecret = encryptSecret(secret.base32);
    await user.save({ validateBeforeSave: false });

    const qrCode = await qrcode.toDataURL(secret.otpauth_url);
    await recordAudit({ req, userId: user._id, action: "2fa_enrollment_started" });

    res.json({
      success: true,
      otpauthUrl: secret.otpauth_url,
      manualEntryKey: secret.base32,
      qrCode,
    });
  } catch (err) {
    next(err);
  }
};

exports.verifyTwoFactorEnrollment = async (req, res, next) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user._id).select("+twoFactor.tempSecret");

    if (!user?.twoFactor?.tempSecret) {
      return res.status(400).json({ success: false, message: "No pending 2FA enrollment" });
    }

    const secret = decryptSecret(user.twoFactor.tempSecret);
    if (!verifyTotp(secret, token)) {
      return res.status(401).json({ success: false, message: "Invalid authenticator code" });
    }

    const backupCodes = generateBackupCodes();
    user.twoFactor.enabled = true;
    user.twoFactor.secret = user.twoFactor.tempSecret;
    user.twoFactor.tempSecret = null;
    user.twoFactor.backupCodes = await hashBackupCodes(backupCodes);
    user.twoFactor.enabledAt = new Date();
    await user.save({ validateBeforeSave: false });

    await recordAudit({ req, userId: user._id, action: "2fa_enabled" });
    res.json({ success: true, backupCodes });
  } catch (err) {
    next(err);
  }
};

exports.disableTwoFactor = async (req, res, next) => {
  try {
    const { token, backupCode } = req.body;
    const user = await User.findById(req.user._id).select("+twoFactor.secret +twoFactor.backupCodes.codeHash");

    if (!user?.twoFactor?.enabled) {
      return res.status(400).json({ success: false, message: "2FA is not enabled" });
    }

    const secret = decryptSecret(user.twoFactor.secret);
    const validToken = token ? verifyTotp(secret, token) : false;
    const validBackup = !validToken && backupCode ? await consumeBackupCode(user, backupCode) : false;

    if (!validToken && !validBackup) {
      return res.status(401).json({ success: false, message: "Invalid 2FA code" });
    }

    user.twoFactor.enabled = false;
    user.twoFactor.secret = null;
    user.twoFactor.tempSecret = null;
    user.twoFactor.backupCodes = [];
    user.twoFactor.enabledAt = null;
    await user.save({ validateBeforeSave: false });

    await recordAudit({ req, userId: user._id, action: "2fa_disabled" });
    res.json({ success: true, message: "2FA disabled" });
  } catch (err) {
    next(err);
  }
};

exports.listSessions = async (req, res, next) => {
  try {
    const sessions = await Session.find({
      user: req.user._id,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    })
      .sort({ lastUsedAt: -1 })
      .lean();

    res.json({
      success: true,
      sessions: sessions.map((session) => ({
        id: session._id,
        current: String(session._id) === String(req.auth?.sid),
        provider: session.provider,
        deviceName: session.deviceName,
        ip: session.ip,
        userAgent: session.userAgent,
        lastUsedAt: session.lastUsedAt,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
      })),
    });
  } catch (err) {
    next(err);
  }
};

exports.revokeSession = async (req, res, next) => {
  try {
    const sessionId = req.params.id === "current" ? req.auth?.sid : req.params.id;
    const session = await revokeSession(sessionId, req.user._id, "user_revoked");

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    if (String(sessionId) === String(req.auth?.sid)) {
      clearRefreshCookie(res);
    }

    await recordAudit({
      req,
      userId: req.user._id,
      action: "session_revoked",
      metadata: { sessionId },
    });

    res.json({ success: true, message: "Session revoked" });
  } catch (err) {
    next(err);
  }
};
