import express from "express";
import mongoose from "mongoose";
import { protect } from "../middleware/authMiddleware.js";
import Group from "../models/groupModel.js";
import GroupMessage from "../models/groupMessageModel.js";

const router = express.Router();

router.post("/", protect, async (req, res) => {
  try {
    const g = await Group.create({
      name: req.body.name,
      admin: req.user.id,
      members: [req.user.id, ...new Set(req.body.members || [])]
    });
    res.json(g);
  } catch {
    res.status(500).json({ error: "server" });
  }
});

router.post("/:groupId/members", protect, async (req, res) => {
  try {
    const g = await Group.findByIdAndUpdate(
      req.params.groupId,
      { $addToSet: { members: { $each: req.body.members || [] } } },
      { new: true }
    );
    if (!g) return res.status(404).json({ error: "not_found" });
    res.json(g);
  } catch {
    res.status(500).json({ error: "server" });
  }
});

router.delete("/:groupId/members/:userId", protect, async (req, res) => {
  try {
    const g = await Group.findByIdAndUpdate(
      req.params.groupId,
      { $pull: { members: req.params.userId } },
      { new: true }
    );
    if (!g) return res.status(404).json({ error: "not_found" });
    res.json(g);
  } catch {
    res.status(500).json({ error: "server" });
  }
});

router.get("/", protect, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user.id })
      .sort({ lastAt: -1 })
      .select("name members admin lastText lastImage lastAt createdAt updatedAt")
      .lean();
    res.json(groups);
  } catch {
    res.status(500).json({ error: "server" });
  }
});

router.get("/:groupId", protect, async (req, res) => {
  try {
    const gid = req.params.groupId;
    if (!mongoose.Types.ObjectId.isValid(gid)) return res.status(400).json({ error: "bad_id" });
    const g = await Group.findById(gid)
      .populate({ path: "members", select: "username email" })
      .populate({ path: "admin", select: "username email" })
      .lean();
    if (!g) return res.status(404).json({ error: "not_found" });
    const isMember = g.members.some((m) => String(m._id) === String(req.user.id));
    if (!isMember) return res.status(403).json({ error: "forbidden" });
    res.json({
      id: String(g._id),
      name: g.name,
      admin: g.admin ? { id: String(g.admin._id), username: g.admin.username || null, email: g.admin.email || null } : null,
      members: g.members.map((m) => ({ id: String(m._id), username: m.username || null, email: m.email || null })),
      lastText: g.lastText || null,
      lastImage: g.lastImage || null,
      lastAt: g.lastAt || null
    });
  } catch {
    res.status(500).json({ error: "server" });
  }
});

router.get("/:groupId/messages", protect, async (req, res) => {
  try {
    const gid = req.params.groupId;
    if (!mongoose.Types.ObjectId.isValid(gid)) return res.status(400).json({ error: "bad_id" });
    const isMember = await Group.exists({ _id: gid, members: req.user.id });
    if (!isMember) return res.status(403).json({ error: "forbidden" });
    const msgs = await GroupMessage.find({ group: gid }).sort({ createdAt: 1 });
    res.json(msgs);
  } catch {
    res.status(500).json({ error: "server" });
  }
});

export default router;