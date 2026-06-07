import { useState } from 'react';
import { MessageCircle, X, Zap, Shield, Clock } from 'lucide-react';
import ChatModal from './components/ChatModal';

export default function App() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Landing Page */}
      <main className="landing">
        <div className="landing__badge">
          <span className="landing__badge-dot" />
          Live support available
        </div>

        <h1 className="landing__title">
          Customer support<br />
          <span>made simple</span>
        </h1>

        <p className="landing__subtitle">
          Get instant answers from our AI assistant. Fast, friendly,
          and available around the clock.
        </p>

        <button className="landing__cta" onClick={() => setIsOpen(true)}>
          <MessageCircle size={18} />
          Chat with us
        </button>

        <p className="landing__hint">Usually replies in seconds</p>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: 12, marginTop: '3rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { icon: <Zap size={14} />, label: 'Instant replies' },
            { icon: <Shield size={14} />, label: 'Secure & private' },
            { icon: <Clock size={14} />, label: '24/7 support' },
          ].map(({ icon, label }) => (
            <div
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                color: 'var(--color-muted-text)',
                background: 'var(--color-muted)',
                border: '1px solid var(--color-border)',
                padding: '6px 12px',
                borderRadius: 100,
              }}
            >
              {icon}
              {label}
            </div>
          ))}
        </div>
      </main>

      {/* Widget Button */}
      <button
        className="widget-btn"
        onClick={() => setIsOpen((o) => !o)}
        aria-label={isOpen ? 'Close support chat' : 'Open support chat'}
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* Chat Modal */}
      <ChatModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
