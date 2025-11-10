import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import User from "../models/userModel.js";
import Conversation from "../models/conversationModel.js";

const router = express.Router();

router.post("/request/:receiverId", protect, async (req, res) => {
  try {
    const senderId = String(req.user.id);
    const receiver = await User.findById(req.params.receiverId);
    if (!receiver) return res.status(404).json({ error: "User not found" });
    if (String(receiver._id) === senderId) return res.status(400).json({ error: "Invalid" });
    if (receiver.friendRequests.some(id => String(id) === senderId))
      return res.status(400).json({ error: "Request already sent" });
    if (receiver.friends.some(id => String(id) === senderId))
      return res.status(400).json({ error: "Already friends" });
    receiver.friendRequests.push(senderId);
    await receiver.save();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to send request" });
  }
});

router.post("/accept/:senderId", protect, async (req, res) => {
  try {
    const sender = await User.findById(req.params.senderId);
    const receiver = await User.findById(req.user.id);
    if (!sender || !receiver) return res.status(404).json({ error: "User not found" });
    receiver.friendRequests = (receiver.friendRequests || []).filter(id => String(id) !== String(sender._id));
    if (!receiver.friends.some(id => String(id) === String(sender._id))) receiver.friends.push(sender._id);
    if (!sender.friends.some(id => String(id) === String(receiver._id))) sender.friends.push(receiver._id);
    await receiver.save();
    await sender.save();

    const existing = await Conversation.findOne({ participants: { $all: [receiver._id, sender._id] } });
    if (!existing) await Conversation.create({ participants: [receiver._id, sender._id] });

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to accept request" });
  }
});

router.post("/reject/:senderId", protect, async (req, res) => {
  try {
    const receiver = await User.findById(req.user.id);
    if (!receiver) return res.status(404).json({ error: "User not found" });
    receiver.friendRequests = (receiver.friendRequests || []).filter(id => String(id) !== String(req.params.senderId));
    await receiver.save();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to reject request" });
  }
});

router.get("/pending", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("friendRequests", "username email");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user.friendRequests || []);
  } catch {
    res.status(500).json({ error: "Failed to fetch friend requests" });
  }
});

router.get("/friends", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("friends", "username email");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user.friends || []);
  } catch {
    res.status(500).json({ error: "Failed to fetch friends" });
  }
});

router.get("/check/:userId", protect, async (req, res) => {
  try {
    const me = await User.findById(req.user.id).select("friends");
    if (!me) return res.status(404).json({ error: "User not found" });
    const isFriend = (me.friends || []).some(id => String(id) === String(req.params.userId));
    res.json({ isFriend });
  } catch {
    res.status(500).json({ error: "Failed to check friend status" });
  }
});

export default router;