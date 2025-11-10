import bcrypt from "bcryptjs";
import User from "../models/userModel.js";
import generateToken from "../utils/generateToken.js";

export const register = async (req, res) => {
  try {
    let { username, email, password } = req.body || {};
    if (!username || !email || !password) return res.status(400).json({ error: "Missing fields" });
    username = String(username).trim();
    email = String(email).trim().toLowerCase();

    const exists = await User.findOne({
      $or: [
        { email: email },
        { username: { $regex: new RegExp(`^${username}$`, "i") } }
      ]
    });
    if (exists) return res.status(409).json({ error: "User already exists" });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hash });

    const token = generateToken({ id: user._id, username: user.username, email: user.email });
    res.status(201).json({ token, user: { id: user._id, username: user.username, email: user.email, profilePic: user.profilePic } });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
};

export const login = async (req, res) => {
  try {
    const identifier = String(req.body?.identifier || req.body?.email || req.body?.username || "").trim();
    const password = String(req.body?.password || "");
    if (!identifier || !password) return res.status(400).json({ error: "Missing fields" });

    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: { $regex: new RegExp(`^${identifier}$`, "i") } }
      ]
    });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = generateToken({ id: user._id, username: user.username, email: user.email });
    res.json({ token, user: { id: user._id, username: user.username, email: user.email, profilePic: user.profilePic } });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
};

export const me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("_id username email profilePic createdAt");
    if (!user) return res.status(404).json({ error: "Not found" });
    res.json({ user });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
};