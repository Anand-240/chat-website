import React from "react";
import { API_BASE_URL } from "../constants.js";

export default function MessageBubble({ msg, meId }) {
  const mine = String(msg.sender) === String(meId);
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"} mb-2 px-2`}>
      <div className={`${mine ? "bg-black text-white" : "bg-white border"} rounded-2xl p-2 max-w-[70%]`}>
        {msg.imageUrl && (
          <img
            src={`${API_BASE_URL}${msg.imageUrl}`}
            alt="img"
            className="rounded-xl max-h-64 object-cover mb-1"
          />
        )}
        {msg.text && <div className="whitespace-pre-wrap break-words">{msg.text}</div>}
        <div className="text-[10px] opacity-60 mt-1">{new Date(msg.createdAt).toLocaleTimeString()}</div>
      </div>
    </div>
  );
}
