import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  try {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (!token) return res.status(401).json({ error: "No token" });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: String(payload.id) };
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
};

export const protect = verifyToken;
export default verifyToken;