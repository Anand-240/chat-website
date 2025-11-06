import express from "express";
import mongoose from "mongoose";
import { protect } from "../middleware/authMiddleware.js";
import Message from "../models/messageModel.js";
import User from "../models/userModel.js";

const router = express.Router();

router.get("/:other", protect, async (req, res) => {
  try {
    const me = req.user.id;
    const otherParam = req.params.other;
    let otherId = otherParam;

    if (!mongoose.Types.ObjectId.isValid(otherParam)) {
      const u = await User.findOne({
        $or: [{ username: otherParam }, { email: otherParam }],
      });
      if (!u) return res.status(404).json({ error: "User not found" });
      otherId = u._id.toString();
    }

    const messages = await Message.find({
      $or: [
        { sender: me, receiver: otherId },
        { sender: otherId, receiver: me },
      ],
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    console.error("Chat route error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;

