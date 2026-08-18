const express = require("express");
const searchRouter = express.Router();
const notifRouter = express.Router();
const { authenticate } = require("../middleware/auth");
const { searchLimiter } = require("../middleware/rateLimiter");
const searchCtrl = require("../controllers/searchController");
const notifCtrl = require("../controllers/notificationController");

searchRouter.use(authenticate, searchLimiter);
searchRouter.get("/", searchCtrl.search);
exports.searchRoutes = searchRouter;

notifRouter.use(authenticate);
notifRouter.get("/", notifCtrl.getNotifications);
notifRouter.patch("/read-all", notifCtrl.markAllRead);
notifRouter.patch("/:id/read", notifCtrl.markRead);
notifRouter.delete("/:id", notifCtrl.deleteNotification);
exports.notificationRoutes = notifRouter;
