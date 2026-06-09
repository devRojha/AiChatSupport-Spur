import { createContext, useContext, useReducer, ReactNode } from 'react';

type View = 'list' | 'chat';

interface ChatState {
  view: View;
  sessionId: string | null;
  title: string;
  createdAt: string | null;
}

export type ChatAction =
  | { type: 'NEW_CHAT' }
  | { type: 'OPEN_CONVERSATION'; id: string; title: string; createdAt: string }
  | { type: 'BACK' }
  | { type: 'SESSION_CREATED'; title: string };

const initial: ChatState = {
  view: 'list',
  sessionId: null,
  title: 'Support Chat',
  createdAt: null,
};

function reducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'NEW_CHAT':
      return { view: 'chat', sessionId: null, title: 'New Conversation', createdAt: null };
    case 'OPEN_CONVERSATION':
      return { view: 'chat', sessionId: action.id, title: action.title, createdAt: action.createdAt };
    case 'BACK':
      return { ...initial };
    case 'SESSION_CREATED':
      // Only update the title — sessionId stays null so ChatView's useEffect doesn't reset messages
      return { ...state, title: action.title };
  }
}

interface ContextValue {
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
}

const ChatContext = createContext<ContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  return <ChatContext.Provider value={{ state, dispatch }}>{children}</ChatContext.Provider>;
}

export function useChatContext(): ContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider');
  return ctx;
}
