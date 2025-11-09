import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import Conversation from "../models/conversationModel.js";
import Message from "../models/messageModel.js";
import User from "../models/userModel.js";

const router = express.Router();

router.get("/resolve/:query", async (req, res) => {
  try {
    const q = req.params.query.trim();
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

router.get("/", verifyToken, async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user._id })
      .populate("participants", "username email")
      .populate("lastMessage")
      .sort({ updatedAt: -1 });
    res.json(conversations);
  } catch {
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

router.get("/:receiverId", verifyToken, async (req, res) => {
  try {
    const { receiverId } = req.params;
    const conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, receiverId] }
    });
    if (!conversation) return res.json([]);
    const messages = await Message.find({ conversation: conversation._id })
      .populate("sender", "username email")
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.post("/:receiverId", verifyToken, async (req, res) => {
  try {
    const { text, imageUrl } = req.body;
    const { receiverId } = req.params;
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, receiverId] }
    });
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, receiverId]
      });
    }
    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      receiver: receiverId,
      text: text || "",
      image: imageUrl || ""
    });
    conversation.lastMessage = message._id;
    await conversation.save();
    res.status(201).json(message);
  } catch {
    res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;