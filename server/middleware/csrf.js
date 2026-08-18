const crypto = require("crypto");

const CSRF_SECRET_COOKIE = process.env.CSRF_SECRET_COOKIE_NAME || "dc_csrf_secret";
const CSRF_TOKEN_COOKIE = process.env.CSRF_TOKEN_COOKIE_NAME || "XSRF-TOKEN";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const cookieOptions = (httpOnly) => ({
  httpOnly,
  secure: process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production",
  sameSite: process.env.COOKIE_SAME_SITE || "lax",
  domain: process.env.COOKIE_DOMAIN || undefined,
  path: "/",
  maxAge: 2 * 60 * 60 * 1000,
});

const signToken = (secret, nonce = crypto.randomBytes(16).toString("base64url")) => {
  const digest = crypto.createHmac("sha256", secret).update(nonce).digest("base64url");
  return `${nonce}.${digest}`;
};

const verifyToken = (secret, token) => {
  const [nonce, digest] = String(token || "").split(".");
  if (!nonce || !digest) return false;

  const expected = crypto.createHmac("sha256", secret).update(nonce).digest("base64url");
  const actualBuffer = Buffer.from(digest);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  );
};

const issueCsrfToken = (req, res) => {
  const secret = req.cookies?.[CSRF_SECRET_COOKIE] || crypto.randomBytes(32).toString("base64url");
  const token = signToken(secret);

  res.cookie(CSRF_SECRET_COOKIE, secret, cookieOptions(true));
  res.cookie(CSRF_TOKEN_COOKIE, token, cookieOptions(false));
  return token;
};

const csrfProtection = (req, res, next) => {
  if (process.env.CSRF_DISABLED === "true" || SAFE_METHODS.has(req.method)) {
    return next();
  }

  if ((req.originalUrl || req.path).startsWith("/api/webhooks")) {
    return next();
  }

  const secret = req.cookies?.[CSRF_SECRET_COOKIE];
  const token = req.get("x-csrf-token") || req.get("x-xsrf-token") || req.body?._csrf;

  if (!secret || !verifyToken(secret, token)) {
    return res.status(403).json({
      success: false,
      message: "Invalid or missing CSRF token",
    });
  }

  return next();
};

module.exports = {
  CSRF_SECRET_COOKIE,
  CSRF_TOKEN_COOKIE,
  csrfProtection,
  issueCsrfToken,
};
