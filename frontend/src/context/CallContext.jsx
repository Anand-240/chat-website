import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useSocket } from "./SocketContext.jsx";
import { useAuth } from "./AuthContext.jsx";

const CallContext = createContext(null);
export const useCall = () => useContext(CallContext);

export function CallProvider({ children }) {
  const socket = useSocket();
  const { user } = useAuth();
  const meId = String(user?.id || user?._id || "");
  const [state, setState] = useState({ active: false, incoming: null, peer: "", callId: "" });

  const pcRef = useRef(null);
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const localStreamRef = useRef(null);

  useEffect(() => {
    console.log("🔵 [CallProvider] Mounted, meId:", meId);
    if (socket && meId) {
      console.log("🟢 [Socket] Emitting auth and join");
      try { socket.emit("auth", { userId: meId }); } catch (e) { console.error("❌ [Auth] Failed:", e); }
      try { socket.emit("join", meId); } catch (e) { console.error("❌ [Join] Failed:", e); }
    }
  }, [socket, meId]);

  useEffect(() => {
    if (!socket) {
      console.log("❌ [Socket] Not ready");
      return;
    }

    console.log("🟢 [Socket] Setting up call listeners");

    const onOffer = ({ from, offer, displayName, callId }) => {
      console.log("📞 [Offer received] from:", from, "callId:", callId);
      const nextCallId = String(callId || "");
      setState({ active: false, incoming: { from, offer, displayName, callId: nextCallId }, peer: "", callId: nextCallId });
    };
    const onAnswer = async ({ answer, callId }) => {
      console.log("📞 [Answer received] callId:", callId, "pcRef exists:", !!pcRef.current);
      if (pcRef.current && answer && (!state.callId || String(callId || "") === state.callId)) {
        try { await pcRef.current.setRemoteDescription(answer); console.log("✅ [Answer] Processed"); } catch (e) { console.error("❌ [Answer] Failed:", e); }
      }
    };
    const onIce = async ({ candidate, callId }) => {
      console.log("📞 [ICE received] callId:", callId);
      if (pcRef.current && candidate && (!state.callId || String(callId || "") === state.callId)) {
        try { 
          await pcRef.current.addIceCandidate(candidate);
          console.log("✅ [ICE] Candidate added");
        } catch (e) { 
          console.error("❌ [ICE] Failed to add:", e); 
        }
      }
    };
    const onEnd = ({ callId }) => {
      console.log("📞 [Call end received] callId:", callId);
      if (!state.callId || String(callId || "") === state.callId) endCall(false);
    };

    socket.on("call:offer", onOffer);
    socket.on("call:answer", onAnswer);
    socket.on("call:ice", onIce);
    socket.on("call:end", onEnd);

    console.log("✅ [Socket] Listeners registered");

    return () => {
      console.log("🔴 [Socket] Cleaning up listeners");
      socket.off("call:offer", onOffer);
      socket.off("call:answer", onAnswer);
      socket.off("call:ice", onIce);
      socket.off("call:end", onEnd);
    };
  }, [socket, state.callId]);

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
      console.log("🎥 [Media] Requesting camera+audio");
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      console.log("✅ [Media] Camera+audio granted");
    } catch (e) {
      console.warn("⚠️ [Media] Camera failed, trying audio only:", e);
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        console.log("✅ [Media] Audio-only granted");
      } catch (e2) {
        console.error("❌ [Media] No media access:", e2);
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

  async function createPC(toId, callId) {
    const iceServers = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: ["turn:openrelay.metered.ca:80"], username: "openrelayproject", credential: "openrelayproject" },
      { urls: ["turn:openrelay.metered.ca:443"], username: "openrelayproject", credential: "openrelayproject" }
    ];
    
    console.log(`🔷 [PC] Creating RTCPeerConnection for ${toId}`);
    const pc = new RTCPeerConnection({ 
      iceServers,
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require"
    });

    pc.onconnectionstatechange = () => {
      console.log(`🔷 [PC] Connection state: ${pc.connectionState}`);
      if (pc.connectionState === "failed") {
        console.error(`❌ [PC] Connection FAILED. ICE state: ${pc.iceConnectionState}`);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`🔷 [PC] ICE connection state: ${pc.iceConnectionState}`);
    };

    pc.onicegatheringstatechange = () => {
      console.log(`🔷 [PC] ICE gathering state: ${pc.iceGatheringState}`);
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        console.log(`🔷 [PC] ICE candidate:`, e.candidate.candidate.substring(0, 50));
        try { socket?.emit("call:ice", { to: toId, from: meId, candidate: e.candidate, callId }); } catch (e) { console.error("❌ [ICE emit] Failed:", e); }
      } else {
        console.log(`🔷 [PC] ICE gathering COMPLETE`);
      }
    };

    pc.ontrack = (e) => {
      console.log(`🔷 [PC] Track received:`, e.track.kind);
      const stream = e.streams?.[0];
      if (remoteRef.current && stream) {
        attachStreamToVideo(remoteRef.current, stream);
      }
    };

    try {
      const stream = await ensureLocalStream();
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      console.log(`✅ [PC] Local tracks added`);
    } catch (e) {
      console.error("❌ [PC] Failed to add tracks:", e);
      throw e;
    }

    pcRef.current = pc;
    return pc;
  }

  async function startCall(toId) {
    console.log("📞 [StartCall] Initiating call to:", toId);
    if (!toId || !meId) {
      console.error("❌ [StartCall] Missing toId or meId");
      return;
    }
    
    const callId = crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    console.log(`📞 [StartCall] callId: ${callId}`);
    
    try {
      const pc = await createPC(toId, callId);
      console.log(`📞 [StartCall] Creating offer...`);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log(`📞 [StartCall] Local description set`);
      
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.log(`⏱️  [StartCall] ICE gathering timeout, sending offer`);
          resolve();
        }, 2000);
        
        if (pc.iceGatheringState === "complete") {
          clearTimeout(timeout);
          console.log(`✅ [StartCall] ICE gathering ready`);
          resolve();
        } else {
          pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === "complete") {
              clearTimeout(timeout);
              console.log(`✅ [StartCall] ICE gathering ready`);
              resolve();
            }
          };
        }
      });
      
      console.log(`📞 [StartCall] Emitting offer`);
      socket?.emit("call:offer", { to: String(toId), from: meId, offer, displayName: user?.username || "User", callId });
      setState({ active: true, incoming: null, peer: String(toId), callId });
      console.log(`✅ [StartCall] Call initiated`);
    } catch (err) {
      console.error("❌ [StartCall] Failed:", err);
      endCall();
    }
  }

  async function acceptCall() {
    console.log("👍 [AcceptCall] User accepting call");
    if (!state.incoming) {
      console.error("❌ [AcceptCall] No incoming call");
      return;
    }
    
    const toId = String(state.incoming.from);
    const callId = String(state.incoming.callId || state.callId || "");
    console.log(`👍 [AcceptCall] callId: ${callId}, from: ${toId}`);
    
    try {
      const pc = await createPC(toId, callId);
      console.log(`👍 [AcceptCall] Setting remote description...`);
      await pc.setRemoteDescription(state.incoming.offer);
      console.log(`👍 [AcceptCall] Creating answer...`);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log(`👍 [AcceptCall] Local description set`);
      
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.log(`⏱️  [AcceptCall] ICE gathering timeout, sending answer`);
          resolve();
        }, 2000);
        
        if (pc.iceGatheringState === "complete") {
          clearTimeout(timeout);
          console.log(`✅ [AcceptCall] ICE gathering ready`);
          resolve();
        } else {
          pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === "complete") {
              clearTimeout(timeout);
              console.log(`✅ [AcceptCall] ICE gathering ready`);
              resolve();
            }
          };
        }
      });
      
      console.log(`👍 [AcceptCall] Emitting answer`);
      socket?.emit("call:answer", { to: toId, from: meId, answer, callId });
      setState({ active: true, incoming: null, peer: toId, callId });
      console.log(`✅ [AcceptCall] Call accepted`);
    } catch (err) {
      console.error("❌ [AcceptCall] Failed:", err);
      stopLocalResources();
      setState((prev) => ({ active: false, incoming: prev.incoming || state.incoming, peer: "", callId: prev.callId || state.callId || "" }));
    }
  }

  function endCall(sendSignal = true) {
    console.log(`🔴 [EndCall] Ending call, sendSignal: ${sendSignal}`);
    const to = state.peer || state.incoming?.from;
    if (to) {
      try { 
        if (sendSignal) {
          socket?.emit("call:end", { to: String(to), from: meId, callId: state.callId || state.incoming?.callId || "" }); 
          console.log(`🔴 [EndCall] End signal sent`);
        }
      } catch (e) { console.error("❌ [EndCall] Signal failed:", e); }
    }
    stopLocalResources();
    setState({ active: false, incoming: null, peer: "", callId: "" });
    console.log(`✅ [EndCall] Call ended`);
  }

  return (
    <CallContext.Provider value={{ startCall, acceptCall, endCall, state, localRef, remoteRef }}>
      {children}
    </CallContext.Provider>
  );
}