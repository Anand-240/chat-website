import React, { useEffect, useRef } from "react";

export default function ChatBox({ messages = [], meId, isGroup }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full px-4 py-3 overflow-y-auto space-y-3 bg-white">
      {messages.map((msg) => {
        const isMine = String(msg.sender) === String(meId);
        const justify = isMine ? "justify-end" : "justify-start";
        const bubbleColor = isMine ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-900";
        const edgeMargin = isMine ? "mr-2" : "ml-2";
        const nameAlign = isMine ? "text-right pr-2" : "text-left pl-2";
        const showName = isGroup && msg.senderName;

        return (
          <div key={msg._id || msg._clientId} className={`w-full flex ${justify}`}>
            <div className="flex flex-col max-w-[75%]">
              {showName && (
                <div className={`text-xs font-medium mb-1 ${nameAlign} ${isMine ? "text-blue-500" : "text-gray-600"}`}>
                  {msg.senderName}
                </div>
              )}
              <div className={`rounded-2xl px-4 py-2 break-words shadow-sm ${bubbleColor} ${edgeMargin}`}>
                {msg.imageUrl ? (
                  <img src={msg.imageUrl} alt="img" className="rounded-lg max-w-full mt-1" />
                ) : (
                  <div className="whitespace-pre-wrap break-words text-[15px] leading-6">
                    {msg.text}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}