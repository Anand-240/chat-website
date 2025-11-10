import React from "react";
import { useCall } from "../context/CallContext.jsx";

export default function VideoCall() {
  const { state, acceptCall, endCall, localRef, remoteRef } = useCall();

  if (!state.active && !state.incoming) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      {state.incoming && !state.active ? (
        <div className="bg-white rounded-xl p-6 w-80 space-y-4 text-center">
          <div className="text-lg font-semibold">Incoming call</div>
          <div className="text-sm text-gray-600">{state.incoming.displayName || "User"}</div>
          <div className="flex gap-3">
            <button onClick={acceptCall} className="flex-1 bg-green-600 text-white rounded-md py-2">Accept</button>
            <button onClick={endCall} className="flex-1 bg-gray-200 rounded-md py-2">Decline</button>
          </div>
        </div>
      ) : (
        <div className="relative w-[900px] max-w-[95vw] h-[520px] bg-black rounded-2xl overflow-hidden">
          <video ref={remoteRef} autoPlay playsInline className="w-full h-full object-cover" />
          <video ref={localRef} autoPlay muted playsInline className="absolute right-4 bottom-4 w-56 h-36 rounded-lg border-2 border-white object-cover" />
          <div className="absolute left-1/2 -translate-x-1/2 bottom-4">
            <button onClick={endCall} className="bg-red-600 text-white rounded-full px-6 py-2">End</button>
          </div>
        </div>
      )}
    </div>
  );
}