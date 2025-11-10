import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../constants.js";
import { useAuth } from "./AuthContext.jsx";

const SocketContext = createContext(null);
export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }) {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token || !user) return;
    const s = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: { token, userId: String(user.id || user._id) },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
    });
    s.on("connect", () => {
      s.emit("join", String(user.id || user._id));
    });
    setSocket(s);
    return () => {
      s.close();
      setSocket(null);
    };
  }, [token, user]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}