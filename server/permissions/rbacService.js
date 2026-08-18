const crypto = require("crypto");
const mongoose = require("mongoose");
const Organization = require("../models/Organization");
const Workspace = require("../models/Workspace");
const Project = require("../models/Project");
const Document = require("../models/Document");
const Issue = require("../models/Issue");
const Task = require("../models/Task");
const PermissionGrant = require("../models/PermissionGrant");
const Invite = require("../models/Invite");
const ShareLink = require("../models/ShareLink");
const User = require("../models/User");
const { maxRole, normalizeRole, ROLES } = require("../constants/roles");
const { defineAbilityForRole } = require("./ability");

const tokenHash = (token) => crypto.createHash("sha256").update(token).digest("hex");
const makeToken = () => crypto.randomBytes(32).toString("base64url");
const isObjectId = (value) => value && mongoose.Types.ObjectId.isValid(value);

const subjectName = (resourceType) => {
  const map = {
    organization: "Organization",
    workspace: "Workspace",
    project: "Project",
    document: "Document",
    board: "Board",
    issue: "Issue",
  };
  return map[resourceType] || resourceType;
};

const getMemberRole = (container, userId) => {
  if (!container || !userId) return null;
  if (container.owner?.toString() === userId.toString()) return ROLES.OWNER;
  const member = container.members?.find((m) => m.user?.toString() === userId.toString());
  return normalizeRole(member?.role);
};

const loadContext = async ({ organizationId, workspaceId, projectId, documentId, issueId, boardId }) => {
  let document;
  let issue;
  let task;
  let project;
  let workspace;
  let organization;

  if (isObjectId(documentId)) {
    document = await Document.findById(documentId).lean();
    projectId = projectId || document?.project;
  }

  if (isObjectId(issueId)) {
    issue = await Issue.findById(issueId).lean();
    projectId = projectId || issue?.project;
  }

  if (isObjectId(boardId)) {
    task = await Task.findById(boardId).lean();
    projectId = projectId || task?.project || boardId;
  }

  if (isObjectId(projectId)) {
    project = await Project.findById(projectId).lean();
    workspaceId = workspaceId || project?.workspace;
    organizationId = organizationId || project?.organization;
  }

  if (isObjectId(workspaceId)) {
    workspace = await Workspace.findById(workspaceId).lean();
    organizationId = organizationId || workspace?.organization;
  }

  if (isObjectId(organizationId)) {
    organization = await Organization.findById(organizationId).lean();
  }

  return { organization, workspace, project, document, issue, task };
};

const directGrantRole = async (userId, resourceType, resourceId) => {
  if (!userId || !resourceType || !resourceId) return null;
  const grant = await PermissionGrant.findOne({
    user: userId,
    resourceType,
    resource: resourceId,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  }).lean();
  return normalizeRole(grant?.role);
};

const getEffectiveRole = async (user, contextInput) => {
  const userId = user?._id || user?.id;
  if (!userId) return null;

  if (user.role === "admin") return ROLES.ADMIN;

  const context = await loadContext(contextInput);
  const roles = [];

  if (context.organization) {
    roles.push(getMemberRole(context.organization, userId));
    roles.push(await directGrantRole(userId, "organization", context.organization._id));
  }

  if (context.workspace) {
    if (context.workspace.settings?.inheritOrganizationPermissions !== false) {
      roles.push(getMemberRole(context.organization, userId));
    }
    roles.push(getMemberRole(context.workspace, userId));
    roles.push(await directGrantRole(userId, "workspace", context.workspace._id));
  }

  if (context.project) {
    roles.push(getMemberRole(context.project, userId));
    roles.push(await directGrantRole(userId, "project", context.project._id));
  }

  if (context.document) {
    roles.push(await directGrantRole(userId, "document", context.document._id));
  }

  if (context.issue) {
    roles.push(await directGrantRole(userId, "issue", context.issue._id));
  }

  if (context.task) {
    roles.push(await directGrantRole(userId, "board", context.task._id));
  }

  return maxRole(...roles);
};

const can = async (user, action, resourceType, contextInput) => {
  const role = await getEffectiveRole(user, contextInput);
  if (!role) {
    return {
      allowed: false,
      role: null,
      ability: defineAbilityForRole(ROLES.GUEST),
    };
  }

  const ability = defineAbilityForRole(role);
  return {
    allowed: ability.can(action, subjectName(resourceType)),
    role,
    ability,
  };
};

const upsertProjectMember = async (projectId, userId, role) => {
  const project = await Project.findById(projectId);
  if (!project) throw new Error("Project not found");

  const existing = project.members.find((m) => m.user.toString() === userId.toString());
  if (existing) existing.role = role;
  else project.members.push({ user: userId, role });
  await project.save();
  return project;
};

const assignRole = async ({ actor, userId, role, resourceType, resourceId }) => {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) throw new Error("Invalid role");

  if (resourceType === "project") {
    return upsertProjectMember(resourceId, userId, normalizedRole);
  }

  return PermissionGrant.findOneAndUpdate(
    { user: userId, resourceType, resource: resourceId },
    { $set: { role: normalizedRole, grantedBy: actor._id } },
    { upsert: true, new: true }
  );
};

const revokeRole = async ({ userId, resourceType, resourceId }) => {
  if (resourceType === "project") {
    return Project.findByIdAndUpdate(resourceId, { $pull: { members: { user: userId } } }, { new: true });
  }

  return PermissionGrant.findOneAndDelete({ user: userId, resourceType, resource: resourceId });
};

const createInvite = async ({ actor, email, role, scopeType, scope, message, ttlHours = 168 }) => {
  const token = makeToken();
  const invite = await Invite.create({
    email,
    role: normalizeRole(role),
    scopeType,
    scope,
    message,
    invitedBy: actor._id,
    tokenHash: tokenHash(token),
    expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000),
  });

  return { invite, token };
};

const acceptInvite = async ({ token, userId }) => {
  const invite = await Invite.findOne({ tokenHash: tokenHash(token) }).select("+tokenHash");
  if (!invite || invite.revokedAt || invite.acceptedAt || invite.expiresAt <= new Date()) {
    const err = new Error("Invite is invalid or expired");
    err.status = 410;
    throw err;
  }

  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }

  if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
    const err = new Error("Invite email does not match authenticated user");
    err.status = 403;
    throw err;
  }

  await assignRole({
    actor: { _id: invite.invitedBy },
    userId,
    role: invite.role,
    resourceType: invite.scopeType,
    resourceId: invite.scope,
  });

  invite.acceptedAt = new Date();
  invite.acceptedBy = userId;
  await invite.save();
  return invite;
};

const createShareLink = async ({ actor, resourceType, resource, expiresInHours = 72 }) => {
  const token = makeToken();
  const shareLink = await ShareLink.create({
    resourceType,
    resource,
    createdBy: actor._id,
    tokenHash: tokenHash(token),
    expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
  });
  return { shareLink, token };
};

const validateShareLink = async (token) => {
  const shareLink = await ShareLink.findOne({ tokenHash: tokenHash(token) }).select("+tokenHash");
  if (!shareLink || shareLink.revokedAt || shareLink.expiresAt <= new Date()) {
    const err = new Error("Share link is invalid or expired");
    err.status = 410;
    throw err;
  }

  shareLink.lastUsedAt = new Date();
  shareLink.useCount += 1;
  await shareLink.save();
  return shareLink;
};

module.exports = {
  acceptInvite,
  assignRole,
  can,
  createInvite,
  createShareLink,
  getEffectiveRole,
  loadContext,
  revokeRole,
  subjectName,
  validateShareLink,
};
