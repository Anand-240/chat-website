import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { api } from "../utils/api.js";
import Sidebar from "../components/Sidebar.jsx";
import ChatBox from "../components/ChatBox.jsx";
import Composer from "../components/Composer.jsx";
import {
  loadConvos,
  saveConvos,
  mergeConvos,
  loadActive,
  saveActive,
} from "../utils/convoStore.js";

export default function Chat({ onLogout }) {
  const { user, token, logout } = useAuth();
  const socket = useSocket();

  const userKey = String(user?.id || user?._id || "");
  const [convos, setConvos] = useState(() => loadConvos(userKey));
  const [receiverInput, setReceiverInput] = useState("");
  const [receiverId, setReceiverId] = useState(() => loadActive(userKey));
  const [messages, setMessages] = useState([]);
  const loadingRef = useRef(false);

  useEffect(() => {
    saveConvos(userKey, convos);
  }, [convos, userKey]);

  useEffect(() => {
    saveActive(userKey, receiverId);
  }, [receiverId, userKey]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { data } = await api(token).get("/chat/conversations");
        const mapped = (data || []).map((x) => ({
          id: x.id || x._id || x.username || x.email,
          username: x.username,
          email: x.email,
          preview: x.lastText,
          time: x.lastAt
            ? new Date(x.lastAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
          unread: x.unread || 0,
        }));
        setConvos((prev) => mergeConvos(prev, mapped));
        if (!receiverId && mapped.length)
          setReceiverId(String(mapped[0].id));
      } catch {}
    })();
  }, [token]);

  useEffect(() => {
    if (!socket) return;
    const me = String(user?.id || user?._id || "");
    const onNew = (msg) => {
      setMessages((prev) => [...prev, msg]);
      const target =
        String(msg.sender) === me ? String(msg.receiver) : String(msg.sender);
      const now = new Date(
        msg.createdAt || Date.now()
      ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      setConvos((prev) => {
        const base = mergeConvos(prev, [{ id: target }]);
        const idx = base.findIndex((c) => String(c.id) === target);
        const row = base[idx] || { id: target };
        const unread =
          receiverId === target
            ? 0
            : (row.unread || 0) + (String(msg.sender) !== me ? 1 : 0);
        const updated = {
          ...row,
          preview: msg.text ? msg.text : "Image",
          time: now,
          unread,
          temp: false,
        };
        const next = base.filter((c) => String(c.id) !== target);
        next.unshift(updated);
        saveConvos(userKey, next);
        return next;
      });

      if (String(msg.sender) === me && String(receiverId) !== target)
        setReceiverId(target);
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
          prev.map((c) =>
            String(c.id) === String(receiverId) ? { ...c, unread: 0 } : c
          )
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
      const { data } = await api(token).post("/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      imageUrl = data.url;
    }
    if (!text && !imageUrl) return;

    const now = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    setConvos((prev) => {
      const idx = prev.findIndex(
        (c) => String(c.id) === String(receiverId)
      );
      const preview = text ? text : "Image";
      let next;
      if (idx < 0) {
        next = [
          {
            id: receiverId,
            username: receiverId,
            preview,
            time: now,
            unread: 0,
            temp: true,
          },
          ...prev,
        ];
      } else {
        const row = { ...prev[idx], preview, time: now, unread: 0 };
        next = [...prev];
        next.splice(idx, 1);
        next.unshift(row);
      }
      saveConvos(userKey, next);
      return next;
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
    <div
      className="h-full max-w-[1200px] mx-auto p-4 grid"
      style={{ gridTemplateColumns: "320px 1fr", gap: "16px" }}
    >
      <Sidebar
        me={{ username: user?.username, email: user?.email }}
        items={convos}
        activeId={receiverId}
        onSelect={(id) => setReceiverId(id)}
      />

      <div className="h-full bg-white rounded-3xl border border-(--border) overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-(--border) flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-semibold">
              {receiverId ? `Chat with: ${receiverId}` : "Start a chat"}
            </div>
            {user && (
              <div className="text-xs text-[#667085]">
                Logged in as {user.username}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              className="rounded-xl border border-(--border) bg-[#0f1218] px-3 py-2 text-[14px] text-white/90 placeholder:text-[#70778a] outline-none focus:ring-2 focus:ring-(--accent2)/30 w-72"
              placeholder="username / email / id"
              value={receiverInput}
              onChange={(e) => setReceiverInput(e.target.value)}
              onKeyDown={handleKey}
            />
            <button
              onClick={applyReceiver}
              className="rounded-xl px-4 py-2 bg-(--primary) text-white text-sm font-medium"
            >
              Start
            </button>
            <button
              onClick={() => {
                logout();
                onLogout && onLogout();
              }}
              className="rounded-xl px-4 py-2 text-sm bg-[#f4f5f9]"
            >
              Logout
            </button>
          </div>
        </div>

        {!receiverId ? (
          <div className="flex-1 grid place-items-center text-[#667085] text-sm">
            Type a username, email, or id to start chatting
          </div>
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
