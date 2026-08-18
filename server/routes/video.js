const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const videoCtrl = require("../controllers/videoController");

router.use(authenticate);

router.post("/rooms", videoCtrl.createRoom);
router.get("/rooms", videoCtrl.getRooms);
router.get("/rooms/:roomId", videoCtrl.getRoom);
router.post("/rooms/:roomId/join", videoCtrl.joinRoom);
router.delete("/rooms/:roomId", videoCtrl.endRoom);

module.exports = router;
