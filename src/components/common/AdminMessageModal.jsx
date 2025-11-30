import React, { useEffect } from 'react';
import { X, AlertCircle, CheckCircle2, MessageCircleReply, CalendarClock } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

export default function AdminMessageModal({ message, onClose, theme, onMarkRead }) {
  const { user } = useAppContext();

  // Mark as read when modal opens (only once)
  useEffect(() => {
    if (message?.id && onMarkRead) {
      // Mark message as read when modal is opened
      onMarkRead();
    }
  }, [message?.id]); // Only run when message changes

  if (!message) return null;

  const messageDate = message.createdAt?.toDate?.()
    ? new Date(message.createdAt.toDate())
    : new Date();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        className="rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
        style={{ 
          backgroundColor: theme.cardBackground
        }}
      >
        {/* Alert Header - Theme Matched Style */}
        <div 
          className="p-5"
          style={{
            background: theme.secondary || theme.accent || theme.background,
            color: theme.text
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full" style={{ backgroundColor: `${theme.primary || '#6366F1'}15` }}>
                <MessageCircleReply size={24} style={{ color: theme.primary || theme.text }} />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: theme.text }}>Personal Message</h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
              style={{ color: theme.text }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Message Content - Clean Card Style */}
        <div 
          className="flex-1 p-6"
          style={{ backgroundColor: theme.cardBackground }}
        >
          <div className="space-y-4">
            {/* Message Body */}
            <div className="relative">
              <div 
                className="rounded-lg p-5"
                style={{
                  backgroundColor: theme.background,
                  border: `1px solid ${theme.border}`
                }}
              >
                <p 
                  className="text-base leading-relaxed whitespace-pre-wrap" 
                  style={{ color: theme.text }}
                >
                  {message.message}
                </p>
              </div>
              
              {/* Decorative accent */}
              <div 
                className="absolute -left-1 top-0 bottom-0 w-1 rounded-full"
                style={{ backgroundColor: theme.primary || '#6366F1' }}
              />
            </div>

            {/* Timestamp */}
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 text-xs" style={{ color: theme.textLight }}>
                <CalendarClock size={14} />
                <span>
                  {messageDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <div className="text-xs italic" style={{ color: theme.textLight }}>
                - From The Pep Planner Team
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Info Note */}
        <div 
          className="p-4 border-t"
          style={{ 
            borderColor: theme.border, 
            backgroundColor: theme.cardBackground 
          }}
        >
          <div className="flex items-center gap-2 text-xs text-center justify-center" style={{ color: theme.textLight }}>
            <CheckCircle2 size={14} style={{ color: theme.success || '#10B981' }} />
            <span>This message will remain visible for 24 hours after opened.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

