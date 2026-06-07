import { prisma } from "../db/prisma.js";
import { generateReply, generateTitle } from "./llm.service.js";

// --- Internal DB Helpers ---

// UPDATED: Now checks how many messages exist in the conversation
const getOrCreateConversation = async (sessionId?: string) => {
    if (sessionId) {
        const existing = await prisma.conversation.findUnique({ 
            where: { id: sessionId },
            include: { _count: { select: { messages: true } } } // Count existing messages
        });
        if (existing) return existing;
    }
    // If creating a new one, we know it has 0 messages
    const newConv = await prisma.conversation.create({ data: {} });
    return { ...newConv, _count: { messages: 0 } };
};

const saveMessage = async (conversationId: string, text: string, sender: "user" | "ai") => {
    return prisma.message.create({ data: { conversationId, text, sender } });
};

// --- Exported Business Logic ---

export const getConversationHistory = async (conversationId: string, page: number = 1, limit: number = 10) => {
    const skip = (page - 1) * limit;
    const messages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
    });
    return messages.reverse();
};

export const getAllConversations = async () => {
    return prisma.conversation.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
    });
};

export const processChatMessage = async (query: string, sessionId?: string) => {
    // 1. Session Management
    const conversation = await getOrCreateConversation(sessionId);
    const currentSessionId = conversation.id;

    // 2. Persist User Message
    const safeMessage = query.substring(0, 1000);
    await saveMessage(currentSessionId, safeMessage, "user");

    // --- NEW: Background Title Generation ---
    // If this is the very first message, generate a title in the background
    if (conversation._count.messages === 0) {
        generateTitle(safeMessage).then(async (title) => {
            await prisma.conversation.update({
                where: { id: currentSessionId },
                data: { title: title }
            });
        }).catch(console.error); // Fire and forget!
    }

    // 3. Fetch Context
    const history = await getConversationHistory(currentSessionId, 1, 10);

    // 4. Generate AI Reply
    let aiReplyText = "";
    try {
        aiReplyText = await generateReply(history, safeMessage);
    } catch (error: any) {
        aiReplyText = error.message;
    }

    // 5. Persist AI Message
    await saveMessage(currentSessionId, aiReplyText, "ai");

    // 6. Return the finalized data
    return {
        reply: aiReplyText,
        sessionId: currentSessionId,
    };
};