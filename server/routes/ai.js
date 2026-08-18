const express = require("express");
const { body } = require("express-validator");
const ctrl = require("../controllers/aiController");
const { authenticate } = require("../middleware/auth");
const { requirePermission } = require("../middleware/permissions");
const validate = require("../middleware/validate");

const router = express.Router();

router.use(authenticate);

router.get("/jobs/:id", ctrl.getJob);
router.post("/documents/:id/index", requirePermission("read", "document", (req) => ({ documentId: req.params.id })), ctrl.enqueueDocumentIndex);
router.post(
  "/documents/:id/ask",
  requirePermission("read", "document", (req) => ({ documentId: req.params.id })),
  [body("question").notEmpty()],
  validate,
  ctrl.streamDocumentQuestion
);

router.post("/issues/generate", requirePermission("create", "issue", (req) => ({ projectId: req.body.project })), ctrl.generateIssues);
router.post("/meetings/summarize", requirePermission("read", "project", (req) => ({ projectId: req.body.project })), ctrl.summarizeMeeting);
router.post("/sprints/plan", requirePermission("read", "project", (req) => ({ projectId: req.body.project })), ctrl.planSprint);
router.post("/standup", ctrl.generateStandup);
router.post("/analytics/insights", requirePermission("read", "project", (req) => ({ projectId: req.body.project })), ctrl.summarizeAnalytics);

module.exports = router;
