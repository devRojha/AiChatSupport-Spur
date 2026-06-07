import { useState } from 'react';
import { Bot, X, ArrowLeft } from 'lucide-react';
import ConversationList from './ConversationList';
import ChatView from './ChatView';

type View = 'list' | 'chat';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatModal({ isOpen, onClose }: Props) {
  const [view, setView] = useState<View>('list');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [title, setTitle] = useState('Support Chat');

  const openNewChat = () => {
    setSessionId(null);
    setTitle('New Conversation');
    setView('chat');
  };

  const openConversation = (id: string, convTitle: string) => {
    setSessionId(id);
    setTitle(convTitle);
    setView('chat');
  };

  const handleBack = () => {
    setView('list');
    setSessionId(null);
    setTitle('Support Chat');
  };

  const handleSessionCreated = (id: string, firstMsg: string) => {
    setSessionId(id);
    setTitle(firstMsg || 'New Chat');
  };

  return (
    <div className={`modal ${isOpen ? 'open' : ''}`} role="dialog" aria-modal="true" aria-label="Support chat">
      <div className="modal-header">
        {view === 'chat' ? (
          <button className="modal-header__back" onClick={handleBack} aria-label="Back to conversations">
            <ArrowLeft size={15} />
          </button>
        ) : (
          <div className="modal-header__avatar">
            <Bot size={18} />
          </div>
        )}

        <div className="modal-header__info">
          <div className="modal-header__title">
            {view === 'list' ? 'SpurStore Support' : title}
          </div>
          <div className="modal-header__sub">Online</div>
        </div>

        <button className="modal-header__close" onClick={onClose} aria-label="Close chat">
          <X size={16} />
        </button>
      </div>

      {view === 'list' ? (
        <ConversationList
          onNewChat={openNewChat}
          onSelectConversation={openConversation}
        />
      ) : (
        <ChatView
          sessionId={sessionId}
          onSessionCreated={handleSessionCreated}
        />
      )}
    </div>
  );
}
