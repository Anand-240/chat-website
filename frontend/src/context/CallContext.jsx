import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useSocket } from "./SocketContext.jsx";
import { useAuth } from "./AuthContext.jsx";

const CallContext = createContext(null);
export const useCall = () => useContext(CallContext);

export function CallProvider({ children }) {
  const socket = useSocket();
  const { user } = useAuth();
  const meId = String(user?.id || user?._id || "");
  const [state, setState] = useState({ active: false, incoming: null, peer: "" });

  const pcRef = useRef(null);
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const localStreamRef = useRef(null);

  useEffect(() => {
    if (socket && meId) {
      try { socket.emit("auth", { userId: meId }); } catch {}
      try { socket.emit("join", meId); } catch {}
    }
  }, [socket, meId]);

  useEffect(() => {
    if (!socket) return;

    const onOffer = ({ from, offer, displayName }) => {
      setState({ active: false, incoming: { from, offer, displayName }, peer: "" });
    };
    const onAnswer = async ({ answer }) => {
      if (pcRef.current && answer) {
        try { await pcRef.current.setRemoteDescription(answer); } catch {}
      }
    };
    const onIce = async ({ candidate }) => {
      if (pcRef.current && candidate) {
        try { await pcRef.current.addIceCandidate(candidate); } catch {}
      }
    };
    const onEnd = () => endCall();

    socket.on("call:offer", onOffer);
    socket.on("call:answer", onAnswer);
    socket.on("call:ice", onIce);
    socket.on("call:end", onEnd);

    return () => {
      socket.off("call:offer", onOffer);
      socket.off("call:answer", onAnswer);
      socket.off("call:ice", onIce);
      socket.off("call:end", onEnd);
    };
  }, [socket]);

  function attachStreamToVideo(video, stream) {
    if (!video || !stream) return;
    video.muted = video.muted ?? false;
    video.playsInline = true;
    video.autoplay = true;
    video.srcObject = stream;

    let attempts = 0;
    const maxAttempts = 20;

    const tryPlay = () => {
      attempts += 1;
      const p = video.play();
      if (!p || typeof p.then !== "function") return;
      p.catch(() => {
        if (attempts < maxAttempts) {
          setTimeout(tryPlay, 100);
        }
      });
    };

    if (video.readyState >= 2) tryPlay();
    else video.onloadedmetadata = tryPlay;

    const onVisible = () => {
      if (document.visibilityState === "visible") tryPlay();
    };
    document.addEventListener("visibilitychange", onVisible, { once: true });
  }

  function clearMediaElements() {
    try {
      if (remoteRef.current) remoteRef.current.srcObject = null;
    } catch {}
    try {
      if (localRef.current) localRef.current.srcObject = null;
    } catch {}
  }

  function stopLocalResources() {
    try { pcRef.current?.getSenders().forEach((s) => s.track?.stop()); } catch {}
    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;
    clearMediaElements();
    localStreamRef.current = null;
  }

  useEffect(() => {
    if (localRef.current && localStreamRef.current) {
      const v = localRef.current;
      v.muted = true;
      attachStreamToVideo(v, localStreamRef.current);
    }
  }, [localRef.current]);

  async function ensureLocalStream() {
    if (localStreamRef.current) return localStreamRef.current;

    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
    } catch {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch {
        stream = null;
      }
    }

    if (!stream) {
      throw new Error("Unable to access camera or microphone");
    }

    localStreamRef.current = stream;
    if (localRef.current) {
      localRef.current.muted = true;
      attachStreamToVideo(localRef.current, stream);
    }
    return stream;
  }

  async function createPC(toId) {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        try { socket?.emit("call:ice", { to: toId, from: meId, candidate: e.candidate }); } catch {}
      }
    };

    pc.ontrack = (e) => {
      const stream = e.streams?.[0];
      if (remoteRef.current && stream) {
        attachStreamToVideo(remoteRef.current, stream);
      }
    };

    const stream = await ensureLocalStream();
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    pcRef.current = pc;
    return pc;
  }

  async function startCall(toId) {
    if (!toId || !meId) return;
    try {
      const pc = await createPC(toId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket?.emit("call:offer", { to: String(toId), from: meId, offer, displayName: user?.username || "User" });
      setState({ active: true, incoming: null, peer: String(toId) });
    } catch {
      endCall();
    }
  }

  async function acceptCall() {
    if (!state.incoming) return;
    const toId = String(state.incoming.from);
    try {
      const pc = await createPC(toId);
      await pc.setRemoteDescription(state.incoming.offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket?.emit("call:answer", { to: toId, from: meId, answer });
      setState({ active: true, incoming: null, peer: toId });
    } catch {
      console.error("Failed to accept call");
      stopLocalResources();
      setState((prev) => ({ active: false, incoming: prev.incoming || state.incoming, peer: "" }));
    }
  }

  function endCall() {
    const to = state.peer || state.incoming?.from;
    if (to) {
      try { socket?.emit("call:end", { to: String(to), from: meId }); } catch {}
    }
    stopLocalResources();

    setState({ active: false, incoming: null, peer: "" });
  }

  return (
    <CallContext.Provider value={{ startCall, acceptCall, endCall, state, localRef, remoteRef }}>
      {children}
    </CallContext.Provider>
  );
}