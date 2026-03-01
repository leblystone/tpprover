import React, { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getFirestore, getDoc, where, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../config/firebase';
import { getUserByEmail, closeSupportTicketFromWorkQueue } from '../../services/firebase';
// Admin password removed — cloud functions verify admin via Firebase Auth email token
import { 
  Clock, Copy, CheckCircle2, AlertCircle, X, Send, 
  MessageSquare, Wrench, ExternalLink, History, 
  DollarSign, Calendar, TrendingUp, FileText, HelpCircle,
  ChevronDown, ChevronUp, Info, User, Mail, CreditCard, Trash2, ShieldCheck,
  Search, Plus
} from 'lucide-react';

// Quick response templates
const QUICK_RESPONSES = [
  {
    id: 'working',
    label: '🔧 Working On It',
    message: "We're actively working on this and will update you as soon as we have more info!\n\nThe Pep Planner Team"
  },
  {
    id: 'resolved',
    label: '✅ Resolved!',
    message: "Great news - this has been fixed! Give it a try and let us know if you run into anything else.\n\nThe Pep Planner Team"
  },
  {
    id: 'need-info',
    label: '❓ Need Info',
    message: "Could you share a bit more detail? A screenshot or steps to reproduce would help us track this down faster.\n\nThe Pep Planner Team"
  },
  {
    id: 'known-issue',
    label: '🐛 Known Issue',
    message: "We've identified this as a known issue and it's on our fix list. Thanks for the report - we'll update you when it's resolved!\n\nThe Pep Planner Team"
  }
];

// Tooltip component
const Tooltip = ({ text, children }) => {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center' }}
      >
        {children}
      </div>
      {show && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: '8px',
          padding: '8px 12px',
          backgroundColor: '#1F2937',
          color: '#fff',
          borderRadius: '6px',
          fontSize: '12px',
          whiteSpace: 'nowrap',
          zIndex: 10000,
          maxWidth: '250px',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>
          {text}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            borderWidth: '6px',
            borderStyle: 'solid',
            borderColor: '#1F2937 transparent transparent transparent'
          }} />
        </div>
      )}
    </div>
  );
};

