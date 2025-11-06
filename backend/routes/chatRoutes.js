import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getConversation, sendMessage, markSeen } from "../controllers/chatController.js";

const router = express.Router();

router.get("/:otherUserId", protect, getConversation);
router.post("/send", protect, sendMessage);
router.post("/seen", protect, markSeen);

export default router;
