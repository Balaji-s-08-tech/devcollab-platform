const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const passport = require("passport");
const ctrl = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimiter");
const { startOAuth, verifyOAuthState } = require("../middleware/oauthState");
const validate = require("../middleware/validate");

const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

const ensureOAuthConfigured = (provider) => (req, res, next) => {
  const prefix = provider.toUpperCase();
  if (!process.env[`${prefix}_CLIENT_ID`] || !process.env[`${prefix}_CLIENT_SECRET`]) {
    return res.status(503).json({
      success: false,
      message: `${provider} OAuth is not configured`,
    });
  }
  next();
};

router.get("/csrf-token", ctrl.getCsrfToken);

router.post(
  "/register",
  authLimiter,
  [
    body("name").trim().notEmpty().withMessage("Name required"),
    body("email").isEmail().withMessage("Valid email required"),
    body("password").isLength({ min: 8 }).withMessage("Password min 8 chars"),
  ],
  validate,
  ctrl.register
);

router.post(
  "/login",
  authLimiter,
  [
    body("email").isEmail(),
    body("password").notEmpty(),
  ],
  validate,
  ctrl.login
);

router.post(
  "/2fa/verify",
  authLimiter,
  [
    body("challengeId").notEmpty().withMessage("2FA challenge required"),
    body("token").optional().isString(),
    body("backupCode").optional().isString(),
  ],
  validate,
  ctrl.verifyTwoFactorLogin
);

router.post("/refresh", ctrl.refresh);
router.post("/logout", authenticate, ctrl.logout);
router.get("/me", authenticate, ctrl.getMe);
router.patch("/me", authenticate, ctrl.updateMe);
router.post("/2fa/enroll", authenticate, ctrl.enrollTwoFactor);
router.post(
  "/2fa/verify-enrollment",
  authenticate,
  [body("token").notEmpty().withMessage("Authenticator code required")],
  validate,
  ctrl.verifyTwoFactorEnrollment
);
router.delete("/2fa", authenticate, ctrl.disableTwoFactor);
router.get("/sessions", authenticate, ctrl.listSessions);
router.delete("/sessions/:id", authenticate, ctrl.revokeSession);

router.get(
  "/oauth/google",
  ensureOAuthConfigured("google"),
  startOAuth("google", ["profile", "email"])
);
router.get(
  "/oauth/google/callback",
  verifyOAuthState("google"),
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${clientUrl}/login?error=oauth_failed`,
  }),
  (req, res, next) => {
    req.params.provider = "google";
    ctrl.oauthLogin(req, res, next);
  }
);
router.get(
  "/oauth/github",
  ensureOAuthConfigured("github"),
  startOAuth("github", ["user:email"])
);
router.get(
  "/oauth/github/callback",
  verifyOAuthState("github"),
  passport.authenticate("github", {
    session: false,
    failureRedirect: `${clientUrl}/login?error=oauth_failed`,
  }),
  (req, res, next) => {
    req.params.provider = "github";
    ctrl.oauthLogin(req, res, next);
  }
);

module.exports = router;
