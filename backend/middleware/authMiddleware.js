import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

export async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "No token" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("_id username email");
    if (!user) return res.status(401).json({ error: "Invalid token" });
    req.user = { id: user._id, username: user.username, email: user.email };
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}
