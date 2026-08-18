const express = require("express");
const { body } = require("express-validator");
const ctrl = require("../controllers/permissionController");
const { authenticate } = require("../middleware/auth");
const { requirePermission } = require("../middleware/permissions");
const validate = require("../middleware/validate");

const router = express.Router();

router.post("/invites/accept", authenticate, [body("token").notEmpty()], validate, ctrl.acceptInvite);

router.use(authenticate);

router.get("/effective", ctrl.getEffectivePermission);

router.post(
  "/grants",
  requirePermission("manage", "Permission", (req) => ({ [`${req.body.resourceType}Id`]: req.body.resourceId })),
  [
    body("userId").notEmpty(),
    body("role").isIn(["owner", "admin", "member", "viewer", "guest"]),
    body("resourceType").isIn(["organization", "workspace", "project", "document", "board", "issue"]),
    body("resourceId").notEmpty(),
  ],
  validate,
  ctrl.grantPermission
);

router.patch(
  "/grants",
  requirePermission("manage", "Permission", (req) => ({ [`${req.body.resourceType}Id`]: req.body.resourceId })),
  [
    body("userId").notEmpty(),
    body("role").isIn(["owner", "admin", "member", "viewer", "guest"]),
    body("resourceType").isIn(["organization", "workspace", "project", "document", "board", "issue"]),
    body("resourceId").notEmpty(),
  ],
  validate,
  ctrl.updatePermission
);

router.delete(
  "/grants",
  requirePermission("manage", "Permission", (req) => ({ [`${req.body.resourceType}Id`]: req.body.resourceId })),
  [body("userId").notEmpty(), body("resourceType").notEmpty(), body("resourceId").notEmpty()],
  validate,
  ctrl.revokePermission
);

router.post(
  "/invites",
  requirePermission("invite", "Invite", (req) => ({ [`${req.body.scopeType}Id`]: req.body.scope })),
  [
    body("email").isEmail(),
    body("role").isIn(["admin", "member", "viewer", "guest"]),
    body("scopeType").isIn(["organization", "workspace", "project", "document"]),
    body("scope").notEmpty(),
  ],
  validate,
  ctrl.createInvite
);

router.post(
  "/share-links",
  requirePermission("share", "ShareLink", (req) => ({ [`${req.body.resourceType}Id`]: req.body.resource })),
  [body("resourceType").isIn(["document", "project", "issue", "board"]), body("resource").notEmpty()],
  validate,
  ctrl.createShareLink
);

router.delete("/share-links/:id", ctrl.revokeShareLink);

module.exports = router;
