import { useEffect, useRef, useState, useCallback } from 'react';
import { Send, ChevronUp } from 'lucide-react';
import { fetchMessages, sendMessage } from '../api/chat';
import type { Message } from '../types';

interface Props {
  sessionId: string | null;
  onSessionCreated: (id: string, title: string) => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatView({ sessionId, onSessionCreated }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [typing, setTyping] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionId);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = useCallback(async (sid: string, p: number, prepend = false) => {
    setFetching(true);
    try {
      const msgs = await fetchMessages(sid, p, 20);
      if (msgs.length < 20) setHasMore(false);
      setMessages((prev) => (prepend ? [...msgs, ...prev] : msgs));
    } catch {
      // silent fail
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (sessionId) {
      setCurrentSessionId(sessionId);
      loadMessages(sessionId, 1, false);
    }
  }, [sessionId, loadMessages]);

  useEffect(() => {
    if (!fetching) scrollToBottom();
  }, [messages]);

  const handleLoadMore = async () => {
    if (!currentSessionId || fetching || !hasMore) return;
    const prevScrollHeight = scrollRef.current?.scrollHeight ?? 0;
    const nextPage = page + 1;
    setPage(nextPage);
    await loadMessages(currentSessionId, nextPage, true);
    // restore scroll position after prepend
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevScrollHeight;
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const now = new Date().toISOString();
    const optimisticUser: Message = {
      id: `tmp-${Date.now()}`,
      content: text,
      sender: 'user',
      timestamp: now,
    };

    setMessages((prev) => [...prev, optimisticUser]);
    setInput('');
    setLoading(true);
    setTyping(true);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const res = await sendMessage(text, currentSessionId ?? undefined);

      if (!currentSessionId) {
        setCurrentSessionId(res.sessionId);
        onSessionCreated(res.sessionId, text.slice(0, 40));
      }

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        content: res.reply,
        sender: 'ai',
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errMsg: Message = {
        id: `err-${Date.now()}`,
        content: 'Something went wrong. Please try again.',
        sender: 'ai',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
      setTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 96)}px`;
  };

  return (
    <div className="chat-view">
      <div className="chat-view__messages" ref={scrollRef}>
        {currentSessionId && hasMore && messages.length >= 20 && (
          <button
            className="chat-view__load-more"
            onClick={handleLoadMore}
            disabled={fetching}
          >
            {fetching ? <><span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Loading</> : <><ChevronUp size={14} /> Load older messages</>}
          </button>
        )}

        {messages.length === 0 && !fetching && (
          <div className="chat-view__empty">
            <p>How can I help you today?</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`msg msg--${msg.sender}`}>
            <div className="msg__bubble">{msg.content}</div>
            <span className="msg__time">{formatTime(msg.timestamp)}</span>
          </div>
        ))}

        {typing && (
          <div className="typing-indicator">
            <span /><span /><span />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="chat-input">
        <textarea
          ref={textareaRef}
          className="chat-input__field"
          placeholder="Type a message..."
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          rows={1}
          aria-label="Message input"
        />
        <button
          className="chat-input__send"
          onClick={handleSend}
          disabled={!input.trim() || loading}
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
