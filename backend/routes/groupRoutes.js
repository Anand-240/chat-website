import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import Group from "../models/groupModel.js";
import GroupMessage from "../models/groupMessageModel.js";
import User from "../models/userModel.js";

const router = express.Router();

router.get("/", verifyToken, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user.id }).sort({ updatedAt: -1 });
    res.json(groups);
  } catch {
    res.status(500).json({ error: "Failed to load groups" });
  }
});

router.post("/", verifyToken, async (req, res) => {
  try {
    const { name, members = [], member = "" } = req.body || {};
    const nm = String(name || "").trim();
    if (!nm) return res.status(400).json({ error: "Name required" });

    const identifiers = [];
    if (Array.isArray(members)) identifiers.push(...members);
    if (member) identifiers.push(member);

    const foundDocs = await Promise.all(
      identifiers
        .map(s => String(s).trim())
        .filter(Boolean)
        .map(q => User.findOne({
          $or: [
            { email: { $regex: new RegExp(`^${q}$`, "i") } },
            { username: { $regex: new RegExp(`^${q}$`, "i") } }
          ]
        }))
    );

    const ids = [req.user.id, ...foundDocs.filter(Boolean).map(u => u._id)];
    const unique = Array.from(new Set(ids.map(String)));
    const group = await Group.create({ name: nm, members: unique });
    res.status(201).json(group);
  } catch {
    res.status(500).json({ error: "Failed to create group" });
  }
});

router.get("/:groupId", verifyToken, async (req, res) => {
  try {
    const g = await Group.findById(req.params.groupId).populate("members", "username email");
    if (!g) return res.status(404).json({ error: "Group not found" });
    if (!g.members.some(m => String(m._id) === String(req.user.id))) return res.status(403).json({ error: "Forbidden" });
    res.json({ _id: g._id, name: g.name, members: g.members.map(m => ({ id: m._id, username: m.username, email: m.email })) });
  } catch {
    res.status(500).json({ error: "Failed to load group" });
  }
});

router.get("/:groupId/messages", verifyToken, async (req, res) => {
  try {
    const g = await Group.findById(req.params.groupId).select("_id members");
    if (!g) return res.status(404).json({ error: "Group not found" });
    if (!g.members.some(m => String(m) === String(req.user.id))) return res.status(403).json({ error: "Forbidden" });
    const msgs = await GroupMessage.find({ group: g._id }).sort({ createdAt: 1 }).populate("sender", "username email");
    res.json(msgs);
  } catch {
    res.status(500).json({ error: "Failed to load messages" });
  }
});

router.post("/:groupId/members", verifyToken, async (req, res) => {
  try {
    const { identifier = "" } = req.body || {};
    const g = await Group.findById(req.params.groupId).select("_id members");
    if (!g) return res.status(404).json({ error: "Group not found" });
    if (!g.members.some(m => String(m) === String(req.user.id))) return res.status(403).json({ error: "Forbidden" });

    const q = String(identifier).trim();
    if (!q) return res.status(400).json({ error: "Identifier required" });

    const user = await User.findOne({
      $or: [
        { email: { $regex: new RegExp(`^${q}$`, "i") } },
        { username: { $regex: new RegExp(`^${q}$`, "i") } }
      ]
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (g.members.some(m => String(m) === String(user._id))) return res.status(409).json({ error: "Already a member" });

    g.members.push(user._id);
    await g.save();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to add member" });
  }
});

router.post("/:groupId/messages", verifyToken, async (req, res) => {
  try {
    const { text = "", imageUrl = "" } = req.body || {};
    const g = await Group.findById(req.params.groupId).select("_id members");
    if (!g) return res.status(404).json({ error: "Group not found" });
    if (!g.members.some(m => String(m) === String(req.user.id))) return res.status(403).json({ error: "Forbidden" });
    const msg = await GroupMessage.create({ sender: req.user.id, group: g._id, text, imageUrl });
    await Group.updateOne({ _id: g._id }, { $set: { updatedAt: new Date() } });
    const populated = await msg.populate("sender", "username email");
    res.status(201).json(populated);
  } catch {
    res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;