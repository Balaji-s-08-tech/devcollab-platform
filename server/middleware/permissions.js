const rbac = require("../permissions/rbacService");

const contextFromRequest = (req) => ({
  organizationId: req.params.organizationId || req.body.organization || req.query.organization,
  workspaceId: req.params.workspaceId || req.body.workspace || req.query.workspace,
  projectId: req.params.projectId || req.params.idProject || req.body.project || req.query.project,
  documentId: req.params.documentId || (req.baseUrl.includes("/documents") ? req.params.id : null),
  issueId: req.params.issueId || (req.baseUrl.includes("/issues") ? req.params.id : null),
  boardId: req.params.taskId || (req.baseUrl.includes("/tasks") ? req.params.id : null),
});

const requirePermission = (action, resourceType, contextResolver = contextFromRequest) => async (req, res, next) => {
  try {
    const context = typeof contextResolver === "function" ? contextResolver(req) : contextResolver;
    const result = await rbac.can(req.user, action, resourceType, context);

    if (!result.allowed) {
      return res.status(403).json({
        success: false,
        message: `Missing permission: ${action} ${resourceType}`,
        role: result.role,
      });
    }

    req.ability = result.ability;
    req.effectiveRole = result.role;
    req.permissionContext = context;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  contextFromRequest,
  requirePermission,
};
