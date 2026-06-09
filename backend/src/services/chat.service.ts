import { generateReply, generateTitle } from "./llm.service.js";
import redis from "../db/redis.js";
import { CONVERSATIONS_CACHE_KEY, CONVERSATIONS_TTL, SESSION_TTL_MS } from "../utils/constants.js";
import {
    findConversationById,
    createConversation,
    updateConversationTitle,
    findRecentConversations,
    createMessage,
    findMessagesPaginated,
} from "../repositories/chat.repository.js";

export class SessionExpiredError extends Error {
    constructor() {
        super("Session has expired");
        this.name = "SessionExpiredError";
    }
}

const getOrCreateConversation = async (sessionId?: string) => {
    if (sessionId) {
        const existing = await findConversationById(sessionId);
        if (existing) return existing;
    }
    const newConv = await createConversation();
    redis.del(CONVERSATIONS_CACHE_KEY).catch(() => {});
    return { ...newConv, _count: { messages: 0 } };
};

export const getConversationHistory = async (conversationId: string, page: number = 1, limit: number = 10) => {
    return findMessagesPaginated(conversationId, (page - 1) * limit, limit);
};

export const getAllConversations = async () => {
    try {
        const cached = await redis.get(CONVERSATIONS_CACHE_KEY);
        if (cached) return JSON.parse(cached);
    } catch {}

    const conversations = await findRecentConversations();

    try {
        await redis.set(CONVERSATIONS_CACHE_KEY, JSON.stringify(conversations), { EX: CONVERSATIONS_TTL });
    } catch {}

    return conversations;
};

export const processChatMessage = async (query: string, sessionId?: string) => {
    const conversation = await getOrCreateConversation(sessionId);
    const currentSessionId = conversation.id;

    if (sessionId && Date.now() - conversation.createdAt.getTime() > SESSION_TTL_MS) {
        throw new SessionExpiredError();
    }

    const safeMessage = query.substring(0, 1000);
    await createMessage(currentSessionId, safeMessage, "user");

    if (conversation._count.messages === 0) {
        generateTitle(safeMessage)
            .then((title) => updateConversationTitle(currentSessionId, title))
            .catch(console.error);
    }

    const history = await getConversationHistory(currentSessionId, 1, 10);

    let aiReplyText = "";
    try {
        aiReplyText = await generateReply(history, safeMessage);
    } catch (error: any) {
        aiReplyText = error.message;
    }

    await createMessage(currentSessionId, aiReplyText, "ai");

    return { reply: aiReplyText, sessionId: currentSessionId };
};
