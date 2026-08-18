const Document = require("../models/Document");
const Activity = require("../models/Activity");
const Project = require("../models/Project");
const { deleteCachePattern } = require("../config/redis");
const searchIndex = require("../services/searchIndexService");

exports.getDocuments = async (req, res, next) => {
  try {
    const { project, parent = null, archived = false } = req.query;
    const filter = { project, isArchived: archived === "true", parent };

    const docs = await Document.find(filter)
      .populate("author", "name avatar")
      .populate("lastEditedBy", "name avatar")
      .select("-content -contentText -activeEditors -comments")
      .sort({ isPinned: -1, order: 1, updatedAt: -1 })
      .lean();

    res.json({ success: true, data: docs });
  } catch (err) {
    next(err);
  }
};

exports.createDocument = async (req, res, next) => {
  try {
    const { project, title, parent, icon, content } = req.body;

    const doc = await Document.create({
      project,
      title: title || "Untitled",
      parent: parent || null,
      icon: icon || "📄",
      content: content || { type: "doc", content: [{ type: "paragraph" }] },
      author: req.user._id,
      lastEditedBy: req.user._id,
    });

    await Project.findByIdAndUpdate(project, { $inc: { "stats.documents": 1 } });

    await Activity.create({
      actor: req.user._id,
      project,
      action: "created_document",
      entityType: "Document",
      entityId: doc._id,
      entityTitle: doc.title,
    });

    const io = req.app.get("io");
    io?.to(`project:${project}`).emit("doc:created", doc);
    searchIndex.indexDocument(doc._id).catch(() => {});

    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};

exports.getDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id)
      .populate("author", "name avatar email")
      .populate("lastEditedBy", "name avatar")
      .populate("comments.author", "name avatar")
      .populate("activeEditors.user", "name avatar isOnline");

    if (!doc) return res.status(404).json({ success: false, message: "Document not found" });
    if (doc.isArchived) {
      return res.status(410).json({ success: false, message: "Document is archived" });
    }

    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};

exports.updateDocument = async (req, res, next) => {
  try {
    const { title, content, contentText, icon, coverImage, tags, isPinned, isPublished } = req.body;

    const doc = await Document.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          ...(title !== undefined && { title }),
          ...(content !== undefined && { content }),
          ...(contentText !== undefined && { contentText }),
          ...(icon !== undefined && { icon }),
          ...(coverImage !== undefined && { coverImage }),
          ...(tags !== undefined && { tags }),
          ...(isPinned !== undefined && { isPinned }),
          ...(isPublished !== undefined && { isPublished }),
          lastEditedBy: req.user._id,
          lastEditedAt: new Date(),
          $inc: { version: 1 },
        },
      },
      { new: true }
    ).populate("lastEditedBy", "name avatar");

    if (!doc) return res.status(404).json({ success: false, message: "Document not found" });

    await deleteCachePattern(`cache:*:*${req.params.id}*`);

    const io = req.app.get("io");
    io?.to(`doc:${doc._id}`).emit("doc:update", {
      docId: doc._id,
      title: doc.title,
      content: doc.content,
      version: doc.version,
      lastEditedBy: doc.lastEditedBy,
      lastEditedAt: doc.lastEditedAt,
    });
    searchIndex.indexDocument(doc._id).catch(() => {});

    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};

exports.archiveDocument = async (req, res, next) => {
  try {
    const doc = await Document.findByIdAndUpdate(
      req.params.id,
      { isArchived: true },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });

    const io = req.app.get("io");
    io?.to(`project:${doc.project}`).emit("doc:archived", { docId: doc._id });
    searchIndex.indexDocument(doc._id).catch(() => {});

    res.json({ success: true, message: "Document archived" });
  } catch (err) {
    next(err);
  }
};

exports.addComment = async (req, res, next) => {
  try {
    const { content } = req.body;
    const doc = await Document.findByIdAndUpdate(
      req.params.id,
      { $push: { comments: { author: req.user._id, content } } },
      { new: true }
    ).populate("comments.author", "name avatar");

    const newComment = doc.comments.at(-1);

    const io = req.app.get("io");
    io?.to(`doc:${doc._id}`).emit("doc:comment", { docId: doc._id, comment: newComment });
    searchIndex.indexDocument(doc._id).catch(() => {});

    res.status(201).json({ success: true, data: newComment });
  } catch (err) {
    next(err);
  }
};
