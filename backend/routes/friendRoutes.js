import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import User from "../models/userModel.js";

const router = express.Router();

router.post("/request/:receiverId", protect, async (req, res) => {
  try {
    const receiver = await User.findById(req.params.receiverId);
    const sender = await User.findById(req.user._id);
    if (!receiver) return res.status(404).json({ error: "User not found" });
    if (receiver.friendRequests.some(id => String(id) === String(sender._id)))
      return res.status(400).json({ error: "Request already sent" });
    if (receiver.friends.some(id => String(id) === String(sender._id)))
      return res.status(400).json({ error: "Already friends" });
    receiver.friendRequests.push(sender._id);
    await receiver.save();
    res.json({ message: "Friend request sent successfully" });
  } catch {
    res.status(500).json({ error: "Failed to send request" });
  }
});

router.post("/accept/:senderId", protect, async (req, res) => {
  try {
    const sender = await User.findById(req.params.senderId);
    const receiver = await User.findById(req.user._id);
    if (!sender || !receiver) return res.status(404).json({ error: "User not found" });
    receiver.friendRequests = receiver.friendRequests.filter(id => String(id) !== String(sender._id));
    if (!receiver.friends.some(id => String(id) === String(sender._id))) receiver.friends.push(sender._id);
    if (!sender.friends.some(id => String(id) === String(receiver._id))) sender.friends.push(receiver._id);
    await receiver.save();
    await sender.save();
    res.json({ message: "Friend request accepted" });
  } catch {
    res.status(500).json({ error: "Failed to accept request" });
  }
});

router.post("/reject/:senderId", protect, async (req, res) => {
  try {
    const sender = await User.findById(req.params.senderId);
    const receiver = await User.findById(req.user._id);
    if (!sender || !receiver) return res.status(404).json({ error: "User not found" });
    receiver.friendRequests = receiver.friendRequests.filter(id => String(id) !== String(sender._id));
    await receiver.save();
    res.json({ message: "Friend request rejected" });
  } catch {
    res.status(500).json({ error: "Failed to reject request" });
  }
});

router.get("/pending", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("friendRequests", "username email");
    res.json(user.friendRequests || []);
  } catch {
    res.status(500).json({ error: "Failed to fetch friend requests" });
  }
});

router.get("/friends", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("friends", "username email");
    res.json(user.friends || []);
  } catch {
    res.status(500).json({ error: "Failed to fetch friends" });
  }
});

router.get("/check/:userId", protect, async (req, res) => {
  try {
    const me = await User.findById(req.user._id).select("friends");
    const isFriend = me?.friends?.some(id => String(id) === String(req.params.userId)) || false;
    res.json({ isFriend });
  } catch {
    res.status(500).json({ error: "Failed to check friend status" });
  }
});

export default router;