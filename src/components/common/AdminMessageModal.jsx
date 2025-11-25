import React, { useEffect, useRef } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

export default function AdminMessageModal({ message, onClose, theme, onMarkRead }) {
  const { user } = useAppContext();
  const messagesEndRef = useRef(null);

  // Scroll to bottom of message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [message]);

  // Mark as read when modal opens (only once)
  useEffect(() => {
    if (message?.id && onMarkRead) {
      // Mark message as read when modal is opened
      onMarkRead();
    }
  }, [message?.id]); // Only run when message changes

  if (!message) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        className="rounded-lg shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh]"
        style={{ backgroundColor: theme.cardBackground }}
      >
        {/* Header */}
        <div 
          className="p-4 border-b flex items-center justify-between"
          style={{ borderColor: theme.border }}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} style={{ color: theme.primary }} />
            <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>
              From the Team🥼
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:opacity-70 transition-opacity"
            style={{ color: theme.textLight }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Message */}
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-4"
          style={{ backgroundColor: theme.background }}
        >
          <div className="flex justify-start">
            <div
              className="max-w-[85%] rounded-lg p-4 rounded-tl-none"
              style={{
                backgroundColor: theme.primary + '15',
                borderLeft: `3px solid ${theme.primary}`
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={14} style={{ color: theme.primary }} />
                <span className="text-xs font-semibold" style={{ color: theme.primary }}>
                  The Pep Planner Team
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap" style={{ color: theme.text }}>
                {message.message}
              </p>
              <div className="flex items-center gap-1 mt-3 text-xs opacity-50" style={{ color: theme.textLight }}>
                <span>
                  {message.createdAt?.toDate?.()
                    ? new Date(message.createdAt.toDate()).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })
                    : 'Recently'}
                </span>
              </div>
            </div>
          </div>
          <div ref={messagesEndRef} />
        </div>

        {/* Footer */}
        <div 
          className="p-4 border-t"
          style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
        >
          <p className="text-xs text-center" style={{ color: theme.textLight }}>
            💡 This message will remain visible for 24 hours after you open it
          </p>
        </div>
      </div>
    </div>
  );
}

