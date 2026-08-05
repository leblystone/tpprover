import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Send, Loader, User, ShieldCheck, RotateCcw, Camera, CheckCheck, MessageSquare } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import {
  getFirestore,
  collection,
  doc,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { reopenTicket, closeTicketByUser, getUserTickets } from '../../services/firebase';

/**
 * SupportChatModal — unified chronological thread across ALL of a user's tickets.
 *
 * Props:
 *   ticket        — The "active" ticket (used for the chip entry point; null-safe).
 *                   If allTickets is provided, this is only used to highlight the most
 *                   recent context and mark the reply target.
 *   allTickets    — Optional array of all the user's tickets. When provided the modal
 *                   shows a single merged, chronological thread across all of them.
 *   onClose       — Close handler.
 *   theme         — Theme object from parent.
 *   onMarkRead    — Called when the modal opens to clear the unread badge.
 *   onTicketUpdate — Called after reopen / close so parent can refresh.
 */
export default function SupportChatModal({
  ticket: initialTicket,
  allTickets: allTicketsProp,
  onClose,
  theme,
  onMarkRead,
  onTicketUpdate,
}) {
  const { user } = useAppContext();

  // All tickets we're threading together
  const [tickets, setTickets] = useState(() => {
    if (allTicketsProp?.length) return allTicketsProp;
    if (initialTicket) return [initialTicket];
    return [];
  });

  // Flat merged messages — each annotated with _ticketId / _ticketNumber / _ticketType
  const [allMessages, setAllMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [closing, setClosing] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  const messagesEndRef = useRef(null);
  const messagesByTicket = useRef(new Map());
  const loadedTickets = useRef(new Set());

  // If allTicketsProp changes (parent refreshes), update
  useEffect(() => {
    if (allTicketsProp?.length) setTickets(allTicketsProp);
  }, [allTicketsProp]);

  // If no tickets were passed at all, try fetching from Firestore by user email
  useEffect(() => {
    if (tickets.length > 0 || !user?.email) return;
    getUserTickets(user.email)
      .then((fetched) => {
        if (fetched?.length) setTickets(fetched);
      })
      .catch(console.error);
  }, [user?.email, tickets.length]);

  // Subscribe to messages for ALL tickets simultaneously
  useEffect(() => {
    if (!tickets.length) return;
    const db = getFirestore();
    const unsubscribers = [];

    for (const ticket of tickets) {
      if (loadedTickets.current.has(ticket.id)) continue;
      loadedTickets.current.add(ticket.id);

      const messagesRef = collection(db, 'supportTickets', ticket.id, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'asc'));

      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const msgs = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            _ticketId: ticket.id,
            _ticketNumber: ticket.ticketNumber || ticket.id.slice(-6).toUpperCase(),
            _ticketType: ticket.type || 'support',
            _ticketStatus: ticket.status,
          }));
          messagesByTicket.current.set(ticket.id, msgs);
          rebuildMessages();
          setLoading(false);
        },
        (error) => {
          console.error('SupportChatModal message load error:', error);
          setLoading(false);
        }
      );
      unsubscribers.push(unsub);
    }

    // If all tickets were already loaded (re-render), still clear loading
    if (loadedTickets.current.size >= tickets.length) setLoading(false);

    return () => unsubscribers.forEach((fn) => fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets.map((t) => t.id).join(',')]);

  const rebuildMessages = () => {
    const flat = [];
    for (const msgs of messagesByTicket.current.values()) flat.push(...msgs);
    flat.sort((a, b) => {
      const ta = tsToMs(a.createdAt);
      const tb = tsToMs(b.createdAt);
      return ta - tb;
    });
    setAllMessages(flat);
  };

  const tsToMs = (ts) => {
    if (!ts) return 0;
    if (typeof ts === 'number') return ts;
    if (typeof ts?.toMillis === 'function') return ts.toMillis();
    if (typeof ts?.toDate === 'function') return ts.toDate().getTime();
    if (ts instanceof Date) return ts.getTime();
    const sec = ts?.seconds ?? ts?._seconds;
    if (typeof sec === 'number') {
      const nano = ts.nanoseconds ?? ts._nanoseconds ?? 0;
      return sec * 1000 + Math.floor(nano / 1e6);
    }
    return 0;
  };

  // Scroll to bottom whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages]);

  // Mark as read on open
  useEffect(() => {
    if (onMarkRead) onMarkRead();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The "active" ticket to reply to — first open/in-progress, else most recent
  const replyTarget = useMemo(() => {
    const open = tickets.find((t) => t.status === 'new' || t.status === 'in-progress');
    if (open) return open;
    // All closed — use most recent
    return tickets.slice().sort((a, b) => {
      const ta = tsToMs(a.lastMessageAt || a.updatedAt || a.createdAt);
      const tb = tsToMs(b.lastMessageAt || b.updatedAt || b.createdAt);
      return tb - ta;
    })[0] || null;
  }, [tickets]);

  const allClosed = tickets.length > 0 && tickets.every(
    (t) => t.status === 'closed' || t.status === 'resolved'
  );

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !replyTarget?.id || !user) return;
    setSending(true);
    try {
      const db = getFirestore();
      const messagesRef = collection(db, 'supportTickets', replyTarget.id, 'messages');
      await addDoc(messagesRef, {
        message: newMessage.trim(),
        text: newMessage.trim(),
        senderType: 'user',
        senderName: user.displayName || user.email,
        senderEmail: user.email,
        createdAt: serverTimestamp(),
      });
      // Keep ticket sorted for admin mobile inbox / work queue
      try {
        await updateDoc(doc(db, 'supportTickets', replyTarget.id), {
          lastMessageAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (_) { /* non-fatal */ }
      setNewMessage('');
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Message sent!', type: 'success' },
      }));
    } catch (error) {
      console.error('Error sending message:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Failed to send. Please try again.', type: 'error' },
      }));
    } finally {
      setSending(false);
    }
  };

  const handleReopenTicket = async () => {
    if (!replyTarget?.id || !user) return;
    setReopening(true);
    try {
      await reopenTicket(replyTarget.id);
      if (onTicketUpdate) onTicketUpdate();
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Request reopened!', type: 'success' },
      }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Failed to reopen. Please try again.', type: 'error' },
      }));
    } finally {
      setReopening(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!replyTarget?.id || !user) return;
    setClosing(true);
    try {
      await closeTicketByUser(replyTarget.id);
      setConfirmClose(false);
      if (onTicketUpdate) onTicketUpdate();
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Ticket closed. Thanks for reaching out!', type: 'success' },
      }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Failed to close. Please try again.', type: 'error' },
      }));
    } finally {
      setClosing(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMsgDate = (ts) => {
    const ms = tsToMs(ts);
    if (!ms) return 'Today';
    const d = new Date(ms);
    const now = new Date();
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // TYPE LABEL helpers
  const typeLabel = (type) => {
    if (type === 'bug') return 'Bug Report';
    if (type === 'suggestion') return 'Suggestion';
    return 'Support Request';
  };
  const typeColor = (type) => {
    if (type === 'bug') return { bg: '#FEE2E2', color: '#DC2626' };
    if (type === 'suggestion') return { bg: '#D1FAE5', color: '#065F46' };
    return { bg: '#DBEAFE', color: '#1D4ED8' };
  };

  // Build render list: insert ticket-context dividers when the ticket changes
  const renderItems = useMemo(() => {
    const items = [];
    let lastTicketId = null;
    for (let i = 0; i < allMessages.length; i++) {
      const msg = allMessages[i];
      if (msg._ticketId !== lastTicketId) {
        lastTicketId = msg._ticketId;
        const tc = typeColor(msg._ticketType);
        const ticketMsgs = allMessages.filter((m) => m._ticketId === msg._ticketId);
        const firstTs = ticketMsgs[0]?.createdAt;
        items.push({
          type: 'divider',
          key: `divider-${msg._ticketId}`,
          ticketNumber: msg._ticketNumber,
          ticketType: msg._ticketType,
          ticketStatus: msg._ticketStatus,
          tc,
          date: firstTs,
        });
      }
      items.push({ type: 'message', key: msg.id, msg });
    }
    return items;
  }, [allMessages]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10002] p-4">
      <div
        className="rounded-xl shadow-2xl w-full max-w-2xl flex flex-col"
        style={{
          backgroundColor: theme.cardBackground,
          maxHeight: '85vh',
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 border-b flex items-center justify-between flex-shrink-0"
          style={{ borderColor: theme.border }}
        >
          <div>
            <h2 className="text-base font-semibold" style={{ color: theme.primaryDark }}>
              Your Support History
            </h2>
            <p className="text-xs mt-0.5" style={{ color: theme.textLight }}>
              {tickets.length} report{tickets.length !== 1 ? 's' : ''} — all messages in one place
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
          className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
          style={{ backgroundColor: theme.background }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader size={22} className="animate-spin" style={{ color: theme.primary }} />
              <span className="ml-2 text-sm" style={{ color: theme.textLight }}>Loading…</span>
            </div>
          ) : allMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <MessageSquare size={36} style={{ color: theme.textLight, opacity: 0.3 }} />
              <p className="text-sm text-center" style={{ color: theme.textLight }}>
                No messages yet. Start the conversation below!
              </p>
            </div>
          ) : (
            renderItems.map((item) => {
              if (item.type === 'divider') {
                return (
                  <div key={item.key} className="flex items-center gap-3 py-3">
                    <div className="flex-1 h-px" style={{ backgroundColor: theme.border }} />
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: '700',
                          padding: '3px 8px',
                          borderRadius: '999px',
                          backgroundColor: item.tc.bg,
                          color: item.tc.color,
                          textTransform: 'uppercase',
                          letterSpacing: '0.03em',
                        }}
                      >
                        {typeLabel(item.ticketType)}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '600',
                          color: theme.textLight,
                        }}
                      >
                        #{item.ticketNumber}
                      </span>
                      {item.date && (
                        <span style={{ fontSize: '11px', color: theme.textLight }}>
                          · {formatMsgDate(item.date)}
                        </span>
                      )}
                      {(item.ticketStatus === 'closed' || item.ticketStatus === 'resolved') && (
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '999px',
                            backgroundColor: theme.isDark ? '#ffffff10' : '#00000010',
                            color: theme.textLight,
                          }}
                        >
                          closed
                        </span>
                      )}
                    </div>
                    <div className="flex-1 h-px" style={{ backgroundColor: theme.border }} />
                  </div>
                );
              }

              // Message bubble
              const { msg } = item;
              const isAdmin =
                msg.senderType === 'admin' ||
                msg.senderType === 'ghost-worker' ||
                msg.senderEmail?.includes('admin') ||
                msg.senderEmail?.includes('thepepplanner.com');

              return (
                <div
                  key={item.key}
                  className={`flex ${isAdmin ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-xl p-3 ${isAdmin ? 'rounded-tl-none' : 'rounded-tr-none'}`}
                    style={{
                      backgroundColor: isAdmin ? theme.primary + '15' : theme.accent,
                      borderLeft: isAdmin ? `3px solid ${theme.primary}` : 'none',
                      borderRight: !isAdmin ? `3px solid ${theme.primary}` : 'none',
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      {isAdmin ? (
                        <ShieldCheck size={13} style={{ color: theme.primary }} />
                      ) : (
                        <User size={13} style={{ color: theme.primary }} />
                      )}
                      <span className="text-xs font-semibold" style={{ color: theme.primary }}>
                        {isAdmin ? 'The Pep Planner Team' : 'You'}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: theme.text }}>
                      {msg.message || msg.text}
                    </p>
                    {msg.imageUrls?.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {msg.imageUrls.map((url, idx) => (
                          <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                            <img
                              src={url}
                              alt={`Screenshot ${idx + 1}`}
                              className="rounded-lg border"
                              style={{ maxHeight: '200px', objectFit: 'contain', borderColor: theme.border }}
                              loading="lazy"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-[10px] opacity-50" style={{ color: theme.textLight }}>
                        {formatMsgDate(msg.createdAt)}
                      </span>
                      {/* Small ticket tag on each message so the reference is always visible */}
                      <span
                        style={{
                          fontSize: '10px',
                          opacity: 0.45,
                          color: theme.textLight,
                          fontFamily: 'monospace',
                        }}
                      >
                        #{msg._ticketNumber}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Footer */}
        <div
          className="px-5 py-4 border-t flex-shrink-0"
          style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
        >
          {allClosed ? (
            /* All tickets closed */
            <div className="space-y-2">
              <p className="text-xs text-center" style={{ color: theme.textLight }}>
                All requests are closed. Need help with something new?
              </p>
              <button
                onClick={handleReopenTicket}
                disabled={reopening}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
                style={{
                  backgroundColor: 'transparent',
                  color: theme.primary,
                  border: `1px solid ${theme.primary}40`,
                }}
              >
                {reopening ? <Loader size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                Reopen most recent request
              </button>
            </div>
          ) : (
            /* Active reply area */
            <>
              {replyTarget && tickets.length > 1 && (
                <p className="text-[11px] mb-2 opacity-60" style={{ color: theme.textLight }}>
                  Replying to #{replyTarget.ticketNumber || replyTarget.id.slice(-6).toUpperCase()}
                </p>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Reply…"
                  rows={2}
                  className="flex-1 px-3 py-2 rounded-lg border text-sm resize-none"
                  style={{
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                    color: theme.text,
                  }}
                  disabled={sending}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="p-3 rounded-lg flex items-center gap-2 disabled:opacity-50 transition-all"
                  style={{ backgroundColor: '#D2691E', color: '#FFFFFF' }}
                >
                  {sending ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-[10px] opacity-60" style={{ color: theme.textLight }}>
                  We'll notify you when we respond
                </p>
                {confirmClose ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] opacity-70" style={{ color: theme.textLight }}>Resolved?</span>
                    <button
                      onClick={handleCloseTicket}
                      disabled={closing}
                      className="px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 disabled:opacity-50"
                      style={{ backgroundColor: (theme.success || '#10B981') + '20', color: theme.success || '#10B981' }}
                    >
                      {closing ? <Loader size={10} className="animate-spin" /> : <CheckCheck size={10} />}
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmClose(false)}
                      disabled={closing}
                      className="px-2 py-0.5 rounded text-[10px] font-medium"
                      style={{ color: theme.textLight }}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClose(true)}
                    className="text-[10px] flex items-center gap-1 opacity-60 hover:opacity-90 transition-opacity"
                    style={{ color: theme.textLight }}
                  >
                    <CheckCheck size={10} />
                    Issue resolved?
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
