import { useEffect, useState } from 'react';
import { MessageSquare, Plus, ChevronRight } from 'lucide-react';
import { fetchConversations } from '../api/chat';
import type { Conversation } from '../types';
import { useChatContext } from '../context/ChatContext';

function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ConversationList() {
  const { dispatch } = useChatContext();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations()
      .then(setConversations)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="conv-list">
      <button className="conv-list__new" onClick={() => dispatch({ type: 'NEW_CHAT' })}>
        <Plus size={16} />
        New Conversation
      </button>

      {loading ? (
        <div className="spinner-wrap">
          <div className="spinner" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="conv-list__empty">
          <div className="conv-list__empty-icon">
            <MessageSquare size={22} />
          </div>
          <p>No conversations yet</p>
          <p style={{ fontSize: 12 }}>Start one above</p>
        </div>
      ) : (
        <>
          <p className="conv-list__section-label">Recent</p>
          <div className="conv-list__scroll">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className="conv-item"
                onClick={() => dispatch({ type: 'OPEN_CONVERSATION', id: conv.id, title: conv.title ?? 'Chat', createdAt: conv.createdAt })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && dispatch({ type: 'OPEN_CONVERSATION', id: conv.id, title: conv.title ?? 'Chat', createdAt: conv.createdAt })}
              >
                <div className="conv-item__icon">
                  <MessageSquare size={16} />
                </div>
                <div className="conv-item__info">
                  <div className="conv-item__title">{conv.title ?? 'New Chat'}</div>
                  <div className="conv-item__date">{formatDate(conv.createdAt)}</div>
                </div>
                <ChevronRight size={14} className="conv-item__arrow" />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
