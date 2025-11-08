import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { api } from "../utils/api.js";
import Sidebar from "../components/Sidebar.jsx";
import ChatBox from "../components/ChatBox.jsx";
import Composer from "../components/Composer.jsx";
import NewGroupModal from "../components/NewGroupModal.jsx";

const isOid = (s) => /^[a-f0-9]{24}$/i.test(String(s || ""));
const cid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const activeKey = (uid) => `active_chat:${uid || "guest"}`;
const activeGroupKey = (uid) => `active_group:${uid || "guest"}`;

export default function Chat() {
  const { user, token, logout } = useAuth();
  const socket = useSocket();

  const [mode, setMode] = useState("dm");
  const [sidebarView, setSidebarView] = useState("all");
  const [convos, setConvos] = useState([]);
  const [groups, setGroups] = useState([]);
  const [receiverInput, setReceiverInput] = useState("");
  const [receiverId, setReceiverId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [groupInfo, setGroupInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [openGroupModal, setOpenGroupModal] = useState(false);
  const loadingRef = useRef(false);

  const meId = String(user?.id || user?._id || "");

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { data } = await api(token).get("/chat/conversations");
        const mapped = (data || []).map((x) => ({
          type: "dm",
          id: x.id,
          username: x.username,
          email: x.email,
          preview: x.lastText || (x.lastImage ? "Image" : ""),
          time: x.lastAt ? new Date(x.lastAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
          ts: x.lastAt ? new Date(x.lastAt).getTime() : 0,
          unread: 0
        }));
        setConvos(mapped);
        const saved = localStorage.getItem(activeKey(meId));
        if (saved && mapped.some((c) => String(c.id) === String(saved))) setReceiverId(saved);
        else if (mapped.length) setReceiverId(String(mapped[0].id));
      } catch {}
      try {
        const { data } = await api(token).get("/groups");
        const gs = (data || []).map((g) => ({
          type: "group",
          id: String(g._id),
          name: g.name,
          preview: g.lastText || (g.lastImage ? "Image" : ""),
          time: g.lastAt ? new Date(g.lastAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
          ts: g.lastAt ? new Date(g.lastAt).getTime() : 0,
          unread: 0
        }));
        setGroups(gs);
        const savedG = localStorage.getItem(activeGroupKey(meId));
        if (savedG && gs.some((x) => String(x.id) === String(savedG))) setGroupId(savedG);
        else if (gs.length) setGroupId(gs[0].id);
      } catch {}
    })();
  }, [token]);

  useEffect(() => {
    if (!socket) return;
    const onNew = (msg) => {
      const other = String(msg.sender) === meId ? String(msg.receiver) : String(msg.sender);
      const show = mode === "dm" && String(other) === String(receiverId);
      if (show) setMessages((prev) => (msg._clientId && prev.some((p) => p._clientId === msg._clientId) ? prev : [...prev, msg]));
      const now = new Date(msg.createdAt || Date.now());
      const nowStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setConvos((prev) => {
        const p = [...prev];
        const idx = p.findIndex((c) => String(c.id) === String(other));
        const preview = msg.text ? msg.text : "Image";
        if (idx < 0) { p.unshift({ type:"dm", id: other, preview, time: nowStr, ts: now.getTime(), unread: show ? 0 : 1 }); return p; }
        const row = { ...p[idx], preview, time: nowStr, ts: now.getTime(), unread: show ? 0 : (p[idx].unread || 0) + (String(msg.sender) !== meId ? 1 : 0) };
        p.splice(idx, 1); p.unshift(row); return p;
      });
    };
    const onNewGroup = (msg) => {
      const show = mode === "group" && String(msg.group) === String(groupId);
      if (show) setMessages((prev) => (msg._clientId && prev.some((p) => p._clientId === msg._clientId) ? prev : [...prev, msg]));
      const now = new Date(msg.createdAt || Date.now());
      const nowStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setGroups((prev) => {
        const p = [...prev];
        const idx = p.findIndex((g) => String(g.id) === String(msg.group));
        const preview = msg.text ? msg.text : "Image";
        if (idx < 0) return p;
        const row = { ...p[idx], preview, time: nowStr, ts: now.getTime(), unread: show ? 0 : (p[idx].unread || 0) + 1 };
        p.splice(idx, 1); p.unshift(row); return p;
      });
    };
    socket.on("new_message", onNew);
    socket.on("new_group_message", onNewGroup);
    return () => {
      socket.off("new_message", onNew);
      socket.off("new_group_message", onNewGroup);
    };
  }, [socket, receiverId, groupId, mode, meId]);

  useEffect(() => {
    if (mode !== "dm" || !receiverId || !token) return;
    localStorage.setItem(activeKey(meId), receiverId);
    if (loadingRef.current) return;
    loadingRef.current = true;
    (async () => {
      try {
        const { data } = await api(token).get(`/chat/${receiverId}`);
        setMessages(data);
      } catch {} finally { loadingRef.current = false; }
    })();
  }, [receiverId, token, meId, mode]);

  useEffect(() => {
    if (mode !== "group" || !groupId || !token) return;
    localStorage.setItem(activeGroupKey(meId), groupId);
    if (loadingRef.current) return;
    loadingRef.current = true;
    (async () => {
      try {
        const [messagesRes, infoRes] = await Promise.all([
          api(token).get(`/groups/${groupId}/messages`),
          api(token).get(`/groups/${groupId}`)
        ]);
        setMessages(messagesRes.data);
        setGroupInfo(infoRes.data);
      } catch {
        setGroupInfo(null);
      } finally { loadingRef.current = false; }
    })();
  }, [groupId, token, meId, mode]);

  async function applyReceiver() {
    if (mode !== "dm") return;
    const q = receiverInput.trim();
    if (!q) return;
    try {
      const { data } = await api(token).get(`/chat/resolve/${encodeURIComponent(q)}`);
      const { id, username, email } = data;
      setReceiverId(id);
      setReceiverInput("");
      setMessages([]);
      setConvos((prev) => (prev.some((c) => c.type==="dm" && String(c.id) === String(id)) ? prev : [{ type:"dm", id, username, email, preview: "", time: "", ts: 0, unread: 0 }, ...prev]));
    } catch {
      alert("User not found. Please enter a registered username or email.");
    }
  }

  async function handleSend({ text, file }) {
    if (mode === "dm" && !isOid(receiverId)) return alert("Select a valid user first.");
    if (mode === "group" && !isOid(groupId)) return alert("Select a valid group first.");
    let imageUrl;
    if (file) {
      const form = new FormData();
      form.append("image", file);
      const { data } = await api(token).post("/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
      imageUrl = data.url;
    }
    if (!text && !imageUrl) return;

    const _clientId = cid();
    if (mode === "dm") {
      const optimistic = { _clientId, _id: _clientId, sender: meId, receiver: receiverId, text: text || "", imageUrl: imageUrl || "", createdAt: new Date().toISOString() };
      setMessages((prev) => [...prev, optimistic]);
      socket?.emit("send_message", { receiverId, text, imageUrl, _clientId });
    } else {
      const optimistic = { _clientId, _id: _clientId, sender: meId, group: groupId, text: text || "", imageUrl: imageUrl || "", createdAt: new Date().toISOString() };
      setMessages((prev) => [...prev, optimistic]);
      socket?.emit("send_group_message", { groupId, text, imageUrl, _clientId });
    }
  }

  function handleKey(e) { if (e.key === "Enter") { e.preventDefault(); applyReceiver(); } }

  const allItems = [...convos, ...groups].sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const listForSidebar = sidebarView === "all" ? allItems : sidebarView === "dm" ? convos : groups;

  const active = mode === "dm" ? receiverId : groupId;
  const onSelectItem = (c) => {
    if (c.type === "dm") { setMode("dm"); setReceiverId(c.id); }
    else { setMode("group"); setGroupId(c.id); }
  };

  const groupMembersLine = groupInfo?.members?.map(m => m.username || m.email || m.id).join(", ") || "";
  const memberMap = (groupInfo?.members || []).reduce((acc, m) => {
    acc[m.id] = m.username || m.email || m.id;
    return acc;
  }, {});

  return (
    <div className="h-screen w-full overflow-hidden bg-white">
      <div className="grid h-full w-full" style={{ gridTemplateColumns: "360px 1fr" }}>
        <div className="min-h-0">
          <Sidebar
            me={{ username: user?.username, email: user?.email }}
            items={listForSidebar}
            activeId={active}
            onSelect={onSelectItem}
            view={sidebarView}
            onChangeView={setSidebarView}
          />
        </div>
        <div className="h-full min-h-0 w-full bg-white border-l border-(--border) flex flex-col">
          <div className="px-6 h-16 border-b border-(--border) flex items-center justify-between shrink-0">
            <div className="min-w-0">
              <div className="text-base font-semibold truncate">
                {mode === "dm" ? (active ? "Chat" : "Start a chat") : (groupInfo?.name || "Group")}
              </div>
              {mode === "dm" && user && <div className="text-[12px] text-[#667085] truncate">{user.username}</div>}
              {mode === "group" && groupMembersLine && (
                <div className="text-[12px] text-[#667085] truncate">{groupMembersLine}</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {mode === "dm" && (
                <>
                  <input
                    className="rounded-xl border border-(--border) bg-[#0f1218] px-3 py-2 text-[14px] text-white/90 placeholder:text-[#70778a] outline-none focus:ring-2 focus:ring-(--accent2)/30 w-80"
                    placeholder="username / email"
                    value={receiverInput}
                    onChange={(e) => setReceiverInput(e.target.value)}
                    onKeyDown={handleKey}
                  />
                  <button onClick={applyReceiver} className="rounded-xl px-4 py-2 bg-(--primary) text-white text-sm">Start</button>
                </>
              )}
              {mode === "group" && (
                <button onClick={() => setOpenGroupModal(true)} className="rounded-xl px-4 py-2 bg-(--primary) text-white text-sm">
                  New Group
                </button>
              )}
              <button onClick={logout} className="rounded-xl px-4 py-2 text-sm bg-[#f4f5f9]">Logout</button>
            </div>
          </div>
          {(!active) ? (
            <div className="flex-1 grid place-items-center text-[#667085] text-sm min-h-0">
              {mode==="dm" ? "Type a registered username or email to start" : "Select a group to start"}
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col bg-white">
              <div className="flex-1 overflow-y-auto">
                <ChatBox
                  messages={messages}
                  meId={meId}
                  showSenderNames={mode === "group"}
                  memberMap={memberMap}
                />
              </div>
              <div className="border-t border-(--border) mt-0">
                <Composer onSend={handleSend} />
              </div>
            </div>
          )}
        </div>
      </div>
      {openGroupModal && (
        <NewGroupModal
          token={token}
          onClose={() => setOpenGroupModal(false)}
          onCreated={(g) => {
            const row = { type:"group", id: String(g._id), name: g.name, preview: "", time: "", ts: 0, unread: 0 };
            setGroups((prev) => [row, ...prev]);
            setMode("group");
            setGroupId(String(g._id));
          }}
        />
      )}
    </div>
  );
}