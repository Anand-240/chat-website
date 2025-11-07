import React from "react";

export default function Sidebar({ me, items = [], activeId, onSelect }) {
  return (
    <div className="h-full w-[360px] bg-white border-r border-(--border) flex flex-col">
      <div className="px-5 py-4 border-b border-(--border) shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-(--lav) ring-1 ring-(--border)" />
          <div className="min-w-0">
            <div className="font-semibold truncate">{me?.username || "User"}</div>
            <div className="text-xs text-[#667085] truncate">{me?.email || ""}</div>
          </div>
        </div>
      </div>
      <div className="px-5 py-2 text-xs text-[#98a2b3] shrink-0">Chats</div>
      <div className="flex-1 overflow-y-auto px-3 pb-4 min-h-0">
        {items.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect && onSelect(c.id)}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition ${
              String(activeId) === String(c.id) ? "bg-(--lav)" : "hover:bg-(--lav-2)"
            }`}
          >
            <div className="h-10 w-10 rounded-2xl bg-[#e5e7f2]" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold truncate">{c.username || c.email || c.id}</div>
                {c.time && <div className="text-xs text-[#98a2b3] shrink-0">{c.time}</div>}
              </div>
              <div className="text-xs text-[#98a2b3] truncate">{c.preview || ""}</div>
            </div>
            {c.unread ? (
              <span className="min-w-5 h-5 px-1 rounded-full bg-(--primary) text-white text-xs flex items-center justify-center">
                {c.unread}
              </span>
            ) : null}
          </button>
        ))}
        {!items.length && <div className="px-2 py-6 text-sm text-[#98a2b3]">No conversations yet</div>}
      </div>
    </div>
  );
}