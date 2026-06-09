import type { Conversation, Message } from '../types';
import { API_BASE as BASE } from '../constants';

export async function fetchConversations(): Promise<Conversation[]> {
  const res = await fetch(`${BASE}/conversations`);
  if (!res.ok) throw new Error('Failed to fetch conversations');
  const data = await res.json();
  return data.conversations;
}

export async function fetchMessages(sessionId: string, page: number, limit = 20): Promise<Message[]> {
  const res = await fetch(`${BASE}/${sessionId}/messages?page=${page}&limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch messages');
  const data = await res.json();
  return data.messages;
}

export async function sendMessage(
  query: string,
  sessionId?: string
): Promise<{ reply: string; sessionId: string }> {
  const res = await fetch(`${BASE}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, ...(sessionId ? { sessionId } : {}) }),
  });
  if (res.status === 410) throw new Error('SESSION_EXPIRED');
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}
