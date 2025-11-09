import React from "react";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar({ onGoChat, onGoProfile }) {
  const { user, logout } = useAuth();
  return (
    <div className="h-12 px-4 border-b border-(--border) bg-white flex items-center justify-between">
      <div className="font-semibold">MERN Chat</div>
      <div className="flex items-center gap-2">
        <button onClick={onGoChat} className="px-3 py-1.5 rounded-lg text-sm bg-[#f4f5f9]">Chat</button>
        <button onClick={onGoProfile} className="px-3 py-1.5 rounded-lg text-sm bg-[#f4f5f9]">Profile</button>
        <div className="text-sm text-[#667085]">{user?.username}</div>
        <button onClick={logout} className="px-3 py-1.5 rounded-lg text-sm bg-(--primary) text-white">Logout</button>
      </div>
    </div>
  );
}