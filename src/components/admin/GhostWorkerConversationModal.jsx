/**
 * 👻 Ghosty Conversation Modal
 *
 * Shows the full conversation exactly as the user sees it (same chat bubble UI as SupportChatModal).
 * Includes Ghosty analysis and routing details for admins.
 */

import { useState, useEffect, useRef } from 'react';
import { db } from '../../config/firebase';
import { COLLECTIONS } from '../../config/collections';
import { collection, query, where, orderBy, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { User, ShieldCheck, X, PaperPlaneTilt } from '@phosphor-icons/react';

// Same theme defaults as user-facing SupportChatModal for "as user sees it" look
const defaultTheme = {
  primary: '#4a7c59',
  primaryDark: '#2d5a3a',
  accent: '#E8F5E9',
  text: '#1F2937',
  textLight: '#6B7280',
  background: '#F9FAFB',
  cardBackground: '#FFFFFF',
  border: '#E5E7EB'
};

export default function GhostWorkerConversationModal({ ticketId, onClose, theme: themeProp }) {
  const theme = themeProp || defaultTheme;
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [ghostWorkerLog, setGhostWorkerLog] = useState(null);
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef(null);

  // Load ticket and Ghosty log once
  useEffect(() => {
    if (!ticketId) return;
    let cancelled = false;
    (async () => {
      try {
        const ticketDoc = await getDoc(doc(db, 'supportTickets', ticketId));
        if (cancelled) return;
        if (ticketDoc.exists()) {
          setTicket({ id: ticketDoc.id, ...ticketDoc.data() });
        }
        const logsRef = collection(db, COLLECTIONS.USER_REPORTS_QUEUE);
        const logsQuery = query(logsRef, where('ticketId', '==', ticketId), orderBy('timestamp', 'desc'));
        const logsSnapshot = await getDocs(logsQuery);
        if (!cancelled && !logsSnapshot.empty) {
          setGhostWorkerLog({ id: logsSnapshot.docs[0].id, ...logsSnapshot.docs[0].data() });
        }
      } catch (error) {
        if (!cancelled) console.error('Error loading conversation:', error);
      }
    })();
    return () => { cancelled = true; };
  }, [ticketId]);

  // Live subscription to messages (same as user - real-time chat)
  useEffect(() => {
    if (!ticketId) return;
    const messagesRef = collection(db, 'supportTickets', ticketId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error('Error loading messages:', err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [ticketId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
        <div className="rounded-lg shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh] p-6" style={{ backgroundColor: theme.cardBackground }}>
          <div className="flex items-center justify-center py-8">
            <span className="animate-pulse" style={{ color: theme.textLight }}>Loading messages...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
          <div className="text-center text-gray-600">
            Ticket not found
          </div>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition w-full"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
      <div
        className="rounded-lg shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh]"
        style={{ backgroundColor: theme.cardBackground }}
      >
        {/* Header — exactly like user: "Support Conversation" only */}
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

        {/* Messages — same area as user */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-4"
          style={{ backgroundColor: theme.background }}
        >
          {messages.length === 0 ? (
            <div className="text-center py-8" style={{ color: theme.textLight }}>
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isAdmin = msg.senderType === 'admin' || msg.senderType === 'ghost-worker' ||
                (msg.senderEmail && (msg.senderEmail.includes('admin') || msg.senderEmail.includes('thepepplanner.com')));
              return (
                <div
                  key={msg.id}
                  className={`flex ${isAdmin ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${isAdmin ? 'rounded-tl-none' : 'rounded-tr-none'}`}
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
                    {msg.imageUrls && msg.imageUrls.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {msg.imageUrls.map((url, idx) => (
                          <div key={idx} className="relative">
                            <a href={url} target="_blank" rel="noopener noreferrer" className="block hover:opacity-90 transition-opacity">
                              <img
                                src={url}
                                alt={`Screenshot ${idx + 1}`}
                                className="rounded-lg border max-w-full"
                                style={{ maxHeight: '300px', objectFit: 'contain', borderColor: theme.border }}
                                loading="lazy"
                              />
                            </a>
                            <p className="text-xs mt-1" style={{ color: theme.textLight }}>
                              📸 Screenshot {idx + 1} • Click to open
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
          <div ref={messagesEndRef} />
        </div>

        {/* Footer — same as user: input + orange send + tip (read-only) */}
        <div
          className="p-4 border-t"
          style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
        >
          <div className="flex items-end gap-2">
            <textarea
              readOnly
              placeholder="Type your message... (Press Enter to send)"
              rows={3}
              className="flex-1 px-3 py-2 rounded-lg border text-sm resize-none opacity-70"
              style={{
                borderColor: theme.border,
                backgroundColor: theme.background,
                color: theme.text
              }}
            />
            <button
              type="button"
              disabled
              className="p-3 rounded-lg flex items-center gap-2 opacity-70 cursor-default"
              style={{ backgroundColor: '#D2691E', color: '#FFFFFF' }}
            >
              <PaperPlaneTilt size={18} />
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
