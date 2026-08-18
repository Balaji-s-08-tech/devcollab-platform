const Notification = require("../models/Notification");

exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unread } = req.query;
    const filter = { recipient: req.user._id };
    if (unread === "true") filter.isRead = false;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter)
        .populate("actor", "name avatar")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(+limit)
        .lean(),
      Notification.countDocuments({ recipient: req.user._id, isRead: false }),
    ]);

    res.json({ success: true, data: notifications, unreadCount });
  } catch (err) {
    next(err);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
