import React, { useState } from "react";
import { API_BASE_URL } from "../constants.js";

const srcFor = (u) => {
  if (!u) return "";
  return /^https?:\/\//i.test(u) ? u : `${API_BASE_URL}${u}`;
};

export default function MessageBubble({ msg, meId }) {
  const mine = String(msg.sender) === String(meId);
  const [open, setOpen] = useState(false);
  const imgSrc = msg?.imageUrl ? srcFor(msg.imageUrl) : "";

  return (
    <>
      <div className={`flex ${mine ? "justify-end" : "justify-start"} mb-2 px-1`}>
        <div className={`max-w-[78%] rounded-2xl shadow-sm overflow-hidden ${mine ? "bg-linear-to-tr from-(--accent1) to-(--accent2) text-white" : "bg-white border border-(--border)"}`}>
          {imgSrc ? (
            <div className={`${mine ? "bg-white/10" : "bg-white"} w-full`}>
              <img
                src={imgSrc}
                alt=""
                className={`block w-full h-auto ${msg.text ? "rounded-b-none" : ""} rounded-2xl max-w-[720px]`}
                onClick={() => setOpen(true)}
              />
            </div>
          ) : null}
          {msg.text ? (
            <div className={`px-4 py-3 ${mine ? "text-white" : "text-[#0f172a]"}`}>
              <div className="whitespace-pre-wrap break-all text-base leading-relaxed">{msg.text}</div>
              <div className={`text-[10px] mt-2 ${mine ? "text-white/80" : "text-[#6b7280]"}`}>
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          ) : (
            <div className={`px-4 pt-2 ${mine ? "text-white/80" : "text-[#6b7280]"}`}>
              <div className="text-[10px]">
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          )}
        </div>
      </div>
      {open && imgSrc && (
        <div className="fixed inset-0 z-50 bg-black/80 grid place-items-center p-4" onClick={() => setOpen(false)}>
          <img src={imgSrc} alt="" className="max-h-[90vh] max-w-[95vw] rounded-xl" onClick={(e) => e.stopPropagation()} />
          <button className="absolute top-4 right-4 h-10 px-4 rounded-full bg-white/90 text-black text-sm" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      )}
    </>
  );
}