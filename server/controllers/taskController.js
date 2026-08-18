const Task = require("../models/Task");
const Activity = require("../models/Activity");
const Notification = require("../models/Notification");
const { deleteCachePattern } = require("../config/redis");
const searchIndex = require("../services/searchIndexService");

exports.getTasks = async (req, res, next) => {
  try {
    const { project, status, assignee, priority, sprint, page = 1, limit = 100 } = req.query;
    const filter = {};

    if (project) filter.project = project;
    if (status) filter.status = status;
    if (assignee) filter.assignees = assignee;
    if (priority) filter.priority = priority;
    if (sprint) filter.sprint = sprint;

    const tasks = await Task.find(filter)
      .populate("author", "name avatar")
      .populate("assignees", "name avatar email")
      .sort({ status: 1, order: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    res.json({ success: true, data: tasks });
  } catch (err) {
    next(err);
  }
};

exports.createTask = async (req, res, next) => {
  try {
    const { project, title, description, status, priority, assignees, dueDate, labels, sprint } = req.body;

    const maxOrder = await Task.findOne({ project, status: status || "todo" })
      .sort({ order: -1 })
      .lean();

    const task = await Task.create({
      project,
      title,
      description,
      status: status || "todo",
      priority: priority || "none",
      assignees: assignees || [],
      dueDate,
      labels,
      sprint,
      author: req.user._id,
      order: maxOrder ? maxOrder.order + 1 : 0,
    });

    await Activity.create({
      actor: req.user._id,
      project,
      action: "created_task",
      entityType: "Task",
      entityId: task._id,
      entityTitle: task.title,
    });

    if (assignees?.length) {
      for (const userId of assignees) {
        if (userId.toString() !== req.user._id.toString()) {
          await Notification.create({
            recipient: userId,
            actor: req.user._id,
            type: "task_assigned",
            title: "You were assigned a task",
            message: `${req.user.name} assigned you: "${title}"`,
            entityType: "Task",
            entityId: task._id,
            link: `/projects/${project}/board?task=${task._id}`,
          });
        }
      }
    }

    const populated = await task.populate([
      { path: "author", select: "name avatar" },
      { path: "assignees", select: "name avatar email" },
    ]);

    const io = req.app.get("io");
    io?.to(`project:${project}`).emit("task:created", populated);
    searchIndex.indexTask(task._id).catch(() => {});

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

exports.getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("author", "name avatar")
      .populate("assignees", "name avatar email")
      .populate("comments.author", "name avatar")
      .populate("linkedIssues", "number title state")
      .populate("linkedDocuments", "title icon");

    if (!task) return res.status(404).json({ success: false, message: "Task not found" });
    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

exports.updateTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    const prevStatus = task.status;
    const updates = req.body;

    if (updates.status === "done" && prevStatus !== "done") {
      updates.completedAt = new Date();
    } else if (updates.status && updates.status !== "done") {
      updates.completedAt = null;
    }

    Object.assign(task, updates);
    await task.save();

    await deleteCachePattern(`cache:*:*${task.project}*`);

    if (updates.status && updates.status !== prevStatus) {
      await Activity.create({
        actor: req.user._id,
        project: task.project,
        action: "moved_task",
        entityType: "Task",
        entityId: task._id,
        entityTitle: task.title,
        meta: { from: prevStatus, to: updates.status },
      });
    }

    const populated = await task.populate([
      { path: "author", select: "name avatar" },
      { path: "assignees", select: "name avatar email" },
    ]);

    const io = req.app.get("io");
    io?.to(`project:${task.project}`).emit("task:updated", populated);
    searchIndex.indexTask(task._id).catch(() => {});

    res.json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

exports.reorderTasks = async (req, res, next) => {
  try {
    const { updates } = req.body;

    const ops = updates.map(({ id, status, order }) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { status, order } },
      },
    }));

    await Task.bulkWrite(ops);

    const io = req.app.get("io");
    io?.to(`project:${req.body.project}`).emit("task:reordered", { updates });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: "Not found" });

    const io = req.app.get("io");
    io?.to(`project:${task.project}`).emit("task:deleted", { taskId: task._id });
    searchIndex.deleteSearchDocuments([`board:${task._id}`]).catch(() => {});

    res.json({ success: true, message: "Task deleted" });
  } catch (err) {
    next(err);
  }
};

exports.addComment = async (req, res, next) => {
  try {
    const { content } = req.body;
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $push: { comments: { author: req.user._id, content } } },
      { new: true }
    ).populate("comments.author", "name avatar");

    const newComment = task.comments.at(-1);

    const io = req.app.get("io");
    io?.to(`project:${task.project}`).emit("task:comment", { taskId: task._id, comment: newComment });
    searchIndex.indexTask(task._id).catch(() => {});

    res.status(201).json({ success: true, data: newComment });
  } catch (err) {
    next(err);
  }
};
