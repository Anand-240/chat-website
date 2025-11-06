import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

export const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) return res.status(401).json({ error: "Invalid token" });

    req.user = await User.findById(decoded.id).select("_id username email");
    if (!req.user) return res.status(401).json({ error: "User not found" });

    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
};
