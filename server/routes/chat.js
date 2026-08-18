const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const chatCtrl = require("../controllers/chatController");

router.use(authenticate);

router.get("/channels", chatCtrl.getChannels);
router.post("/channels", chatCtrl.createChannel);
router.patch("/channels/:id", chatCtrl.updateChannel);
router.post("/channels/:id/members", chatCtrl.addMember);

router.get("/channels/:channelId/messages", chatCtrl.getMessages);

router.patch("/messages/:id", chatCtrl.editMessage);
router.delete("/messages/:id", chatCtrl.deleteMessage);
router.post("/messages/:id/react", chatCtrl.reactToMessage);

router.post("/dm", chatCtrl.createDM);

module.exports = router;
