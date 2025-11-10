import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { useCall } from "../context/CallContext.jsx";
import { api } from "../utils/api.js";
import Sidebar from "../components/Sidebar.jsx";
import ChatBox from "../components/ChatBox.jsx";
import Composer from "../components/Composer.jsx";
import VideoCall from "../components/VideoCall.jsx";

const isOid = (s) => /^[a-f0-9]{24}$/i.test(String(s || ""));
const cid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function Chat() {
  const { user, token } = useAuth();
  const socket = useSocket();
  const { startCall } = useCall();
  const meId = String(user?.id || user?._id || "");
  const [mode, setMode] = useState("dm");
  const [convos, setConvos] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [peerInfo, setPeerInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { data } = await api(token).get("/chat/conversations");
        const mapped = (data || [])
          .map((x) => {
            const other = (x.participants || []).find((p) => String(p._id) !== String(meId)) || {};
            return { type: "dm", id: String(other._id || ""), username: other.username || "", email: other.email || "", ts: new Date(x.updatedAt || Date.now()).getTime() };
          })
          .filter((r) => r.id);
        setConvos(mapped);
      } catch {}
      try {
        const { data } = await api(token).get("/groups");
        setGroups((data || []).map((g) => ({ type: "group", id: String(g._id), name: g.name, ts: new Date(g.updatedAt || Date.now()).getTime() })));
      } catch {}
    })();
  }, [token, meId]);

  useEffect(() => {
    if (!socket) return;

    const onDM = (msg) => {
      if (mode !== "dm") return;
      const other = String(msg.sender) === meId ? String(msg.receiver) : String(msg.sender);
      if (String(activeId) !== String(other)) return;
      setMessages((prev) => (prev.some((p) => p._id === msg._id || p._clientId === msg._clientId) ? prev : [...prev, msg]));
    };

    const onGroup = (msg) => {
      if (mode !== "group") return;
      if (String(activeId) !== String(msg.group)) return;
      const senderId = typeof msg.sender === "object" ? String(msg.sender._id) : String(msg.sender);
      const senderName = typeof msg.sender === "object" ? msg.sender.username : msg.senderName || "Unknown";
      const normalized = { ...msg, sender: senderId, senderName };
      setMessages((prev) => (prev.some((p) => p._id === normalized._id || p._clientId === normalized._clientId) ? prev : [...prev, normalized]));
    };

    socket.on("new_message", onDM);
    socket.on("new_group_message", onGroup);
    return () => {
      socket.off("new_message", onDM);
      socket.off("new_group_message", onGroup);
    };
  }, [socket, mode, activeId, meId]);

  useEffect(() => {
    if (!activeId || !token) return;
    if (loadingRef.current) return;
    loadingRef.current = true;
    (async () => {
      try {
        if (mode === "dm") {
          const [chatRes, userRes] = await Promise.all([api(token).get(`/chat/${activeId}`), api(token).get(`/chat/user/${activeId}`)]);
          setMessages(chatRes.data || []);
          setPeerInfo(userRes.data || null);
        } else {
          socket?.emit("join_group", { groupId: activeId, userId: meId });
          const [metaRes, msgsRes] = await Promise.all([api(token).get(`/groups/${activeId}`), api(token).get(`/groups/${activeId}/messages`)]);
          const msgsWithNames = (msgsRes.data || []).map((m) => {
            const senderId = typeof m.sender === "object" ? String(m.sender._id) : String(m.sender);
            const senderName = typeof m.sender === "object" ? m.sender.username : m.senderName || "Unknown";
            return { ...m, sender: senderId, senderName };
          });
          setPeerInfo(metaRes.data || null);
          setMessages(msgsWithNames);
        }
      } catch {
        setMessages([]);
        setPeerInfo(null);
      } finally {
        loadingRef.current = false;
      }
    })();
  }, [activeId, mode, token, meId, socket]);

  async function handleSend({ text, file }) {
    if (!isOid(activeId)) return;
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

    if (mode === "dm") {
      const optimistic = { _clientId, _id: _clientId, sender: meId, receiver: activeId, text: text || "", imageUrl: imageUrl || "", createdAt: now.toISOString() };
      setMessages((p) => [...p, optimistic]);
      await api(token).post(`/chat/${activeId}`, { text, imageUrl, _clientId });
    } else {
      const optimistic = { _clientId, _id: _clientId, sender: meId, senderName: user.username, group: activeId, text: text || "", imageUrl: imageUrl || "", createdAt: now.toISOString() };
      setMessages((p) => [...p, optimistic]);
      await api(token).post(`/groups/${activeId}/messages`, { text, imageUrl, _clientId, senderName: user.username });
    }
  }

  function onGroupCreated(g) {
    setGroups((prev) => [{ type: "group", id: String(g._id), name: g.name, ts: new Date(g.updatedAt || Date.now()).getTime() }, ...prev]);
  }

  const items = [...convos.map((c) => ({ ...c, label: c.username, type: "dm" })), ...groups.map((g) => ({ ...g, label: `# ${g.name}`, type: "group" }))].sort((a, b) => (b.ts || 0) - (a.ts || 0));

  return (
    <div className="h-screen w-full overflow-hidden bg-white">
      <VideoCall />
      <div className="grid h-full w-full" style={{ gridTemplateColumns: "340px 1fr" }}>
        <Sidebar
          me={{ username: user?.username, email: user?.email }}
          items={items}
          activeId={activeId}
          onSelect={(row) => { setMode(row.type); setActiveId(row.id); }}
          view={mode}
          onChangeView={(v) => setMode(v)}
          onGroupCreated={onGroupCreated}
        />
        <div className="h-full min-h-0 w-full bg-white border-l border-gray-200 flex flex-col">
          <div className="px-6 h-16 border-b border-gray-200 flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-base font-semibold truncate">{mode === "dm" ? peerInfo?.username || "Chat" : peerInfo?.name || "Group"}</div>
              <div className="text-[12px] text-gray-500 truncate">{mode === "dm" ? peerInfo?.email || "" : peerInfo?.members?.map((m) => m.username).join(", ") || ""}</div>
            </div>
            <div className="flex items-center gap-2">
              {mode === "dm" && activeId && (
                <button onClick={() => startCall(activeId)} className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm">
                  Video Call
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 min-h-0 flex flex-col bg-white">
            <div className="flex-1 overflow-y-auto">
              <ChatBox messages={messages} meId={meId} isGroup={mode === "group"} />
            </div>
            <div className="border-t border-gray-200">
              <Composer onSend={handleSend} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}