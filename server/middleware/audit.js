const AuditLog = require("../models/AuditLog");
const logger = require("../config/logger");
const { getRequestIp } = require("../services/authTokens");

const getDeviceName = (userAgent = "") => {
  if (/mobile|android|iphone|ipad/i.test(userAgent)) return "Mobile browser";
  if (/windows/i.test(userAgent)) return "Windows browser";
  if (/macintosh|mac os/i.test(userAgent)) return "macOS browser";
  if (/linux/i.test(userAgent)) return "Linux browser";
  return userAgent ? "Browser session" : "Unknown device";
};

const recordAudit = async ({
  req,
  userId,
  action,
  status = "success",
  targetType = null,
  targetId = null,
  metadata = {},
}) => {
  try {
    await AuditLog.create({
      actor: userId || req?.user?._id || null,
      action,
      status,
      targetType,
      targetId,
      ip: req ? getRequestIp(req) : null,
      device: getDeviceName(req?.get?.("user-agent") || ""),
      userAgent: req?.get?.("user-agent") || null,
      method: req?.method || null,
      path: req?.originalUrl || req?.path || null,
      requestId: req?.id || req?.headers?.["x-request-id"] || null,
      metadata,
    });
  } catch (err) {
    logger.warn(`Audit log write failed: ${err.message}`);
  }
};

const inferSensitiveAction = (req) => {
  const path = req.originalUrl || req.path || "";
  if (req.method === "DELETE") return "delete";
  if (/\/export\b/i.test(path)) return "export";
  if (/\/members\b|permission|role/i.test(path) && ["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) {
    return "permission_change";
  }
  return null;
};

const auditSensitiveRoutes = (req, res, next) => {
  res.on("finish", () => {
    if (res.statusCode >= 400) return;

    const action = inferSensitiveAction(req);
    if (!action) return;

    recordAudit({
      req,
      action,
      targetType: req.baseUrl?.split("/").pop() || null,
      targetId: req.params?.id || req.params?.userId || null,
      metadata: {
        statusCode: res.statusCode,
      },
    });
  });

  next();
};

module.exports = {
  auditSensitiveRoutes,
  recordAudit,
};
