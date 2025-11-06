import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { api } from "../utils/api.js";
import Sidebar from "../components/Sidebar.jsx";
import ChatBox from "../components/ChatBox.jsx";
import Composer from "../components/Composer.jsx";

export default function Chat({ onLogout }) {
  const { user, token, logout } = useAuth();
  const socket = useSocket();

  const [convos, setConvos] = useState([]);
  const [receiverInput, setReceiverInput] = useState("");
  const [receiverId, setReceiverId] = useState("");
  const [messages, setMessages] = useState([]);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { data } = await api(token).get("/chat/conversations");
        const mapped = (data || []).map((x) => ({
          id: x.id,
          username: x.username,
          email: x.email,
          preview: x.lastText || (x.lastImage ? "Image" : ""),
          time: x.lastAt
            ? new Date(x.lastAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "",
          unread: 0,
        }));
        setConvos(mapped);
        if (!receiverId && mapped.length) setReceiverId(String(mapped[0].id));
      } catch {}
    })();
  }, [token]);

  useEffect(() => {
    if (!socket) return;
    const me = String(user?.id || user?._id || "");
    const onNew = (msg) => {
      const other = String(msg.sender) === me ? String(msg.receiver) : String(msg.sender);
      setMessages((prev) => (String(other) === String(receiverId) ? [...prev, msg] : prev));
      const now = new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setConvos((prev) => {
        const p = [...prev];
        const idx = p.findIndex((c) => String(c.id) === String(other));
        const preview = msg.text ? msg.text : "Image";
        if (idx < 0) {
          p.unshift({ id: other, preview, time: now, unread: String(receiverId) === String(other) ? 0 : 1 });
          return p;
        }
        const row = {
          ...p[idx],
          preview,
          time: now,
          unread: String(receiverId) === String(other) ? 0 : (p[idx].unread || 0) + (String(msg.sender) !== me ? 1 : 0),
        };
        p.splice(idx, 1);
        p.unshift(row);
        return p;
      });
    };
    socket.on("new_message", onNew);
    return () => socket.off("new_message", onNew);
  }, [socket, receiverId, user]);

  useEffect(() => {
    if (!receiverId || !token) return;
    if (loadingRef.current) return;
    loadingRef.current = true;
    (async () => {
      try {
        const { data } = await api(token).get(`/chat/${receiverId}`);
        setMessages(data);
        setConvos((prev) =>
          prev.map((c) => (String(c.id) === String(receiverId) ? { ...c, unread: 0 } : c))
        );
      } catch {
      } finally {
        loadingRef.current = false;
      }
    })();
  }, [receiverId, token]);

  async function handleSend({ text, file }) {
    if (!receiverId) return;
    let imageUrl;
    if (file) {
      const form = new FormData();
      form.append("image", file);
      const { data } = await api(token).post("/api/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      imageUrl = data.url;
    }
    if (!text && !imageUrl) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setConvos((prev) => {
      const p = [...prev];
      const idx = p.findIndex((c) => String(c.id) === String(receiverId));
      const preview = text ? text : "Image";
      if (idx < 0) {
        p.unshift({ id: receiverId, username: receiverId, preview, time: now, unread: 0 });
        return p;
      }
      const row = { ...p[idx], preview, time: now, unread: 0 };
      p.splice(idx, 1);
      p.unshift(row);
      return p;
    });
    socket?.emit("send_message", { receiverId, text, imageUrl });
  }

  function applyReceiver() {
    const v = receiverInput.trim();
    if (!v) return;
    setReceiverId(v);
    setReceiverInput("");
    setMessages([]);
  }

  function handleKey(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      applyReceiver();
    }
  }

  const meId = user?.id || user?._id;

  return (
    <div className="h-full max-w-[1200px] mx-auto p-4 grid" style={{ gridTemplateColumns: "320px 1fr", gap: "16px" }}>
      <div className="h-full w-80 bg-white rounded-3xl border border-(--border) overflow-hidden flex flex-col">
        <div className="px-4 pt-4 pb-3 border-b border-(--border)">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#eceef6]" />
            <div className="min-w-0">
              <div className="font-semibold truncate">{user?.username || "User"}</div>
              <div className="text-xs text-[#667085] truncate">{user?.email || ""}</div>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <input
              className="w-full rounded-xl bg-[#f6f7fb] px-3 py-2 text-sm outline-none"
              placeholder="username / email / id"
              value={receiverInput}
              onChange={(e)=>setReceiverInput(e.target.value)}
              onKeyDown={handleKey}
            />
            <button onClick={applyReceiver} className="rounded-xl px-3 py-2 bg-(--primary) text-white text-sm">
              Start
            </button>
          </div>
        </div>
        <div className="px-3 py-2 text-xs text-[#98a2b3]">All chats</div>
        <div className="flex-1 overflow-y-auto p-2">
          {convos.map((c) => (
            <button
              key={c.id}
              onClick={() => setReceiverId(String(c.id))}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition ${String(receiverId) === String(c.id) ? "bg-[#ebe7ff]" : "hover:bg-[#f7f7fb]"}`}
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
          {!convos.length && <div className="px-3 py-4 text-sm text-[#98a2b3]">No conversations yet</div>}
        </div>
        <div className="px-4 py-3 border-t border-(--border)">
          <button onClick={()=>{ logout(); onLogout && onLogout(); }} className="rounded-xl px-4 py-2 text-sm bg-[#f4f5f9] w-full">Logout</button>
        </div>
      </div>

      <div className="h-full bg-white rounded-3xl border border-(--border) overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-(--border) flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-semibold">{receiverId ? `Chat with: ${receiverId}` : "Start a chat"}</div>
            {user && <div className="text-xs text-[#667085]">Logged in as {user.username}</div>}
          </div>
        </div>
        {!receiverId ? (
          <div className="flex-1 grid place-items-center text-[#667085] text-sm">Type a username, email, or id to start chatting</div>
        ) : (
          <>
            <ChatBox messages={messages} meId={meId} />
            <Composer onSend={handleSend} />
          </>
        )}
      </div>
    </div>
  );
}
