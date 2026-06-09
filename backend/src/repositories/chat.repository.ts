import { prisma } from "../db/prisma.js";

export const findConversationById = async (id: string) => {
    return prisma.conversation.findUnique({
        where: { id },
        include: { _count: { select: { messages: true } } },
    });
};

export const createConversation = async () => {
    return prisma.conversation.create({ data: {} });
};

export const updateConversationTitle = async (id: string, title: string) => {
    return prisma.conversation.update({ where: { id }, data: { title } });
};

export const findRecentConversations = async (limit = 20) => {
    return prisma.conversation.findMany({ orderBy: { createdAt: "desc" }, take: limit });
};

export const createMessage = async (conversationId: string, text: string, sender: "user" | "ai") => {
    return prisma.message.create({ data: { conversationId, text, sender } });
};

export const findMessagesPaginated = async (conversationId: string, skip: number, take: number) => {
    const messages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { timestamp: "desc" },
        skip,
        take,
    });
    return messages.reverse();
};
