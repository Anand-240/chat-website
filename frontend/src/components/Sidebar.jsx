import React from "react";

export default function Sidebar({ users, activeId, onSelect }) {
  return (
    <div className="w-64 border-r bg-white">
      <div className="px-3 py-2 font-semibold border-b">Chats</div>
      <div className="p-2 space-y-1">
        {users.map((u) => (
          <button
            key={u.id}
            onClick={() => onSelect(u.id)}
            className={`w-full text-left px-3 py-2 rounded-lg ${
              activeId === u.id ? "bg-black text-white" : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            <div className="font-medium">{u.username}</div>
            {u.last && <div className="text-xs opacity-70 truncate">{u.last}</div>}
          </button>
        ))}
      </div>
    </div>
  );
}
