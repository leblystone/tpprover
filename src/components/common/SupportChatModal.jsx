import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Loader, Clock, User, ShieldCheck } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { getFirestore, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';

export default function SupportChatModal({ ticket, onClose, theme, onMarkRead }) {
  const { user } = useAppContext();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load messages in real-time
  useEffect(() => {
    if (!ticket?.id) return;

    const db = getFirestore();
    const messagesRef = collection(db, 'supportTickets', ticket.id, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
      setLoading(false);

      // Mark as read when modal opens
      if (onMarkRead) {
        onMarkRead();
      }
    }, (error) => {
      console.error('❌ Error loading messages:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [ticket?.id, onMarkRead]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !ticket?.id || !user) return;

    setSending(true);
    try {
      const db = getFirestore();
      const messagesRef = collection(db, 'supportTickets', ticket.id, 'messages');

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
            <p className="text-sm mt-1" style={{ color: theme.textLight }}>
              {ticket?.subject || 'Support Request'}
            </p>
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
              const isAdmin = msg.senderType === 'admin';
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
                    <div className="flex items-center gap-1 mt-2 text-xs" style={{ color: theme.textLight }}>
                      <Clock size={10} />
                      <span>
                        {msg.createdAt?.toDate?.()
                          ? new Date(msg.createdAt.toDate()).toLocaleString()
                          : 'Just now'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div 
          className="p-4 border-t"
          style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
        >
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
                backgroundColor: theme.primary,
                color: theme.textOnPrimary
              }}
            >
              {sending ? (
                <Loader size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
          <p className="text-xs mt-2" style={{ color: theme.textLight }}>
            💡 You'll receive a notification when the admin responds
          </p>
        </div>
      </div>
    </div>
  );
}

