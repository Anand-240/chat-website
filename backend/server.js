import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import friendRoutes from "./routes/friendRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import { setupSocket } from "./socket/socket.js";

await connectDB();

const app = express();
const server = http.createServer(app);
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const isProd = process.env.NODE_ENV === "production";

const isLanOrLocalOrigin = (origin) => {
  try {
    const { protocol, hostname } = new URL(origin);
    if (protocol !== "http:" && protocol !== "https:") return false;
    if (hostname === "localhost" || hostname === "127.0.0.1") return true;
    if (hostname.endsWith(".local")) return true;

    const ipv4Match = hostname.match(/^(\d{1,3}\.){3}\d{1,3}$/);
    if (!ipv4Match) return false;
    const [a, b] = hostname.split(".").map((part) => Number(part));

    // Private IPv4 ranges: 10.0.0.0/8, 172.16.0.0-172.31.255.255, 192.168.0.0/16
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  } catch {
    return false;
  }
};

const corsOrigin = (origin, callback) => {
  // Allow server-to-server and health-check requests that do not send Origin.
  if (!origin) return callback(null, true);
  if (CLIENT_ORIGINS.includes(origin)) return callback(null, true);
  if (!isProd && isLanOrLocalOrigin(origin)) return callback(null, true);
  return callback(new Error(`CORS blocked for origin: ${origin}`));
};

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/upload", uploadRoutes);

const io = new Server(server, { cors: { origin: corsOrigin, credentials: true } });
setupSocket(io);

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO configured for origins:`, CLIENT_ORIGINS);
});