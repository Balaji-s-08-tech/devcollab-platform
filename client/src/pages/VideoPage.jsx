import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { videoAPI } from "../services/api";
import useVideoStore from "../context/videoStore";
import { useWebRTC } from "../hooks/useWebRTC";
import { getSocket } from "../services/socket";
import useAuthStore from "../context/authStore";
import toast from "react-hot-toast";
import { Video, VideoOff, Mic, MicOff, PhoneOff, Monitor, Plus, Users, Copy } from "lucide-react";

function VideoTile({ stream, label, isMuted, isCamOn, isLocal = false }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="video-tile">
      {stream && isCamOn !== false ? (
        <video ref={videoRef} autoPlay playsInline muted={isLocal} className="video-el" />
      ) : (
        <div className="video-placeholder">
          <div className="video-avatar">
            {label?.charAt(0)?.toUpperCase() || "?"}
          </div>
        </div>
      )}
      <div className="video-label">
        <span>{label}{isLocal ? " (You)" : ""}</span>
        <div style={{ display: "flex", gap: 4 }}>
          {isMuted && <MicOff size={12} style={{ color: "#ef4444" }} />}
          {isCamOn === false && <VideoOff size={12} style={{ color: "#ef4444" }} />}
        </div>
      </div>
    </div>
  );
}

function RoomCard({ room, onJoin, onEnd, currentUserId }) {
  const isOwner = String(room.createdBy?._id) === String(currentUserId);
  const count = room.participants?.length || 0;

  const copyRoomId = () => {
    navigator.clipboard.writeText(room.id);
    toast.success("Room ID copied!");
  };

  return (
    <div className="room-card">
      <div className="room-card-header">
        <div>
          <h3 className="room-name">{room.name}</h3>
          <p className="room-meta">
            <Users size={12} /> {count} participant{count !== 1 ? "s" : ""}
          </p>
        </div>
        <span className="room-live-badge">LIVE</span>
      </div>
      <div className="room-id-row">
        <span className="room-id-label">Room ID:</span>
        <code className="room-id">{room.id.slice(0, 12)}…</code>
        <button className="copy-btn" onClick={copyRoomId}><Copy size={12} /></button>
      </div>
      <div className="room-participants">
        {room.participants?.slice(0, 5).map((p) => (
          <div key={p._id} style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 700, color: "#fff", border: "2px solid var(--bg-primary)" }}>
            {p.name?.charAt(0)?.toUpperCase()}
          </div>
        ))}
        {count > 5 && <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>+{count - 5}</span>}
      </div>
      <div className="room-actions">
        <button className="btn-join" onClick={() => onJoin(room.id)}>
          <Video size={14} /> Join Room
        </button>
        {isOwner && (
          <button className="btn-end" onClick={() => onEnd(room.id)}>
            <PhoneOff size={14} /> End
          </button>
        )}
      </div>
    </div>
  );
}

