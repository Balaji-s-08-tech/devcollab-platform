import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

let socket = null;

export const initSocket = (token) => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  socket.on("connect", () => {
    console.log("🔌 Socket connected:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("🔌 Socket disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("Socket error:", err.message);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinProject = (projectId) => socket?.emit("project:join", projectId);
export const leaveProject = (projectId) => socket?.emit("project:leave", projectId);

export const joinDocument = (docId) => socket?.emit("doc:join", { docId });
export const leaveDocument = (docId) => socket?.emit("doc:leave", { docId });
export const sendDocChange = (docId, delta, version) =>
  socket?.emit("doc:change", { docId, delta, version });
export const sendDocCursor = (docId, position, selection) =>
  socket?.emit("doc:cursor", { docId, position, selection });
export const sendDocTyping = (docId, isTyping) =>
  socket?.emit("doc:typing", { docId, isTyping });

export const joinBoard = (projectId) => socket?.emit("task:join_board", projectId);
export const emitTaskMove = (data) => socket?.emit("task:move", data);

export const joinIssue = (issueId) => socket?.emit("issue:join", issueId);
export const leaveIssue = (issueId) => socket?.emit("issue:leave", issueId);
export const sendIssueTyping = (issueId, isTyping) =>
  socket?.emit("issue:typing", { issueId, isTyping });

export const sendPresence = (projectId, status) =>
  socket?.emit("user:presence", { projectId, status });
