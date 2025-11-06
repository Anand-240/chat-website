import React, { useState } from "react";
import { API_BASE_URL } from "../constants.js";

export default function MessageBubble({ msg, meId }) {
  const mine = String(msg.sender) === String(meId);
  const [open, setOpen] = useState(false);
  const hasImage = !!msg.imageUrl;
  const hasText = !!msg.text;

  return (
    <>
      <div className={`flex ${mine ? "justify-end" : "justify-start"} mb-3 px-3`}>
        <div
          className={`max-w-[85%] rounded-2xl px-0 pb-2 pt-0 shadow-sm overflow-hidden ${
            mine ? "bg-linear-to-tr from-(--accent1) to-(--accent2) text-white" : "bg-white border border-(--border)"
          }`}
        >
          {hasImage && (
            <div className={`${mine ? "bg-white/10" : "bg-white"} w-full`}>
              <img
                src={`${API_BASE_URL}${msg.imageUrl}`}
                alt=""
                className={`block w-full h-auto ${
                  hasText ? "rounded-b-none" : ""
                } rounded-2xl ${mine ? "" : ""} max-w-[640px]`}
                onClick={() => setOpen(true)}
              />
            </div>
          )}

          {hasText && (
            <div className={`px-4 py-3 ${mine ? "text-white" : "text-[#0f172a]"}`}>
              <div className="whitespace-pre-wrap wrap-break-word text-[15px] leading-6">{msg.text}</div>
              <div className={`text-[10px] mt-2 ${mine ? "text-white/80" : "text-[#6b7280]"}`}>
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          )}

          {!hasText && (
            <div className={`px-4 pt-2 ${mine ? "text-white/80" : "text-[#6b7280]"}`}>
              <div className="text-[10px]">
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          )}
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/80 grid place-items-center p-4"
          onClick={() => setOpen(false)}
        >
          <img
            src={`${API_BASE_URL}${msg.imageUrl}`}
            alt=""
            className="max-h-[90vh] max-w-[95vw] rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 h-10 px-4 rounded-full bg-white/90 text-black text-sm"
            onClick={() => setOpen(false)}
          >
            Close
          </button>
        </div>
      )}
    </>
  );
}
