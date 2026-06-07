import { Router } from "express";
import { handleIncomingMessage, getSessionMessages, getConversationsList } from "../controllers/chat.controller.js";

const router = Router();

// GET /api/chat/conversations - Fetch sidebar history
router.get("/conversations", getConversationsList);

// GET /api/chat/:sessionId/messages?page=1&limit=10 - Fetch paginated messages
router.get("/:sessionId/messages", getSessionMessages);

// POST /api/chat/message - Send a message and get an AI response
router.post("/message", handleIncomingMessage);

export default router;