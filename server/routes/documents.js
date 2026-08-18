const express = require("express");
const r = express.Router();
const ctrl = require("../controllers/documentController");
const { authenticate } = require("../middleware/auth");
const { requirePermission } = require("../middleware/permissions");

r.use(authenticate);
r.get("/", requirePermission("read", "project", (req) => ({ projectId: req.query.project })), ctrl.getDocuments);
r.post("/", requirePermission("create", "document", (req) => ({ projectId: req.body.project })), ctrl.createDocument);
r.get("/:id", requirePermission("read", "document", (req) => ({ documentId: req.params.id })), ctrl.getDocument);
r.patch("/:id", requirePermission("update", "document", (req) => ({ documentId: req.params.id })), ctrl.updateDocument);
r.delete("/:id", requirePermission("delete", "document", (req) => ({ documentId: req.params.id })), ctrl.archiveDocument);
r.post("/:id/comments", requirePermission("comment", "document", (req) => ({ documentId: req.params.id })), ctrl.addComment);

module.exports = r;
