import bcrypt from "bcryptjs";
import User from "../models/userModel.js";
import generateToken from "../utils/generateToken.js";

export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: "Missing fields" });

    const exists = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
    if (exists) return res.status(409).json({ error: "User already exists" });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email: email.toLowerCase(), password: hash });

    const token = generateToken({ id: user._id, username: user.username, email: user.email });
    res.json({ token, user: { id: user._id, username: user.username, email: user.email, profilePic: user.profilePic } });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    if (!password || (!email && !username)) return res.status(400).json({ error: "Missing fields" });

    const query = email ? { email: email.toLowerCase() } : { username };
    const user = await User.findOne(query);
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
