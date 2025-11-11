import React, { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../constants.js";
import { useAuth } from "./AuthContext.jsx";

const SocketContext = createContext(null);
export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }) {
  const { token, user } = useAuth();
  const userId = String(user?.id || user?._id || "");
  const sockRef = useRef(null);

  const socket = useMemo(() => {
    if (!token || !userId) return null;
    const s = io(SOCKET_URL, {
      transports: ["websocket"],
      withCredentials: true,
      auth: { token, userId }
    });
    sockRef.current = s;
    return s;
  }, [token, userId]);

  useEffect(() => {
    const s = socket;
    if (!s) return;
    s.on("connect", () => {
      s.emit("auth", { userId, token });
      s.emit("join", userId);
    });
    return () => {
      try { s.disconnect(); } catch {}
      sockRef.current = null;
    };
  }, [socket, userId, token]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}