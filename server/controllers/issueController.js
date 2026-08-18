const Issue = require("../models/Issue");
const Activity = require("../models/Activity");
const Notification = require("../models/Notification");
const { deleteCachePattern } = require("../config/redis");
const searchIndex = require("../services/searchIndexService");

exports.getIssues = async (req, res, next) => {
  try {
    const { project, state, type, priority, assignee, label, page = 1, limit = 30 } = req.query;
    const filter = {};
    if (project) filter.project = project;
    if (state) filter.state = state;
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (assignee) filter.assignees = assignee;
    if (label) filter["labels.name"] = label;

    const total = await Issue.countDocuments(filter);
    const issues = await Issue.find(filter)
      .populate("author", "name avatar")
      .populate("assignees", "name avatar")
      .select("-comments -body")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: issues,
      meta: { total, page: +page, limit: +limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

exports.createIssue = async (req, res, next) => {
  try {
    const { project, title, body, type, priority, assignees, labels, dueDate, milestone } = req.body;

    const issue = await Issue.create({
      project,
      title,
      body,
      type: type || "other",
      priority: priority || "none",
      assignees: assignees || [],
      labels: labels || [],
      dueDate,
      milestone,
      author: req.user._id,
    });

    await Activity.create({
      actor: req.user._id,
      project,
      action: "created_issue",
      entityType: "Issue",
      entityId: issue._id,
      entityTitle: `#${issue.number} ${issue.title}`,
    });

    if (assignees?.length) {
      for (const userId of assignees) {
        if (userId.toString() !== req.user._id.toString()) {
          await Notification.create({
            recipient: userId,
            actor: req.user._id,
            type: "issue_assigned",
            title: "You were assigned an issue",
            message: `${req.user.name} assigned you: "#${issue.number} ${title}"`,
            entityType: "Issue",
            entityId: issue._id,
            link: `/projects/${project}/issues/${issue.number}`,
          });
        }
      }
    }

    const populated = await issue.populate([
      { path: "author", select: "name avatar" },
      { path: "assignees", select: "name avatar" },
    ]);

    const io = req.app.get("io");
    io?.to(`project:${project}`).emit("issue:created", populated);
    searchIndex.indexIssue(issue._id).catch(() => {});

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

exports.getIssue = async (req, res, next) => {
  try {
    const filter = req.params.id.match(/^\d+$/)
      ? { project: req.query.project, number: +req.params.id }
      : { _id: req.params.id };

    const issue = await Issue.findOne(filter)
      .populate("author", "name avatar email")
      .populate("assignees", "name avatar email")
      .populate("comments.author", "name avatar")
      .populate("linkedTasks", "title status priority")
      .populate("closedBy", "name avatar");

    if (!issue) return res.status(404).json({ success: false, message: "Issue not found" });
    res.json({ success: true, data: issue });
  } catch (err) {
    next(err);
  }
};

exports.updateIssue = async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: "Issue not found" });

    const prevState = issue.state;
    Object.assign(issue, req.body);

    if (req.body.state === "closed" && prevState !== "closed") {
      issue.closedAt = new Date();
      issue.closedBy = req.user._id;
    }
    if (req.body.state === "open") {
      issue.closedAt = null;
      issue.closedBy = null;
    }

    await issue.save();
    await deleteCachePattern(`cache:*:*${issue.project}*`);

    if (req.body.state && req.body.state !== prevState) {
      await Activity.create({
        actor: req.user._id,
        project: issue.project,
        action: req.body.state === "closed" ? "closed_issue" : "reopened_issue",
        entityType: "Issue",
        entityId: issue._id,
        entityTitle: `#${issue.number} ${issue.title}`,
      });
    }

    const populated = await issue.populate([
      { path: "author", select: "name avatar" },
      { path: "assignees", select: "name avatar" },
    ]);

    const io = req.app.get("io");
    io?.to(`project:${issue.project}`).emit("issue:updated", populated);
    searchIndex.indexIssue(issue._id).catch(() => {});

    res.json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

exports.addComment = async (req, res, next) => {
  try {
    const { content } = req.body;
    const issue = await Issue.findByIdAndUpdate(
      req.params.id,
      { $push: { comments: { author: req.user._id, content } } },
      { new: true }
    ).populate("comments.author", "name avatar");

    const newComment = issue.comments.at(-1);

    if (issue.author.toString() !== req.user._id.toString()) {
      await Notification.create({
        recipient: issue.author,
        actor: req.user._id,
        type: "issue_comment",
        title: "New comment on your issue",
        message: `${req.user.name} commented on #${issue.number}`,
        entityType: "Issue",
        entityId: issue._id,
        link: `/projects/${issue.project}/issues/${issue.number}`,
      });
    }

    const io = req.app.get("io");
    io?.to(`project:${issue.project}`).emit("issue:comment", { issueId: issue._id, comment: newComment });
    searchIndex.indexIssue(issue._id).catch(() => {});

    res.status(201).json({ success: true, data: newComment });
  } catch (err) {
    next(err);
  }
};

exports.deleteIssue = async (req, res, next) => {
  try {
    const issue = await Issue.findByIdAndDelete(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: "Not found" });

    const io = req.app.get("io");
    io?.to(`project:${issue.project}`).emit("issue:deleted", { issueId: issue._id });
    searchIndex.deleteSearchDocuments([`issue:${issue._id}`]).catch(() => {});

    res.json({ success: true, message: "Issue deleted" });
  } catch (err) {
    next(err);
  }
};
