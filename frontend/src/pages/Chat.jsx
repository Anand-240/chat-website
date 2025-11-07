import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { api } from "../utils/api.js";
import Sidebar from "../components/Sidebar.jsx";
import ChatBox from "../components/ChatBox.jsx";
import Composer from "../components/Composer.jsx";

const isOid = (s) => /^[a-f0-9]{24}$/i.test(String(s || ""));
const cid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const activeKey = (uid) => `active_chat:${uid || "guest"}`;

export default function Chat() {
  const { user, token, logout } = useAuth();
  const socket = useSocket();

  const [convos, setConvos] = useState([]);
  const [receiverInput, setReceiverInput] = useState("");
  const [receiverId, setReceiverId] = useState("");
  const [messages, setMessages] = useState([]);
  const loadingRef = useRef(false);

  const meId = String(user?.id || user?._id || "");

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
          time: x.lastAt ? new Date(x.lastAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
          unread: 0
        }));
        setConvos(mapped);
        const saved = localStorage.getItem(activeKey(meId));
        if (saved && mapped.some((c) => String(c.id) === String(saved))) {
          setReceiverId(saved);
        } else if (!receiverId && mapped.length) {
          setReceiverId(String(mapped[0].id));
        }
      } catch {}
    })();
  }, [token]);

  useEffect(() => {
    if (!socket) return;
    const onNew = (msg) => {
      const other = String(msg.sender) === meId ? String(msg.receiver) : String(msg.sender);
      const show = String(other) === String(receiverId);
      if (show) {
        setMessages((prev) => {
          if (msg._clientId && prev.some((p) => p._clientId === msg._clientId)) return prev;
          return [...prev, msg];
        });
      }
      const now = new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setConvos((prev) => {
        const p = [...prev];
        const idx = p.findIndex((c) => String(c.id) === String(other));
        const preview = msg.text ? msg.text : "Image";
        if (idx < 0) {
          p.unshift({ id: other, preview, time: now, unread: show ? 0 : 1 });
          return p;
        }
        const row = { ...p[idx], preview, time: now, unread: show ? 0 : (p[idx].unread || 0) + (String(msg.sender) !== meId ? 1 : 0) };
        p.splice(idx, 1);
        p.unshift(row);
        return p;
      });
    };
    socket.on("new_message", onNew);
    return () => socket.off("new_message", onNew);
  }, [socket, receiverId, meId]);

  useEffect(() => {
    if (!receiverId || !token) return;
    localStorage.setItem(activeKey(meId), receiverId);
    if (loadingRef.current) return;
    loadingRef.current = true;
    (async () => {
      try {
        const { data } = await api(token).get(`/chat/${receiverId}`);
        setMessages(data);
        setConvos((prev) => prev.map((c) => (String(c.id) === String(receiverId) ? { ...c, unread: 0 } : c)));
      } catch {
      } finally {
        loadingRef.current = false;
      }
    })();
  }, [receiverId, token, meId]);

  async function applyReceiver() {
    const q = receiverInput.trim();
    if (!q) return;
    try {
      const { data } = await api(token).get(`/chat/resolve/${encodeURIComponent(q)}`);
      const { id, username, email } = data;
      setReceiverId(id);
      setReceiverInput("");
      setMessages([]);
      setConvos((prev) => {
        if (prev.some((c) => String(c.id) === String(id))) return prev;
        return [{ id, username, email, preview: "", time: "", unread: 0 }, ...prev];
      });
    } catch {
      alert("User not found. Please enter a registered username or email.");
    }
  }

  async function handleSend({ text, file }) {
    if (!isOid(receiverId)) {
      alert("Select a valid user first.");
      return;
    }
    let imageUrl;
    if (file) {
      const form = new FormData();
      form.append("image", file);
      const { data } = await api(token).post("/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
      imageUrl = data.url;
    }
    if (!text && !imageUrl) return;

    const _clientId = cid();
    const optimistic = { _clientId, _id: _clientId, sender: meId, receiver: receiverId, text: text || "", imageUrl: imageUrl || "", createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setConvos((prev) => {
      const p = [...prev];
      const idx = p.findIndex((c) => String(c.id) === String(receiverId));
      const preview = text ? text : "Image";
      if (idx < 0) { p.unshift({ id: receiverId, preview, time: now, unread: 0 }); return p; }
      const row = { ...p[idx], preview, time: now, unread: 0 };
      p.splice(idx, 1);
      p.unshift(row);
      return p;
    });

    socket?.emit("send_message", { receiverId, text, imageUrl, _clientId });
  }

  function handleKey(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      applyReceiver();
    }
  }

  return (
    <div className="h-full max-w-[1200px] mx-auto p-4 grid" style={{ gridTemplateColumns: "320px 1fr", gap: "16px" }}>
      <Sidebar me={{ username: user?.username, email: user?.email }} items={convos} activeId={receiverId} onSelect={(id) => setReceiverId(id)} />
      <div className="h-full bg-white rounded-3xl border border-(--border) overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-(--border) flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-semibold">{receiverId ? "Chat" : "Start a chat"}</div>
            {user && <div className="text-xs text-[#667085]">{user.username}</div>}
          </div>
          <div className="flex items-center gap-2">
            <input
              className="rounded-xl border border-(--border) bg-[#0f1218] px-3 py-2 text-[14px] text-white/90 placeholder:text-[#70778a] outline-none focus:ring-2 focus:ring-(--accent2)/30 w-72"
              placeholder="username / email"
              value={receiverInput}
              onChange={(e) => setReceiverInput(e.target.value)}
              onKeyDown={handleKey}
            />
            <button onClick={applyReceiver} className="rounded-xl px-4 py-2 bg-(--primary) text-white text-sm font-medium">Start</button>
            <button onClick={logout} className="rounded-xl px-4 py-2 text-sm bg-[#f4f5f9]">Logout</button>
          </div>
        </div>
        {!receiverId ? (
          <div className="flex-1 grid place-items-center text-[#667085] text-sm">Type a registered username or email to start</div>
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