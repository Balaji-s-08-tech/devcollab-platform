import { useEffect, useRef, useCallback } from "react";
import useVideoStore from "../context/videoStore";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

export function useWebRTC(socket) {
  const peerConnections = useRef({});
  const localStreamRef = useRef(null);

  const {
    setLocalStream,
    setStatus,
    setError,
    addPeer,
    removePeer,
    updatePeerStream,
    updatePeerMediaState,
    localStream,
    isMuted,
    isCamOn,
    reset,
  } = useVideoStore();

  const createPeerConnection = useCallback((socketId, peerInfo) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("video:ice_candidate", { to: socketId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      updatePeerStream(socketId, remoteStream);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        removePeer(socketId);
        delete peerConnections.current[socketId];
      }
    };

    peerConnections.current[socketId] = pc;
    addPeer(socketId, { pc, stream: null, ...peerInfo });

    return pc;
  }, [socket, addPeer, removePeer, updatePeerStream]);

  const joinRoom = useCallback(async (roomId) => {
    if (!socket) return;
    setStatus("connecting");

    try {

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);

      stream.getAudioTracks().forEach((t) => (t.enabled = !isMuted));
      stream.getVideoTracks().forEach((t) => (t.enabled = isCamOn));

      socket.emit("video:join_room", { roomId });
      setStatus("connected");
    } catch (err) {
      setError(`Could not access camera/mic: ${err.message}`);
    }
  }, [socket, isMuted, isCamOn, setLocalStream, setStatus, setError]);

  const leaveRoom = useCallback((roomId) => {
    if (socket) socket.emit("video:leave_room", { roomId });
    Object.values(peerConnections.current).forEach((pc) => pc.close());
    peerConnections.current = {};
    reset();
  }, [socket, reset]);

  const toggleMute = useCallback((roomId) => {
    useVideoStore.getState().toggleMute();
    if (socket && roomId) {
      const { isMuted, isCamOn } = useVideoStore.getState();
      socket.emit("video:media_state", { roomId, isMuted, isCamOn });
    }
  }, [socket]);

  const toggleCam = useCallback((roomId) => {
    useVideoStore.getState().toggleCam();
    if (socket && roomId) {
      const { isMuted, isCamOn } = useVideoStore.getState();
      socket.emit("video:media_state", { roomId, isMuted, isCamOn });
    }
  }, [socket]);

  const shareScreen = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];

      Object.values(peerConnections.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(screenTrack);
      });

      if (localStreamRef.current) {
        const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
        if (oldVideoTrack) {
          localStreamRef.current.removeTrack(oldVideoTrack);
          oldVideoTrack.stop();
        }
        localStreamRef.current.addTrack(screenTrack);
        setLocalStream(new MediaStream([...localStreamRef.current.getTracks()]));
      }

      screenTrack.onended = async () => {
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const camTrack = newStream.getVideoTracks()[0];
        Object.values(peerConnections.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender) sender.replaceTrack(camTrack);
        });
        useVideoStore.setState({ isScreenSharing: false });
      };

      useVideoStore.setState({ isScreenSharing: true });
    } catch (err) {
      console.error("Screen share failed:", err.message);
    }
  }, [setLocalStream]);

  useEffect(() => {
    if (!socket) return;

    const handleUserJoined = async ({ socketId, userId, name, avatar }) => {
      const pc = createPeerConnection(socketId, { userId, name, avatar });
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("video:offer", { to: socketId, offer });
      } catch (err) {
        console.error("Failed to create offer:", err);
      }
    };

    const handleOffer = async ({ from, offer, userId, name, avatar }) => {
      const pc = createPeerConnection(from, { userId, name, avatar });
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("video:answer", { to: from, answer });
      } catch (err) {
        console.error("Failed to handle offer:", err);
      }
    };

    const handleAnswer = async ({ from, answer }) => {
      const pc = peerConnections.current[from];
      if (pc && pc.signalingState !== "stable") {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error("Failed to set remote description:", err);
        }
      }
    };

    const handleIceCandidate = async ({ from, candidate }) => {
      const pc = peerConnections.current[from];
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Failed to add ICE candidate:", err);
        }
      }
    };

    const handleUserLeft = ({ socketId }) => {
      removePeer(socketId);
      delete peerConnections.current[socketId];
    };

    const handleMediaState = ({ socketId, isMuted, isCamOn }) => {
      updatePeerMediaState(socketId, { isMuted, isCamOn });
    };

    socket.on("video:user_joined", handleUserJoined);
    socket.on("video:offer", handleOffer);
    socket.on("video:answer", handleAnswer);
    socket.on("video:ice_candidate", handleIceCandidate);
    socket.on("video:user_left", handleUserLeft);
    socket.on("video:media_state", handleMediaState);

    return () => {
      socket.off("video:user_joined", handleUserJoined);
      socket.off("video:offer", handleOffer);
      socket.off("video:answer", handleAnswer);
      socket.off("video:ice_candidate", handleIceCandidate);
      socket.off("video:user_left", handleUserLeft);
      socket.off("video:media_state", handleMediaState);
    };
  }, [socket, createPeerConnection, removePeer, updatePeerMediaState]);

  return { joinRoom, leaveRoom, toggleMute, toggleCam, shareScreen };
}
