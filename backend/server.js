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

const corsOrigin = (origin, callback) => {
  // Allow server-to-server and health-check requests that do not send Origin.
  if (!origin) return callback(null, true);
  if (CLIENT_ORIGINS.includes(origin)) return callback(null, true);
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

const io = new Server(server, { cors: { origin: CLIENT_ORIGINS, credentials: true } });
setupSocket(io);

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO configured for origins:`, CLIENT_ORIGINS);
});