import express from "express";
import { upload } from "../config/cloudinary.js";

const router = express.Router();

router.post("/", upload.single("image"), async (req, res) => {
  try {
    res.json({ url: req.file.path });
  } catch {
    res.status(500).json({ error: "Image upload failed" });
  }
});

export default router;