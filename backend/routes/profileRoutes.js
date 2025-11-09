import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import Profile from "../models/profileModel.js";
import User from "../models/userModel.js";

const router = express.Router();

router.get("/me", protect, async (req, res) => {
  const p = await Profile.findOne({ user: req.user.id }).lean();
  res.json(
    p || {
      user: req.user.id,
      displayName: req.user.username,
      bio: "",
      avatarUrl: ""
    }
  );
});

router.put("/me", protect, async (req, res) => {
  const { displayName, bio, avatarUrl } = req.body || {};
  const p = await Profile.findOneAndUpdate(
    { user: req.user.id },
    { user: req.user.id, displayName, bio, avatarUrl },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  res.json(p);
});

router.get("/user/:query", protect, async (req, res) => {
  const q = req.params.query.trim();
  const u = await User.findOne({ $or: [{ username: q }, { email: q }] })
    .select("_id username email")
    .lean();
  if (!u) return res.status(404).json({ error: "not_found" });
  const p = await Profile.findOne({ user: u._id }).lean();
  res.json({
    id: String(u._id),
    username: u.username,
    email: u.email,
    displayName: p?.displayName || u.username,
    bio: p?.bio || "",
    avatarUrl: p?.avatarUrl || ""
  });
});

export default router;