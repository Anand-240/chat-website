import React from "react";

export default function Navbar({
  authed,
  username,
  onGoLogin,
  onGoRegister,
  onGoChat,
  onLogout,
}) {
  return (
    <div className="w-full bg-white border-b border-(--border)">
      <div className="max-w-[1400px] mx-auto px-4 h-14 flex items-center justify-between">
        <div className="text-lg font-semibold">MERN Chat</div>
        <div className="flex items-center gap-2">
          <button
            onClick={onGoChat}
            className="rounded-lg px-3 py-1.5 bg-[#f4f5f9] text-sm"
          >
            Chat
          </button>
          {!authed ? (
            <>
              <button
                onClick={onGoLogin}
                className="rounded-lg px-3 py-1.5 bg-(--primary) text-white text-sm"
              >
                Login
              </button>
              <button
                onClick={onGoRegister}
                className="rounded-lg px-3 py-1.5 border border-(--border) text-sm"
              >
                Register
              </button>
            </>
          ) : (
            <>
              <div className="px-3 py-1.5 text-sm text-[#667085]">
                {username}
              </div>
              <button
                onClick={onLogout}
                className="rounded-lg px-3 py-1.5 border border-(--border) text-sm"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
