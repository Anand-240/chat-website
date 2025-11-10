import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import User from "../models/userModel.js";
import Message from "../models/messageModel.js";
import Conversation from "../models/conversationModel.js";

const router = express.Router();

router.get("/conversations", verifyToken, async (req, res) => {
  try {
    const convos = await Conversation.find({ participants: req.user.id })
      .populate("participants", "username email")
      .populate("lastMessage")
      .sort({ updatedAt: -1 });
    res.json(convos);
  } catch {
    res.status(500).json({ error: "Failed to load conversations" });
  }
});

router.get("/resolve/:query", verifyToken, async (req, res) => {
  try {
    const q = String(req.params.query || "").trim();
    if (!q) return res.status(400).json({ error: "Query required" });
    const user = await User.findOne({
      $or: [
        { email: { $regex: new RegExp(`^${q}$`, "i") } },
        { username: { $regex: new RegExp(`^${q}$`, "i") } }
      ]
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ id: user._id, username: user.username, email: user.email });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/user/:id", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("username email");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch {
    res.status(500).json({ error: "Failed to load user" });
  }
});

router.get("/:receiverId", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const receiverId = req.params.receiverId;
    let convo = await Conversation.findOne({ participants: { $all: [userId, receiverId] } });
    if (!convo) convo = await Conversation.create({ participants: [userId, receiverId] });
    const messages = await Message.find({ conversation: convo._id }).sort({ createdAt: 1 });
    res.json(messages);
  } catch {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.post("/:receiverId", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const receiverId = req.params.receiverId;
    const { text, imageUrl } = req.body || {};
    let convo = await Conversation.findOne({ participants: { $all: [userId, receiverId] } });
    if (!convo) convo = await Conversation.create({ participants: [userId, receiverId] });

    const msg = await Message.create({
      sender: userId,
      receiver: receiverId,
      text: text || "",
      imageUrl: imageUrl || "",
      conversation: convo._id
    });

    convo.lastMessage = msg._id;
    await convo.save();

    res.json(msg);
  } catch {
    res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;