import express from "express";
import mongoose from "mongoose";
import { protect } from "../middleware/authMiddleware.js";
import Message from "../models/messageModel.js";
import User from "../models/userModel.js";
import Conversation from "../models/conversationModel.js";

const router = express.Router();

router.get("/resolve/:other", protect, async (req, res) => {
  try {
    let q = req.params.other;
    let u = null;
    if (mongoose.Types.ObjectId.isValid(q)) {
      u = await User.findById(q).select("username email").lean();
    } else {
      u = await User.findOne({ $or: [{ username: q }, { email: q }] })
        .select("username email")
        .lean();
    }
    if (!u) return res.status(404).json({ error: "not_found" });
    res.json({ id: String(u._id), username: u.username || null, email: u.email || null });
  } catch {
    res.status(500).json({ error: "server" });
  }
});

router.get("/conversations", protect, async (req, res) => {
  try {
    const me = String(req.user.id);
    const convos = await Conversation.find({ users: me })
      .sort({ lastAt: -1 })
      .populate({ path: "users", select: "username email" })
      .lean();
    const out = convos
      .map((c) => {
        const other = c.users.find((u) => String(u._id) !== me);
        if (!other) return null;
        return {
          id: String(other._id),
          username: other.username || null,
          email: other.email || null,
          lastText: c.lastText,
          lastImage: c.lastImage,
          lastAt: c.lastAt
        };
      })
      .filter(Boolean);
    res.json(out);
  } catch {
    res.status(500).json({ error: "server" });
  }
});

router.get("/:other", protect, async (req, res) => {
  try {
    const me = String(req.user.id);
    let otherId = req.params.other;
    if (!mongoose.Types.ObjectId.isValid(otherId)) {
      const u = await User.findOne({ $or: [{ username: otherId }, { email: otherId }] }).lean();
      if (!u) return res.status(404).json({ error: "not_found" });
      otherId = String(u._id);
    }
    const msgs = await Message.find({
      $or: [
        { sender: me, receiver: otherId },
        { sender: otherId, receiver: me }
      ]
    }).sort({ createdAt: 1 });
    res.json(msgs);
  } catch {
    res.status(500).json({ error: "server" });
  }
});

export default router;