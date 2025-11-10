import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import Group from "../models/groupModel.js";
import GroupMessage from "../models/groupMessageModel.js";
import User from "../models/userModel.js";

const router = express.Router();

router.get("/", verifyToken, async (req, res) => {
  try {
    const list = await Group.find({ members: req.user.id })
      .select("name members updatedAt")
      .sort({ updatedAt: -1 });
    res.json(list);
  } catch {
    res.status(500).json({ error: "Failed to load groups" });
  }
});

router.get("/:groupId", verifyToken, async (req, res) => {
  try {
    const g = await Group.findById(req.params.groupId).populate("members", "username email");
    if (!g) return res.status(404).json({ error: "Group not found" });
    res.json({ _id: g._id, name: g.name, members: g.members.map(m => ({ id: m._id, username: m.username, email: m.email })) });
  } catch {
    res.status(500).json({ error: "Failed to load group" });
  }
});

router.get("/:groupId/messages", verifyToken, async (req, res) => {
  try {
    const msgs = await GroupMessage.find({ group: req.params.groupId }).sort({ createdAt: 1 });
    res.json(msgs);
  } catch {
    res.status(500).json({ error: "Failed to load group messages" });
  }
});

router.post("/", verifyToken, async (req, res) => {
  try {
    const { name, memberIdentifiers = [] } = req.body || {};
    const membersDocs = await Promise.all(
      memberIdentifiers.map(async q =>
        await User.findOne({
          $or: [
            { email: { $regex: new RegExp(`^${q}$`, "i") } },
            { username: { $regex: new RegExp(`^${q}$`, "i") } }
          ]
        })
      )
    );
    const ids = [req.user.id, ...membersDocs.filter(Boolean).map(u => u._id)];
    const g = await Group.create({ name, members: Array.from(new Set(ids.map(String))) });
    res.json(g);
  } catch {
    res.status(500).json({ error: "Failed to create group" });
  }
});

export default router;