import React from "react";

export default function Sidebar({ me, items = [], activeId, onSelect, view, onChangeView }) {
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
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => onChangeView?.("all")}
            className={`px-3 py-1.5 rounded-lg text-sm ${view==="all"?"bg-(--primary) text-white":"bg-[#f4f5f9]"}`}
          >
            All
          </button>
          <button
            onClick={() => onChangeView?.("dm")}
            className={`px-3 py-1.5 rounded-lg text-sm ${view==="dm"?"bg-(--primary) text-white":"bg-[#f4f5f9]"}`}
          >
            Chats
          </button>
          <button
            onClick={() => onChangeView?.("group")}
            className={`px-3 py-1.5 rounded-lg text-sm ${view==="group"?"bg-(--primary) text-white":"bg-[#f4f5f9]"}`}
          >
            Groups
          </button>
        </div>
      </div>

      <div className="px-5 py-2 text-xs text-[#98a2b3] shrink-0">Conversations</div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 min-h-0">
        {items.map((c) => (
          <button
            key={`${c.type}-${c.id}`}
            onClick={() => onSelect && onSelect(c)}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition ${
              String(activeId) === String(c.id) ? "bg-(--lav)" : "hover:bg-(--lav-2)"
            }`}
          >
            <div className="h-10 w-10 rounded-2xl bg-[#e5e7f2]" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold truncate">{c.username || c.email || c.name || c.id}</div>
                {c.time && <div className="text-xs text-[#98a2b3] shrink-0">{c.time}</div>}
              </div>
              <div className="text-xs text-[#98a2b3] truncate">{c.preview || ""}</div>
            </div>
            {c.type === "group" && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#eef2ff] text-[#4f46e5]">Group</span>
            )}
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