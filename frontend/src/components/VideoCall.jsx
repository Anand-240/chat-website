import React, { useEffect, useMemo, useState } from "react";
import { useCall } from "../context/CallContext.jsx";

export default function VideoCall() {
  const { state, acceptCall, endCall, localRef, remoteRef } = useCall();
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const title = useMemo(() => {
    if (state.incoming && !state.active) return "Incoming call";
    return "In call";
  }, [state]);

  useEffect(() => {
    const stream = localRef.current?.srcObject;
    if (!stream) return;
    const audioTracks = stream.getAudioTracks();
    const videoTracks = stream.getVideoTracks();
    if (audioTracks.length) setMicOn(audioTracks.every(t => t.enabled));
    if (videoTracks.length) setCamOn(videoTracks.every(t => t.enabled));
  }, [state.active, localRef.current?.srcObject]);

  if (!state.active && !state.incoming) return null;

  function toggleMic() {
    const stream = localRef.current?.srcObject;
    if (!stream) return;
    const next = !micOn;
    stream.getAudioTracks().forEach(t => { t.enabled = next; });
    setMicOn(next);
  }

  function toggleCam() {
    const stream = localRef.current?.srcObject;
    if (!stream) return;
    const next = !camOn;
    stream.getVideoTracks().forEach(t => { t.enabled = next; });
    setCamOn(next);
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center">
      {state.incoming && !state.active ? (
        <div className="bg-white rounded-xl p-6 w-80 space-y-4 text-center">
          <div className="text-lg font-semibold">{title}</div>
          <div className="text-sm text-gray-600">{state.incoming.displayName || "User"}</div>
          <div className="flex gap-3">
            <button onClick={acceptCall} className="flex-1 bg-green-600 text-white rounded-md py-2">Accept</button>
            <button onClick={endCall} className="flex-1 bg-gray-200 rounded-md py-2">Decline</button>
          </div>
        </div>
      ) : (
        <div className="relative w-[900px] max-w-[95vw] h-[520px] bg-black rounded-2xl overflow-hidden">
          <video
            ref={remoteRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover bg-black"
          />
          <video
            ref={localRef}
            autoPlay
            muted
            playsInline
            className={`absolute right-4 bottom-4 w-56 h-36 rounded-lg border-2 border-white object-cover bg-black shadow-lg transition-opacity ${camOn ? "opacity-100" : "opacity-30"}`}
          />
          <div className="absolute left-0 right-0 bottom-4 flex items-center justify-center gap-3">
            <button onClick={toggleMic} className={`px-4 py-2 rounded-full ${micOn ? "bg-white text-black" : "bg-gray-600 text-white"}`}>
              {micOn ? "Mic On" : "Mic Off"}
            </button>
            <button onClick={toggleCam} className={`px-4 py-2 rounded-full ${camOn ? "bg-white text-black" : "bg-gray-600 text-white"}`}>
              {camOn ? "Cam On" : "Cam Off"}
            </button>
            <button onClick={endCall} className="px-5 py-2 rounded-full bg-red-600 text-white">End</button>
          </div>
          <div className="absolute top-3 left-4 text-white/90 text-sm">{title}</div>
        </div>
      )}
    </div>
  );
}