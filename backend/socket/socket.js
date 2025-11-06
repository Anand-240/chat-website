import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Message from "../models/messageModel.js";
import User from "../models/userModel.js";
import Conversation from "../models/conversationModel.js";

export function setupSocket(httpServer, corsOrigin) {
  const io = new Server(httpServer, { cors: { origin: corsOrigin } });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
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
      try {
        if (!receiverId) return;
        if (!text && !imageUrl) return;

        let to = receiverId;
        if (!mongoose.Types.ObjectId.isValid(receiverId)) {
          const u = await User.findOne({ $or: [{ username: receiverId }, { email: receiverId }] }).lean();
          if (!u) return;
          to = u._id.toString();
        }

        const msg = await Message.create({ sender: userId, receiver: to, text, imageUrl });
        const data = { ...msg.toObject(), _id: String(msg._id) };

        const sorted = [String(userId), String(to)].sort();
        await Conversation.findOneAndUpdate(
          { pairKey: `${sorted[0]}:${sorted[1]}` },
          {
            users: [sorted[0], sorted[1]],
            lastText: text || null,
            lastImage: imageUrl || null,
            lastAt: new Date(),
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        io.to(to).emit("new_message", data);
        io.to(userId).emit("new_message", data);
      } catch {}
    });
  });

  return io;
}
