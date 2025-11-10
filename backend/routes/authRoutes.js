import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    let { username, email, password } = req.body || {};
    if (!username || !email || !password)
      return res.status(400).json({ error: "All fields are required" });

    username = username.trim().toLowerCase();
    email = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      $or: [
        { email: { $regex: new RegExp(`^${email}$`, "i") } },
        { username: { $regex: new RegExp(`^${username}$`, "i") } }
      ]
    });

    if (existingUser)
      return res.status(409).json({ error: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({
      user: { id: user._id, username: user.username, email: user.email },
      token,
    });
  } catch {
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password)
      return res
        .status(400)
        .json({ error: "Email/Username and password are required" });

    const user = await User.findOne({
      $or: [
        { email: { $regex: new RegExp(`^${identifier}$`, "i") } },
        { username: { $regex: new RegExp(`^${identifier}$`, "i") } },
      ],
    });

    if (!user) return res.status(404).json({ error: "Invalid credentials" });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(200).json({
      user: { id: user._id, username: user.username, email: user.email },
      token,
    });
  } catch {
    res.status(500).json({ error: "Login failed" });
  }
});

export default router;