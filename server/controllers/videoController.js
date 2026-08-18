const { randomUUID } = require("crypto");
const { setCache, getCache, deleteCache } = require("../config/redis");
const logger = require("../config/logger");

const ROOM_TTL = 60 * 60 * 24;
const ROOM_PREFIX = "video:room:";

exports.createRoom = async (req, res, next) => {
  try {
    const { name, projectId } = req.body;
    const roomId = randomUUID();
    const userId = req.user._id;

    const room = {
      id: roomId,
      name: name || `Room ${roomId.slice(0, 6)}`,
      projectId: projectId || null,
      createdBy: { _id: userId, name: req.user.name, avatar: req.user.avatar },
      participants: [{ _id: userId, name: req.user.name, avatar: req.user.avatar }],
      createdAt: new Date().toISOString(),
    };

    await setCache(`${ROOM_PREFIX}${roomId}`, JSON.stringify(room), ROOM_TTL);

    logger.info(`[video] Room created: ${roomId} by ${req.user.name}`);
    res.status(201).json({ success: true, room });
  } catch (err) {
    next(err);
  }
};

exports.getRooms = async (req, res, next) => {
  try {
    const { projectId } = req.query;

    const setKey = `video:project:${projectId}:rooms`;
    const roomIds = await getCache(setKey);
    if (!roomIds) return res.json({ success: true, rooms: [] });

    const ids = JSON.parse(roomIds);
    const rooms = [];
    for (const id of ids) {
      const roomJson = await getCache(`${ROOM_PREFIX}${id}`);
      if (roomJson) rooms.push(JSON.parse(roomJson));
    }

    res.json({ success: true, rooms });
  } catch (err) {
    next(err);
  }
};

exports.getRoom = async (req, res, next) => {
  try {
    const roomJson = await getCache(`${ROOM_PREFIX}${req.params.roomId}`);
    if (!roomJson) return res.status(404).json({ success: false, message: "Room not found or expired" });

    res.json({ success: true, room: JSON.parse(roomJson) });
  } catch (err) {
    next(err);
  }
};

exports.joinRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const roomJson = await getCache(`${ROOM_PREFIX}${roomId}`);
    if (!roomJson) return res.status(404).json({ success: false, message: "Room not found or expired" });

    const room = JSON.parse(roomJson);
    const userId = String(req.user._id);

    if (!room.participants.find((p) => String(p._id) === userId)) {
      room.participants.push({ _id: userId, name: req.user.name, avatar: req.user.avatar });
      await setCache(`${ROOM_PREFIX}${roomId}`, JSON.stringify(room), ROOM_TTL);
    }

    res.json({ success: true, room });
  } catch (err) {
    next(err);
  }
};

exports.endRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    await deleteCache(`${ROOM_PREFIX}${roomId}`);
    logger.info(`[video] Room ended: ${roomId}`);
    res.json({ success: true, message: "Room ended" });
  } catch (err) {
    next(err);
  }
};
