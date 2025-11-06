import Message from "../models/messageModel.js";

export const getConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const otherId = req.params.otherUserId;
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherId },
        { sender: otherId, receiver: userId }
      ]
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const sender = req.user.id;
    const { receiverId, text, imageUrl } = req.body;
    if (!receiverId || (!text && !imageUrl)) return res.status(400).json({ error: "Missing fields" });

    const msg = await Message.create({ sender, receiver: receiverId, text, imageUrl });
    res.status(201).json(msg);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
};

export const markSeen = async (req, res) => {
  try {
    const userId = req.user.id;
    const { otherUserId } = req.body;
    await Message.updateMany(
      { sender: otherUserId, receiver: userId, seen: false },
      { $set: { seen: true } }
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
};
