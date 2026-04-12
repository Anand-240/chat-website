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
    if (!token || !userId) {
      console.log("🔌 [Socket] Skipped - missing token or userId:", { token: !!token, userId: !!userId });
      return null;
    }
    console.log("🔌 [Socket] Creating socket connection to:", SOCKET_URL);
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
    
    console.log("🔌 [Socket] Attempting connection to:", SOCKET_URL);
    
    s.on("connect", () => {
      console.log("✅ [Socket] Connected successfully");
      s.emit("auth", { userId, token });
      s.emit("join", userId);
    });

    s.on("connect_error", (error) => {
      console.error("❌ [Socket] Connection error:", error?.message || error);
    });

    s.on("error", (error) => {
      console.error("❌ [Socket] Error event:", error);
    });

    s.on("disconnect", (reason) => {
      console.warn("⚠️  [Socket] Disconnected:", reason);
    });

    return () => {
      console.log("🔌 [Socket] Cleaning up listeners");
      try { s.disconnect(); } catch {}
      sockRef.current = null;
    };
  }, [socket, userId, token]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}