import React from "react";

export default function Sidebar({ me, items = [], activeId, onSelect }) {
  return (
    <div className="h-full w-80 bg-white rounded-3xl border border-(--border) overflow-hidden flex flex-col">
      <div className="px-4 pt-4 pb-3 border-b border-(--border)">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-[#eceef6]" />
          <div className="min-w-0">
            <div className="font-semibold truncate">{me?.username || "User"}</div>
            <div className="text-xs text-[#667085] truncate">{me?.email || ""}</div>
          </div>
        </div>
      </div>
      <div className="px-3 py-2 text-xs text-[#98a2b3]">All chats</div>
      <div className="flex-1 overflow-y-auto p-2">
        {items.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect && onSelect(c.id)}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition ${
              String(activeId) === String(c.id) ? "bg-[#ebe7ff]" : "hover:bg-[#f7f7fb]"
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
              <span className="min-w-5 h-5 px-1 rounded-full bg-[#6e5ddc] text-white text-xs flex items-center justify-center">
                {c.unread}
              </span>
            ) : null}
          </button>
        ))}
        {!items.length && <div className="px-3 py-4 text-sm text-[#98a2b3]">No conversations yet</div>}
      </div>
    </div>
  );
}
