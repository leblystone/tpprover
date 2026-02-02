/**
 * 👻 Ghosty Conversation Modal
 *
 * Shows the full conversation exactly as the user sees it (same chat bubble UI as SupportChatModal).
 * Includes Ghosty analysis and routing details for admins.
 */

import { useState, useEffect, useRef } from 'react';
import { db } from '../../config/firebase';
import { collection, query, where, orderBy, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { User, ShieldCheck, Bot, X } from 'lucide-react';

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
        const logsRef = collection(db, 'ai_worker_logs');
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
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
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header — same as user SupportChatModal */}
        <div
          className="p-4 border-b flex items-center justify-between flex-shrink-0"
          style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
        >
          <div>
            <h3 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>
              Conversation (as user sees it)
            </h3>
            <p className="text-sm mt-0.5" style={{ color: theme.textLight }}>
              #{ticket.ticketNumber} • {ticket.userName || ticket.userEmail}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:opacity-70 transition-opacity" style={{ color: theme.textLight }}>
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {/* Ticket Overview */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-xs text-gray-500 mb-1">Status</div>
                <div className="font-medium capitalize">{ticket.status}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Priority</div>
                <div className="font-medium capitalize">{ticket.priority}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Created</div>
                <div className="font-medium">{formatTimestamp(ticket.createdAt)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Last Updated</div>
                <div className="font-medium">{formatTimestamp(ticket.updatedAt)}</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Subject</div>
              <div className="font-medium">{ticket.subject}</div>
            </div>
          </div>

          {/* Ghosty Analysis (if exists) */}
          {ghostWorkerLog && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="font-bold text-blue-900 mb-3">👻 Ghosty Analysis</div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <div className="text-xs text-blue-600 mb-1">Route Decision</div>
                  <div className="font-medium">
                    {ghostWorkerLog.route === 'gemini-pro' ? '🎨 Gemini Pro' : '🔧 Claude Sonnet'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-blue-600 mb-1">Confidence</div>
                  <div className="font-medium">{ghostWorkerLog.confidence}%</div>
                </div>
                <div>
                  <div className="text-xs text-blue-600 mb-1">Cost</div>
                  <div className="font-medium">${ghostWorkerLog.totalCost?.toFixed(5) || 'N/A'}</div>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-xs text-blue-600 mb-1">Routing Reasoning</div>
                <div className="text-sm bg-white p-2 rounded">{ghostWorkerLog.reasoning}</div>
              </div>

              {ghostWorkerLog.keywords && ghostWorkerLog.keywords.length > 0 && (
                <div>
                  <div className="text-xs text-blue-600 mb-2">Keywords Detected</div>
                  <div className="flex flex-wrap gap-2">
                    {ghostWorkerLog.keywords.map((keyword, idx) => (
                      <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-blue-200 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-blue-600">Response Posted:</span>{' '}
                  <span className="font-medium">
                    {ghostWorkerLog.responsePosted ? '✅ Yes' : '❌ No'}
                  </span>
                </div>
                <div>
                  <span className="text-blue-600">Human Override:</span>{' '}
                  <span className="font-medium">
                    {ghostWorkerLog.humanOverride ? '⚠️ Yes' : '✅ No'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Conversation Thread — same UI as user sees (SupportChatModal) */}
          <div className="space-y-4">
            <h4 className="font-bold text-gray-900 mb-2">💬 Conversation (as user sees it)</h4>
            <div
              className="rounded-lg p-4 min-h-[200px] space-y-4"
              style={{ backgroundColor: theme.background }}
            >
              {messages.length === 0 ? (
                <div className="text-center py-8" style={{ color: theme.textLight }}>
                  No messages yet.
                </div>
              ) : (
                messages.map((msg) => {
                  const isUser = msg.senderType === 'user';
                  const isGhost = msg.senderType === 'ghost-worker';
                  const isAdmin = msg.senderType === 'admin' || (msg.senderEmail && (msg.senderEmail.includes('admin') || msg.senderEmail.includes('thepepplanner.com')));
                  const fromTeam = isAdmin || isGhost;
                  const label = isUser ? (msg.senderName || 'User') : isGhost ? 'Ghosty' : 'The Pep Planner Team';
                  const Icon = isUser ? User : isGhost ? Bot : ShieldCheck;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${fromTeam ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${fromTeam ? 'rounded-tl-none' : 'rounded-tr-none'}`}
                        style={{
                          backgroundColor: fromTeam ? theme.primary + '15' : theme.accent,
                          borderLeft: fromTeam ? `3px solid ${theme.primary}` : 'none',
                          borderRight: !fromTeam ? `3px solid ${theme.primary}` : 'none'
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon size={14} style={{ color: theme.primary }} />
                          <span className="text-xs font-semibold" style={{ color: theme.primary }}>
                            {label}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap" style={{ color: theme.text }}>
                          {msg.message || msg.text}
                        </p>
                        {msg.imageUrls && msg.imageUrls.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {msg.imageUrls.map((url, idx) => (
                              <div key={idx}>
                                <a href={url} target="_blank" rel="noopener noreferrer" className="block hover:opacity-90">
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
                          {msg.createdAt?.toDate?.() ? new Date(msg.createdAt.toDate()).toLocaleString() : (msg.createdAt ? new Date(msg.createdAt).toLocaleString() : '')}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Ghosty Metadata */}
          {ticket.metadata?.ghostWorker && (
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="font-bold text-yellow-900 mb-2">⚠️ Ghosty Metadata</div>
              <pre className="text-xs bg-white p-3 rounded overflow-x-auto">
                {JSON.stringify(ticket.metadata.ghostWorker, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={() => window.open(`#/admin/tickets/${ticketId}`, '_blank')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Open in Admin Panel
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
