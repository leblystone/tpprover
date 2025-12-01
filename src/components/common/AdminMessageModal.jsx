import React, { useEffect } from 'react';
import { X, AlertCircle, CheckCircle2, MessageCircleReply, CalendarClock, Trash2 } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { deleteAdminMessage } from '../../services/firebase';

export default function AdminMessageModal({ message, onClose, theme, onMarkRead, onDelete }) {
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
          className="px-4 py-3"
          style={{
            background: theme.secondary || theme.accent || theme.background,
            color: theme.text
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full" style={{ backgroundColor: `${theme.primary || '#6366F1'}15` }}>
                <MessageCircleReply size={24} style={{ color: theme.primary || theme.text }} />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: theme.text }}>Personal Message</h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Delete button for test messages */}
              {(message?.message?.includes('test admin message') || 
                message?.message?.includes('Test admin message') || 
                message?.message?.includes('🧪')) && (
                <button
                  onClick={async () => {
                    if (window.confirm('Delete this test message? The page will refresh.')) {
                      try {
                        console.log('🗑️ Deleting admin message:', message.id);
                        await deleteAdminMessage(message.id);
                        console.log('✅ Message deleted successfully');
                        if (onDelete) onDelete();
                        onClose();
                        window.dispatchEvent(new CustomEvent('tpp:toast', { 
                          detail: { message: 'Test message deleted. Refreshing...', type: 'success' } 
                        }));
                        // Force page refresh to update the chip
                        setTimeout(() => {
                          window.location.reload();
                        }, 500);
                      } catch (error) {
                        console.error('❌ Failed to delete message:', error);
                        window.dispatchEvent(new CustomEvent('tpp:toast', { 
                          detail: { message: `Failed to delete: ${error.message}`, type: 'error' } 
                        }));
                      }
                    }
                  }}
                  className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
                  style={{ color: theme.error || '#EF4444' }}
                  title="Delete test message"
                >
                  <Trash2 size={18} />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
                style={{ color: theme.text }}
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Message Content - Letter Style */}
        <div 
          className="flex-1 px-6 py-5"
          style={{ backgroundColor: theme.cardBackground }}
        >
          {/* Message Body - Clean quote style */}
          <div 
            className="pl-4 mb-6"
            style={{ 
              borderLeft: `3px solid ${theme.primary || '#6366F1'}40`
            }}
          >
            <p 
              className="text-sm leading-7 whitespace-pre-wrap" 
              style={{ color: theme.text }}
            >
              {message.message}
            </p>
          </div>

          {/* Timestamp & Signature - Right aligned */}
          <div className="flex flex-col items-end gap-1 pt-2">
            <div className="flex items-center gap-2 text-xs" style={{ color: theme.textLight }}>
              <CalendarClock size={12} />
              <span>
                {messageDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
            <div 
              className="text-sm mt-1" 
              style={{ 
                color: theme.text,
                fontStyle: 'italic'
              }}
            >
              — The Pep Planner Team
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
          <div className="flex items-center gap-2 text-xs md:text-sm text-center justify-center" style={{ color: '#9CA3AF' }}>
            <CheckCircle2 size={14} className="md:w-4 md:h-4" style={{ color: '#9CA3AF' }} />
            <span>This message will remain visible for 24 hours after opened.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

