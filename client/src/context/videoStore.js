import { create } from "zustand";

const useVideoStore = create((set, get) => ({

  room: null,
  roomId: null,

  peers: {},

  localStream: null,
  isMuted: false,
  isCamOn: true,
  isScreenSharing: false,

  status: "idle",
  error: null,

  setRoom: (room) => set({ room, roomId: room?.id }),
  setLocalStream: (stream) => set({ localStream: stream }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error, status: "error" }),

  addPeer: (socketId, peerData) =>
    set((s) => ({ peers: { ...s.peers, [socketId]: peerData } })),

  removePeer: (socketId) =>
    set((s) => {
      const updated = { ...s.peers };

      if (updated[socketId]?.pc) {
        updated[socketId].pc.close();
      }
      delete updated[socketId];
      return { peers: updated };
    }),

  updatePeerStream: (socketId, stream) =>
    set((s) => ({
      peers: { ...s.peers, [socketId]: { ...s.peers[socketId], stream } },
    })),

  updatePeerMediaState: (socketId, { isMuted, isCamOn }) =>
    set((s) => ({
      peers: {
        ...s.peers,
        [socketId]: { ...s.peers[socketId], isMuted, isCamOn },
      },
    })),

  toggleMute: () => {
    const { localStream, isMuted } = get();
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => (t.enabled = isMuted));
    }
    set({ isMuted: !isMuted });
  },

  toggleCam: () => {
    const { localStream, isCamOn } = get();
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => (t.enabled = !isCamOn));
    }
    set({ isCamOn: !isCamOn });
  },

  reset: () => {
    const { localStream, peers } = get();

    if (localStream) localStream.getTracks().forEach((t) => t.stop());

    Object.values(peers).forEach((p) => p?.pc?.close());
    set({
      room: null,
      roomId: null,
      peers: {},
      localStream: null,
      isMuted: false,
      isCamOn: true,
      isScreenSharing: false,
      status: "idle",
      error: null,
    });
  },
}));

export default useVideoStore;
