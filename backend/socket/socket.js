import Message from "../models/messageModel.js";
import Conversation from "../models/conversationModel.js";
import GroupMessage from "../models/groupMessageModel.js";
import Group from "../models/groupModel.js";

const online = new Map();

export function setupSocket(io) {
  io.on("connection", (socket) => {
    const uid = socket.handshake.auth?.userId;
    if (uid) {
      online.set(String(uid), socket.id);
      socket.data.userId = String(uid);
    }

    socket.on("auth", ({ userId }) => {
      if (!userId) return;
      online.set(String(userId), socket.id);
      socket.data.userId = String(userId);
    });

    socket.on("join", (userId) => {
      if (!userId) return;
      online.set(String(userId), socket.id);
      socket.data.userId = String(userId);
    });

    socket.on("join_group", async ({ groupId, userId }) => {
      if (!groupId || !userId) return;
      const g = await Group.findById(groupId).select("members");
      if (!g) return;
      if (!g.members.some((m) => String(m) === String(userId))) return;
      socket.join(String(groupId));
    });

    socket.on("send_message", async ({ senderId, receiverId, text, imageUrl, _clientId }) => {
      if (!senderId || !receiverId) return;
      let convo = await Conversation.findOne({ participants: { $all: [senderId, receiverId] } });
      if (!convo) convo = await Conversation.create({ participants: [senderId, receiverId] });
      const msg = await Message.create({
        sender: senderId,
        receiver: receiverId,
        text: text || "",
        imageUrl: imageUrl || "",
        conversation: convo._id,
      });
      convo.lastMessage = msg._id;
      await convo.save();
      const payload = { ...msg.toObject(), _clientId };
      const rSock = online.get(String(receiverId));
      if (rSock) io.to(rSock).emit("new_message", payload);
    });

    socket.on("send_group_message", async ({ senderId, groupId, text, imageUrl, _clientId }) => {
      if (!senderId || !groupId) return;
      const g = await Group.findById(groupId).select("members");
      if (!g) return;
      if (!g.members.some((m) => String(m) === String(senderId))) return;
      const msg = await GroupMessage.create({
        sender: senderId,
        group: groupId,
        text: text || "",
        imageUrl: imageUrl || "",
      });
      const payload = { ...msg.toObject(), _clientId };
      socket.to(String(groupId)).emit("new_group_message", payload);
    });

    socket.on("call:offer", ({ to, from, offer, displayName }) => {
      const sid = online.get(String(to));
      if (sid) io.to(sid).emit("call:offer", { from, offer, displayName });
      else io.to(socket.id).emit("call:unavailable", { to });
    });

    socket.on("call:answer", ({ to, from, answer }) => {
      const sid = online.get(String(to));
      if (sid) io.to(sid).emit("call:answer", { from, answer });
    });

    socket.on("call:ice", ({ to, from, candidate }) => {
      const sid = online.get(String(to));
      if (sid) io.to(sid).emit("call:ice", { from, candidate });
    });

    socket.on("call:end", ({ to, from }) => {
      const sid = online.get(String(to));
      if (sid) io.to(sid).emit("call:end", { from });
    });

    socket.on("call:busy", ({ to, from }) => {
      const sid = online.get(String(to));
      if (sid) io.to(sid).emit("call:busy", { from });
    });

    socket.on("disconnect", () => {
      for (const [k, v] of online.entries()) {
        if (v === socket.id) online.delete(k);
      }
    });
  });
}