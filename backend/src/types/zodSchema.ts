import { z } from "zod";

export const MessageSchema = z.object({
    id: z.string(),
    content: z.string(),
    sender: z.enum(['user', 'ai']),
    timestamp: z.string().datetime(), // Validates ISO date-time string natively
});

export type MessageSchemaType = z.infer<typeof MessageSchema>;

export const ConversationSchema = z.object({
    id: z.string(),
    messages: z.array(MessageSchema),
});

export type ConversationSchemaType = z.infer<typeof ConversationSchema>;

export const ConversationListSchema = z.object({
    conversations: z.array(ConversationSchema),
});

export type ConversationListSchemaType = z.infer<typeof ConversationListSchema>;

export const QuerySchema = z.object({
    query: z.string().min(1, "Message cannot be empty.").max(1000, "Message is too long."),
    sessionId: z.string().optional(),
}).strict(); 

export type QuerySchemaType = z.infer<typeof QuerySchema>;