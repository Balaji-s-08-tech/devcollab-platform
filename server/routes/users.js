const express = require("express");
const r = express.Router();
const { authenticate } = require("../middleware/auth");
const User = require("../models/User");

r.use(authenticate);

r.get("/:id", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

module.exports = r;
