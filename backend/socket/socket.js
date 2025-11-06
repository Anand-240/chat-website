import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Message from "../models/messageModel.js";

export function setupSocket(httpServer, corsOrigin) {
  const io = new Server(httpServer, { cors: { origin: corsOrigin } });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No token"));
      const user = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: user.id, username: user.username };
      next();
    } catch {
      next(new Error("Auth error"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user.id;
    socket.join(userId);

    socket.on("send_message", async ({ receiverId, text, imageUrl }) => {
      if (!receiverId || (!text && !imageUrl)) return;
      const msg = await Message.create({ sender: userId, receiver: receiverId, text, imageUrl });
      const data = { ...msg.toObject(), _id: String(msg._id) };
      io.to(receiverId).emit("new_message", data);
      io.to(userId).emit("new_message", data);
    });

    socket.on("typing", ({ to, isTyping }) => {
      if (!to) return;
      io.to(to).emit("typing", { from: userId, isTyping: !!isTyping });
    });
  });

  return io;
}
