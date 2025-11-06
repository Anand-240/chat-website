import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { api } from "../utils/api.js";
import ChatBox from "../components/ChatBox.jsx";
import Composer from "../components/Composer.jsx";

export default function Chat({ onLogout }) {
  const { user, token, logout } = useAuth();
  const socket = useSocket();
  const [otherUserId, setOtherUserId] = useState("");
  const [messages, setMessages] = useState([]);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!socket) return;
    const onNew = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };
    socket.on("new_message", onNew);
    return () => {
      socket.off("new_message", onNew);
    };
  }, [socket]);

  useEffect(() => {
    if (!otherUserId || !token) return;
    if (loadingRef.current) return;
    loadingRef.current = true;
    (async () => {
      try {
        const { data } = await api(token).get(`/chat/${otherUserId}`);
        setMessages(data);
      } finally {
        loadingRef.current = false;
      }
    })();
  }, [otherUserId, token]);

  async function handleSend({ text, file }) {
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
    socket?.emit("send_message", { receiverId: otherUserId, text, imageUrl });
  }

  function doLogout() {
    logout();
    onLogout && onLogout();
  }

  return (
    <div className="h-full max-w-4xl mx-auto flex flex-col">
      <header className="p-3 flex items-center justify-between">
        <div className="font-semibold">Logged in as {user?.username}</div>
        <div className="flex items-center gap-2">
          <input
            className="border rounded p-2 w-72"
            placeholder="Enter other user's ID"
            value={otherUserId}
            onChange={(e) => setOtherUserId(e.target.value)}
          />
          <button onClick={doLogout} className="px-3 py-2 rounded bg-gray-200">
            Logout
          </button>
        </div>
      </header>

      <ChatBox messages={messages} meId={user?.id} />
      <Composer onSend={handleSend} />
    </div>
  );
}
