const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Session = require("../models/Session");
const Message = require("../models/Message");
const Channel = require("../models/Channel");
const logger = require("../config/logger");
const { setCache } = require("../config/redis");

const socketAuth = async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(" ")[1];

    if (!token) return next(new Error("Authentication required"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.sid) {
      const session = await Session.findOne({
        _id: decoded.sid,
        user: decoded.id,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      }).lean();
      if (!session) return next(new Error("Session expired or revoked"));
    }

    const user = await User.findById(decoded.id).lean();
    if (!user) return next(new Error("User not found"));

    socket.user = user;
    next();
  } catch (err) {
    next(new Error("Invalid token"));
  }
};

const initSocketHandlers = (io) => {

  io.use(socketAuth);

  io.on("connection", async (socket) => {
    const user = socket.user;
    logger.info(`🔌 Socket connected: ${user.name} (${socket.id})`);

    await User.findByIdAndUpdate(user._id, { isOnline: true, lastSeen: new Date() });
    socket.broadcast.emit("user:online", { userId: user._id, name: user.name });

    socket.on("project:join", (projectId) => {
      socket.join(`project:${projectId}`);
      logger.debug(`${user.name} joined project room: ${projectId}`);
    });

    socket.on("project:leave", (projectId) => {
      socket.leave(`project:${projectId}`);
    });

    socket.on("doc:join", async ({ docId }) => {
      socket.join(`doc:${docId}`);
      socket.to(`doc:${docId}`).emit("doc:user_joined", {
        docId,
        user: { _id: user._id, name: user.name, avatar: user.avatar },
      });
      logger.debug(`${user.name} joined doc room: ${docId}`);
    });

    socket.on("doc:leave", ({ docId }) => {
      socket.leave(`doc:${docId}`);
      socket.to(`doc:${docId}`).emit("doc:user_left", { docId, userId: user._id });
    });

    socket.on("doc:change", ({ docId, delta, version }) => {
      socket.to(`doc:${docId}`).emit("doc:patch", {
        docId, delta, version,
        author: { _id: user._id, name: user.name, avatar: user.avatar },
        timestamp: Date.now(),
      });
    });

    socket.on("doc:cursor", ({ docId, position, selection }) => {
      socket.to(`doc:${docId}`).emit("doc:cursor", {
        docId, userId: user._id, name: user.name, avatar: user.avatar, position, selection,
      });
    });

    socket.on("doc:typing", ({ docId, isTyping }) => {
      socket.to(`doc:${docId}`).emit("doc:typing", { docId, userId: user._id, name: user.name, isTyping });
    });

    socket.on("task:join_board", (projectId) => {
      socket.join(`board:${projectId}`);
    });

    socket.on("task:move", ({ taskId, fromStatus, toStatus, order, projectId }) => {
      socket.to(`board:${projectId}`).emit("task:moved", {
        taskId, fromStatus, toStatus, order,
        movedBy: { _id: user._id, name: user.name },
      });
    });

    socket.on("issue:join", (issueId) => socket.join(`issue:${issueId}`));
    socket.on("issue:leave", (issueId) => socket.leave(`issue:${issueId}`));

    socket.on("issue:typing", ({ issueId, isTyping }) => {
      socket.to(`issue:${issueId}`).emit("issue:typing", { issueId, userId: user._id, name: user.name, isTyping });
    });

    socket.join(`user:${user._id}`);

    socket.on("user:presence", ({ projectId, status }) => {
      socket.to(`project:${projectId}`).emit("user:presence", {
        userId: user._id, name: user.name, avatar: user.avatar, status, projectId,
      });
    });

    socket.on("chat:join_channel", async (channelId) => {
      socket.join(`channel:${channelId}`);
      logger.debug(`${user.name} joined channel: ${channelId}`);
    });

    socket.on("chat:leave_channel", (channelId) => {
      socket.leave(`channel:${channelId}`);
    });

    socket.on("chat:message", async ({ channelId, content, type = "text", language, replyTo }) => {
      try {
        if (!channelId || !content) return;

        const message = await Message.create({
          channel: channelId,
          sender: user._id,
          content: content.trim(),
          type,
          language: language || null,
          replyTo: replyTo || null,
        });

        await message.populate("sender", "name avatar");
        if (message.replyTo) await message.populate("replyTo", "content sender");

        await Channel.findByIdAndUpdate(channelId, {
          lastMessage: { content: content.slice(0, 100), sender: user._id, sentAt: new Date() },
          updatedAt: new Date(),
        });

        io.to(`channel:${channelId}`).emit("chat:message", message);
      } catch (err) {
        logger.error(`[chat] Message save error: ${err.message}`);
        socket.emit("chat:error", { message: "Failed to send message" });
      }
    });

    socket.on("chat:typing", ({ channelId, isTyping }) => {
      socket.to(`channel:${channelId}`).emit("chat:typing", {
        channelId, userId: user._id, name: user.name, isTyping,
      });
    });

    socket.on("chat:react", ({ messageId, channelId, emoji }) => {
      socket.to(`channel:${channelId}`).emit("chat:react", {
        messageId, emoji, userId: user._id,
      });
    });

    socket.on("chat:delete", ({ messageId, channelId }) => {
      socket.to(`channel:${channelId}`).emit("chat:deleted", { messageId });
    });

    socket.on("chat:edit", ({ messageId, channelId, content }) => {
      socket.to(`channel:${channelId}`).emit("chat:edited", { messageId, content, editedAt: new Date() });
    });

    socket.on("video:join_room", ({ roomId }) => {
      socket.join(`video:${roomId}`);

      socket.to(`video:${roomId}`).emit("video:user_joined", {
        socketId: socket.id,
        userId: user._id,
        name: user.name,
        avatar: user.avatar,
      });
      logger.info(`[video] ${user.name} joined room ${roomId}`);
    });

    socket.on("video:offer", ({ to, offer, roomId }) => {
      socket.to(to).emit("video:offer", {
        from: socket.id,
        userId: user._id,
        name: user.name,
        offer,
        roomId,
      });
    });

    socket.on("video:answer", ({ to, answer, roomId }) => {
      socket.to(to).emit("video:answer", {
        from: socket.id,
        answer,
        roomId,
      });
    });

    socket.on("video:ice_candidate", ({ to, candidate }) => {
      socket.to(to).emit("video:ice_candidate", {
        from: socket.id,
        candidate,
      });
    });

    socket.on("video:leave_room", ({ roomId }) => {
      socket.to(`video:${roomId}`).emit("video:user_left", {
        socketId: socket.id,
        userId: user._id,
        name: user.name,
      });
      socket.leave(`video:${roomId}`);
      logger.info(`[video] ${user.name} left room ${roomId}`);
    });

    socket.on("video:media_state", ({ roomId, isMuted, isCamOn }) => {
      socket.to(`video:${roomId}`).emit("video:media_state", {
        socketId: socket.id,
        userId: user._id,
        isMuted,
        isCamOn,
      });
    });

    socket.on("disconnect", async () => {
      logger.info(`🔌 Socket disconnected: ${user.name} (${socket.id})`);

      await User.findByIdAndUpdate(user._id, { isOnline: false, lastSeen: new Date() });

      socket.broadcast.emit("user:offline", {
        userId: user._id, name: user.name, lastSeen: new Date(),
      });

      socket.rooms.forEach((room) => {
        if (room.startsWith("video:")) {
          const roomId = room.replace("video:", "");
          socket.to(room).emit("video:user_left", {
            socketId: socket.id,
            userId: user._id,
            name: user.name,
          });
        }
      });
    });
  });

  io.sendNotification = (userId, notification) => {
    io.to(`user:${userId}`).emit("notification:new", notification);
  };

  logger.info("✅ Socket.io handlers initialized");
};

module.exports = { initSocketHandlers };
