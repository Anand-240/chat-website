import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import friendRoutes from "./routes/friendRoutes.js";
import { setupSocket } from "./socket/socket.js";

await connectDB();

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "10mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/friends", friendRoutes);

setupSocket(server, process.env.CLIENT_ORIGIN || "http://localhost:5173");

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));