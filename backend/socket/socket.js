import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Message from "../models/messageModel.js";
import User from "../models/userModel.js";
import Conversation from "../models/conversationModel.js";
import Group from "../models/groupModel.js";
import GroupMessage from "../models/groupMessageModel.js";
import Contact from "../models/contactModel.js";

const key = (a, b) => {
  const s = [String(a), String(b)].sort();
  return `${s[0]}:${s[1]}`;
};

export function setupSocket(httpServer, corsOrigin) {
  const io = new Server(httpServer, { cors: { origin: corsOrigin, credentials: true } });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const u = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: u.id, username: u.username };
      next();
    } catch {
      next(new Error("auth"));
    }
  });

  io.on("connection", (socket) => {
    const userId = String(socket.user.id);
    socket.join(userId);

    socket.on("join_groups", async () => {
      const groups = await Group.find({ members: userId }).select("_id").lean();
      groups.forEach((g) => socket.join(String(g._id)));
    });

    socket.on("send_message", async ({ receiverId, text, imageUrl, _clientId }) => {
      try {
        if (!receiverId || (!text && !imageUrl)) return;
        let to = receiverId;
        if (!mongoose.Types.ObjectId.isValid(receiverId)) {
          const u = await User.findOne({ $or: [{ username: receiverId }, { email: receiverId }] }).lean();
          if (!u) return;
          to = String(u._id);
        }
        const ok = await Contact.exists({ pairKey: key(userId, to) });
        if (!ok) return;

        const msg = await Message.create({ sender: userId, receiver: to, text, imageUrl });
        const data = { ...msg.toObject(), _id: String(msg._id), _clientId };
        const s = [userId, to].sort();
        await Conversation.findOneAndUpdate(
          { pairKey: `${s[0]}:${s[1]}` },
          { users: [s[0], s[1]], lastText: text || null, lastImage: imageUrl || null, lastAt: new Date() },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        io.to(to).emit("new_message", data);
        io.to(userId).emit("new_message", data);
      } catch {}
    });

    socket.on("send_group_message", async ({ groupId, text, imageUrl, _clientId }) => {
      try {
        if (!groupId || (!text && !imageUrl)) return;
        if (!mongoose.Types.ObjectId.isValid(groupId)) return;
        const isMember = await Group.exists({ _id: groupId, members: userId });
        if (!isMember) return;
        const msg = await GroupMessage.create({ group: groupId, sender: userId, text, imageUrl });
        const data = { ...msg.toObject(), _id: String(msg._id), _clientId };
        await Group.findByIdAndUpdate(groupId, { lastText: text || null, lastImage: imageUrl || null, lastAt: new Date() });
        io.to(String(groupId)).emit("new_group_message", data);
      } catch {}
    });
  });

  return io;
}