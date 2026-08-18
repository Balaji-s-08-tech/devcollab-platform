import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import useChatStore from "../context/chatStore";
import { getSocket } from "../services/socket";
import useAuthStore from "../context/authStore";
import toast from "react-hot-toast";
import { Hash, Lock, Plus, Send, Smile, Code, Trash2, MessageSquare, Users, Edit2 } from "lucide-react";

const EMOJIS = ["👍", "❤️", "😂", "🚀", "👀", "🎉", "🔥", "✅"];

function Avatar({ user, size = 32 }) {
  const initials = user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
  return user?.avatar ? (
    <img src={user.avatar} alt={user.name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: size * 0.38, fontWeight: 700, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function MessageBubble({ msg, currentUserId, onReact, onDelete }) {
  const [showActions, setShowActions] = useState(false);
  const isOwn = String(msg.sender?._id) === String(currentUserId);
  const isDeleted = !!msg.deletedAt;
  const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      className="msg-row"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Avatar user={msg.sender} size={34} />
      <div className="msg-content">
        <div className="msg-header">
          <span className="msg-author">{msg.sender?.name || "Unknown"}</span>
          <span className="msg-time">{time}{msg.editedAt && <em style={{ fontSize: "0.68rem", marginLeft: 4 }}>(edited)</em>}</span>
        </div>
        {msg.replyTo && (
          <div className="msg-reply">
            <span>↩</span>
            <span style={{ opacity: 0.7, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {msg.replyTo.content}
            </span>
          </div>
        )}
        {isDeleted ? (
          <span className="msg-deleted">This message was deleted</span>
        ) : msg.type === "code" ? (
          <pre className="msg-code"><code>{msg.content}</code></pre>
        ) : (
          <p className="msg-text">{msg.content}</p>
        )}
        {msg.reactions?.length > 0 && (
          <div className="msg-reactions">
            {msg.reactions.map((r) => (
              <button key={r.emoji} className="reaction-pill" onClick={() => onReact(msg._id, r.emoji)}>
                {r.emoji} <span>{r.users?.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {showActions && !isDeleted && (
        <div className="msg-actions">
          {EMOJIS.slice(0, 4).map((e) => (
            <button key={e} className="action-btn emoji-btn" onClick={() => onReact(msg._id, e)} title={e}>{e}</button>
          ))}
          {isOwn && (
            <button className="action-btn delete-btn" onClick={() => onDelete(msg._id)} title="Delete message">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CreateChannelModal({ onClose, onCreate, projectId }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("public");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onCreate({ name: name.trim(), description, type, projectId });
      onClose();
    } catch {  } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Create Channel</h3>
        <form onSubmit={handleSubmit}>
          <div className="modal-field">
            <label>Channel Name</label>
            <input className="modal-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. design, backend, general" autoFocus />
          </div>
          <div className="modal-field">
            <label>Description</label>
            <input className="modal-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's this channel for?" />
          </div>
          <div className="modal-field">
            <label>Type</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {["public", "private"].map((t) => (
                <button key={t} type="button" onClick={() => setType(t)}
                  style={{ flex: 1, padding: "0.5rem", borderRadius: 8, border: `1px solid ${type === t ? "#6366f1" : "var(--border)"}`, background: type === t ? "rgba(99,102,241,0.15)" : "transparent", color: type === t ? "#818cf8" : "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: "0.83rem", fontWeight: 600 }}>
                  {t === "public" ? <Hash size={14} /> : <Lock size={14} />} {t}
                </button>
              ))}
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Creating…" : "Create"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { projectId } = useParams();
  const user = useAuthStore((s) => s.user);
  const socket = getSocket();

  const {
    channels, activeChannelId, messages, typingUsers,
    fetchChannels, createChannel, setActiveChannel,
    fetchMessages, onMessage, onMessageDeleted, onMessageEdited, onReaction, setTyping,
  } = useChatStore();

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [messageType, setMessageType] = useState("text");
  const [codeLanguage, setCodeLanguage] = useState("javascript");
  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);

  const activeChannel = channels.find((c) => c._id === activeChannelId);
  const channelMessages = messages[activeChannelId] || [];
  const typers = Object.values(typingUsers[activeChannelId] || {});

  useEffect(() => {
    fetchChannels(projectId);
  }, [projectId]);

  useEffect(() => {
    if (!socket) return;

    socket.on("chat:message", onMessage);
    socket.on("chat:deleted", ({ messageId }) => onMessageDeleted(messageId));
    socket.on("chat:edited", onMessageEdited);
    socket.on("chat:react", onReaction);
    socket.on("chat:typing", setTyping);

    return () => {
      socket.off("chat:message", onMessage);
      socket.off("chat:deleted");
      socket.off("chat:edited");
      socket.off("chat:react");
      socket.off("chat:typing");
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [channelMessages]);

  const openChannel = useCallback(async (channelId) => {

    if (activeChannelId && socket) socket.emit("chat:leave_channel", activeChannelId);

    setActiveChannel(channelId);
    if (socket) socket.emit("chat:join_channel", channelId);
    await fetchMessages(channelId);
  }, [activeChannelId, socket, setActiveChannel, fetchMessages]);

  const sendMessage = () => {
    if (!input.trim() || !activeChannelId || !socket) return;
    socket.emit("chat:message", {
      channelId: activeChannelId,
      content: input.trim(),
      type: messageType,
      language: messageType === "code" ? codeLanguage : undefined,
    });
    setInput("");
    setIsTyping(false);
    if (socket) socket.emit("chat:typing", { channelId: activeChannelId, isTyping: false });
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      if (socket) socket.emit("chat:typing", { channelId: activeChannelId, isTyping: true });
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
      if (socket) socket.emit("chat:typing", { channelId: activeChannelId, isTyping: false });
    }, 2000);
  };

  const handleReact = (messageId, emoji) => {
    if (!socket) return;
    socket.emit("chat:react", { messageId, channelId: activeChannelId, emoji });
  };

  const handleDelete = (messageId) => {
    if (!socket) return;
    socket.emit("chat:delete", { messageId, channelId: activeChannelId });
    onMessageDeleted(messageId);
  };

  const publicChannels = channels.filter((c) => c.type === "public");
  const privateChannels = channels.filter((c) => c.type === "private");
  const dmChannels = channels.filter((c) => c.type === "dm");

  return (
    <div className="chat-page">
      <style>{`
        .chat-page { display: grid; grid-template-columns: 260px 1fr; height: 100%; background: var(--bg-primary); }
        .chat-sidebar { background: var(--bg-secondary); border-right: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; }
        .sidebar-brand { padding: 1.25rem 1rem; font-weight: 700; font-size: 0.95rem; color: var(--text-primary); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
        .sidebar-section { padding: 0.75rem 0.5rem 0.25rem; }
        .sidebar-label { font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; padding: 0 0.5rem; display: flex; align-items: center; justify-content: space-between; }
        .channel-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.45rem 0.75rem; border-radius: 8px; cursor: pointer; font-size: 0.87rem; color: var(--text-muted); transition: all 0.12s; }
        .channel-item:hover { background: var(--bg-tertiary); color: var(--text-primary); }
        .channel-item.active { background: rgba(99,102,241,0.15); color: #818cf8; font-weight: 600; }
        .channel-unread { margin-left: auto; background: #6366f1; color: #fff; border-radius: 10px; padding: 1px 6px; font-size: 0.68rem; font-weight: 700; }
        .chat-main { display: flex; flex-direction: column; overflow: hidden; }
        .chat-header { padding: 0.9rem 1.5rem; border-bottom: 1px solid var(--border); background: var(--bg-secondary); display: flex; align-items: center; gap: 0.75rem; }
        .chat-header-name { font-size: 1rem; font-weight: 700; color: var(--text-primary); }
        .chat-header-desc { font-size: 0.8rem; color: var(--text-muted); margin-left: 0.5rem; }
        .messages-area { flex: 1; overflow-y: auto; padding: 1rem 1.5rem; display: flex; flex-direction: column; gap: 0.15rem; }
        .msg-row { display: flex; gap: 0.75rem; padding: 0.4rem 0.5rem; border-radius: 8px; position: relative; transition: background 0.1s; }
        .msg-row:hover { background: var(--bg-secondary); }
        .msg-content { flex: 1; min-width: 0; }
        .msg-header { display: flex; align-items: baseline; gap: 0.5rem; margin-bottom: 2px; }
        .msg-author { font-size: 0.88rem; font-weight: 700; color: var(--text-primary); }
        .msg-time { font-size: 0.72rem; color: var(--text-muted); }
        .msg-text { font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5; word-break: break-word; }
        .msg-code { background: #0d0d14; border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem 1rem; font-size: 0.8rem; color: #a5f3fc; overflow-x: auto; margin-top: 4px; }
        .msg-deleted { font-size: 0.82rem; color: var(--text-muted); font-style: italic; }
        .msg-reply { display: flex; gap: 6px; align-items: center; font-size: 0.78rem; color: var(--text-muted); padding: 2px 8px; border-left: 2px solid #6366f1; margin-bottom: 4px; background: rgba(99,102,241,0.05); border-radius: 0 4px 4px 0; }
        .msg-reactions { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
        .reaction-pill { display: flex; align-items: center; gap: 3px; padding: 2px 8px; border-radius: 12px; background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.2); color: var(--text-secondary); font-size: 0.78rem; cursor: pointer; transition: all 0.12s; }
        .reaction-pill:hover { background: rgba(99,102,241,0.25); }
        .msg-actions { position: absolute; right: 0.5rem; top: 0; display: flex; gap: 4px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; padding: 3px 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
        .action-btn { background: transparent; border: none; cursor: pointer; padding: 2px 4px; border-radius: 4px; transition: background 0.1s; font-size: 0.85rem; }
        .action-btn:hover { background: var(--bg-tertiary); }
        .action-btn.delete-btn { color: #ef4444; }
        .chat-input-area { padding: 1rem 1.5rem; border-top: 1px solid var(--border); background: var(--bg-secondary); }
        .input-row { display: flex; gap: 0.5rem; align-items: flex-end; background: var(--bg-primary); border: 1px solid var(--border); border-radius: 12px; padding: 0.5rem 0.5rem 0.5rem 1rem; transition: border-color 0.15s; }
        .input-row:focus-within { border-color: #6366f1; }
        .chat-input { flex: 1; background: transparent; border: none; outline: none; color: var(--text-primary); font-size: 0.9rem; resize: none; max-height: 120px; min-height: 24px; line-height: 1.5; }
        .input-actions { display: flex; gap: 4px; align-items: center; flex-shrink: 0; }
        .input-icon-btn { background: transparent; border: none; cursor: pointer; color: var(--text-muted); padding: 6px; border-radius: 6px; transition: all 0.12s; display: flex; }
        .input-icon-btn:hover { background: var(--bg-tertiary); color: var(--text-primary); }
        .send-btn { background: #6366f1; border: none; cursor: pointer; color: #fff; padding: 8px; border-radius: 8px; display: flex; transition: background 0.15s; }
        .send-btn:hover { background: #4f46e5; }
        .send-btn:disabled { opacity: 0.4; cursor: default; }
        .typing-indicator { font-size: 0.75rem; color: var(--text-muted); padding: 0.25rem 0; min-height: 20px; font-style: italic; }
        .date-divider { display: flex; align-items: center; gap: 1rem; margin: 0.75rem 0; }
        .date-divider::before, .date-divider::after { content: ""; flex: 1; height: 1px; background: var(--border); }
        .date-divider span { font-size: 0.72rem; color: var(--text-muted); white-space: nowrap; }
        .empty-channel { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; color: var(--text-muted); }
        .empty-channel h3 { font-size: 1rem; font-weight: 600; color: var(--text-secondary); }
        .no-channel { flex: 1; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 1rem; color: var(--text-muted); }
        .add-channel-btn { background: transparent; border: none; cursor: pointer; color: var(--text-muted); display: flex; padding: 2px; border-radius: 4px; }
        .add-channel-btn:hover { color: var(--text-primary); }
        .code-bar { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.75rem; background: rgba(99,102,241,0.08); border-radius: 8px; margin-bottom: 0.5rem; font-size: 0.78rem; color: #818cf8; }
        .sidebar-channels { flex: 1; overflow-y: auto; padding: 0 0.5rem 1rem; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 200; }
        .modal-card { background: var(--bg-secondary); border-radius: 16px; padding: 2rem; width: 440px; border: 1px solid var(--border); }
        .modal-title { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 1.5rem; }
        .modal-field { margin-bottom: 1rem; }
        .modal-field label { display: block; font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.4rem; }
        .modal-input { width: 100%; padding: 0.6rem 0.9rem; background: var(--bg-primary); border: 1px solid var(--border); border-radius: 8px; color: var(--text-primary); font-size: 0.87rem; outline: none; }
        .modal-input:focus { border-color: #6366f1; }
        .modal-actions { display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem; }
        .btn-primary { padding: 0.6rem 1.25rem; background: #6366f1; color: #fff; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; font-size: 0.88rem; }
        .btn-cancel { padding: 0.6rem 1.25rem; background: transparent; color: var(--text-muted); border-radius: 8px; border: 1px solid var(--border); cursor: pointer; font-size: 0.88rem; }
        .emoji-quick { display: flex; gap: 4px; position: absolute; bottom: 100%; right: 0; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
        .emoji-quick button { background: transparent; border: none; font-size: 1.1rem; cursor: pointer; padding: 2px 4px; border-radius: 4px; }
        .emoji-quick button:hover { background: var(--bg-tertiary); }
      `}</style>

      {}
      <div className="chat-sidebar">
        <div className="sidebar-brand">
          <span>💬 Team Chat</span>
        </div>

        <div className="sidebar-channels">
          {[
            { label: "Channels", items: publicChannels, icon: <Hash size={13} /> },
            { label: "Private", items: privateChannels, icon: <Lock size={13} /> },
            { label: "Direct Messages", items: dmChannels, icon: <MessageSquare size={13} /> },
          ].map(({ label, items, icon }) => (
            <div key={label} className="sidebar-section">
              <div className="sidebar-label">
                <span>{label}</span>
                {label === "Channels" && (
                  <button className="add-channel-btn" onClick={() => setShowCreateModal(true)}>
                    <Plus size={14} />
                  </button>
                )}
              </div>
              {items.map((ch) => {
                const unread = useChatStore.getState().unreadCounts[ch._id] || 0;
                return (
                  <div key={ch._id} className={`channel-item ${activeChannelId === ch._id ? "active" : ""}`} onClick={() => openChannel(ch._id)}>
                    {icon}
                    <span>{ch.type === "dm" ? ch.name.replace(/^dm-[a-f0-9]+-[a-f0-9]+$/, "Direct") : ch.name}</span>
                    {unread > 0 && <span className="channel-unread">{unread}</span>}
                  </div>
                );
              })}
              {items.length === 0 && (
                <div style={{ padding: "0.3rem 0.75rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>No {label.toLowerCase()}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {}
      <div className="chat-main">
        {!activeChannel ? (
          <div className="no-channel">
            <Hash size={40} style={{ opacity: 0.3 }} />
            <h3 style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Select a channel to start chatting</h3>
            <button className="btn-primary" onClick={() => setShowCreateModal(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Plus size={15} /> Create Channel
            </button>
          </div>
        ) : (
          <>
            <div className="chat-header">
              {activeChannel.type === "public" ? <Hash size={18} style={{ color: "#818cf8" }} /> : activeChannel.type === "private" ? <Lock size={18} style={{ color: "#818cf8" }} /> : <MessageSquare size={18} style={{ color: "#818cf8" }} />}
              <span className="chat-header-name">{activeChannel.name}</span>
              {activeChannel.description && <span className="chat-header-desc">— {activeChannel.description}</span>}
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: "0.82rem" }}>
                <Users size={14} /> {activeChannel.members?.length || 0}
              </div>
            </div>

            <div className="messages-area">
              {channelMessages.length === 0 ? (
                <div className="empty-channel">
                  <Hash size={36} style={{ opacity: 0.3 }} />
                  <h3>Welcome to #{activeChannel.name}</h3>
                  <p style={{ fontSize: "0.85rem" }}>This is the start of the channel. Say hello!</p>
                </div>
              ) : (
                channelMessages.map((msg) => (
                  <MessageBubble
                    key={msg._id}
                    msg={msg}
                    currentUserId={user?._id}
                    onReact={handleReact}
                    onDelete={handleDelete}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
              {messageType === "code" && (
                <div className="code-bar">
                  <Code size={13} />
                  <span>Code Block</span>
                  <select style={{ background: "transparent", border: "none", color: "#818cf8", fontSize: "0.78rem", cursor: "pointer" }} value={codeLanguage} onChange={(e) => setCodeLanguage(e.target.value)}>
                    {["javascript", "python", "bash", "typescript", "json", "sql", "html", "css"].map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <button onClick={() => setMessageType("text")} style={{ marginLeft: "auto", background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.8rem" }}>✕ Cancel</button>
                </div>
              )}
              <div className="input-row">
                <textarea
                  className="chat-input"
                  placeholder={`Message #${activeChannel.name}`}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  rows={1}
                />
                <div className="input-actions" style={{ position: "relative" }}>
                  <button className="input-icon-btn" title="Code block" onClick={() => setMessageType(messageType === "code" ? "text" : "code")}>
                    <Code size={18} />
                  </button>
                  <div style={{ position: "relative" }}>
                    <button className="input-icon-btn" title="Emoji" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                      <Smile size={18} />
                    </button>
                    {showEmojiPicker && (
                      <div className="emoji-quick">
                        {EMOJIS.map((e) => (
                          <button key={e} onClick={() => { setInput((i) => i + e); setShowEmojiPicker(false); }}>{e}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button className="send-btn" onClick={sendMessage} disabled={!input.trim()}>
                    <Send size={16} />
                  </button>
                </div>
              </div>
              <div className="typing-indicator">
                {typers.length > 0 && `${typers.map((t) => t.name).join(", ")} ${typers.length === 1 ? "is" : "are"} typing…`}
              </div>
            </div>
          </>
        )}
      </div>

      {showCreateModal && (
        <CreateChannelModal
          onClose={() => setShowCreateModal(false)}
          onCreate={createChannel}
          projectId={projectId}
        />
      )}
    </div>
  );
}
