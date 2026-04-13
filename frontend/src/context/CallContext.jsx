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
  const stateRef = useRef({ active: false, incoming: null, peer: "", callId: "" });
  const startLockRef = useRef(false);
  const acceptLockRef = useRef(false);

  const pcRef = useRef(null);
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingIceRef = useRef([]);
  const remoteStreamRef = useRef(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

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
      if (!nextCallId) {
        console.warn("⚠️ [Offer] Ignored - missing callId");
        return;
      }
      if (stateRef.current.active || stateRef.current.incoming || pcRef.current) {
        console.warn("⚠️ [Offer] Ignored - already busy in another call");
        try { socket.emit("call:busy", { to: String(from), from: meId }); } catch {}
        return;
      }
      setState({ active: false, incoming: { from, offer, displayName, callId: nextCallId }, peer: "", callId: nextCallId });
    };
    const onAnswer = async ({ answer, callId }) => {
      console.log("📞 [Answer received] callId:", callId, "pcRef exists:", !!pcRef.current);
      const currentCallId = String(stateRef.current.callId || "");
      if (!currentCallId || String(callId || "") !== currentCallId) {
        console.warn("⚠️ [Answer] Ignored stale/foreign answer");
        return;
      }
      if (pcRef.current && answer) {
        try {
          await pcRef.current.setRemoteDescription(answer);
          await flushPendingIceCandidates(pcRef.current, "Answer");
          console.log("✅ [Answer] Processed");
        } catch (e) {
          console.error("❌ [Answer] Failed:", e);
        }
      }
    };
    const onIce = async ({ candidate, callId }) => {
      console.log("📞 [ICE received] callId:", callId);
      const currentCallId = String(stateRef.current.callId || "");
      if (!currentCallId || String(callId || "") !== currentCallId) return;
      if (pcRef.current && candidate) {
        if (!pcRef.current.remoteDescription) {
          pendingIceRef.current.push(candidate);
          console.log(`🧊 [ICE] Queued candidate, waiting remote description (${pendingIceRef.current.length})`);
          return;
        }
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
      const currentCallId = String(stateRef.current.callId || "");
      if (!callId || !currentCallId) {
        console.warn("⚠️ [Call end] Ignored - missing callId context");
        return;
      }
      if (String(callId) === currentCallId) endCall(false);
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
  }, [socket, meId]);

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
    remoteStreamRef.current = null;
  }

  function stopLocalResources() {
    try { pcRef.current?.getSenders().forEach((s) => s.track?.stop()); } catch {}
    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;
    pendingIceRef.current = [];
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

    if (
      typeof window !== "undefined" &&
      !window.isSecureContext &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      throw new Error("Camera/mic requires HTTPS (or localhost). Open the app on HTTPS to place a video call.");
    }

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

    stream.getAudioTracks().forEach((t) => { t.enabled = true; });
    stream.getVideoTracks().forEach((t) => { t.enabled = true; });

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

    try {
      pc.addTransceiver("audio", { direction: "sendrecv" });
      pc.addTransceiver("video", { direction: "sendrecv" });
      console.log("🎬 [PC] Transceivers added for audio/video sendrecv");
    } catch (e) {
      console.warn("⚠️ [PC] Failed to add transceivers:", e);
    }

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
      const incomingStream = e.streams?.[0] || e.track?.kind && remoteStreamRef.current;
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
      }

      if (e.track) {
        try {
          remoteStreamRef.current.addTrack(e.track);
        } catch (err) {
          console.warn("⚠️ [PC] Could not add remote track to stream:", err);
        }
      }

      const stream = e.streams?.[0] || remoteStreamRef.current || incomingStream;
      if (remoteRef.current && stream) {
        remoteRef.current.muted = true;
        attachStreamToVideo(remoteRef.current, stream);
      }
    };

    try {
      const stream = await ensureLocalStream();
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      console.log(`📹 [PC] Local tracks:`, stream.getTracks().map((t) => `${t.kind}:${t.readyState}:${t.enabled}`));
      console.log(`✅ [PC] Local tracks added`);
    } catch (e) {
      console.error("❌ [PC] Failed to add tracks:", e);
      throw e;
    }

    pcRef.current = pc;
    return pc;
  }

  async function waitForIceGathering(pc, phase) {
    await new Promise((resolve) => {
      let done = false;
      const finish = (message) => {
        if (done) return;
        done = true;
        clearTimeout(timeout);
        pc.removeEventListener("icegatheringstatechange", onGatheringChange);
        console.log(message);
        resolve();
      };
      const onGatheringChange = () => {
        if (pc.iceGatheringState === "complete") {
          finish(`✅ [${phase}] ICE gathering ready`);
        }
      };
      const timeout = setTimeout(() => {
        finish(`⏱️  [${phase}] ICE gathering timeout, continuing`);
      }, 2000);

      if (pc.iceGatheringState === "complete") {
        finish(`✅ [${phase}] ICE gathering ready`);
      } else {
        pc.addEventListener("icegatheringstatechange", onGatheringChange);
      }
    });
  }

  async function flushPendingIceCandidates(pc, phase) {
    if (!pc || !pc.remoteDescription) return;
    if (!pendingIceRef.current.length) return;

    const queued = [...pendingIceRef.current];
    pendingIceRef.current = [];
    console.log(`🧊 [${phase}] Flushing queued ICE: ${queued.length}`);

    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (e) {
        console.error(`❌ [${phase}] Failed queued ICE add:`, e);
      }
    }
  }

  async function startCall(toId) {
    console.log("📞 [StartCall] Initiating call to:", toId);
    if (startLockRef.current) {
      console.warn("⚠️ [StartCall] Ignored duplicate start while previous is in progress");
      return;
    }
    if (stateRef.current.active || stateRef.current.incoming || pcRef.current) {
      console.warn("⚠️ [StartCall] Ignored - already in call state");
      return;
    }
    if (!toId || !meId) {
      console.error("❌ [StartCall] Missing toId or meId");
      return;
    }
    startLockRef.current = true;
    
    const callId = crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    console.log(`📞 [StartCall] callId: ${callId}`);
    
    try {
      const pc = await createPC(toId, callId);
      console.log(`📞 [StartCall] Creating offer...`);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log(`📞 [StartCall] Local description set`);
      
      await waitForIceGathering(pc, "StartCall");
      
      console.log(`📞 [StartCall] Emitting offer`);
      socket?.emit("call:offer", { to: String(toId), from: meId, offer, displayName: user?.username || "User", callId });
      setState({ active: true, incoming: null, peer: String(toId), callId });
      console.log(`✅ [StartCall] Call initiated`);
    } catch (err) {
      console.error("❌ [StartCall] Failed:", err);
      endCall();
    } finally {
      startLockRef.current = false;
    }
  }

  async function acceptCall() {
    console.log("👍 [AcceptCall] User accepting call");
    if (acceptLockRef.current) {
      console.warn("⚠️ [AcceptCall] Ignored duplicate accept while previous is in progress");
      return;
    }
    const incoming = stateRef.current.incoming;
    if (!incoming) {
      console.error("❌ [AcceptCall] No incoming call");
      return;
    }
    acceptLockRef.current = true;
    
    const toId = String(incoming.from);
    const callId = String(incoming.callId || stateRef.current.callId || "");
    console.log(`👍 [AcceptCall] callId: ${callId}, from: ${toId}`);
    
    try {
      const pc = await createPC(toId, callId);
      console.log(`👍 [AcceptCall] Setting remote description...`);
      await pc.setRemoteDescription(incoming.offer);
      await flushPendingIceCandidates(pc, "AcceptCall");
      console.log(`👍 [AcceptCall] Creating answer...`);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log(`👍 [AcceptCall] Local description set`);

      await waitForIceGathering(pc, "AcceptCall");
      
      console.log(`👍 [AcceptCall] Emitting answer`);
      socket?.emit("call:answer", { to: toId, from: meId, answer, callId });
      setState({ active: true, incoming: null, peer: toId, callId });
      console.log(`✅ [AcceptCall] Call accepted`);
    } catch (err) {
      console.error("❌ [AcceptCall] Failed:", err);
      stopLocalResources();
      setState((prev) => ({ active: false, incoming: prev.incoming || incoming, peer: "", callId: prev.callId || stateRef.current.callId || "" }));
    } finally {
      acceptLockRef.current = false;
    }
  }

  function endCall(sendSignal = true) {
    if (typeof sendSignal !== "boolean") sendSignal = true;
    console.log(`🔴 [EndCall] Ending call, sendSignal: ${sendSignal}`);
    const snapshot = stateRef.current;
    const to = snapshot.peer || snapshot.incoming?.from;
    const currentCallId = snapshot.callId || snapshot.incoming?.callId || "";
    if (to) {
      try { 
        if (sendSignal) {
          socket?.emit("call:end", { to: String(to), from: meId, callId: currentCallId }); 
          console.log(`🔴 [EndCall] End signal sent`);
        }
      } catch (e) { console.error("❌ [EndCall] Signal failed:", e); }
    }
    stopLocalResources();
    startLockRef.current = false;
    acceptLockRef.current = false;
    setState({ active: false, incoming: null, peer: "", callId: "" });
    console.log(`✅ [EndCall] Call ended`);
  }

  return (
    <CallContext.Provider value={{ startCall, acceptCall, endCall, state, localRef, remoteRef }}>
      {children}
    </CallContext.Provider>
  );
}