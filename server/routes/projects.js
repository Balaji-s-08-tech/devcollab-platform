const express = require("express");
const r = express.Router();
const ctrl = require("../controllers/projectController");
const { authenticate } = require("../middleware/auth");
const { cacheMiddleware } = require("../middleware/cache");
const { requirePermission } = require("../middleware/permissions");

r.use(authenticate);
r.get("/", cacheMiddleware(30), ctrl.getProjects);
r.post("/", ctrl.createProject);
r.get("/:id", requirePermission("read", "project", (req) => ({ projectId: req.params.id })), cacheMiddleware(30), ctrl.getProject);
r.patch("/:id", requirePermission("update", "project", (req) => ({ projectId: req.params.id })), ctrl.updateProject);
r.delete("/:id", requirePermission("delete", "project", (req) => ({ projectId: req.params.id })), ctrl.deleteProject);
r.post("/:id/members", requirePermission("invite", "project", (req) => ({ projectId: req.params.id })), ctrl.addMember);
r.delete("/:id/members/:userId", requirePermission("manage", "Permission", (req) => ({ projectId: req.params.id })), ctrl.removeMember);
r.get("/:id/activity", requirePermission("read", "project", (req) => ({ projectId: req.params.id })), cacheMiddleware(20), ctrl.getActivity);

module.exports = r;