export default function VideoPage() {
  const { projectId } = useParams();
  const user = useAuthStore((s) => s.user);
  const socket = getSocket();
  const { joinRoom, leaveRoom, toggleMute, toggleCam, shareScreen } = useWebRTC(socket);
  const { room, roomId, peers, localStream, isMuted, isCamOn, isScreenSharing, status, error, setRoom, reset } = useVideoStore();

  const [rooms, setRooms] = useState([]);
  const [joinRoomId, setJoinRoomId] = useState("");
  const [newRoomName, setNewRoomName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNewRoom, setShowNewRoom] = useState(false);

  useEffect(() => {
    loadRooms();
  }, [projectId]);

  const loadRooms = async () => {
    try {
      const { data } = await videoAPI.getRooms({ projectId });
      setRooms(data.rooms || []);
    } catch {  }
  };

  const handleCreateRoom = async () => {
    setLoading(true);
    try {
      const { data } = await videoAPI.createRoom({ name: newRoomName || `Room ${Date.now()}`, projectId });
      setRoom(data.room);
      toast.success(`Room "${data.room.name}" created`);
      await joinRoom(data.room.id);
      setShowNewRoom(false);
      setNewRoomName("");
      loadRooms();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinById = async () => {
    if (!joinRoomId.trim()) return toast.error("Enter a Room ID");
    try {
      const { data } = await videoAPI.getRoom(joinRoomId.trim());
      setRoom(data.room);
      await joinRoom(joinRoomId.trim());
      loadRooms();
    } catch {
      toast.error("Room not found or expired");
    }
  };

  const handleJoinRoom = async (rId) => {
    try {
      const { data } = await videoAPI.joinRoom(rId);
      setRoom(data.room);
      await joinRoom(rId);
    } catch {
      toast.error("Failed to join room");
    }
  };

  const handleLeave = () => {
    if (roomId) leaveRoom(roomId);
    reset();
    loadRooms();
    toast("Left the call", { icon: "👋" });
  };

  const handleEndRoom = async (rId) => {
    try {
      await videoAPI.endRoom(rId);
      if (roomId === rId) handleLeave();
      loadRooms();
      toast.success("Room ended");
    } catch {
      toast.error("Failed to end room");
    }
  };

  const peerEntries = Object.entries(peers);
  const totalParticipants = peerEntries.length + 1;

  if (roomId && status === "connected") {
    return (
      <div className="video-call">
        <style>{`
          .video-call { display: flex; flex-direction: column; height: 100%; background: #0a0a12; }
          .call-header { padding: 1rem 1.5rem; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #1a1a28; }
          .call-title { font-size: 0.95rem; font-weight: 700; color: #e2e8f0; display: flex; align-items: center; gap: 0.5rem; }
          .live-dot { width: 8px; height: 8px; border-radius: 50%; background: #ef4444; animation: pulse 1.5s infinite; }
          @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
          .call-room-info { font-size: 0.78rem; color: #6b7280; }
          .video-grid { flex: 1; display: grid; gap: 8px; padding: 1rem; overflow: hidden; }
          .video-grid.p1 { grid-template-columns: 1fr; }
          .video-grid.p2 { grid-template-columns: 1fr 1fr; }
          .video-grid.p3 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
          .video-grid.p4 { grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(2, 1fr); }
          .video-grid.p5, .video-grid.p6 { grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(2, 1fr); }
          .video-tile { position: relative; border-radius: 16px; overflow: hidden; background: #141420; border: 1px solid #1a1a2e; }
          .video-el { width: 100%; height: 100%; object-fit: cover; }
          .video-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #1a1a2e,#16213e); }
          .video-avatar { width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 700; color: #fff; }
          .video-label { position: absolute; bottom: 8px; left: 8px; display: flex; align-items: center; gap: 6px; background: rgba(0,0,0,0.6); padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; color: #e2e8f0; backdrop-filter: blur(4px); }
          .controls { display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 1.25rem; background: #0f0f1e; border-top: 1px solid #1a1a28; }
          .ctrl-btn { width: 48px; height: 48px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
          .ctrl-btn-normal { background: #1e1e30; color: #a0aec0; }
          .ctrl-btn-normal:hover { background: #2a2a40; color: #e2e8f0; }
          .ctrl-btn-active { background: rgba(239,68,68,0.2); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
          .ctrl-btn-hang { background: #ef4444; color: #fff; width: 56px; height: 56px; }
          .ctrl-btn-hang:hover { background: #dc2626; }
          .ctrl-label { font-size: 0.7rem; color: #6b7280; text-align: center; }
          .ctrl-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
          .peer-count { font-size: 0.82rem; color: #6b7280; margin-left: 1rem; }
        `}</style>

        <div className="call-header">
          <div className="call-title">
            <span className="live-dot" />
            {room?.name || "Video Call"}
          </div>
          <div className="call-room-info">
            Room ID: {roomId?.slice(0, 8)}… · {totalParticipants} participant{totalParticipants !== 1 ? "s" : ""}
          </div>
        </div>

        <div className={`video-grid p${Math.min(totalParticipants, 6)}`}>
          {}
          <VideoTile
            stream={localStream}
            label={user?.name}
            isMuted={isMuted}
            isCamOn={isCamOn}
            isLocal
          />
          {}
          {peerEntries.map(([socketId, peer]) => (
            <VideoTile
              key={socketId}
              stream={peer.stream}
              label={peer.name}
              isMuted={peer.isMuted}
              isCamOn={peer.isCamOn}
            />
          ))}
        </div>

        <div className="controls">
          <div className="ctrl-item">
            <button className={`ctrl-btn ${isMuted ? "ctrl-btn-active" : "ctrl-btn-normal"}`} onClick={() => toggleMute(roomId)}>
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <span className="ctrl-label">{isMuted ? "Unmute" : "Mute"}</span>
          </div>
          <div className="ctrl-item">
            <button className={`ctrl-btn ${!isCamOn ? "ctrl-btn-active" : "ctrl-btn-normal"}`} onClick={() => toggleCam(roomId)}>
              {isCamOn ? <Video size={20} /> : <VideoOff size={20} />}
            </button>
            <span className="ctrl-label">{isCamOn ? "Stop video" : "Start video"}</span>
          </div>
          <div className="ctrl-item">
            <button className={`ctrl-btn ${isScreenSharing ? "ctrl-btn-active" : "ctrl-btn-normal"}`} onClick={shareScreen}>
              <Monitor size={20} />
            </button>
            <span className="ctrl-label">Share screen</span>
          </div>
          <div className="ctrl-item">
            <button className="ctrl-btn ctrl-btn-hang" onClick={handleLeave}>
              <PhoneOff size={22} />
            </button>
            <span className="ctrl-label" style={{ color: "#ef4444" }}>Leave</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="video-lobby">
      <style>{`
        .video-lobby { padding: 2rem; height: 100%; overflow-y: auto; background: var(--bg-primary); }
        .lobby-header { margin-bottom: 2rem; }
        .lobby-header h1 { font-size: 1.6rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.5rem; }
        .lobby-header p { color: var(--text-muted); font-size: 0.9rem; }
        .lobby-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; }
        .lobby-card { background: var(--bg-secondary); border-radius: 16px; padding: 1.5rem; border: 1px solid var(--border); }
        .lobby-card h3 { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
        .lobby-input { width: 100%; padding: 0.65rem 1rem; background: var(--bg-primary); border: 1px solid var(--border); border-radius: 10px; color: var(--text-primary); font-size: 0.88rem; outline: none; margin-bottom: 0.75rem; }
        .lobby-input:focus { border-color: #6366f1; }
        .btn-green { padding: 0.65rem 1.25rem; background: #22c55e; color: #fff; border-radius: 10px; border: none; cursor: pointer; font-weight: 700; font-size: 0.88rem; display: flex; align-items: center; gap: 6px; width: 100%; justify-content: center; }
        .btn-green:hover { background: #16a34a; }
        .btn-blue { padding: 0.65rem 1.25rem; background: #6366f1; color: #fff; border-radius: 10px; border: none; cursor: pointer; font-weight: 700; font-size: 0.88rem; display: flex; align-items: center; gap: 6px; width: 100%; justify-content: center; }
        .btn-blue:hover { background: #4f46e5; }
        .rooms-section { margin-top: 2rem; }
        .rooms-section h2 { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
        .rooms-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
        .room-card { background: var(--bg-secondary); border-radius: 14px; padding: 1.25rem; border: 1px solid var(--border); transition: border-color 0.15s; }
        .room-card:hover { border-color: rgba(99,102,241,0.3); }
        .room-card-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 0.75rem; }
        .room-name { font-size: 1rem; font-weight: 700; color: var(--text-primary); }
        .room-meta { display: flex; align-items: center; gap: 4px; font-size: 0.78rem; color: var(--text-muted); margin-top: 2px; }
        .room-live-badge { background: rgba(239,68,68,0.2); color: #ef4444; padding: 2px 8px; border-radius: 20px; font-size: 0.68rem; font-weight: 800; letter-spacing: 0.05em; animation: pulse 2s infinite; }
        .room-id-row { display: flex; align-items: center; gap: 6px; margin-bottom: 0.75rem; }
        .room-id-label { font-size: 0.75rem; color: var(--text-muted); }
        .room-id { font-family: monospace; font-size: 0.78rem; color: #818cf8; }
        .copy-btn { background: transparent; border: none; cursor: pointer; color: var(--text-muted); padding: 2px; border-radius: 4px; display: flex; }
        .copy-btn:hover { color: var(--text-primary); }
        .room-participants { display: flex; gap: -4px; align-items: center; margin-bottom: 1rem; }
        .room-actions { display: flex; gap: 0.5rem; }
        .btn-join { flex: 1; padding: 0.5rem; background: rgba(99,102,241,0.2); color: #818cf8; border-radius: 8px; border: 1px solid rgba(99,102,241,0.3); cursor: pointer; font-weight: 700; font-size: 0.82rem; display: flex; align-items: center; justify-content: center; gap: 5px; transition: all 0.15s; }
        .btn-join:hover { background: rgba(99,102,241,0.35); }
        .btn-end { padding: 0.5rem 0.75rem; background: rgba(239,68,68,0.1); color: #ef4444; border-radius: 8px; border: 1px solid rgba(239,68,68,0.2); cursor: pointer; font-size: 0.82rem; display: flex; align-items: center; gap: 5px; transition: all 0.15s; }
        .btn-end:hover { background: rgba(239,68,68,0.2); }
        .no-rooms { text-align: center; padding: 3rem; color: var(--text-muted); font-size: 0.9rem; }
        .error-banner { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #ef4444; padding: 0.75rem 1rem; border-radius: 10px; font-size: 0.85rem; margin-bottom: 1rem; }
      `}</style>

      <div className="lobby-header">
        <h1>📹 Video Calls</h1>
        <p>Start or join a video call with your team members</p>
      </div>

      {error && <div className="error-banner">⚠️ {error}</div>}

      <div className="lobby-grid">
        <div className="lobby-card">
          <h3><Plus size={18} style={{ color: "#22c55e" }} /> Create New Room</h3>
          <input
            className="lobby-input"
            placeholder="Room name (optional)"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateRoom()}
          />
          <button className="btn-green" onClick={handleCreateRoom} disabled={loading}>
            <Video size={16} /> {loading ? "Creating…" : "Start Room"}
          </button>
        </div>

        <div className="lobby-card">
          <h3><Video size={18} style={{ color: "#6366f1" }} /> Join by Room ID</h3>
          <input
            className="lobby-input"
            placeholder="Paste Room ID here…"
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoinById()}
          />
          <button className="btn-blue" onClick={handleJoinById}>
            <Video size={16} /> Join Room
          </button>
        </div>
      </div>

      <div className="rooms-section">
        <h2><Users size={18} style={{ color: "#818cf8" }} /> Active Rooms</h2>
        {rooms.length === 0 ? (
          <div className="no-rooms">
            <Video size={32} style={{ opacity: 0.3, margin: "0 auto 0.75rem" }} />
            <p>No active rooms. Start one above!</p>
          </div>
        ) : (
          <div className="rooms-grid">
            {rooms.map((r) => (
              <RoomCard
                key={r.id}
                room={r}
                onJoin={handleJoinRoom}
                onEnd={handleEndRoom}
                currentUserId={user?._id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
