const express = require("express");
const r = express.Router();
const ctrl = require("../controllers/taskController");
const { authenticate } = require("../middleware/auth");
const { cacheMiddleware } = require("../middleware/cache");
const { requirePermission } = require("../middleware/permissions");

r.use(authenticate);
r.get("/", requirePermission("read", "board", (req) => ({ projectId: req.query.project })), cacheMiddleware(15), ctrl.getTasks);
r.post("/", requirePermission("create", "board", (req) => ({ projectId: req.body.project })), ctrl.createTask);
r.patch("/reorder", requirePermission("update", "board", (req) => ({ projectId: req.body.project })), ctrl.reorderTasks);
r.get("/:id", requirePermission("read", "board", (req) => ({ boardId: req.params.id })), ctrl.getTask);
r.patch("/:id", requirePermission("update", "board", (req) => ({ boardId: req.params.id })), ctrl.updateTask);
r.delete("/:id", requirePermission("delete", "board", (req) => ({ boardId: req.params.id })), ctrl.deleteTask);
r.post("/:id/comments", requirePermission("comment", "board", (req) => ({ boardId: req.params.id })), ctrl.addComment);

module.exports = r;
