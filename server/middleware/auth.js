const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Session = require("../models/Session");
const { getCache, setCache } = require("../config/redis");
const { authenticatedLimiter } = require("./rateLimiter");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.auth = decoded;

    if (decoded.sid) {
      const session = await Session.findOne({
        _id: decoded.sid,
        user: decoded.id,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      }).lean();

      if (!session) {
        return res.status(401).json({ success: false, message: "Session expired or revoked" });
      }

      req.session = session;
    }

    const cacheKey = `user:${decoded.id}`;
    let user = await getCache(cacheKey);

    if (!user) {
      user = await User.findById(decoded.id).lean();
      if (!user) {
        return res.status(401).json({ success: false, message: "User not found" });
      }
      await setCache(cacheKey, user, 300);
    }

    req.user = user;
    return authenticatedLimiter(req, res, next);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired" });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
    next(err);
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized for this action`,
      });
    }
    next();
  };
};

const requireProjectRole = (...roles) => {
  return async (req, res, next) => {
    try {
      const Project = require("../models/Project");
      const projectId = req.params.projectId || req.body.project || req.query.project;

      if (!projectId) return next();

      const project = await Project.findById(projectId).lean();
      if (!project) {
        return res.status(404).json({ success: false, message: "Project not found" });
      }

      if (project.owner.toString() === req.user._id.toString()) {
        req.projectRole = "owner";
        req.project = project;
        return next();
      }

      const member = project.members.find(
        (m) => m.user.toString() === req.user._id.toString()
      );

      if (!member) {
        return res.status(403).json({ success: false, message: "Not a project member" });
      }

      if (roles.length && !roles.includes(member.role)) {
        return res.status(403).json({
          success: false,
          message: `Project role '${member.role}' is not authorized`,
        });
      }

      req.projectRole = member.role;
      req.project = project;
      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = { authenticate, authorize, requireProjectRole };
