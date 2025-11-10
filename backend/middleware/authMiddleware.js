import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

const verifyToken = async (req, res, next) => {
  try {
    const raw = req.headers.authorization || "";
    const token = raw.startsWith("Bearer ") ? raw.slice(7) : null;
    if (!token) return res.status(401).json({ error: "No token" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ error: "Invalid token" });
    req.user = { id: String(user._id), _id: user._id, username: user.username, email: user.email };
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
};

export { verifyToken, verifyToken as protect };