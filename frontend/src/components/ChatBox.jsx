import React, { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble.jsx";

export default function ChatBox({ messages, meId }) {
  const listRef = useRef(null);
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);
  return (
    <div ref={listRef} className="flex-1 overflow-y-auto bg-white">
      <div className="px-6 py-6 space-y-2">
        {messages.map((m) => (
          <MessageBubble key={m._id || `${m.sender}-${m.createdAt}`} msg={m} meId={meId} />
        ))}
      </div>
    </div>
  );
}