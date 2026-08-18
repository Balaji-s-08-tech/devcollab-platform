const Document = require("../models/Document");
const Project = require("../models/Project");
const Issue = require("../models/Issue");
const ShareLink = require("../models/ShareLink");
const rbac = require("../permissions/rbacService");
const { sendInviteEmail } = require("../services/emailService");
const { recordAudit } = require("../middleware/audit");

const publicUrl = (path) => `${process.env.CLIENT_URL || "http://localhost:5173"}${path}`;

exports.getEffectivePermission = async (req, res, next) => {
  try {
    const { resourceType, resourceId } = req.query;
    const context = { [`${resourceType}Id`]: resourceId };
    const role = await rbac.getEffectiveRole(req.user, context);
    res.json({ success: true, role });
  } catch (err) {
    next(err);
  }
};

exports.grantPermission = async (req, res, next) => {
  try {
    const { userId, role, resourceType, resourceId } = req.body;
    const grant = await rbac.assignRole({
      actor: req.user,
      userId,
      role,
      resourceType,
      resourceId,
    });

    await recordAudit({
      req,
      action: "permission_grant",
      targetType: resourceType,
      targetId: resourceId,
      metadata: { userId, role },
    });

    res.status(201).json({ success: true, data: grant });
  } catch (err) {
    next(err);
  }
};

exports.updatePermission = async (req, res, next) => {
  try {
    const { userId, role, resourceType, resourceId } = req.body;
    const grant = await rbac.assignRole({
      actor: req.user,
      userId,
      role,
      resourceType,
      resourceId,
    });

    await recordAudit({
      req,
      action: "permission_update",
      targetType: resourceType,
      targetId: resourceId,
      metadata: { userId, role },
    });

    res.json({ success: true, data: grant });
  } catch (err) {
    next(err);
  }
};

exports.revokePermission = async (req, res, next) => {
  try {
    const { userId, resourceType, resourceId } = req.body;
    const result = await rbac.revokeRole({ userId, resourceType, resourceId });

    await recordAudit({
      req,
      action: "permission_revoke",
      targetType: resourceType,
      targetId: resourceId,
      metadata: { userId },
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.createInvite = async (req, res, next) => {
  try {
    const { email, role, scopeType, scope, message, ttlHours } = req.body;
    const { invite, token } = await rbac.createInvite({
      actor: req.user,
      email,
      role,
      scopeType,
      scope,
      message,
      ttlHours,
    });
    const emailResult = await sendInviteEmail({ to: email, token, role, scopeType, message });

    await recordAudit({
      req,
      action: "invite_create",
      targetType: scopeType,
      targetId: scope,
      metadata: { email, role },
    });

    res.status(201).json({
      success: true,
      invite,
      acceptUrl: publicUrl(`/invite/accept?token=${token}`),
      email: emailResult,
    });
  } catch (err) {
    next(err);
  }
};

exports.acceptInvite = async (req, res, next) => {
  try {
    const invite = await rbac.acceptInvite({ token: req.body.token, userId: req.user._id });
    await recordAudit({
      req,
      action: "invite_accept",
      targetType: invite.scopeType,
      targetId: invite.scope,
      metadata: { inviteId: invite._id },
    });
    res.json({ success: true, invite });
  } catch (err) {
    next(err);
  }
};

exports.createShareLink = async (req, res, next) => {
  try {
    const { resourceType, resource, expiresInHours } = req.body;
    const { shareLink, token } = await rbac.createShareLink({
      actor: req.user,
      resourceType,
      resource,
      expiresInHours,
    });

    await recordAudit({
      req,
      action: "share_link_create",
      targetType: resourceType,
      targetId: resource,
      metadata: { shareLinkId: shareLink._id },
    });

    res.status(201).json({
      success: true,
      shareLink,
      url: publicUrl(`/share/${token}`),
      token,
    });
  } catch (err) {
    next(err);
  }
};

exports.revokeShareLink = async (req, res, next) => {
  try {
    const shareLink = await ShareLink.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { revokedAt: new Date() },
      { new: true }
    );
    if (!shareLink) return res.status(404).json({ success: false, message: "Share link not found" });

    await recordAudit({
      req,
      action: "share_link_revoke",
      targetType: shareLink.resourceType,
      targetId: shareLink.resource,
      metadata: { shareLinkId: shareLink._id },
    });

    res.json({ success: true, shareLink });
  } catch (err) {
    next(err);
  }
};

exports.getSharedResource = async (req, res, next) => {
  try {
    const shareLink = await rbac.validateShareLink(req.params.token);
    let data;

    if (shareLink.resourceType === "document") {
      data = await Document.findById(shareLink.resource).select("title content contentText icon updatedAt").lean();
    } else if (shareLink.resourceType === "project") {
      data = await Project.findById(shareLink.resource).select("name description icon color updatedAt").lean();
    } else if (shareLink.resourceType === "issue") {
      data = await Issue.findById(shareLink.resource).select("number title body state type priority updatedAt").lean();
    }

    if (!data) return res.status(404).json({ success: false, message: "Shared resource not found" });
    res.json({ success: true, resourceType: shareLink.resourceType, permission: "read", data });
  } catch (err) {
    next(err);
  }
};
