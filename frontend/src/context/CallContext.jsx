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
    if (socket && meId) socket.emit("auth", { userId: meId });
  }, [socket, meId]);

  useEffect(() => {
    if (!socket) return;

    const onOffer = ({ from, offer, displayName }) => setState({ active: false, incoming: { from, offer, displayName }, peer: "" });
    const onAnswer = async ({ answer }) => { if (pcRef.current) await pcRef.current.setRemoteDescription(answer); };
    const onIce = async ({ candidate }) => { if (pcRef.current && candidate) { try { await pcRef.current.addIceCandidate(candidate); } catch {} } };
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

  async function createPC(toId) {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pc.onicecandidate = e => { if (e.candidate) socket.emit("call:ice", { to: toId, from: meId, candidate: e.candidate }); };
    pc.ontrack = e => { if (remoteRef.current) remoteRef.current.srcObject = e.streams[0]; };
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = stream;
    if (localRef.current) localRef.current.srcObject = stream;
    stream.getTracks().forEach(t => pc.addTrack(t, stream));
    pcRef.current = pc;
    return pc;
  }

  async function startCall(toId) {
    if (!toId || !meId) return;
    const pc = await createPC(toId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("call:offer", { to: String(toId), from: meId, offer, displayName: user?.username || "User" });
    setState({ active: true, incoming: null, peer: String(toId) });
  }

  async function acceptCall() {
    if (!state.incoming) return;
    const toId = String(state.incoming.from);
    const pc = await createPC(toId);
    await pc.setRemoteDescription(state.incoming.offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("call:answer", { to: toId, from: meId, answer });
    setState({ active: true, incoming: null, peer: toId });
  }

  function endCall() {
    const to = state.peer || state.incoming?.from;
    if (to) socket.emit("call:end", { to: String(to), from: meId });
    try { pcRef.current?.getSenders().forEach(s => s.track?.stop()); } catch {}
    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
    setState({ active: false, incoming: null, peer: "" });
  }

  return (
    <CallContext.Provider value={{ startCall, acceptCall, endCall, state, localRef, remoteRef }}>
      {children}
    </CallContext.Provider>
  );
}