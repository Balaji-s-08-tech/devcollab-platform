const express = require("express");
const r = express.Router();
const { authenticate } = require("../middleware/auth");
const User = require("../models/User");

r.use(authenticate);

r.get("/users", async (req, res, next) => {
  try {
    const { q } = req.query;
    const regex = new RegExp(q, "i");
    const users = await User.find({
      $or: [{ name: regex }, { email: regex }],
      _id: { $ne: req.user._id },
    })
      .select("name email avatar isOnline lastSeen")
      .limit(10)
      .lean();
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
});

module.exports = r;
