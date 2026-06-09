import { Bot, X, ArrowLeft } from 'lucide-react';
import { ChatProvider, useChatContext } from '../context/ChatContext';
import ConversationList from './ConversationList';
import ChatView from './ChatView';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

function ChatInner({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useChatContext();
  const { view, title } = state;

  return (
    <>
      <div className="modal-header">
        {view === 'chat' ? (
          <button className="modal-header__back" onClick={() => dispatch({ type: 'BACK' })} aria-label="Back to conversations">
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

      {view === 'list' ? <ConversationList /> : <ChatView />}
    </>
  );
}

export default function ChatModal({ isOpen, onClose }: Props) {
  return (
    <div className={`modal ${isOpen ? 'open' : ''}`} role="dialog" aria-modal="true" aria-label="Support chat">
      <ChatProvider>
        <ChatInner onClose={onClose} />
      </ChatProvider>
    </div>
  );
}
