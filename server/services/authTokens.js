const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const Session = require("../models/Session");

const REFRESH_COOKIE_NAME = process.env.REFRESH_TOKEN_COOKIE_NAME || "dc_refresh";

const parseDurationMs = (value, fallbackMs) => {
  if (!value) return fallbackMs;
  if (typeof value === "number") return value * 1000;

  const match = String(value).trim().match(/^(\d+)(ms|s|m|h|d)?$/i);
  if (!match) return fallbackMs;

  const amount = Number(match[1]);
  const unit = (match[2] || "s").toLowerCase();
  const multipliers = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * (multipliers[unit] || 1000);
};

const refreshTokenTtlMs = () =>
  parseDurationMs(process.env.REFRESH_TOKEN_EXPIRES_IN || "30d", 30 * 24 * 60 * 60 * 1000);

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const getRequestIp = (req) =>
  req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || req.socket?.remoteAddress || null;

const getDeviceName = (userAgent = "") => {
  if (!userAgent) return "Unknown device";
  if (/mobile|android|iphone|ipad/i.test(userAgent)) return "Mobile browser";
  if (/windows/i.test(userAgent)) return "Windows browser";
  if (/macintosh|mac os/i.test(userAgent)) return "macOS browser";
  if (/linux/i.test(userAgent)) return "Linux browser";
  return "Browser session";
};

const getRefreshCookieOptions = () => {
  const secure = process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production";
  const sameSite = process.env.COOKIE_SAME_SITE || "lax";
  const domain = process.env.COOKIE_DOMAIN || undefined;

  return {
    httpOnly: true,
    secure,
    sameSite,
    domain,
    path: "/api/auth",
    maxAge: refreshTokenTtlMs(),
  };
};

const clearRefreshCookie = (res) => {
  const options = getRefreshCookieOptions();
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: options.secure,
    sameSite: options.sameSite,
    domain: options.domain,
    path: options.path,
  });
};

const setRefreshCookie = (res, refreshToken) => {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
};

const signAccessToken = (userId, sessionId) =>
  jwt.sign(
    {
      id: String(userId),
      sid: sessionId ? String(sessionId) : undefined,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
  );

const generateRefreshToken = (sessionId) =>
  `${sessionId}.${crypto.randomBytes(48).toString("base64url")}`;

const createSession = async (user, req, provider = "local") => {
  const expiresAt = new Date(Date.now() + refreshTokenTtlMs());
  const session = await Session.create({
    user: user._id,
    refreshTokenHash: crypto.randomBytes(32).toString("hex"),
    family: crypto.randomUUID(),
    ip: getRequestIp(req),
    userAgent: req.get("user-agent") || null,
    deviceName: getDeviceName(req.get("user-agent")),
    provider,
    expiresAt,
  });

  const refreshToken = generateRefreshToken(session._id);
  session.refreshTokenHash = hashToken(refreshToken);
  await session.save();

  return {
    session,
    refreshToken,
    accessToken: signAccessToken(user._id, session._id),
  };
};

const rotateRefreshToken = async (refreshToken, req) => {
  const [sessionId] = String(refreshToken || "").split(".");
  if (!sessionId) {
    const err = new Error("Invalid refresh token");
    err.status = 401;
    throw err;
  }

  const session = await Session.findById(sessionId).select("+refreshTokenHash");
  if (!session || !session.isActive()) {
    const err = new Error("Refresh session expired or revoked");
    err.status = 401;
    throw err;
  }

  if (session.refreshTokenHash !== hashToken(refreshToken)) {
    await Session.updateMany(
      { user: session.user, family: session.family, revokedAt: null },
      { $set: { revokedAt: new Date(), revokedReason: "refresh_reuse_detected" } }
    );
    const err = new Error("Refresh token reuse detected");
    err.status = 401;
    throw err;
  }

  const nextRefreshToken = generateRefreshToken(session._id);
  session.refreshTokenHash = hashToken(nextRefreshToken);
  session.lastUsedAt = new Date();
  session.ip = getRequestIp(req);
  session.userAgent = req.get("user-agent") || session.userAgent;
  session.deviceName = getDeviceName(req.get("user-agent"));
  await session.save();

  return {
    session,
    refreshToken: nextRefreshToken,
    accessToken: signAccessToken(session.user, session._id),
  };
};

const revokeSession = async (sessionId, userId, reason = "revoked") => {
  if (!sessionId) return null;
  return Session.findOneAndUpdate(
    { _id: sessionId, user: userId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: reason } },
    { new: true }
  );
};

const signTwoFactorChallenge = (userId) =>
  jwt.sign(
    { id: String(userId), purpose: "2fa" },
    process.env.TWO_FACTOR_CHALLENGE_SECRET || `${process.env.JWT_SECRET}_2fa`,
    { expiresIn: "5m" }
  );

const verifyTwoFactorChallenge = (challengeToken) =>
  jwt.verify(
    challengeToken,
    process.env.TWO_FACTOR_CHALLENGE_SECRET || `${process.env.JWT_SECRET}_2fa`
  );

module.exports = {
  REFRESH_COOKIE_NAME,
  clearRefreshCookie,
  createSession,
  getRequestIp,
  revokeSession,
  rotateRefreshToken,
  setRefreshCookie,
  signAccessToken,
  signTwoFactorChallenge,
  verifyTwoFactorChallenge,
};
