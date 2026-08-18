const crypto = require("crypto");
const passport = require("passport");

const OAUTH_STATE_COOKIE = process.env.OAUTH_STATE_COOKIE_NAME || "dc_oauth_state";

const oauthCookieOptions = {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/api/auth/oauth",
  maxAge: 10 * 60 * 1000,
};

const startOAuth = (provider, scope) => (req, res, next) => {
  const state = crypto.randomBytes(24).toString("base64url");
  res.cookie(`${OAUTH_STATE_COOKIE}_${provider}`, state, oauthCookieOptions);
  return passport.authenticate(provider, { scope, session: false, state })(req, res, next);
};

const verifyOAuthState = (provider) => (req, res, next) => {
  const expected = req.cookies?.[`${OAUTH_STATE_COOKIE}_${provider}`];
  const actual = req.query.state;
  res.clearCookie(`${OAUTH_STATE_COOKIE}_${provider}`, oauthCookieOptions);

  if (!expected || !actual || expected !== actual) {
    return res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/login?error=oauth_state`);
  }

  return next();
};

module.exports = {
  startOAuth,
  verifyOAuthState,
};
