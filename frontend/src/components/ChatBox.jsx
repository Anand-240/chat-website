import React, { useEffect, useRef } from "react";

export default function ChatBox({ messages = [], meId, showSenderNames = false, memberMap = {} }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  return (
    <div className="h-full w-full bg-white overflow-y-auto">
      <div className="flex flex-col w-full py-5 space-y-3 pl-2 pr-2">
        {messages.map((msg) => {
          const isMine = String(msg.sender) === String(meId);
          const rowJustify = isMine ? "justify-end" : "justify-start";
          const rowPadding = isMine ? "pr-5" : "pl-3";
          const alignItems = isMine ? "items-end" : "items-start";
          const bubbleColor = isMine ? "bg-(--primary) text-white" : "bg-[#f4f5f9] text-[#0f172a]";
          const textAlign = isMine ? "text-right" : "text-left";
          const senderName = showSenderNames && !isMine ? memberMap[String(msg.sender)] || "" : "";
          const time = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

          return (
            <div key={msg._id || msg._clientId} className={`flex w-full ${rowJustify} ${rowPadding}`}>
              <div className={`flex flex-col ${alignItems} max-w-[78%]`}>
                {senderName ? (
                  <div className={`text-[11px] text-[#667085] mb-1 ${textAlign}`}>{senderName}</div>
                ) : null}

                {msg.imageUrl ? (
                  <a href={msg.imageUrl} target="_blank" rel="noreferrer" className={`block mb-1 ${isMine ? "self-end" : "self-start"}`}>
                    <img
                      src={msg.imageUrl}
                      alt=""
                      className="rounded-2xl max-w-full h-auto"
                      style={{ maxWidth: "420px", maxHeight: "420px", objectFit: "cover" }}
                    />
                  </a>
                ) : null}

                {typeof msg.text === "string" && msg.text.trim().length > 0 ? (
                  <div className={`rounded-2xl px-4 py-2 ${bubbleColor} ${isMine ? "self-end mr-3" : "self-start ml-2"}`}>
                    <div className="whitespace-pre-wrap break-all text-[15px] leading-6">{msg.text}</div>
                  </div>
                ) : null}

                <div className={`text-[11px] text-[#98a2b3] mt-1 px-1 ${textAlign}`}>{time}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
    </div>
  );
}