import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Loader, Clock, User, ShieldCheck, RotateCcw, Camera, Lightbulb } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { getFirestore, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { reopenTicket } from '../../services/firebase';

export default function SupportChatModal({ ticket: initialTicket, onClose, theme, onMarkRead, onTicketUpdate }) {
  const { user } = useAppContext();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reopening, setReopening] = useState(false);
  const [ticketStatus, setTicketStatus] = useState(initialTicket?.status || 'new');
  const [closedAt, setClosedAt] = useState(initialTicket?.closedAt || null);
  const messagesEndRef = useRef(null);

  // Check if ticket is closed
  const isClosed = ticketStatus === 'closed' || ticketStatus === 'resolved';

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mark as read when modal opens (only once)
  useEffect(() => {
    if (initialTicket?.id && onMarkRead) {
      // Mark ticket as read when modal is opened
      onMarkRead();
    }
  }, [initialTicket?.id]); // Only run when ticket changes, not on every message update

  // Listen to ticket status changes in real-time
  useEffect(() => {
    if (!initialTicket?.id) return;

    const db = getFirestore();
    const ticketRef = doc(db, 'supportTickets', initialTicket.id);

    const unsubscribe = onSnapshot(ticketRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setTicketStatus(data.status);
        setClosedAt(data.closedAt);
      }
    }, (error) => {
      console.error('❌ Error listening to ticket status:', error);
    });

    return () => unsubscribe();
  }, [initialTicket?.id]);

  // Load messages in real-time
  useEffect(() => {
    if (!initialTicket?.id) return;

    const db = getFirestore();
    const messagesRef = collection(db, 'supportTickets', initialTicket.id, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
      setLoading(false);
    }, (error) => {
      console.error('❌ Error loading messages:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [initialTicket?.id]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !initialTicket?.id || !user) return;

    setSending(true);
    try {
      const db = getFirestore();
      const messagesRef = collection(db, 'supportTickets', initialTicket.id, 'messages');

      await addDoc(messagesRef, {
        message: newMessage.trim(),
        text: newMessage.trim(), // Keep both for compatibility
        senderType: 'user',
        senderName: user.displayName || user.email,
        senderEmail: user.email,
        createdAt: serverTimestamp()
      });

      setNewMessage('');
      
      // Show success toast
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Message sent! 📨', type: 'success' }
      }));
    } catch (error) {
      console.error('❌ Error sending message:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Failed to send message. Please try again.', type: 'error' }
      }));
    } finally {
      setSending(false);
    }
  };

  // Handle reopening the ticket
  const handleReopenTicket = async () => {
    if (!initialTicket?.id || !user) return;

    setReopening(true);
    try {
      await reopenTicket(initialTicket.id);
      
      // Notify parent component if provided
      if (onTicketUpdate) {
        onTicketUpdate();
      }
      
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Support request reopened! 🔓', type: 'success' }
      }));
    } catch (error) {
      console.error('❌ Error reopening ticket:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Failed to reopen request. Please try again.', type: 'error' }
      }));
    } finally {
      setReopening(false);
    }
  };

  // Format the closed date and time (for display after "ticket closed")
  const formatClosedDate = () => {
    if (!closedAt) return '';
    try {
      const date = closedAt.toDate ? closedAt.toDate() : new Date(closedAt);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };
  const formatClosedTime = () => {
    if (!closedAt) return '';
    try {
      const date = closedAt.toDate ? closedAt.toDate() : new Date(closedAt);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return '';
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

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
          <div>
            <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>
              Support Conversation
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

        {/* Messages */}
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-4"
          style={{ backgroundColor: theme.background }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader size={24} className="animate-spin" style={{ color: theme.primary }} />
              <span className="ml-2" style={{ color: theme.textLight }}>Loading messages...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8" style={{ color: theme.textLight }}>
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => {
              // Determine if message is from admin
              // Check senderType, and also check if senderEmail contains admin indicators
              const isAdmin = msg.senderType === 'admin' || 
                             msg.senderEmail?.includes('admin') || 
                             msg.senderEmail?.includes('thepepplanner.com');
              
              return (
                <div
                  key={msg.id}
                  className={`flex ${isAdmin ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      isAdmin ? 'rounded-tl-none' : 'rounded-tr-none'
                    }`}
                    style={{
                      backgroundColor: isAdmin ? theme.primary + '15' : theme.accent,
                      borderLeft: isAdmin ? `3px solid ${theme.primary}` : 'none',
                      borderRight: !isAdmin ? `3px solid ${theme.primary}` : 'none'
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {isAdmin ? (
                        <ShieldCheck size={14} style={{ color: theme.primary }} />
                      ) : (
                        <User size={14} style={{ color: theme.primary }} />
                      )}
                      <span className="text-xs font-semibold" style={{ color: theme.primary }}>
                        {isAdmin ? 'The Pep Planner Team' : 'You'}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: theme.text }}>
                      {msg.message || msg.text}
                    </p>
                    
                    {/* Display screenshots if present */}
                    {msg.imageUrls && msg.imageUrls.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {msg.imageUrls.map((url, idx) => (
                          <div key={idx} className="relative">
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block hover:opacity-90 transition-opacity"
                            >
                              <img
                                src={url}
                                alt={`Screenshot ${idx + 1}`}
                                className="rounded-lg border max-w-full"
                                style={{
                                  maxHeight: '300px',
                                  objectFit: 'contain',
                                  borderColor: theme.border
                                }}
                                loading="lazy"
                              />
                            </a>
                            <p className="text-xs mt-1 flex items-center gap-1" style={{ color: theme.textLight }}>
                              <Camera size={10} /> Screenshot {idx + 1} • Click to open
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1 mt-2 text-xs opacity-50" style={{ color: theme.textLight }}>
                      <span>
                        {msg.createdAt?.toDate?.()
                          ? new Date(msg.createdAt.toDate()).toLocaleDateString()
                          : 'Today'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Closed Ticket - Lighter grey divider with date + timestamp after last message */}
          {isClosed && (
            <div className="my-6 space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }} />
                <div className="flex flex-col items-center gap-0.5 px-3 py-1 sm:flex-row sm:items-center sm:gap-2">
                  <span className="text-xs font-medium" style={{ color: theme.isDark ? '#9ca3af' : '#6b7280' }}>
                    ——— ticket closed ———
                  </span>
                  {closedAt && (
                    <span className="text-xs" style={{ color: theme.isDark ? '#9ca3af' : '#6b7280' }}>
                      {formatClosedDate()} · {formatClosedTime()}
                    </span>
                  )}
                </div>
                <div className="flex-1 h-px" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }} />
              </div>
              <p className="text-xs text-center" style={{ color: theme.isDark ? '#9ca3af' : '#6b7280' }}>
                This chat will be archived in your support requests in 24 hours.
              </p>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input / Closed State Footer */}
        <div 
          className="p-4 border-t"
          style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
        >
          {isClosed ? (
            /* Closed ticket footer - reopen button only */
            <div>
              <button
                onClick={handleReopenTicket}
                disabled={reopening}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'transparent',
                  color: theme.primary,
                  border: `1px solid ${theme.primary}40`
                }}
              >
                {reopening ? (
                  <Loader size={14} className="animate-spin" />
                ) : (
                  <RotateCcw size={14} />
                )}
                <span>Reopen request</span>
              </button>
            </div>
          ) : (
            /* Active ticket input */
            <>
              <div className="flex items-end gap-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message... (Press Enter to send)"
                  rows={3}
                  className="flex-1 px-3 py-2 rounded-lg border text-sm resize-none"
                  style={{
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                    color: theme.text
                  }}
                  disabled={sending}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="p-3 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  style={{
                    backgroundColor: '#D2691E',
                    color: '#FFFFFF'
                  }}
                >
                  {sending ? (
                    <Loader size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
              <p className="text-xs mt-2 flex items-center gap-1" style={{ color: theme.textLight }}>
                <Lightbulb size={12} /> You'll receive a notification when the admin responds
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

