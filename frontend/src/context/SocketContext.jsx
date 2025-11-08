import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext.jsx";
import { API_BASE_URL } from "../constants.js";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token) { if (socket) socket.disconnect(); setSocket(null); return; }
    const s = io(API_BASE_URL, { auth: { token }, transports: ["websocket"], withCredentials: false });
    setSocket(s);
    s.on("connect", () => { s.emit("join_groups"); });
    return () => { s.disconnect(); setSocket(null); };
  }, [token]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export function useSocket() { return useContext(SocketContext); }