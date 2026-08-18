const Channel = require("../models/Channel");
const Message = require("../models/Message");
const logger = require("../config/logger");

exports.getChannels = async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const userId = req.user._id;

    const channels = await Channel.find({
      isArchived: false,
      $or: [

        { project: projectId, type: "public" },

        { members: userId, type: { $in: ["private", "dm"] } },
      ],
    })
      .populate("members", "name avatar isOnline")
      .populate("lastMessage.sender", "name")
      .sort({ updatedAt: -1 });

    res.json({ success: true, channels });
  } catch (err) {
    next(err);
  }
};

exports.createChannel = async (req, res, next) => {
  try {
    const { name, description, type = "public", projectId, memberIds = [] } = req.body;

    if (!name) return res.status(400).json({ success: false, message: "Channel name is required" });

    if (type === "dm") {
      const existing = await Channel.findOne({
        type: "dm",
        members: { $size: 2, $all: [req.user._id, ...memberIds] },
      });
      if (existing) return res.json({ success: true, channel: existing });
    }

    const members = [...new Set([String(req.user._id), ...memberIds])];
    const channel = await Channel.create({
      name,
      description,
      type,
      project: projectId || null,
      members,
      createdBy: req.user._id,
    });

    await channel.populate("members", "name avatar isOnline");

    logger.info(`[chat] Channel created: ${name} (${type})`);
    res.status(201).json({ success: true, channel });
  } catch (err) {
    next(err);
  }
};

exports.updateChannel = async (req, res, next) => {
  try {
    const { name, description, isArchived } = req.body;
    const channel = await Channel.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { $set: { name, description, isArchived } },
      { new: true }
    );
    if (!channel) return res.status(404).json({ success: false, message: "Channel not found or unauthorized" });
    res.json({ success: true, channel });
  } catch (err) {
    next(err);
  }
};

exports.addMember = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const channel = await Channel.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { members: userId } },
      { new: true }
    ).populate("members", "name avatar isOnline");
    if (!channel) return res.status(404).json({ success: false, message: "Channel not found" });
    res.json({ success: true, channel });
  } catch (err) {
    next(err);
  }
};

exports.getMessages = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const { limit = 50, before } = req.query;

    const channel = await Channel.findOne({
      _id: channelId,
      $or: [{ type: "public" }, { members: req.user._id }],
    });
    if (!channel) return res.status(404).json({ success: false, message: "Channel not found" });

    const query = { channel: channelId, deletedAt: null };
    if (before) query._id = { $lt: before };

    const messages = await Message.find(query)
      .populate("sender", "name avatar")
      .populate("replyTo", "content sender")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ success: true, messages: messages.reverse() });
  } catch (err) {
    next(err);
  }
};

exports.deleteMessage = async (req, res, next) => {
  try {
    const message = await Message.findOneAndUpdate(
      { _id: req.params.id, sender: req.user._id, deletedAt: null },
      { $set: { deletedAt: new Date(), deletedBy: req.user._id, content: "[deleted]" } },
      { new: true }
    );
    if (!message) return res.status(404).json({ success: false, message: "Message not found or unauthorized" });
    res.json({ success: true, message });
  } catch (err) {
    next(err);
  }
};

exports.editMessage = async (req, res, next) => {
  try {
    const { content } = req.body;
    const original = await Message.findOne({ _id: req.params.id, sender: req.user._id, deletedAt: null });
    if (!original) return res.status(404).json({ success: false, message: "Message not found or unauthorized" });

    original.editHistory.push({ content: original.content, editedAt: new Date() });
    original.content = content;
    original.editedAt = new Date();
    await original.save();

    res.json({ success: true, message: original });
  } catch (err) {
    next(err);
  }
};

exports.reactToMessage = async (req, res, next) => {
  try {
    const { emoji } = req.body;
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ success: false, message: "Message not found" });

    const existing = message.reactions.find((r) => r.emoji === emoji);
    if (existing) {
      const userIdx = existing.users.indexOf(String(req.user._id));
      if (userIdx > -1) {
        existing.users.splice(userIdx, 1);
        if (existing.users.length === 0) {
          message.reactions = message.reactions.filter((r) => r.emoji !== emoji);
        }
      } else {
        existing.users.push(req.user._id);
      }
    } else {
      message.reactions.push({ emoji, users: [req.user._id] });
    }

    await message.save();
    res.json({ success: true, reactions: message.reactions });
  } catch (err) {
    next(err);
  }
};

exports.createDM = async (req, res, next) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ success: false, message: "targetUserId required" });

    const members = [req.user._id, targetUserId];
    const dmName = `dm-${[String(req.user._id), targetUserId].sort().join("-")}`;

    let channel = await Channel.findOne({ type: "dm", name: dmName });
    if (!channel) {
      channel = await Channel.create({
        name: dmName,
        type: "dm",
        members,
        createdBy: req.user._id,
        project: null,
      });
    }

    await channel.populate("members", "name avatar isOnline");
    res.json({ success: true, channel });
  } catch (err) {
    next(err);
  }
};
