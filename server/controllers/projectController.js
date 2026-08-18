const Project = require("../models/Project");
const Activity = require("../models/Activity");
const { deleteCache, deleteCachePattern } = require("../config/redis");
const PermissionGrant = require("../models/PermissionGrant");

exports.getProjects = async (req, res, next) => {
  try {
    const directProjectGrants = await PermissionGrant.find({
      user: req.user._id,
      resourceType: "project",
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    }).select("resource").lean();

    const projects = await Project.find({
      $or: [
        { owner: req.user._id },
        { "members.user": req.user._id },
        { _id: { $in: directProjectGrants.map((g) => g.resource) } },
      ],
      status: { $ne: "archived" },
    })
      .populate("owner", "name avatar email")
      .populate("members.user", "name avatar email")
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ success: true, data: projects });
  } catch (err) {
    next(err);
  }
};

exports.createProject = async (req, res, next) => {
  try {
    const { name, description, icon, color, visibility, tags, githubRepo, workspace, organization } = req.body;

    const project = await Project.create({
      name,
      description,
      icon,
      color,
      visibility,
      tags,
      githubRepo,
      workspace: workspace || null,
      organization: organization || null,
      owner: req.user._id,
      members: [{ user: req.user._id, role: "owner" }],
    });

    await Activity.create({
      actor: req.user._id,
      project: project._id,
      action: "created_project",
      entityType: "Project",
      entityId: project._id,
      entityTitle: project.name,
    });

    const populated = await project.populate("owner", "name avatar email");

    const io = req.app.get("io");
    io?.emit("project:created", populated);

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

exports.getProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("owner", "name avatar email")
      .populate("members.user", "name avatar email isOnline lastSeen")
      .lean();

    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    res.json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

exports.updateProject = async (req, res, next) => {
  try {
    const { name, description, icon, color, status, visibility, tags, githubRepo, settings } = req.body;

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { $set: { name, description, icon, color, status, visibility, tags, githubRepo, settings } },
      { new: true, runValidators: true }
    ).populate("owner members.user");

    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    await deleteCachePattern(`cache:*:*${req.params.id}*`);

    const io = req.app.get("io");
    io?.to(`project:${project._id}`).emit("project:updated", project);

    res.json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

exports.deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: "Not found" });

    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Only the owner can delete this project" });
    }

    await project.deleteOne();
    await deleteCachePattern(`cache:*:*${req.params.id}*`);

    res.json({ success: true, message: "Project deleted" });
  } catch (err) {
    next(err);
  }
};

exports.addMember = async (req, res, next) => {
  try {
    const { userId, role = "developer" } = req.body;

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    const alreadyMember = project.members.some((m) => m.user.toString() === userId);
    if (alreadyMember) {
      return res.status(409).json({ success: false, message: "User is already a member" });
    }

    project.members.push({ user: userId, role });
    await project.save();

    const populated = await project.populate("members.user", "name avatar email");

    const io = req.app.get("io");
    io?.to(`project:${project._id}`).emit("project:member_added", {
      projectId: project._id,
      member: populated.members.at(-1),
    });

    res.json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

exports.removeMember = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: "Not found" });

    project.members = project.members.filter(
      (m) => m.user.toString() !== req.params.userId
    );
    await project.save();

    const io = req.app.get("io");
    io?.to(`project:${project._id}`).emit("project:member_removed", {
      projectId: project._id,
      userId: req.params.userId,
    });

    res.json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

exports.getActivity = async (req, res, next) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const activities = await Activity.find({ project: req.params.id })
      .populate("actor", "name avatar")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    res.json({ success: true, data: activities });
  } catch (err) {
    next(err);
  }
};
