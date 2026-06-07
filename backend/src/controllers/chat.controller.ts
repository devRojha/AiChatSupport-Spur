import { Request, Response } from "express";
import { QuerySchema } from "../types/zodSchema.js"; 
import { getConversationHistory, processChatMessage, getAllConversations } from "../services/chat.service.js";

export const handleIncomingMessage = async (req: Request, res: Response): Promise<void> => {
    try {
        // 1. Zod Runtime Validation
        const parsedBody = QuerySchema.safeParse(req.body);
        
        if (!parsedBody.success) {
            // Zod gives beautifully formatted errors automatically
            res.status(400).json({ 
                error: "Invalid request format", 
                details: parsedBody.error.format() 
            });
            return;
        }

        // 2. Destructure the safely typed and validated data
        const { query, sessionId } = parsedBody.data;

        // 3. Delegate to Service Logic
        console.log("Received Query:", query);
        const result = await processChatMessage(query, sessionId);

        res.json(result);

    } catch (error) {
        console.error("Controller Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getConversationsList = async (_req: Request, res: Response): Promise<void> => {
    try {
        const conversations = await getAllConversations();
        res.json({ conversations });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getSessionMessages = async (req: Request, res: Response): Promise<void> => {
    try {
        const rawSessionId = req.params.sessionId;
        const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;

        if (!sessionId) {
            res.status(400).json({ error: "Missing sessionId parameter" });
            return;
        }

        // Type-safe query parsing (prevents array injection bugs)
        const page = typeof req.query.page === 'string' ? parseInt(req.query.page, 10) : 1;
        const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 10;

        const messages = await getConversationHistory(sessionId, page, limit);
        
        const formattedMessages = messages.map(msg => ({
            id: msg.id,
            content: msg.text,
            sender: msg.sender,
            timestamp: msg.timestamp.toISOString()
        }));

        res.json({ messages: formattedMessages });
    } catch (error) {
        console.error("Fetch Messages Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};