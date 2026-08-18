const express = require("express");
const { verifyWebhookSignature } = require("../middleware/abuseProtection");
const { recordAudit } = require("../middleware/audit");

const router = express.Router();

router.post(
  "/github",
  verifyWebhookSignature({ secretEnv: "GITHUB_WEBHOOK_SECRET", header: "x-hub-signature-256" }),
  async (req, res) => {
    await recordAudit({
      req,
      action: "webhook_received",
      metadata: {
        provider: "github",
        event: req.get("x-github-event") || null,
        delivery: req.get("x-github-delivery") || null,
      },
    });
    res.json({ success: true });
  }
);

router.post("/generic", verifyWebhookSignature(), async (req, res) => {
  await recordAudit({
    req,
    action: "webhook_received",
    metadata: { provider: "generic" },
  });
  res.json({ success: true });
});

module.exports = router;
