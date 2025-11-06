import express from "express";
import mongoose from "mongoose";
import { protect } from "../middleware/authMiddleware.js";
import Message from "../models/messageModel.js";
import User from "../models/userModel.js";
import Conversation from "../models/conversationModel.js";

const router = express.Router();

router.get("/conversations", protect, async (req, res) => {
  try {
    const me = req.user.id;
    const convos = await Conversation.find({ users: me })
      .sort({ lastAt: -1 })
      .populate({ path: "users", select: "username email" })
      .lean();
    const list = convos.map((c) => {
      const other = c.users.find((u) => String(u._id) !== String(me));
      return {
        id: other?._id || null,
        username: other?.username || null,
        email: other?.email || null,
        lastText: c.lastText,
        lastImage: c.lastImage,
        lastAt: c.lastAt,
      };
    }).filter(x => x.id);
    res.json(list);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:other", protect, async (req, res) => {
  try {
    const me = req.user.id;
    const otherParam = req.params.other;
    let otherId = otherParam;
    if (!mongoose.Types.ObjectId.isValid(otherParam)) {
      const u = await User.findOne({ $or: [{ username: otherParam }, { email: otherParam }] }).lean();
      if (!u) return res.status(404).json({ error: "User not found" });
      otherId = u._id.toString();
    }
    const messages = await Message.find({
      $or: [
        { sender: me, receiver: otherId },
        { sender: otherId, receiver: me }
      ]
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