export default function GhostWorkerWorkQueue({ theme }) {
  const defaultTheme = {
    text: '#1F2937',
    textLight: '#6B7280',
    background: '#F9FAFB',
    cardBackground: '#FFFFFF',
    border: '#E5E7EB',
    primary: '#4a7c59',
    primaryDark: '#2d5a3a',
    btnSend: '#a0522d',
    btnSuccess: '#0d9668'
  };
  const t = theme || defaultTheme;
  const btnPrimary = t.primaryDark || '#2d5a3a';
  const btnSend = t.btnSend || '#a0522d';
  const btnSuccess = t.btnSuccess || '#0d9668';

  // State
  const [workQueue, setWorkQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendingGhostResponse, setSendingGhostResponse] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const [costs, setCosts] = useState({
    today: 0,
    week: 0,
    month: 0,
    allTime: 0
  });
  const [viewingUserAccount, setViewingUserAccount] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const conversationEndRef = useRef(null);
  const [justClosedTicket, setJustClosedTicket] = useState(null);
  const [uidCopySuccess, setUidCopySuccess] = useState(false);
  const [reopenedTickets, setReopenedTickets] = useState([]);
  const [showAddMissed, setShowAddMissed] = useState(false);
  const [addMissedSearch, setAddMissedSearch] = useState('');
  const [addMissedResult, setAddMissedResult] = useState(null);
  const [addMissedError, setAddMissedError] = useState('');
  const [addMissedSearching, setAddMissedSearching] = useState(false);
  const [addMissedAdding, setAddMissedAdding] = useState(false);
  const [showBacklogScan, setShowBacklogScan] = useState(false);
  const [backlogScanning, setBacklogScanning] = useState(false);
  const [backlogResults, setBacklogResults] = useState(null);

  const [loadError, setLoadError] = useState(null);

  // Load work queue data
  useEffect(() => {
    const logsRef = collection(db, 'ai_worker_logs');
    const q = query(logsRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      setLoadError(null);
      const tickets = [];
      let todayCost = 0, weekCost = 0, monthCost = 0, allTimeCost = 0;
      
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      for (const logDoc of snapshot.docs) {
        const log = logDoc.data();
        const logDate = log.timestamp?.toDate?.() || new Date(log.timestamp);
        const cost = log.executionCost || log.cost?.total || log.totalCost || 0;
        
        allTimeCost += cost;
        if (logDate >= monthStart) monthCost += cost;
        if (logDate >= weekStart) weekCost += cost;
        if (logDate >= todayStart) todayCost += cost;

        const item = {
          logId: logDoc.id,
          ticketId: log.ticketId,
          ticketNumber: log.ticketNumber || log.ticketId?.slice(-6)?.toUpperCase() || 'N/A',
          subject: log.subject || 'Support Request',
          type: log.type || log.ticketType || 'support',
          userName: log.userName || 'Unknown',
          userEmail: log.userEmail || '',
          originalMessage: log.originalMessage || log.ticketMessage || '',
          timestamp: log.timestamp,
          route: log.route,
          confidence: log.confidence,
          reasoning: log.reasoning || log.routingReasoning || '',
          responseContent: log.responseContent || '',
          responsePosted: log.responsePosted || false,
          adminNotes: log.adminNotes || '',
          markedFixed: log.markedFixed || false,
          markedFixedAt: log.markedFixedAt,
          followUpSent: log.followUpSent || false,
          followUpMessage: log.followUpMessage || '',
          executionCost: cost,
          userAccountInfo: log.userAccountInfo || null
        };

        // Fetch full ticket data to get email and user info
        if (item.ticketId) {
          try {
            const ticketRef = doc(db, 'supportTickets', item.ticketId);
            const ticketSnap = await getDoc(ticketRef);
            
            if (ticketSnap.exists()) {
              const ticketData = ticketSnap.data();
              
              // Update with ticket data (ticket data is more complete)
              if (ticketData.userEmail) item.userEmail = ticketData.userEmail;
              if (ticketData.userName) item.userName = ticketData.userName;
              if (ticketData.userDisplayName) item.userName = ticketData.userDisplayName;
              if (Array.isArray(ticketData.requestNumbers)) item.requestNumbers = ticketData.requestNumbers;
              
              // Get userAccountInfo from ticket if available
              if (ticketData.userAccountInfo) {
                item.userAccountInfo = ticketData.userAccountInfo;
              }
            }
          } catch (error) {
            console.error('Error fetching ticket data:', error);
          }
        }

        // If still no userAccountInfo and we have an email, fetch it
        if (!item.userAccountInfo && item.userEmail) {
          try {
            const userInfo = await getUserByEmail(item.userEmail);
            if (userInfo) {
              item.userAccountInfo = userInfo;
            }
          } catch (error) {
            console.error('Error fetching user info:', error);
          }
        }

        tickets.push(item);
      }

      // Deduplicate by ticketId — keep the most recent log per ticket (same ticket can have multiple ai_worker_logs)
      const byTicket = new Map();
      for (const item of tickets) {
        const tid = item.ticketId || item.logId;
        const existing = byTicket.get(tid);
        const itemTime = item.timestamp?.toDate?.()?.getTime() ?? item.timestamp ?? 0;
        const existingTime = existing?.timestamp?.toDate?.()?.getTime() ?? existing?.timestamp ?? 0;
        if (!existing || itemTime >= existingTime) {
          byTicket.set(tid, item);
        }
      }
      const deduped = Array.from(byTicket.values()).sort((a, b) => {
        const ta = a.timestamp?.toDate?.()?.getTime() ?? a.timestamp ?? 0;
        const tb = b.timestamp?.toDate?.()?.getTime() ?? b.timestamp ?? 0;
        return ta - tb;
      });

      setWorkQueue(deduped);
      setCosts({ today: todayCost, week: weekCost, month: monthCost, allTime: allTimeCost });
      setLoading(false);
    }, (err) => {
      console.error('Work queue snapshot error:', err);
      setLoadError(err?.message || 'Failed to load work queue');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Watch for tickets re-opened by users (replied to a closed ticket)
  // These won't have a pending ai_worker_logs entry yet if Ghosty hasn't processed them
  useEffect(() => {
    const ticketsRef = collection(db, 'supportTickets');
    const q = query(ticketsRef, where('reopenedByUser', '==', true), where('status', '==', 'open'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setReopenedTickets(items);
    }, () => {
      setReopenedTickets([]);
    });
    return () => unsubscribe();
  }, []);

  // Live messages for selected ticket (same as user sees)
  useEffect(() => {
    if (!selectedTicket?.ticketId) {
      setTicketMessages([]);
      return;
    }
    const messagesRef = collection(db, 'supportTickets', selectedTicket.ticketId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTicketMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error('Error loading ticket messages:', err);
      setTicketMessages([]);
    });
    return () => unsubscribe();
  }, [selectedTicket?.ticketId]);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticketMessages]);

  const searchMissedTicket = async () => {
    const term = addMissedSearch.trim();
    if (!term) return;
    setAddMissedSearching(true);
    setAddMissedResult(null);
    setAddMissedError('');
    try {
      const firestore = getFirestore();
      // Search by ticketNumber first
      const byNumber = await getDocs(
        query(collection(firestore, 'supportTickets'), where('ticketNumber', '==', term.toUpperCase()))
      );
      if (!byNumber.empty) {
        const d = byNumber.docs[0];
        setAddMissedResult({ id: d.id, ...d.data() });
        return;
      }
      // Fallback: search by requestNumbers array
      const byRequest = await getDocs(
        query(collection(firestore, 'supportTickets'), where('requestNumbers', 'array-contains', term.toUpperCase()))
      );
      if (!byRequest.empty) {
        const d = byRequest.docs[0];
        setAddMissedResult({ id: d.id, ...d.data() });
        return;
      }
      setAddMissedError(`No ticket found for "${term}". Try the exact ticket number, e.g. Z100.`);
    } catch (err) {
      setAddMissedError('Search failed: ' + (err?.message || err));
    } finally {
      setAddMissedSearching(false);
    }
  };

  const addMissedTicketToQueue = async () => {
    if (!addMissedResult) return;
    setAddMissedAdding(true);
    setAddMissedError('');
    try {
      const addToQueue = httpsCallable(functions, 'addTicketToWorkQueue');
      const result = await addToQueue({ ticketId: addMissedResult.id });
      if (!result.data?.success) throw new Error(result.data?.message || 'Failed to add ticket');

      const ticket = addMissedResult;
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: `Ticket #${ticket.ticketNumber || ticket.id.slice(-6)} added to queue ✓`, type: 'success' }
      }));
      setShowAddMissed(false);
      setAddMissedSearch('');
      setAddMissedResult(null);
      setAddMissedError('');
    } catch (err) {
      setAddMissedError('Failed to add: ' + (err?.message || err));
    } finally {
      setAddMissedAdding(false);
    }
  };

  const runBacklogScan = async () => {
    setBacklogScanning(true);
    setBacklogResults(null);
    try {
      const firestore = getFirestore();
      // Build a map: ticketId → { latestLogTimestamp, isMarkedFixed }
      const logMap = new Map();
      for (const item of workQueue) {
        if (!item.ticketId) continue;
        const itemTs = item.timestamp?.toDate?.()?.getTime() ?? item.timestamp ?? 0;
        const existing = logMap.get(item.ticketId);
        if (!existing || itemTs > (existing.ts ?? 0)) {
          logMap.set(item.ticketId, { ts: itemTs, markedFixed: item.markedFixed });
        }
      }

      // Scan supportTickets with any activity in last 90 days
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      const snap = await getDocs(
        query(
          collection(firestore, 'supportTickets'),
          where('lastMessageAt', '>=', cutoff),
          orderBy('lastMessageAt', 'desc')
        )
      );

      const missed = [];
      for (const d of snap.docs) {
        const data = d.data();
        const lastMsgTs = data.lastMessageAt?.toDate?.()?.getTime() ?? 0;
        const logEntry = logMap.get(d.id);

        // Missed if: no log at all, OR log is marked fixed and user sent a message after it was fixed
        const noLog = !logEntry;
        const repliedAfterClose = logEntry?.markedFixed && lastMsgTs > (logEntry.ts ?? 0);

        if (noLog || repliedAfterClose) {
          // Check if it's already pending in our queue (noLog but in workQueue as pending)
          const alreadyPending = workQueue.some(q => q.ticketId === d.id && !q.markedFixed);
          if (!alreadyPending) {
            missed.push({
              id: d.id,
              ticketNumber: data.ticketNumber,
              userEmail: data.userEmail,
              subject: data.subject,
              status: data.status,
              lastMessageAt: data.lastMessageAt,
              reason: noLog ? 'Never processed by Ghosty' : 'User replied after ticket was closed',
            });
          }
        }
      }
      setBacklogResults(missed);
    } catch (err) {
      setBacklogResults({ error: err?.message || 'Scan failed' });
    } finally {
      setBacklogScanning(false);
    }
  };

  const pendingTickets = workQueue.filter(t => !t.markedFixed);
  const completedTickets = workQueue.filter(t => t.markedFixed).sort((a, b) => {
    const dateA = a.markedFixedAt?.toDate?.() || new Date(a.markedFixedAt || 0);
    const dateB = b.markedFixedAt?.toDate?.() || new Date(b.markedFixedAt || 0);
    return dateB - dateA;
  });

  const openTicket = (ticket) => {
    setSelectedTicket(ticket);
    setAdminNotes(ticket.adminNotes || '');
    setCustomMessage('');
    setCopySuccess(false);
    setShowNotes(!!ticket.adminNotes);
  };

  const closeModal = () => {
    setSelectedTicket(null);
    setAdminNotes('');
    setCustomMessage('');
    setShowNotes(false);
  };

  // Extract ONLY the Cursor prompt section
  const extractCursorPrompt = (content) => {
    if (!content) return null;
    
    // Look for ADMIN NOTES section
    const adminMatch = content.match(/---\s*##\s*ADMIN NOTES[\s\S]*$/i);
    if (adminMatch) {
      return adminMatch[0].replace(/^---\s*##\s*ADMIN NOTES.*?\n+/i, '').trim();
    }
    
    // Look for CURSOR PROMPT specifically
    const cursorMatch = content.match(/💡\s*CURSOR PROMPT:?\s*\n([\s\S]+?)(?=\n\n🧪|$)/i);
    if (cursorMatch) {
      return cursorMatch[1].trim();
    }
    
    return null;
  };

  // Extract customer response section
  const extractCustomerResponse = (content) => {
    if (!content) return null;
    
    const parts = content.split(/---\s*##\s*ADMIN NOTES/i);
    if (parts.length > 0) {
      let customerPart = parts[0];
      customerPart = customerPart.replace(/^##\s*CUSTOMER RESPONSE:\s*/i, '').trim();
      return customerPart;
    }
    return content;
  };

  const copyToClipboard = async () => {
    const cursorPrompt = extractCursorPrompt(selectedTicket?.responseContent);
    if (!cursorPrompt) return;
    
    try {
      await navigator.clipboard.writeText(cursorPrompt);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const sendGhostResponseToUser = async () => {
    if (!selectedTicket?.ticketId) return;
    const text = extractCustomerResponse(selectedTicket.responseContent);
    if (!text?.trim()) return;
    
    setSendingGhostResponse(true);
    try {
      const firestore = getFirestore();
      const messagesRef = collection(firestore, 'supportTickets', selectedTicket.ticketId, 'messages');
      await addDoc(messagesRef, {
        message: text.trim(),
        text: text.trim(),
        senderType: 'ghost-worker',
        senderName: 'Ghosty',
        senderEmail: 'ghosty@thepepplanner.com',
        createdAt: serverTimestamp(),
        read: false,
        metadata: { sentVia: 'work-queue-manual', logId: selectedTicket.logId }
      });
      const ticketRef = doc(firestore, 'supportTickets', selectedTicket.ticketId);
      await updateDoc(ticketRef, {
        lastMessageAt: serverTimestamp(),
        status: 'in-progress',
        updatedAt: serverTimestamp(),
        'metadata.ghostWorker.responsePosted': true,
        'metadata.ghostWorker.postedAt': serverTimestamp(),
        'metadata.ghostWorker.approvedVia': 'work-queue'
      });
      // Best-effort: mark log as posted (admin can update if rules allow)
      try {
        const logRef = doc(db, 'ai_worker_logs', selectedTicket.logId);
        await updateDoc(logRef, {
          responsePosted: true,
          responsePostedAt: serverTimestamp()
        });
      } catch (logErr) {
        console.warn('Could not update ai_worker_logs (message was still sent):', logErr?.message);
      }
      setWorkQueue(prev => prev.map(t =>
        t.logId === selectedTicket.logId ? { ...t, responsePosted: true } : t
      ));
      setSelectedTicket(prev => prev ? { ...prev, responsePosted: true } : null);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: "Ghosty's response sent to user ✓", type: 'success' }
      }));
    } catch (error) {
      console.error('Failed to send Ghosty response:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Failed to send response', type: 'error' }
      }));
    } finally {
      setSendingGhostResponse(false);
    }
  };

  const saveAdminNotes = useCallback(async (notes) => {
    if (!selectedTicket) return;
    
    setSaving(true);
    try {
      const logRef = doc(db, 'ai_worker_logs', selectedTicket.logId);
      await updateDoc(logRef, { adminNotes: notes });
      
      setWorkQueue(prev => prev.map(t => 
        t.logId === selectedTicket.logId ? { ...t, adminNotes: notes } : t
      ));
    } catch (error) {
      console.error('Failed to save notes:', error);
    } finally {
      setSaving(false);
    }
  }, [selectedTicket]);

  useEffect(() => {
    if (!selectedTicket || !showNotes || adminNotes === selectedTicket.adminNotes) return;
    
    const timer = setTimeout(() => {
      saveAdminNotes(adminNotes);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [adminNotes, selectedTicket, saveAdminNotes, showNotes]);

  const sendMessage = async () => {
    if (!selectedTicket || !customMessage.trim()) return;
    
    setSending(true);
    try {
      const firestore = getFirestore();
      const messagesRef = collection(firestore, 'supportTickets', selectedTicket.ticketId, 'messages');
      
      await addDoc(messagesRef, {
        message: customMessage.trim(),
        text: customMessage.trim(),
        senderType: 'admin',
        senderName: 'The Pep Planner Team',
        senderEmail: 'support@thepepplanner.com',
        createdAt: serverTimestamp(),
        sentVia: 'work-queue'
      });

      const ticketRef = doc(firestore, 'supportTickets', selectedTicket.ticketId);
      await updateDoc(ticketRef, {
        lastMessageAt: serverTimestamp(),
        lastAdminMessageAt: serverTimestamp(),
        status: 'in-progress'
      });

      const logRef = doc(db, 'ai_worker_logs', selectedTicket.logId);
      await updateDoc(logRef, {
        followUpSent: true,
        followUpMessage: customMessage.trim(),
        followUpAt: serverTimestamp()
      });

      setWorkQueue(prev => prev.map(t => 
        t.logId === selectedTicket.logId 
          ? { ...t, followUpSent: true, followUpMessage: customMessage.trim() } 
          : t
      ));
      setSelectedTicket(prev => ({ ...prev, followUpSent: true, followUpMessage: customMessage.trim() }));

      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Message sent! 📨', type: 'success' }
      }));
      
      setCustomMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Failed to send message', type: 'error' }
      }));
    } finally {
      setSending(false);
    }
  };

  const closeTicket = async () => {
    if (!selectedTicket) return;
    
    setSending(true);
    try {
      await closeSupportTicketFromWorkQueue(
        selectedTicket.ticketId,
        selectedTicket.logId,
        adminNotes
      );

      setWorkQueue(prev => prev.map(t => 
        t.logId === selectedTicket.logId 
          ? { ...t, markedFixed: true, markedFixedAt: new Date(), adminNotes } 
          : t
      ));

      const closed = { ticketId: selectedTicket.ticketId, ticketNumber: selectedTicket.ticketNumber };
      closeModal();
      setJustClosedTicket(closed);
    } catch (error) {
      console.error('Failed to close ticket:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: error?.message || 'Failed to close ticket', type: 'error' }
      }));
    } finally {
      setSending(false);
    }
  };

  const copyUserId = () => {
    const uid = selectedTicket?.userAccountInfo?.userId || selectedTicket?.userAccountInfo?.uid || selectedTicket?.userAccountInfo?.id;
    if (!uid) return;
    navigator.clipboard.writeText(uid);
    setUidCopySuccess(true);
    window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'User ID copied!', type: 'success' } }));
    setTimeout(() => setUidCopySuccess(false), 2000);
  };

  const reopenTicket = async (ticket) => {
    try {
      const logRef = doc(db, 'ai_worker_logs', ticket.logId);
      await updateDoc(logRef, { markedFixed: false, markedFixedAt: null });
      setWorkQueue(prev => prev.map(t => 
        t.logId === ticket.logId ? { ...t, markedFixed: false, markedFixedAt: null } : t
      ));
    } catch (error) {
      console.error('Failed to reopen:', error);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date?.toDate?.() || new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatRelativeTime = (date) => {
    if (!date) return '';
    const d = date?.toDate?.() || new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(date);
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: t.textLight }}>Loading...</div>;
  }

  if (loadError) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
        <div style={{ fontWeight: '600', color: '#DC2626', marginBottom: '6px' }}>Work queue failed to load</div>
        <div style={{ fontSize: '12px', color: t.textLight, marginBottom: '16px', fontFamily: 'monospace', backgroundColor: '#FEF2F2', padding: '8px 12px', borderRadius: '6px', display: 'inline-block' }}>
          {loadError}
        </div>
        <div style={{ fontSize: '12px', color: t.textLight }}>
          Check Firestore rules for <code>ai_worker_logs</code> collection, then refresh the page.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Cost Stats Bar - Compact */}
      <div style={{ 
        display: 'flex', 
        gap: '12px',
        marginBottom: '16px',
        flexWrap: 'wrap'
      }}>
        {[
          { label: 'Today', value: costs.today, icon: Calendar },
          { label: 'Week', value: costs.week, icon: TrendingUp },
          { label: 'Month', value: costs.month, icon: DollarSign },
          { label: 'All Time', value: costs.allTime, icon: History }
        ].map(stat => (
          <div key={stat.label} style={{
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: t.cardBackground,
            border: `1px solid ${t.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flex: '1',
            minWidth: '140px'
          }}>
            <stat.icon size={16} style={{ color: t.primary }} />
            <div>
              <div style={{ fontSize: '10px', color: t.textLight, textTransform: 'uppercase' }}>{stat.label}</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: t.text }}>${stat.value.toFixed(3)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Queue Stats */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{
          padding: '6px 14px',
          borderRadius: '16px',
          backgroundColor: pendingTickets.length > 0 ? '#FEF3C7' : '#D1FAE5',
          color: pendingTickets.length > 0 ? '#92400E' : '#065F46',
          fontWeight: '600',
          fontSize: '13px'
        }}>
          ⏰ {pendingTickets.length} Pending
        </div>
        <div style={{
          padding: '6px 14px',
          borderRadius: '16px',
          backgroundColor: '#E0E7FF',
          color: '#3730A3',
          fontWeight: '600',
          fontSize: '13px',
          cursor: 'pointer'
        }} onClick={() => setShowHistory(!showHistory)}>
          📁 {completedTickets.length} Archive {showHistory ? '▼' : '▶'}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => { setShowBacklogScan(v => !v); setBacklogResults(null); }}
            style={{
              padding: '5px 12px',
              borderRadius: '16px',
              border: `1px solid ${t.border}`,
              backgroundColor: showBacklogScan ? '#FEF3C7' : 'transparent',
              color: showBacklogScan ? '#92400E' : t.textLight,
              fontWeight: '600',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Search size={13} /> Backlog Scan
          </button>
          <button
            type="button"
            onClick={() => { setShowAddMissed(v => !v); setAddMissedResult(null); setAddMissedError(''); setAddMissedSearch(''); }}
            style={{
              padding: '5px 12px',
              borderRadius: '16px',
              border: `1px solid ${t.border}`,
              backgroundColor: showAddMissed ? t.primary + '15' : 'transparent',
              color: showAddMissed ? t.primary : t.textLight,
              fontWeight: '600',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Plus size={13} /> Add Missed Ticket
          </button>
        </div>
      </div>

      {/* Add Missed Ticket panel */}
      {showAddMissed && (
        <div style={{
          backgroundColor: t.cardBackground,
          border: `1px solid ${t.primary}40`,
          borderRadius: '10px',
          padding: '14px',
          marginBottom: '16px'
        }}>
          <div style={{ fontWeight: '600', fontSize: '13px', color: t.text, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Search size={14} style={{ color: t.primary }} />
            Find & Add Missed Ticket
          </div>
          <p style={{ fontSize: '12px', color: t.textLight, margin: '0 0 10px 0' }}>
            Got an email notification about a ticket that's not in the queue? Enter the ticket number to pull it in manually.
          </p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <input
              type="text"
              value={addMissedSearch}
              onChange={e => setAddMissedSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchMissedTicket()}
              placeholder="e.g. Z100"
              style={{
                flex: 1,
                padding: '7px 10px',
                border: `1px solid ${t.border}`,
                borderRadius: '6px',
                fontSize: '13px',
                color: t.text,
                backgroundColor: t.background,
                fontFamily: 'monospace',
                textTransform: 'uppercase'
              }}
            />
            <button
              type="button"
              onClick={searchMissedTicket}
              disabled={addMissedSearching || !addMissedSearch.trim()}
              style={{
                padding: '7px 14px',
                backgroundColor: t.primary,
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: addMissedSearching || !addMissedSearch.trim() ? 'not-allowed' : 'pointer',
                opacity: addMissedSearching || !addMissedSearch.trim() ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Search size={13} /> {addMissedSearching ? 'Searching…' : 'Search'}
            </button>
          </div>

          {addMissedError && (
            <div style={{ fontSize: '12px', color: '#DC2626', marginBottom: '8px', padding: '6px 10px', backgroundColor: '#FEF2F2', borderRadius: '6px' }}>
              {addMissedError}
            </div>
          )}

          {addMissedResult && (
            <div style={{
              padding: '10px 12px',
              backgroundColor: t.background,
              border: `1px solid ${t.border}`,
              borderRadius: '8px',
              marginBottom: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                <span style={{ fontWeight: '600', color: t.text, fontSize: '13px' }}>
                  #{addMissedResult.ticketNumber || addMissedResult.id?.slice(-6).toUpperCase()}
                </span>
                <span style={{
                  fontSize: '10px', padding: '2px 8px', borderRadius: '8px',
                  backgroundColor: addMissedResult.status === 'closed' ? '#FEE2E2' : '#D1FAE5',
                  color: addMissedResult.status === 'closed' ? '#DC2626' : '#065F46',
                  fontWeight: '600'
                }}>
                  {addMissedResult.status || 'unknown'}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: t.textLight }}>
                {addMissedResult.userEmail} • {addMissedResult.subject || 'No subject'}
              </div>
              <button
                type="button"
                onClick={addMissedTicketToQueue}
                disabled={addMissedAdding}
                style={{
                  marginTop: '10px',
                  padding: '7px 14px',
                  backgroundColor: addMissedAdding ? t.border : t.primary,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: addMissedAdding ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Plus size={13} /> {addMissedAdding ? 'Adding…' : 'Add to Work Queue'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Backlog Scan panel */}
      {showBacklogScan && (
        <div style={{
          backgroundColor: '#FFFBEB',
          border: '1px solid #FCD34D',
          borderRadius: '10px',
          padding: '14px',
          marginBottom: '16px'
        }}>
          <div style={{ fontWeight: '600', fontSize: '13px', color: '#92400E', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Search size={14} style={{ color: '#F59E0B' }} />
            Backlog Audit — Last 90 Days
          </div>
          <p style={{ fontSize: '12px', color: '#B45309', margin: '0 0 10px 0' }}>
            Scans all support tickets against your work queue logs to find any that were never processed or had a user reply after being closed.
          </p>
          <button
            type="button"
            onClick={runBacklogScan}
            disabled={backlogScanning}
            style={{
              padding: '7px 16px',
              backgroundColor: backlogScanning ? '#FCD34D' : '#F59E0B',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: backlogScanning ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              marginBottom: backlogResults ? '12px' : '0'
            }}
          >
            <Search size={13} /> {backlogScanning ? 'Scanning…' : 'Run Scan'}
          </button>

          {backlogResults && !backlogResults.error && backlogResults.length === 0 && (
            <div style={{ marginTop: '10px', fontSize: '13px', color: '#065F46', padding: '8px 12px', backgroundColor: '#D1FAE5', borderRadius: '6px' }}>
              ✅ No missed tickets found in the last 90 days.
            </div>
          )}

          {backlogResults?.error && (
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#DC2626', padding: '8px 12px', backgroundColor: '#FEF2F2', borderRadius: '6px' }}>
              ⚠️ {backlogResults.error}
            </div>
          )}

          {Array.isArray(backlogResults) && backlogResults.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#92400E', marginBottom: '8px' }}>
                ⚠️ {backlogResults.length} potentially missed ticket{backlogResults.length > 1 ? 's' : ''} found:
              </div>
              {backlogResults.map((item, idx) => (
                <div
                  key={item.id}
                  style={{
                    padding: '10px 12px',
                    backgroundColor: '#fff',
                    border: '1px solid #FCD34D',
                    borderRadius: '8px',
                    marginBottom: idx < backlogResults.length - 1 ? '8px' : '0',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '3px' }}>
                      <span style={{ fontWeight: '600', color: '#92400E', fontSize: '13px' }}>
                        #{item.ticketNumber || item.id.slice(-6).toUpperCase()}
                      </span>
                      <span style={{
                        fontSize: '10px', padding: '2px 7px', borderRadius: '8px', fontWeight: '600',
                        backgroundColor: item.status === 'closed' ? '#FEE2E2' : '#FEF3C7',
                        color: item.status === 'closed' ? '#DC2626' : '#92400E'
                      }}>
                        {item.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#B45309' }}>{item.userEmail}</div>
                    <div style={{ fontSize: '11px', color: '#92400E', marginTop: '2px', opacity: 0.8 }}>
                      📋 {item.reason}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAddMissedSearch(item.ticketNumber || '');
                      setAddMissedResult({ id: item.id, ticketNumber: item.ticketNumber, userEmail: item.userEmail, subject: item.subject, status: item.status });
                      setShowAddMissed(true);
                      setShowBacklogScan(false);
                    }}
                    style={{
                      padding: '5px 12px',
                      backgroundColor: '#F59E0B',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    + Add to Queue
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Re-opened tickets — user replied to a closed ticket, Ghosty hasn't processed yet */}
      {reopenedTickets.length > 0 && (
        <div style={{
          backgroundColor: '#FFF7ED',
          borderRadius: '10px',
          border: '1px solid #FED7AA',
          marginBottom: '16px',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '10px 14px',
            borderBottom: '1px solid #FED7AA',
            fontWeight: '600',
            color: '#92400E',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <MessageSquare size={15} style={{ color: '#F59E0B' }} />
            🔁 User Replied to Closed Ticket — Waiting for Ghosty
            <span style={{
              marginLeft: 'auto',
              fontSize: '11px',
              backgroundColor: '#FEF3C7',
              color: '#92400E',
              padding: '2px 8px',
              borderRadius: '10px',
              fontWeight: '600'
            }}>
              {reopenedTickets.length} pending
            </span>
          </div>
          {reopenedTickets.map((ticket, idx) => (
            <div
              key={ticket.id}
              style={{
                padding: '10px 14px',
                borderBottom: idx < reopenedTickets.length - 1 ? '1px solid #FED7AA' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px'
              }}
            >
              <AlertCircle size={15} style={{ color: '#F59E0B', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: '600', color: '#92400E' }}>
                  #{ticket.ticketNumber || ticket.id?.slice(-6).toUpperCase()}
                </span>
                <span style={{ color: '#B45309', marginLeft: '8px', fontSize: '12px' }}>
                  {ticket.userEmail || ticket.userName || 'Unknown'}
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#B45309' }}>
                Ghosty processing…
              </span>
            </div>
          ))}
          <div style={{ padding: '8px 14px', fontSize: '11px', color: '#92400E', borderTop: '1px solid #FED7AA' }}>
            💡 These tickets were re-opened when a user replied. Ghosty will process them and they'll appear in Pending Queue shortly. Refresh if they don't appear after ~30 seconds.
          </div>
        </div>
      )}

      {/* Pending Queue */}
      <div style={{
        backgroundColor: t.cardBackground,
        borderRadius: '10px',
        border: `1px solid ${t.border}`,
        marginBottom: '16px',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '12px 14px',
          borderBottom: `1px solid ${t.border}`,
          fontWeight: '600',
          color: t.text,
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Clock size={16} /> Pending Queue
        </div>

        {pendingTickets.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: t.textLight, fontSize: '14px' }}>
            🎉 All caught up!
          </div>
        ) : (
          pendingTickets.map((ticket, idx) => (
            <div
              key={ticket.logId}
              onClick={() => openTicket(ticket)}
              style={{
                padding: '12px 14px',
                borderBottom: idx < pendingTickets.length - 1 ? `1px solid ${t.border}` : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = t.background}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {ticket.type === 'account_deletion_request' ? (
                <Trash2 size={16} style={{ color: '#DC2626', flexShrink: 0 }} />
              ) : (
                <AlertCircle size={16} style={{ color: '#F59E0B', flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: '600', color: t.text, fontSize: '13px' }}>
                    #{ticket.ticketNumber}{ticket.requestNumbers?.length > 1 ? ` (${ticket.requestNumbers.join(', ')})` : ''}
                  </span>
                  {ticket.type === 'account_deletion_request' ? (
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '8px',
                      backgroundColor: '#FEE2E2',
                      color: '#DC2626',
                      fontWeight: '600'
                    }}>
                      🗑️ DELETION REQUEST
                    </span>
                  ) : ticket.addedManually ? (
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '8px',
                      backgroundColor: '#FEF3C7',
                      color: '#92400E',
                      fontWeight: '600'
                    }}>
                      📌 Added Manually
                    </span>
                  ) : (
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '8px',
                      backgroundColor: ticket.route === 'gemini-pro' ? '#DBEAFE' : '#F3E8FF',
                      color: ticket.route === 'gemini-pro' ? '#1D4ED8' : '#7C3AED'
                    }}>
                      {ticket.route === 'gemini-pro' ? '🎨' : '🔧'} {ticket.confidence}%
                    </span>
                  )}
                  {ticket.userAccountInfo && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingUserAccount(ticket.userAccountInfo);
                      }}
                      style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '600',
                        // Prioritize subscriptionType, then subscriptionStatus
                        backgroundColor: ticket.userAccountInfo.subscriptionType === 'lifetime' ? '#8B5CF620' :
                                         ticket.userAccountInfo.subscriptionType === 'annual' ? '#06B6D420' :
                                         ticket.userAccountInfo.subscriptionType === 'monthly' ? '#3B82F620' :
                                         ticket.userAccountInfo.subscriptionStatus === 'active' ? '#10B98120' :
                                         ticket.userAccountInfo.subscriptionStatus === 'canceled' || ticket.userAccountInfo.subscriptionStatus === 'cancelled' ? '#EF444420' :
                                         ticket.userAccountInfo.subscriptionStatus === 'trialing' ? '#F59E0B20' :
                                         ticket.userAccountInfo.subscriptionStatus === 'trial_expired' ? '#DC262620' :
                                         '#6B728020',
                        color: ticket.userAccountInfo.subscriptionType === 'lifetime' ? '#8B5CF6' :
                               ticket.userAccountInfo.subscriptionType === 'annual' ? '#06B6D4' :
                               ticket.userAccountInfo.subscriptionType === 'monthly' ? '#3B82F6' :
                               ticket.userAccountInfo.subscriptionStatus === 'active' ? '#10B981' :
                               ticket.userAccountInfo.subscriptionStatus === 'canceled' || ticket.userAccountInfo.subscriptionStatus === 'cancelled' ? '#EF4444' :
                               ticket.userAccountInfo.subscriptionStatus === 'trialing' ? '#F59E0B' :
                               ticket.userAccountInfo.subscriptionStatus === 'trial_expired' ? '#DC2626' :
                               '#6B7280',
                        transition: 'opacity 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      title={`Click to view account: ${ticket.userAccountInfo.subscriptionType || ticket.userAccountInfo.subscriptionStatus} | ID: ${ticket.userAccountInfo.userId || 'N/A'}`}
                    >
                      {ticket.userAccountInfo.subscriptionType === 'lifetime' ? '👑' : 
                       ticket.userAccountInfo.subscriptionType === 'annual' ? '📅' : 
                       ticket.userAccountInfo.subscriptionType === 'monthly' ? '📆' :
                       ticket.userAccountInfo.subscriptionStatus === 'trialing' ? '🔄' :
                       '👤'} {ticket.userAccountInfo.subscriptionType || ticket.userAccountInfo.subscriptionStatus}
                    </button>
                  )}
                  {!ticket.userAccountInfo && ticket.userEmail && (
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '8px',
                      backgroundColor: '#6B728015',
                      color: '#6B7280'
                    }} title="No account found">
                      👤 No account
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: t.textLight }}>
                  {ticket.userEmail || ticket.userName || 'Unknown'} • {formatRelativeTime(ticket.timestamp)}
                </div>
              </div>
              {ticket.type === 'account_deletion_request' ? (
                <div style={{ 
                  padding: '6px 12px', 
                  backgroundColor: '#DC2626', 
                  color: '#fff', 
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Trash2 size={12} />
                  Review
                </div>
              ) : (
                <div style={{ 
                  padding: '6px 12px', 
                  backgroundColor: t.primary, 
                  color: '#fff', 
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  Open
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* History Section */}
      {showHistory && completedTickets.length > 0 && (
        <div style={{
          backgroundColor: t.cardBackground,
          borderRadius: '10px',
          border: `1px solid ${t.border}`,
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '12px 14px',
            borderBottom: `1px solid ${t.border}`,
            fontWeight: '600',
            color: t.text,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <History size={16} /> Archive
          </div>

          {completedTickets.slice(0, 50).map((ticket, idx) => (
            <div
              key={ticket.logId}
              onClick={() => openTicket(ticket)}
              style={{
                padding: '10px 14px',
                borderBottom: idx < Math.min(completedTickets.length, 50) - 1 ? `1px solid ${t.border}` : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                opacity: 0.9,
                cursor: 'pointer',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = t.background}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <CheckCircle2 size={16} style={{ color: '#10B981', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: '500', color: t.text, fontSize: '13px' }}>
                  #{ticket.ticketNumber}{ticket.requestNumbers?.length > 1 ? ` (${ticket.requestNumbers.join(', ')})` : ''}
                </span>
                <span style={{ fontSize: '12px', color: t.textLight, marginLeft: '8px' }}>
                  Closed {formatDate(ticket.markedFixedAt)}
                </span>
                {ticket.adminNotes && (
                  <span style={{ fontSize: '11px', color: t.textLight, marginLeft: '8px', display: 'block' }}>
                    📝 {ticket.adminNotes.slice(0, 50)}{ticket.adminNotes.length > 50 ? '…' : ''}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); openTicket(ticket); }}
                style={{
                  padding: '4px 10px',
                  backgroundColor: 'transparent',
                  color: t.primary,
                  border: `1px solid ${t.border}`,
                  borderRadius: '4px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                View
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); reopenTicket(ticket); }}
                style={{
                  padding: '4px 10px',
                  backgroundColor: 'transparent',
                  color: t.textLight,
                  border: `1px solid ${t.border}`,
                  borderRadius: '4px',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                Reopen
              </button>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {selectedTicket && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div style={{
            backgroundColor: t.cardBackground,
            borderRadius: '10px',
            width: '100%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '8px 12px',
              borderBottom: `1px solid ${t.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: t.text }}>
                  🎫 #{selectedTicket.ticketNumber}{selectedTicket.requestNumbers?.length > 1 ? ` (${selectedTicket.requestNumbers.join(', ')})` : ''}
                </span>
                {selectedTicket.markedFixed && (
                  <span style={{
                    fontSize: '10px',
                    padding: '3px 8px',
                    borderRadius: '10px',
                    backgroundColor: '#D1FAE5',
                    color: '#065F46',
                    fontWeight: '600'
                  }}>
                    📁 Archived
                  </span>
                )}
                <span style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  borderRadius: '10px',
                  backgroundColor: selectedTicket.route === 'gemini-pro' ? '#DBEAFE' : '#F3E8FF',
                  color: selectedTicket.route === 'gemini-pro' ? '#1D4ED8' : '#7C3AED'
                }}>
                  {selectedTicket.route === 'gemini-pro' ? '🎨 Gemini' : '🔧 Claude'} • {selectedTicket.confidence}%
                </span>
                <span style={{ fontSize: '11px', color: t.textLight }}>💰 ${selectedTicket.executionCost.toFixed(4)}</span>
              </div>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: t.textLight }}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflow: 'auto', padding: '10px 12px' }}>
              {/* User ID — copy in work queue */}
              <div style={{
                marginBottom: '8px',
                padding: '6px 10px',
                backgroundColor: t.background,
                borderRadius: '6px',
                border: `1px solid ${t.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap'
              }}>
                <span style={{ fontSize: '10px', fontWeight: '600', color: t.textLight, textTransform: 'uppercase' }}>
                  User ID
                </span>
                <code style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: t.text,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {selectedTicket.userAccountInfo?.userId || selectedTicket.userAccountInfo?.uid || selectedTicket.userAccountInfo?.id || '—'}
                </code>
                {(selectedTicket.userAccountInfo?.userId || selectedTicket.userAccountInfo?.uid || selectedTicket.userAccountInfo?.id) && (
                  <button
                    type="button"
                    onClick={copyUserId}
                    style={{
                      padding: '4px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: uidCopySuccess ? btnSuccess : btnPrimary,
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    {uidCopySuccess ? <><CheckCircle2 size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                  </button>
                )}
              </div>

              {/* Row 1: Original Message + Ghosty's Reasoning (2 columns) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                {/* Original Message */}
                <div>
                  <div style={{ fontSize: '10px', fontWeight: '600', color: t.textLight, marginBottom: '4px', textTransform: 'uppercase' }}>
                    📨 User Message
                  </div>
                  <div style={{
                    padding: '8px',
                    backgroundColor: '#FEF3C7',
                    border: '1px solid #FCD34D',
                    borderRadius: '6px',
                    fontSize: '11px',
                    lineHeight: '1.35',
                    color: '#78350F',
                    maxHeight: '90px',
                    overflowY: 'auto'
                  }}>
                    {selectedTicket.originalMessage || 'No message available'}
                  </div>
                </div>

                {/* Ghosty's Reasoning */}
                <div>
                  <div style={{ fontSize: '10px', fontWeight: '600', color: t.textLight, marginBottom: '4px', textTransform: 'uppercase' }}>
                    🧠 Ghosty's Reasoning
                  </div>
                  <div style={{
                    padding: '8px',
                    backgroundColor: '#EDE9FE',
                    border: '1px solid #C4B5FD',
                    borderRadius: '6px',
                    fontSize: '11px',
                    lineHeight: '1.35',
                    color: '#5B21B6',
                    maxHeight: '90px',
                    overflowY: 'auto'
                  }}>
                    {selectedTicket.reasoning || 'No reasoning available'}
                  </div>
                </div>
              </div>

              {/* Row 2: Ghosty's response (to user) + Cursor Prompt (2 columns) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                {/* Ghosty's response (to user) — may not be sent yet */}
                <div>
                  <div style={{ fontSize: '10px', fontWeight: '600', color: t.textLight, marginBottom: '4px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                    💬 Ghosty's response (to user)
                    {selectedTicket.responsePosted ? (
                      <span style={{ color: '#059669', fontWeight: '600' }}>✓ Sent</span>
                    ) : (
                      <span style={{ color: '#B45309', fontWeight: '600' }}>(not sent yet)</span>
                    )}
                    <Tooltip text="This is what Ghosty drafted for the customer. In observation mode it isn't sent automatically — use the button below to send it.">
                      <HelpCircle size={11} style={{ color: t.textLight }} />
                    </Tooltip>
                  </div>
                  <div style={{
                    padding: '8px',
                    backgroundColor: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    borderRadius: '6px',
                    fontSize: '11px',
                    lineHeight: '1.35',
                    color: '#065F46',
                    maxHeight: '100px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {extractCustomerResponse(selectedTicket.responseContent) || 'No response available'}
                  </div>
                  {extractCustomerResponse(selectedTicket.responseContent)?.trim() && !selectedTicket.responsePosted && !selectedTicket.markedFixed && (
                    <button
                      type="button"
                      onClick={sendGhostResponseToUser}
                      disabled={sendingGhostResponse}
                      style={{
                        marginTop: '6px',
                        padding: '6px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: sendingGhostResponse ? t.border : btnPrimary,
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: sendingGhostResponse ? 'not-allowed' : 'pointer',
                        opacity: sendingGhostResponse ? 0.8 : 1
                      }}
                    >
                      {sendingGhostResponse ? (
                        <>Sending…</>
                      ) : (
                        <>
                          <Send size={14} />
                          Send this response to user
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Cursor Prompt (for you to copy) */}
                <div>
                  <div style={{ fontSize: '10px', fontWeight: '600', color: t.textLight, marginBottom: '4px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      🤖 Cursor Prompt
                      <Tooltip text="Copy this and paste into Cursor AI to fix the issue">
                        <HelpCircle size={11} style={{ color: t.textLight }} />
                      </Tooltip>
                    </div>
                    {extractCursorPrompt(selectedTicket.responseContent) && (
                      <button
                        onClick={copyToClipboard}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: copySuccess ? btnSuccess : btnPrimary,
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {copySuccess ? <><CheckCircle2 size={11} /> Copied!</> : <><Copy size={11} /> Copy</>}
                      </button>
                    )}
                  </div>
                  <div style={{
                    padding: '8px',
                    backgroundColor: t.background,
                    border: `1px solid ${t.border}`,
                    borderRadius: '6px',
                    fontFamily: 'monospace',
                    fontSize: '10px',
                    lineHeight: '1.35',
                    color: t.text,
                    maxHeight: '100px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {extractCursorPrompt(selectedTicket.responseContent) || '⚠️ No Cursor prompt available for this ticket'}
                  </div>
                </div>
              </div>

              {/* My Notes Button + Expandable */}
              <div style={{ marginBottom: '8px' }}>
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  style={{
                    padding: '6px 10px',
                    backgroundColor: showNotes ? t.background : 'transparent',
                    border: `1px solid ${t.border}`,
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: t.text,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <FileText size={12} />
                  {showNotes ? 'Hide Notes' : 'Add Notes'}
                  {adminNotes && !showNotes && <span style={{ color: btnSuccess }}>✓</span>}
                  {showNotes ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
                
                {showNotes && (
                  <div style={{ marginTop: '6px' }}>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Your notes about this fix... (auto-saves)"
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: `1px solid ${t.border}`,
                        borderRadius: '4px',
                        fontSize: '12px',
                        resize: 'vertical',
                        minHeight: '48px',
                        fontFamily: 'inherit',
                        color: t.text,
                        backgroundColor: t.cardBackground
                      }}
                    />
                    <div style={{ fontSize: '10px', color: saving ? t.primary : btnSuccess, marginTop: '2px' }}>
                      {saving ? 'Saving...' : (adminNotes ? '✓ Saved' : '')}
                    </div>
                  </div>
                )}
              </div>

              {/* Support Conversation at bottom — reply here, same thread as user sees */}
              <div style={{
                marginTop: '10px',
                border: `1px solid ${t.border}`,
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: t.cardBackground
              }}>
                <div style={{
                  padding: '8px 10px',
                  borderBottom: `1px solid ${t.border}`,
                  fontWeight: '600',
                  fontSize: '12px',
                  color: t.primary
                }}>
                  Support Conversation
                </div>
                <div style={{
                  padding: '8px',
                  backgroundColor: t.background,
                  minHeight: '80px',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {ticketMessages.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '8px', color: t.textLight, fontSize: '11px' }}>
                      No messages yet.
                    </div>
                  ) : (
                    ticketMessages.map((msg) => {
                      const isAdmin = msg.senderType === 'admin' || msg.senderType === 'ghost-worker' ||
                        (msg.senderEmail && (msg.senderEmail?.includes('admin') || msg.senderEmail?.includes('thepepplanner.com')));
                      return (
                        <div
                          key={msg.id}
                          style={{
                            display: 'flex',
                            justifyContent: isAdmin ? 'flex-start' : 'flex-end',
                            marginBottom: '8px'
                          }}
                        >
                          <div
                            style={{
                              maxWidth: '70%',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              ...(isAdmin ? { borderTopLeftRadius: 0 } : { borderTopRightRadius: 0 }),
                              backgroundColor: isAdmin ? t.primary + '15' : t.primary === '#4a7c59' ? '#E8F5E9' : t.primary + '20',
                              borderLeft: isAdmin ? `2px solid ${t.primary}` : 'none',
                              borderRight: !isAdmin ? `2px solid ${t.primary}` : 'none'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                              {isAdmin ? (
                                <ShieldCheck size={12} style={{ color: t.primary }} />
                              ) : (
                                <User size={12} style={{ color: t.primary }} />
                              )}
                              <span style={{ fontSize: '10px', fontWeight: '600', color: t.primary }}>
                                {isAdmin ? 'The Pep Planner Team' : 'You'}
                              </span>
                            </div>
                            <p style={{ fontSize: '12px', margin: 0, whiteSpace: 'pre-wrap', color: t.text }}>
                              {msg.message || msg.text}
                            </p>
                            {msg.imageUrls && msg.imageUrls.length > 0 && (
                              <div style={{ marginTop: '6px' }}>
                                {msg.imageUrls.map((url, idx) => (
                                  <a key={idx} href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: '2px' }}>
                                    <img src={url} alt={`Screenshot ${idx + 1}`} style={{ maxWidth: '100%', maxHeight: '100px', borderRadius: '4px', border: `1px solid ${t.border}` }} />
                                  </a>
                                ))}
                              </div>
                            )}
                            <div style={{ fontSize: '10px', color: t.textLight, marginTop: '4px', opacity: 0.7 }}>
                              {msg.createdAt?.toDate?.() ? new Date(msg.createdAt.toDate()).toLocaleDateString() : 'Today'}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={conversationEndRef} />
                </div>
                {/* Quick responses + reply input — your replies appear in the thread above (hidden when viewing archive) */}
                {!selectedTicket.markedFixed && (
                <div style={{
                  padding: '8px 10px',
                  borderTop: `1px solid ${t.border}`,
                  backgroundColor: t.cardBackground
                }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                    {QUICK_RESPONSES.map(response => (
                      <Tooltip key={response.id} text={`Click to fill: "${response.message.slice(0, 50)}..."`}>
                        <button
                          type="button"
                          onClick={() => setCustomMessage(response.message)}
                          style={{
                            padding: '5px 10px',
                            backgroundColor: '#374151',
                            border: '1px solid #1f2937',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            color: '#f3f4f6'
                          }}
                        >
                          {response.label}
                        </button>
                      </Tooltip>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
                    <textarea
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (customMessage.trim() && !sending) sendMessage();
                        }
                      }}
                      placeholder="Type your message... (Press Enter to send)"
                      rows={2}
                      style={{
                        flex: 1,
                        padding: '8px',
                        border: `1px solid ${t.border}`,
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: t.text,
                        backgroundColor: t.background,
                        resize: 'vertical',
                        fontFamily: 'inherit'
                      }}
                    />
                    <Tooltip text="Send to user — appears in conversation above">
                      <button
                        type="button"
                        onClick={sendMessage}
                        disabled={!customMessage.trim() || sending}
                        style={{
                          padding: '8px 12px',
                          backgroundColor: customMessage.trim() ? btnSend : '#4b5563',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: customMessage.trim() && !sending ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          alignSelf: 'flex-end'
                        }}
                      >
                        <Send size={14} />
                      </button>
                    </Tooltip>
                  </div>
                  <p style={{ fontSize: '10px', color: t.textLight, marginTop: '4px', marginBottom: 0 }}>
                    💡 Reply here — it appears in the thread above and notifies the user.
                  </p>
                </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '8px 12px',
              borderTop: `1px solid ${t.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px'
            }}>
              <span
                onClick={() => window.open(`/admin/overview/dashboard?ticketId=${selectedTicket.ticketId}`, '_blank')}
                style={{
                  fontSize: '11px',
                  color: t.textLight,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <ExternalLink size={11} /> view full ticket
              </span>

              {selectedTicket.markedFixed ? (
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    padding: '6px 14px',
                    backgroundColor: t.border,
                    color: t.text,
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  Close
                </button>
              ) : (
                <Tooltip text="Close this support ticket. Does not notify the user.">
                  <button
                    type="button"
                    onClick={closeTicket}
                    disabled={sending}
                    style={{
                      padding: '6px 14px',
                      backgroundColor: btnSuccess,
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: sending ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      opacity: sending ? 0.7 : 1
                    }}
                  >
                    {sending ? (
                      <>Closing . . .</>
                    ) : (
                      <><CheckCircle2 size={14} /> Close Ticket</>
                    )}
                  </button>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Closed confirmation modal */}
      {justClosedTicket && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001,
            padding: '16px'
          }}
          onClick={() => setJustClosedTicket(null)}
        >
          <div
            style={{
              backgroundColor: t.cardBackground,
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '360px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              border: `1px solid ${t.border}`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: t.text }}>
                Ticket closed
              </h3>
              <p style={{ margin: '8px 0 0', fontSize: '14px', color: t.textLight }}>
                #{justClosedTicket.ticketNumber}
              </p>
            </div>
            <a
              href={`/admin/overview/dashboard?ticketId=${justClosedTicket.ticketId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 16px',
                marginBottom: '12px',
                backgroundColor: t.primary + '15',
                color: t.primary,
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                textDecoration: 'none',
                border: `1px solid ${t.primary}`
              }}
            >
              <ExternalLink size={16} /> View closed ticket
            </a>
            <button
              type="button"
              onClick={() => setJustClosedTicket(null)}
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: t.background,
                color: t.text,
                border: `1px solid ${t.border}`,
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* User Account Modal */}
      {viewingUserAccount && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px'
          }}
          onClick={() => setViewingUserAccount(null)}
        >
          <div 
            style={{
              maxWidth: '28rem',
              width: '100%',
              borderRadius: '12px',
              border: `1px solid ${t.border}`,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              backgroundColor: t.cardBackground
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: '16px',
              borderBottom: `1px solid ${t.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={20} style={{ color: t.primary }} />
                <h3 style={{ fontWeight: '600', color: t.text, margin: 0 }}>User Account Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingUserAccount(null)}
                style={{
                  padding: '4px',
                  borderRadius: '4px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: t.textLight,
                  transition: 'opacity 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '16px' }}>
              {/* Email */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: '600', marginBottom: '4px', display: 'block', color: t.textLight }}>
                  <Mail size={12} style={{ display: 'inline', marginRight: '4px' }} />
                  Email
                </label>
                <p style={{ fontSize: '14px', color: t.text, margin: 0 }}>{viewingUserAccount.email}</p>
              </div>

              {/* Display Name */}
              {viewingUserAccount.displayName && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', marginBottom: '4px', display: 'block', color: t.textLight }}>
                    <User size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    Display Name
                  </label>
                  <p style={{ fontSize: '14px', color: t.text, margin: 0 }}>{viewingUserAccount.displayName}</p>
                </div>
              )}

              {/* Subscription Status */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: '600', marginBottom: '4px', display: 'block', color: t.textLight }}>
                  <CreditCard size={12} style={{ display: 'inline', marginRight: '4px' }} />
                  Subscription Status
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    backgroundColor: viewingUserAccount.subscriptionStatus === 'active' ? '#10B98120' :
                                     viewingUserAccount.subscriptionStatus === 'canceled' ? '#EF444420' :
                                     viewingUserAccount.subscriptionStatus === 'trialing' ? '#F59E0B20' :
                                     viewingUserAccount.subscriptionStatus === 'trial_expired' ? '#DC262620' :
                                     '#6B728020',
                    color: viewingUserAccount.subscriptionStatus === 'active' ? '#10B981' :
                           viewingUserAccount.subscriptionStatus === 'canceled' ? '#EF4444' :
                           viewingUserAccount.subscriptionStatus === 'trialing' ? '#F59E0B' :
                           viewingUserAccount.subscriptionStatus === 'trial_expired' ? '#DC2626' :
                           '#6B7280'
                  }}>
                    {viewingUserAccount.subscriptionStatus || 'none'}
                  </span>
                  {viewingUserAccount.subscriptionType && (
                    <span style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      backgroundColor: t.primary + '20',
                      color: t.primary
                    }}>
                      {viewingUserAccount.subscriptionType}
                    </span>
                  )}
                </div>
              </div>

              {/* Account Created */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: '600', marginBottom: '4px', display: 'block', color: t.textLight }}>
                  <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />
                  Account Created
                </label>
                <p style={{ fontSize: '14px', color: t.text, margin: 0 }}>
                  {viewingUserAccount.createdAt?.toDate?.()?.toLocaleString() || 
                   (viewingUserAccount.createdAt ? new Date(viewingUserAccount.createdAt).toLocaleString() : 'Unknown')}
                </p>
              </div>

              {/* Last Login */}
              {viewingUserAccount.lastLoginAt && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', marginBottom: '4px', display: 'block', color: t.textLight }}>
                    <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    Last Login
                  </label>
                  <p style={{ fontSize: '14px', color: t.text, margin: 0 }}>
                    {viewingUserAccount.lastLoginAt?.toDate?.()?.toLocaleString() || 
                     new Date(viewingUserAccount.lastLoginAt).toLocaleString()}
                  </p>
                </div>
              )}

              {/* User ID */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', marginBottom: '4px', display: 'block', color: t.textLight }}>
                  User ID
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <code style={{
                    fontSize: '11px',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    flex: 1,
                    fontFamily: 'monospace',
                    backgroundColor: t.background,
                    color: t.text
                  }}>
                    {viewingUserAccount.userId || viewingUserAccount.uid || viewingUserAccount.id || 'N/A'}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      const userId = viewingUserAccount.userId || viewingUserAccount.uid || viewingUserAccount.id;
                      if (userId) {
                        navigator.clipboard.writeText(userId);
                        window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'User ID copied!', type: 'success' } }));
                      }
                    }}
                    style={{
                      padding: '6px',
                      borderRadius: '4px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: t.primary,
                      transition: 'opacity 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    title="Copy user ID"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
