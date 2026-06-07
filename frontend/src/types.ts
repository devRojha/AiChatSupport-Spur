export interface Conversation {
  id: string;
  title: string | null;
  createdAt: string;
}

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: string;
}
