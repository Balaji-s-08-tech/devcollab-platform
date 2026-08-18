const crypto = require("crypto");

const BOT_PATTERNS = [
  /curl/i,
  /python-requests/i,
  /scrapy/i,
  /sqlmap/i,
  /nikto/i,
  /masscan/i,
  /nmap/i,
  /acunetix/i,
  /bot\b/i,
];

const botDetection = (req, res, next) => {
  const mode = process.env.BOT_DETECTION_MODE || "monitor";
  const userAgent = req.get("user-agent") || "";
  const suspicious = BOT_PATTERNS.some((pattern) => pattern.test(userAgent));

  req.bot = { suspicious, userAgent };

  if (suspicious && mode === "block") {
    return res.status(403).json({ success: false, message: "Automated traffic blocked" });
  }

  return next();
};

const timingSafeEqual = (a, b) => {
  const left = Buffer.from(a || "");
  const right = Buffer.from(b || "");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

const verifyWebhookSignature =
  ({ secretEnv = "WEBHOOK_SECRET", header = "x-devcollab-signature" } = {}) =>
  (req, res, next) => {
    const secret = process.env[secretEnv];
    if (!secret) {
      return res.status(503).json({ success: false, message: "Webhook secret is not configured" });
    }

    const signature = req.get(header);
    const payload = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
    const expected = `sha256=${crypto.createHmac("sha256", secret).update(payload).digest("hex")}`;

    if (!signature || !timingSafeEqual(signature, expected)) {
      return res.status(401).json({ success: false, message: "Invalid webhook signature" });
    }

    return next();
  };

module.exports = {
  botDetection,
  verifyWebhookSignature,
};
