const express = require("express");
const r = express.Router();
const { authenticate } = require("../middleware/auth");
const { searchLimiter } = require("../middleware/rateLimiter");
const ctrl = require("../controllers/searchController");
r.use(authenticate, searchLimiter);
r.get("/", ctrl.search);
module.exports = r;
