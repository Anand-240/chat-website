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
  const [groups, setGroups] = useState([]);
  const [receiverInput, setReceiverInput] = useState("");
  const [receiverId, setReceiverId] = useState("");
  const [receiverInfo, setReceiverInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [friendsSet, setFriendsSet] = useState(new Set());
  const meId = String(user?.id || user?._id || "");
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { data } = await api(token).get("/chat/conversations");
        const mapped = (data || []).map((x) => {
          const other = (x.participants || []).find((p) => String(p._id) !== String(meId)) || {};
          const last = x.lastMessage || {};
          const preview = last.text ? last.text : last.image ? "Image" : "";
          const ts = x.updatedAt ? new Date(x.updatedAt).getTime() : 0;
          const time = ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
          return { type: "dm", id: String(other._id || ""), username: other.username || "", email: other.email || "", preview, time, ts, unread: 0 };
        }).filter(r => r.id);
        setConvos(mapped);
        const saved = localStorage.getItem(activeKey(meId));
        if (saved && mapped.some((c) => String(c.id) === String(saved))) setReceiverId(saved);
      } catch {}
      try {
        const { data } = await api(token).get("/groups");
        setGroups((data || []).map(g => ({
          type: "group",
          id: String(g._id),
          name: g.name,
          preview: "",
          time: "",
          ts: new Date(g.updatedAt || Date.now()).getTime(),
          unread: 0
        })));
      } catch {}
      try {
        const { data } = await api(token).get("/friends/friends");
        const ids = new Set((data || []).map(u => String(u._id)));
        setFriendsSet(ids);
      } catch {}
    })();
  }, [token, meId]);

  useEffect(() => {
    if (!socket) return;
    const onNew = (msg) => {
      const other = String(msg.sender) === meId ? String(msg.receiver) : String(msg.sender);
      const show = String(other) === String(receiverId);
      if (show) setMessages((prev) => (msg._clientId && prev.some((p) => p._clientId === msg._clientId) ? prev : [...prev, msg]));
      const now = new Date(msg.createdAt || Date.now());
      const nowStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setConvos((prev) => {
        const p = [...prev];
        const idx = p.findIndex((c) => String(c.id) === String(other));
        const preview = msg.text ? msg.text : "Image";
        if (idx < 0) {
          p.unshift({ type: "dm", id: other, username: "", email: "", preview, time: nowStr, ts: now.getTime(), unread: show ? 0 : 1 });
          return p;
        }
        const row = { ...p[idx], preview, time: nowStr, ts: now.getTime(), unread: show ? 0 : (p[idx].unread || 0) + (String(msg.sender) !== meId ? 1 : 0) };
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
        const ok = await api(token).get(`/friends/check/${receiverId}`);
        if (!ok.data.isFriend) {
          setMessages([]);
          loadingRef.current = false;
          return;
        }
        const [chatRes, userRes] = await Promise.all([
          api(token).get(`/chat/${receiverId}`),
          api(token).get(`/chat/user/${receiverId}`)
        ]);
        setMessages(chatRes.data);
        setReceiverInfo(userRes.data);
      } catch {
        setMessages([]);
        setReceiverInfo(null);
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
      const ok = await api(token).get(`/friends/check/${id}`);
      if (!ok.data.isFriend) {
        alert("Send a friend request and wait for acceptance before chatting.");
        return;
      }
      setReceiverId(id);
      setReceiverInfo({ id, username, email });
      setReceiverInput("");
      setMessages([]);
      setConvos((prev) => prev.some((c) => c.type === "dm" && String(c.id) === String(id)) ? prev : [{ type: "dm", id, username, email, preview: "", time: "", ts: 0, unread: 0 }, ...prev]);
    } catch (e) {
      alert(e.response?.data?.error || "User not found.");
    }
  }

  async function handleSend({ text, file }) {
    if (!isOid(receiverId)) return alert("Select a valid user first.");
    if (!friendsSet.has(String(receiverId))) return alert("You can message only after friendship is accepted.");
    let imageUrl;
    if (file) {
      const form = new FormData();
      form.append("image", file);
      const up = await api(token).post("/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
      imageUrl = up.data.url;
    }
    if (!text && !imageUrl) return;

    const now = new Date();
    const _clientId = cid();
    const optimistic = { _clientId, _id: _clientId, sender: meId, receiver: receiverId, text: text || "", imageUrl: imageUrl || "", createdAt: now.toISOString() };
    setMessages((prev) => [...prev, optimistic]);
    const nowStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const preview = text ? text : "Image";
    setConvos((prev) => {
      const p = [...prev];
      const idx = p.findIndex((c) => c.type === "dm" && String(c.id) === String(receiverId));
      if (idx < 0) { p.unshift({ type: "dm", id: receiverId, username: receiverInfo?.username || "", email: receiverInfo?.email || "", preview, time: nowStr, ts: now.getTime(), unread: 0 }); return p; }
      const row = { ...p[idx], preview, time: nowStr, ts: now.getTime(), unread: 0 };
      p.splice(idx, 1);
      p.unshift(row);
      return p;
    });

    await api(token).post(`/chat/${receiverId}`, { text: text || "", imageUrl: imageUrl || "" });
    socket?.emit("send_message", { senderId: meId, receiverId, text, imageUrl, _clientId });
  }

  function handleKey(e) { if (e.key === "Enter") { e.preventDefault(); applyReceiver(); } }

  const list = [...convos, ...groups].sort((a, b) => (b.ts || 0) - (a.ts || 0));

  return (
    <div className="h-screen w-full overflow-hidden bg-white">
      <div className="grid h-full w-full" style={{ gridTemplateColumns: "360px 1fr" }}>
        <Sidebar
          me={{ username: user?.username, email: user?.email }}
          items={list}
          activeId={receiverId}
          onSelect={(c) => { if (c.type === "dm") { setReceiverId(c.id); setReceiverInfo(c); } }}
          view="dm"
          onChangeView={() => {}}
        />
        <div className="h-full min-h-0 w-full bg-white border-l border-(--border) flex flex-col">
          <div className="px-6 h-16 border-b border-(--border) flex items-center justify-between shrink-0">
            <div className="min-w-0">
              <div className="text-base font-semibold truncate">{receiverInfo?.username || "Chat"}</div>
              <div className="text-[12px] text-[#667085] truncate">{receiverInfo?.email || ""}</div>
            </div>
            <div className="flex items-center gap-2">
              <input
                className="rounded-xl border border-(--border) bg-[#0f1218] px-3 py-2 text-[14px] text-white/90 placeholder:text-[#70778a] outline-none focus:ring-2 focus:ring-(--accent2)/30 w-72"
                placeholder="username / email"
                value={receiverInput}
                onChange={(e) => setReceiverInput(e.target.value)}
                onKeyDown={handleKey}
              />
              <button onClick={applyReceiver} className="rounded-xl px-4 py-2 bg-(--primary) text-white text-sm">Start</button>
              <button onClick={logout} className="rounded-xl px-4 py-2 text-sm bg-[#f4f5f9]">Logout</button>
            </div>
          </div>
          {!receiverId ? (
            <div className="flex-1 grid place-items-center text-[#667085] text-sm min-h-0">Type a registered username or email to start</div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col bg-white">
              <div className="flex-1 overflow-y-auto">
                <ChatBox messages={messages} meId={meId} />
              </div>
              <div className="border-t border-(--border) mt-0">
                <Composer onSend={handleSend} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}