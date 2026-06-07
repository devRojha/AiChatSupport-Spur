import type { FromSchema } from 'json-schema-to-ts';


export const MessageSchema = {
    type: 'object',
    required: ['id', 'content', 'sender', 'timestamp'],
    title: 'Message',
    properties: {
        id: { type: 'string' },
        content: { type: 'string' },
        sender: { 
            type: 'string',
            enum: ['user', 'ai'] 
        },
        timestamp: { type: 'string', format: 'date-time' },
    },
} as const;

export type MessageSchemaType = FromSchema<typeof MessageSchema>;

export const ConversationSchema = {
    type: 'object',
    required: ['id', 'messages'],
    title: 'Conversation',
    properties: {
        id: { type: 'string' },
        messages: {
            type: 'array',
            items: MessageSchema,
        },
    },
} as const;

export type ConversationSchemaType = FromSchema<typeof ConversationSchema>;


export const ConversationListSchema = {
    type: 'object',
    title: 'ConversationList',
    required: ['conversations'],
    properties: {
        conversations: {
            type: 'array',
            items: ConversationSchema,
        },
    },
} as const;

export type ConversationListSchemaType = FromSchema<typeof ConversationListSchema>;


const querySchema = {
    type: 'object',
    required: ['query'],
    title: 'Query',
    additionalProperties: false,
    properties: {
        query: { type: 'string' },
        sessionId: { type: 'string' },
    },
} as const;

export type QuerySchemaType = FromSchema<typeof querySchema>;