import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getFirestore, getDoc, where, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../config/firebase';
import { getUserByEmail, closeSupportTicketFromWorkQueue } from '../../services/firebase';
import AdminLoader from './AdminLoader';
// Admin password removed — cloud functions verify admin via Firebase Auth email token
import { 
  Clock, Copy, CheckCircle2, AlertCircle, X, Send, 
  MessageSquare, Wrench, ExternalLink, History, 
  DollarSign, Calendar, TrendingUp, FileText,
  ChevronDown, ChevronUp, Info, User, Mail, CreditCard, Trash2, ShieldCheck,
  Search, Plus, Link2, GitCommit
} from 'lucide-react';

// GitHub config — read once from env vars (set in .env.local, gitignored)
const GH_CONFIG = {
  owner: import.meta.env.VITE_GITHUB_OWNER || '',
  repo: import.meta.env.VITE_GITHUB_REPO || '',
  token: import.meta.env.VITE_GITHUB_TOKEN || '',
  branch: import.meta.env.VITE_GITHUB_BRANCH || 'main'
};

// Commit audit helpers — module level so no stale closure issues
const AUDIT_STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with',
  'is','it','be','as','by','this','that','was','are','from','fix','fixes',
  'fixed','update','updates','updated','add','adds','added','remove','removes',
  'removed','change','changes','changed','merge','branch','main','refactor',
  'cleanup','hotfix','wip','bump','v','version','pr','feat','chore','build',
  'ci','test','docs','style','perf','revert','release'
]);

function auditTokenize(str) {
  if (!str) return new Set();
  return new Set(
    str.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !AUDIT_STOP_WORDS.has(w))
  );
}

function auditScoreMatch(commitMsg, ticket) {
  const cTokens = auditTokenize(commitMsg);
  const tTokens = new Set([
    ...auditTokenize(ticket.subject),
    ...auditTokenize(ticket.originalMessage),
  ]);
  if (!cTokens.size || !tTokens.size) return 0;
  let matches = 0;
  for (const w of cTokens) { if (tTokens.has(w)) matches++; }
  return matches / Math.max(cTokens.size, tTokens.size);
}

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

// Cache helpers — sessionStorage survives page refreshes; module var avoids
// re-parsing JSON on same-session navigation (component unmount/remount)
const _WQ_KEY = 'wq_cache_v1';
const _COSTS_KEY = 'wq_costs_v1';

function _tsToMs(v) {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  if (typeof v?.toDate === 'function') return v.toDate().getTime();
  if (typeof v?.seconds === 'number') return v.seconds * 1000 + Math.floor((v.nanoseconds || 0) / 1e6);
  return null;
}

function _serializeTickets(tickets) {
  return tickets.map(t => ({
    ...t,
    timestamp: _tsToMs(t.timestamp),
    markedFixedAt: _tsToMs(t.markedFixedAt),
  }));
}

function _loadCache() {
  try {
    const raw = sessionStorage.getItem(_WQ_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function _loadCostsCache() {
  try {
    const raw = sessionStorage.getItem(_COSTS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function _saveCache(tickets, costs) {
  try {
    sessionStorage.setItem(_WQ_KEY, JSON.stringify(_serializeTickets(tickets)));
    sessionStorage.setItem(_COSTS_KEY, JSON.stringify(costs));
  } catch {} // ignore storage quota errors
}

// Module-level vars avoid re-parsing JSON on navigation (component unmount/remount)
let _wqCache = _loadCache();
let _costsCache = _loadCostsCache();

export default function WorkQueue({ theme, feedbackItems, onFeedbackMarkReviewed, onFeedbackMarkResolved, onFeedbackDelete, onFeedbackReply }) {
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

  // State — initialise from module-level cache so re-mounts are instant
  const [workQueue, setWorkQueue] = useState(() => _wqCache ?? []);
  const [loading, setLoading] = useState(_wqCache === null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adminStatus, setAdminStatusLocal] = useState(null);
  const [linkedCommits, setLinkedCommitsLocal] = useState([]);
  const [commitsFetching, setCommitsFetching] = useState(false);
  const [commitsList, setCommitsList] = useState([]);
  const [showCommitsDropdown, setShowCommitsDropdown] = useState(false);
  const [manualCommitText, setManualCommitText] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  
  const [costs, setCosts] = useState(() => _costsCache ?? {
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
  const [expandedBacklogItems, setExpandedBacklogItems] = useState({});
  const [backlogMessages, setBacklogMessages] = useState({});
  const [expandedUserGroups, setExpandedUserGroups] = useState({});
  const [replyingToFeedbackId, setReplyingToFeedbackId] = useState(null);
  const [feedbackReplyText, setFeedbackReplyText] = useState('');
  const [sendingFeedbackReply, setSendingFeedbackReply] = useState(false);
  const autoScannedRef = useRef(false);
  const autoCommitAuditRanRef = useRef(false);
  const [showCommitAudit, setShowCommitAudit] = useState(false);
  const [commitAuditRunning, setCommitAuditRunning] = useState(false);
  const [commitAuditResults, setCommitAuditResults] = useState(null);
  const [commitAuditDays, setCommitAuditDays] = useState(365);
  const [linkingNoMatchSha, setLinkingNoMatchSha] = useState(null);
  const [selectedLogIdForNoMatch, setSelectedLogIdForNoMatch] = useState('');

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
          adminStatus: log.adminStatus || null,
          linkedCommits: Array.isArray(log.linkedCommits) ? log.linkedCommits : [],
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

        // If no userAccountInfo, or it has no subscription data, fetch by email so badge can show status
        const needsUserInfo = !item.userAccountInfo || (
          !item.userAccountInfo.subscriptionStatus &&
          !item.userAccountInfo.subscriptionType &&
          !(item.userAccountInfo.subscription && (item.userAccountInfo.subscription.status || item.userAccountInfo.subscription.plan))
        );
        if (needsUserInfo && item.userEmail) {
          try {
            const userInfo = await getUserByEmail(item.userEmail);
            if (userInfo) {
              item.userAccountInfo = { ...(item.userAccountInfo || {}), ...userInfo };
            }
          } catch (error) {
            console.error('Error fetching user info:', error);
          }
        }

        tickets.push(item);
      }

      // Deduplicate by ticketId — keep the most recent log per ticket; merge linkedCommits from all logs for that ticket
      const byTicket = new Map();
      for (const item of tickets) {
        const tid = item.ticketId || item.logId;
        const existing = byTicket.get(tid);
        const itemTime = item.timestamp?.toDate?.()?.getTime() ?? item.timestamp ?? 0;
        const existingTime = existing?.timestamp?.toDate?.()?.getTime() ?? existing?.timestamp ?? 0;
        const itemCommits = Array.isArray(item.linkedCommits) ? item.linkedCommits : [];
        const existingCommits = Array.isArray(existing?.linkedCommits) ? existing.linkedCommits : [];
        const seenSha = new Set();
        const merged = [];
        for (const c of [...existingCommits, ...itemCommits]) {
          const sha = c?.sha ?? c?.commit?.sha ?? '';
          if (sha && !seenSha.has(sha)) { seenSha.add(sha); merged.push(c); }
        }
        if (!existing || itemTime >= existingTime) {
          byTicket.set(tid, { ...item, linkedCommits: merged });
        } else {
          byTicket.set(tid, { ...existing, linkedCommits: merged });
        }
      }
      const deduped = Array.from(byTicket.values()).sort((a, b) => {
        const ta = a.timestamp?.toDate?.()?.getTime() ?? a.timestamp ?? 0;
        const tb = b.timestamp?.toDate?.()?.getTime() ?? b.timestamp ?? 0;
        return ta - tb;
      });

      // Update module-level cache + sessionStorage so the next mount/refresh is instant
      _costsCache = { today: todayCost, week: weekCost, month: monthCost, allTime: allTimeCost };
      _wqCache = deduped;
      _saveCache(deduped, _costsCache);

      setWorkQueue(deduped);
      setCosts(_costsCache);
      setLoading(false);

      // One-time backfill: assign adminStatus to old tickets that had replies but no status set
      if (!backfillRanRef.current) {
        backfillRanRef.current = true;
        const needsBackfill = deduped.filter(t => t.followUpSent && !t.adminStatus);
        if (needsBackfill.length > 0) {
          console.log(`[Backfill] Auto-assigning adminStatus to ${needsBackfill.length} old tickets`);
          const inferStatus = (msg = '') => {
            const m = msg.toLowerCase();
            if (m.includes('resolved') || m.includes('fixed') || m.includes('complete') || m.includes('taken care')) return 'resolved';
            if (m.includes('need') || m.includes('info') || m.includes('clarif') || m.includes('more detail')) return 'need-info';
            if (m.includes('known issue') || m.includes('known bug') || m.includes('aware')) return 'known-issue';
            return 'working';
          };
          needsBackfill.forEach(async (t) => {
            const status = inferStatus(t.followUpMessage);
            try {
              await updateDoc(doc(db, 'ai_worker_logs', t.logId), { adminStatus: status });
              setWorkQueue(prev => prev.map(item =>
                item.logId === t.logId ? { ...item, adminStatus: status } : item
              ));
              console.log(`[Backfill] ${t.ticketNumber} → ${status}`);
            } catch (e) {
              console.error(`[Backfill] Failed for ${t.logId}:`, e);
            }
          });
        }
      }
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

  // Auto-run backlog scan once after initial data loads
  useEffect(() => {
    if (!loading && !autoScannedRef.current) {
      autoScannedRef.current = true;
      runBacklogScan();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Auto-run commit audit once after data loads so commits are linked to matching tickets
  useEffect(() => {
    if (loading || workQueue.length === 0 || autoCommitAuditRanRef.current) return;
    const { owner, repo, token } = GH_CONFIG;
    if (!owner || !repo || !token) return;
    autoCommitAuditRanRef.current = true;
    runCommitAudit(commitAuditDays);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, workQueue.length]);

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

  const toggleBacklogItem = async (itemId) => {
    const isExpanding = !expandedBacklogItems[itemId];
    setExpandedBacklogItems(prev => ({ ...prev, [itemId]: isExpanding }));
    if (isExpanding && !backlogMessages[itemId]) {
      try {
        const firestore = getFirestore();
        const msgsSnap = await getDocs(
          query(collection(firestore, 'supportTickets', itemId, 'messages'), orderBy('createdAt', 'asc'))
        );
        const userMsg = msgsSnap.docs.find(d => d.data().senderType === 'user');
        setBacklogMessages(prev => ({
          ...prev,
          [itemId]: userMsg?.data()?.message || userMsg?.data()?.text || '(no message content)'
        }));
      } catch {
        setBacklogMessages(prev => ({ ...prev, [itemId]: '(could not load message)' }));
      }
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
      // Results stored silently — panel stays collapsed until manually opened
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
    setAdminStatusLocal(ticket.adminStatus || null);
    setLinkedCommitsLocal(Array.isArray(ticket.linkedCommits) ? ticket.linkedCommits : []);
    setCustomMessage('');
  };

  const closeModal = () => {
    setSelectedTicket(null);
    setAdminNotes('');
    setAdminStatusLocal(null);
    setLinkedCommitsLocal([]);
    setCustomMessage('');
    setShowCommitsDropdown(false);
    setCommitsList([]);
    setManualCommitText('');
  };

  const backfillRanRef = useRef(false);
  const selectedTicketRef = useRef(null);
  const workQueueRef = useRef(workQueue);
  useEffect(() => { selectedTicketRef.current = selectedTicket; }, [selectedTicket]);
  useEffect(() => { workQueueRef.current = workQueue; }, [workQueue]);

  const saveAdminStatus = async (status) => {
    const ticket = selectedTicketRef.current;
    if (!ticket) { console.warn('[saveAdminStatus] no ticket ref'); return; }
    console.log('[saveAdminStatus] status:', status, 'ticket:', ticket.ticketNumber, ticket.logId);
    setAdminStatusLocal(status);
    try {
      const logRef = doc(db, 'ai_worker_logs', ticket.logId);
      await updateDoc(logRef, { adminStatus: status });
      setWorkQueue(prev => prev.map(t =>
        t.logId === ticket.logId ? { ...t, adminStatus: status } : t
      ));
      setSelectedTicket(prev => prev ? { ...prev, adminStatus: status } : null);
      console.log('[saveAdminStatus] saved OK');
    } catch (error) {
      console.error('[saveAdminStatus] failed:', error);
    }
  };

  /** Update status from the list row without opening the modal */
  const saveAdminStatusForTicket = async (ticket, status) => {
    if (!ticket?.logId) return;
    try {
      const logRef = doc(db, 'ai_worker_logs', ticket.logId);
      await updateDoc(logRef, { adminStatus: status });
      setWorkQueue(prev => prev.map(t =>
        t.logId === ticket.logId ? { ...t, adminStatus: status } : t
      ));
      if (selectedTicket?.logId === ticket.logId) {
        setSelectedTicket(prev => prev ? { ...prev, adminStatus: status } : null);
        setAdminStatusLocal(status);
      }
    } catch (error) {
      console.error('[saveAdminStatusForTicket] failed:', error);
    }
  };

  const saveLinkedCommits = async (commits) => {
    const ticket = selectedTicketRef.current;
    if (!ticket) return;
    setLinkedCommitsLocal(commits);
    try {
      const logRef = doc(db, 'ai_worker_logs', ticket.logId);
      await updateDoc(logRef, { linkedCommits: commits });
      setWorkQueue(prev => {
        const next = prev.map(t =>
          t.logId === ticket.logId ? { ...t, linkedCommits: commits } : t
        );
        _wqCache = next;
        _saveCache(next, _costsCache);
        return next;
      });
      setSelectedTicket(prev => prev ? { ...prev, linkedCommits: commits } : null);
    } catch (error) {
      console.error('Failed to save linked commits:', error);
    }
  };

  const runCommitAudit = async (days) => {
    const auditDays = days || commitAuditDays || 365;
    const branch = GH_CONFIG.branch;
    console.log('[CommitAudit] starting — days:', auditDays, 'branch:', branch, 'owner:', GH_CONFIG.owner, 'repo:', GH_CONFIG.repo, 'token set:', !!GH_CONFIG.token);

    if (!GH_CONFIG.owner || !GH_CONFIG.repo || !GH_CONFIG.token) {
      console.warn('[CommitAudit] GH_CONFIG missing values — check .env.local and restart dev server');
      alert('GitHub credentials not found. Make sure .env.local has VITE_GITHUB_OWNER, VITE_GITHUB_REPO, VITE_GITHUB_TOKEN and that you restarted the dev server.');
      return;
    }

    setCommitAuditRunning(true);
    setCommitAuditResults(null);

    try {
      const since = new Date(Date.now() - auditDays * 24 * 60 * 60 * 1000).toISOString();
      console.log('[CommitAudit] fetching commits since', since, 'on branch', branch);
      let page = 1;
      let allCommits = [];
      const maxPages = 10; // GitHub caps at 300 commits; we fetch up to 1000 (10×100)
      while (page <= maxPages) {
        const url = `https://api.github.com/repos/${GH_CONFIG.owner}/${GH_CONFIG.repo}/commits?sha=${branch}&since=${since}&per_page=100&page=${page}`;
        console.log('[CommitAudit] GET', url);
        const res = await fetch(url, { headers: { Authorization: `Bearer ${GH_CONFIG.token}` } });
        if (!res.ok) throw new Error(`GitHub API ${res.status}: ${res.statusText}`);
        const batch = await res.json();
        if (!Array.isArray(batch) || batch.length === 0) break;
        allCommits = [...allCommits, ...batch];
        console.log('[CommitAudit] fetched', allCommits.length, 'commits so far');
        if (batch.length < 100) break;
        page++;
      }

      console.log('[CommitAudit] total commits:', allCommits.length, '| total tickets:', workQueueRef.current.length);
      const SCORE_THRESHOLD = 0.12;
      const linked = [];
      const noMatch = [];

      for (const commit of allCommits) {
        const sha7 = commit.sha?.slice(0, 7) || commit.sha;
        const msg = (commit.commit?.message || '').split('\n')[0].slice(0, 120);
        const commitUrl = commit.html_url || null;
        const commitDate = commit.commit?.author?.date || new Date().toISOString();

        let best = null;
        let bestScore = 0;
        for (const ticket of workQueueRef.current) {
          const score = auditScoreMatch(msg, ticket);
          if (score > bestScore) { bestScore = score; best = ticket; }
        }

        if (best && bestScore >= SCORE_THRESHOLD) {
          const entry = { sha: sha7, message: msg, url: commitUrl, linkedAt: commitDate, autoLinked: true };
          const currentBest = workQueueRef.current.find(t => t.logId === best.logId);
          const already = (currentBest?.linkedCommits || []).some(lc => lc.sha === sha7);
          if (!already) {
            try {
              const logRef = doc(db, 'ai_worker_logs', best.logId);
              const updatedCommits = [...(currentBest?.linkedCommits || []), entry];
              await updateDoc(logRef, { linkedCommits: updatedCommits });
              setWorkQueue(prev => {
                const next = prev.map(t =>
                  t.logId === best.logId ? { ...t, linkedCommits: updatedCommits } : t
                );
                workQueueRef.current = next;
                _wqCache = next;
                _saveCache(next, _costsCache);
                return next;
              });
              linked.push({ commit: { sha: sha7, msg, url: commitUrl, date: commitDate }, ticket: best, score: bestScore, skipped: false });
              console.log('[CommitAudit] linked', sha7, '→ ticket', best.ticketNumber, 'score', (bestScore*100).toFixed(0)+'%');
            } catch (err) {
              console.error('[CommitAudit] Firestore write failed for', sha7, err);
              linked.push({ commit: { sha: sha7, msg, url: commitUrl, date: commitDate }, ticket: best, score: bestScore, skipped: true, error: err?.message });
            }
          } else {
            linked.push({ commit: { sha: sha7, msg, url: commitUrl, date: commitDate }, ticket: best, score: bestScore, skipped: true, reason: 'already linked' });
          }
        } else {
          noMatch.push({ sha: sha7, msg, url: commitUrl, date: commitDate, bestScore });
        }
      }

      console.log('[CommitAudit] done — linked:', linked.length, 'noMatch:', noMatch.length);
      setCommitAuditResults({ linked, noMatch, totalCommits: allCommits.length, days: auditDays, ranAt: new Date().toISOString() });
    } catch (err) {
      console.error('[CommitAudit] failed:', err);
      alert(`Commit audit failed: ${err.message}`);
    } finally {
      setCommitAuditRunning(false);
    }
  };

  const linkNoMatchCommitToTicket = async (ticket, noMatchEntry) => {
    const entry = {
      sha: noMatchEntry.sha?.slice(0, 7) || noMatchEntry.sha,
      message: noMatchEntry.msg || '',
      url: noMatchEntry.url || null,
      linkedAt: noMatchEntry.date || new Date().toISOString(),
      autoLinked: false
    };
    try {
      const logRef = doc(db, 'ai_worker_logs', ticket.logId);
      const updatedCommits = [...(ticket.linkedCommits || []), entry];
      await updateDoc(logRef, { linkedCommits: updatedCommits });
      setWorkQueue(prev => {
        const next = prev.map(t =>
          t.logId === ticket.logId ? { ...t, linkedCommits: updatedCommits } : t
        );
        workQueueRef.current = next;
        _wqCache = next;
        _saveCache(next, _costsCache);
        return next;
      });
      setCommitAuditResults(prev => prev ? {
        ...prev,
        noMatch: prev.noMatch.filter(c => (c.sha?.slice(0, 7) || c.sha) !== entry.sha)
      } : null);
      setLinkingNoMatchSha(null);
      setSelectedLogIdForNoMatch('');
    } catch (err) {
      console.error('[linkNoMatchCommitToTicket]', err);
    }
  };

  const saveAdminNotes = async (notes) => {
    const ticket = selectedTicketRef.current;
    if (!ticket) return;
    setSaving(true);
    try {
      const logRef = doc(db, 'ai_worker_logs', ticket.logId);
      await updateDoc(logRef, { adminNotes: notes });
      setWorkQueue(prev => prev.map(t =>
        t.logId === ticket.logId ? { ...t, adminNotes: notes } : t
      ));
    } catch (error) {
      console.error('Failed to save notes:', error);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!selectedTicket || adminNotes === selectedTicket.adminNotes) return;
    
    const timer = setTimeout(() => {
      saveAdminNotes(adminNotes);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [adminNotes, selectedTicket, saveAdminNotes]);

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

  const closeTicketInline = async (ticket, e) => {
    if (e) e.stopPropagation();
    if (!ticket?.logId) return;
    try {
      await closeSupportTicketFromWorkQueue(ticket.ticketId, ticket.logId, '');
      setWorkQueue(prev => prev.map(t =>
        t.logId === ticket.logId ? { ...t, markedFixed: true, markedFixedAt: new Date() } : t
      ));
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: `#${ticket.ticketNumber} closed ✓`, type: 'success' } }));
    } catch (err) {
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: err?.message || 'Failed to close', type: 'error' } }));
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

  const renderDateChip = (date) => {
    if (!date) return null;
    const d = date instanceof Date ? date : (date?.toDate?.() || new Date(date));
    if (!d || isNaN(d.getTime())) return null;
    const label = formatRelativeTime(d);
    const diffDays = Math.floor((new Date() - d) / (1000 * 60 * 60 * 24));
    let bg, fg;
    if (diffDays === 0) { bg = '#D1FAE5'; fg = '#065F46'; }
    else if (diffDays <= 2) { bg = '#FEF9C3'; fg = '#854D0E'; }
    else if (diffDays <= 6) { bg = '#FED7AA'; fg = '#9A3412'; }
    else { bg = '#F1F5F9'; fg = '#475569'; }
    return (
      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', fontWeight: '700', backgroundColor: bg, color: fg, whiteSpace: 'nowrap' }}>
        📅 {label}
      </span>
    );
  };

  const handleFeedbackReplyInQueue = async (feedbackItem) => {
    if (!feedbackReplyText.trim() || !onFeedbackReply) return;
    setSendingFeedbackReply(true);
    try {
      await onFeedbackReply(feedbackItem._rawFeedback, feedbackReplyText.trim());
      setReplyingToFeedbackId(null);
      setFeedbackReplyText('');
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Message sent! User will see it as "From the Team".', type: 'success' } }));
    } catch (err) {
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: err?.message || 'Failed to send', type: 'error' } }));
    } finally {
      setSendingFeedbackReply(false);
    }
  };

  if (loading) {
    return <AdminLoader theme={t} message="Loading your queue…" />;
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

      {/* Queue Stats — Pending / Archive toggle */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div
          role="switch"
          aria-checked={showHistory}
          style={{
            display: 'inline-flex',
            borderRadius: '20px',
            padding: '3px',
            backgroundColor: t.border || '#E5E7EB',
            border: `1px solid ${t.border || '#E5E7EB'}`
          }}
        >
          <button
            type="button"
            onClick={() => setShowHistory(false)}
            style={{
              padding: '6px 14px',
              borderRadius: '18px',
              border: 'none',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              backgroundColor: !showHistory ? (t.primary || '#4a7c59') : 'transparent',
              color: !showHistory ? '#fff' : t.textLight,
              transition: 'background-color 0.2s, color 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Clock size={14} /> {pendingTickets.length + (feedbackItems || []).filter(f => f._status !== 'resolved').length} Open
          </button>
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            style={{
              padding: '6px 14px',
              borderRadius: '18px',
              border: 'none',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              backgroundColor: showHistory ? (t.primaryDark || t.primary || '#2d5a3a') : 'transparent',
              color: showHistory ? '#fff' : t.textLight,
              transition: 'background-color 0.2s, color 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <CheckCircle2 size={14} /> {completedTickets.length} Closed
          </button>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => { setShowBacklogScan(v => !v); }}
            style={{
              padding: '5px 12px',
              borderRadius: '16px',
              border: Array.isArray(backlogResults) && backlogResults.length > 0 ? '1px solid #F59E0B' : `1px solid ${t.border}`,
              backgroundColor: showBacklogScan ? '#FEF3C7' : Array.isArray(backlogResults) && backlogResults.length > 0 ? '#FEF3C720' : 'transparent',
              color: showBacklogScan || (Array.isArray(backlogResults) && backlogResults.length > 0) ? '#92400E' : t.textLight,
              fontWeight: '600',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Search size={13} /> Backlog Scan
            {Array.isArray(backlogResults) && backlogResults.length > 0 && (
              <span style={{
                backgroundColor: '#EF4444',
                color: '#fff',
                borderRadius: '10px',
                fontSize: '10px',
                fontWeight: '700',
                padding: '1px 6px',
                lineHeight: '1.4'
              }}>
                {backlogResults.length}
              </span>
            )}
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
          <button
            type="button"
            onClick={() => setShowCommitAudit(v => !v)}
            style={{
              padding: '5px 12px',
              borderRadius: '16px',
              border: `1px solid ${commitAuditResults ? '#8B5CF6' : t.border}`,
              backgroundColor: showCommitAudit ? '#EDE9FE' : commitAuditResults ? '#EDE9FE40' : 'transparent',
              color: showCommitAudit || commitAuditResults ? '#6D28D9' : t.textLight,
              fontWeight: '600',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <GitCommit size={13} /> Commit Audit
            {commitAuditResults && (
              <span style={{ backgroundColor: '#8B5CF6', color: '#fff', borderRadius: '10px', fontSize: '10px', fontWeight: '700', padding: '1px 6px', lineHeight: '1.4' }}>
                {commitAuditResults.linked.filter(l => !l.skipped).length} linked
              </span>
            )}
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

      {/* Commit Audit panel */}
      {showCommitAudit && (
        <div style={{
          backgroundColor: t.cardBackground,
          border: '1px solid #8B5CF640',
          borderRadius: '10px',
          padding: '14px',
          marginBottom: '16px'
        }}>
          <div style={{ fontWeight: '600', fontSize: '13px', color: t.text, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <GitCommit size={14} style={{ color: '#8B5CF6' }} />
            Auto Commit Audit
            {commitAuditResults && (
              <span style={{ fontSize: '11px', fontWeight: '400', color: t.textLight }}>
                — last run {new Date(commitAuditResults.ranAt).toLocaleString()} · {commitAuditResults.totalCommits} commits scanned
              </span>
            )}
          </div>
          <p style={{ fontSize: '12px', color: t.textLight, margin: '0 0 10px 0' }}>
            Fetches commits from the past <strong>{commitAuditDays} days</strong> on branch <strong>{GH_CONFIG.branch}</strong> (set <code>VITE_GITHUB_BRANCH</code> in .env.local; default: main) and links them to matching tickets by keyword. GitHub returns up to 300 commits per run. “No match” commits can be linked manually below.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '12px', color: t.text, fontWeight: '500' }}>Last</label>
            <input
              type="number"
              min="1"
              max="730"
              value={commitAuditDays}
              onChange={e => setCommitAuditDays(Number(e.target.value) || 365)}
              style={{ width: '65px', padding: '5px 8px', border: `1px solid ${t.border}`, borderRadius: '6px', fontSize: '12px', color: t.text, backgroundColor: t.background }}
            />
            <label style={{ fontSize: '12px', color: t.text, fontWeight: '500' }}>days</label>
            <button
              type="button"
              onClick={() => runCommitAudit(commitAuditDays)}
              disabled={commitAuditRunning}
              style={{
                padding: '6px 16px',
                backgroundColor: commitAuditRunning ? t.border : '#7C3AED',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: commitAuditRunning ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              {commitAuditRunning ? (
                <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span> Running…</>
              ) : (
                <><GitCommit size={13} /> Run Audit</>
              )}
            </button>
            {commitAuditResults && (
              <button
                type="button"
                onClick={() => setCommitAuditResults(null)}
                style={{ padding: '5px 10px', backgroundColor: 'transparent', border: `1px solid ${t.border}`, borderRadius: '6px', fontSize: '11px', color: t.textLight, cursor: 'pointer' }}
              >
                Clear results
              </button>
            )}
          </div>

          {commitAuditResults && (
            <div>
              {/* Summary row */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Commits scanned', val: commitAuditResults.totalCommits, bg: '#F3F4F6', fg: t.text },
                  { label: 'Auto-linked', val: commitAuditResults.linked.filter(l => !l.skipped).length, bg: '#EDE9FE', fg: '#6D28D9' },
                  { label: 'Already linked', val: commitAuditResults.linked.filter(l => l.skipped && l.reason === 'already linked').length, bg: '#D1FAE5', fg: '#065F46' },
                  { label: 'No match', val: commitAuditResults.noMatch.length, bg: '#FEF3C7', fg: '#92400E' },
                ].map(s => (
                  <div key={s.label} style={{ padding: '6px 12px', borderRadius: '8px', backgroundColor: s.bg, color: s.fg, fontSize: '12px', fontWeight: '600' }}>
                    {s.val} <span style={{ fontWeight: '400' }}>{s.label}</span>
                  </div>
                ))}
              </div>

              {/* Newly linked commits */}
              {commitAuditResults.linked.filter(l => !l.skipped).length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#6D28D9', marginBottom: '6px', textTransform: 'uppercase' }}>✅ Newly Linked</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {commitAuditResults.linked.filter(l => !l.skipped).map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', backgroundColor: '#EDE9FE40', borderRadius: '6px', border: '1px solid #DDD6FE', fontSize: '11px', flexWrap: 'wrap' }}>
                        {item.commit.url ? (
                          <a href={item.commit.url} target="_blank" rel="noopener noreferrer" style={{ color: '#6D28D9', fontWeight: '600', fontFamily: 'monospace' }}>
                            {item.commit.sha}
                          </a>
                        ) : (
                          <code style={{ color: '#6D28D9' }}>{item.commit.sha}</code>
                        )}
                        <span style={{ color: t.text, flex: 1, minWidth: 0 }}>{item.commit.msg}</span>
                        <span style={{ color: t.textLight }}>→</span>
                        <span
                          style={{ color: t.primary, fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}
                          onClick={() => { openTicket(item.ticket); setShowCommitAudit(false); }}
                        >
                          #{item.ticket.ticketNumber}
                        </span>
                        <span style={{ color: t.textLight, fontSize: '10px' }}>
                          score: {(item.score * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Commits with no match */}
              {commitAuditResults.noMatch.length > 0 && (
                <details style={{ marginTop: '6px' }} open>
                  <summary style={{ fontSize: '11px', fontWeight: '600', color: '#92400E', cursor: 'pointer', marginBottom: '6px' }}>
                    ⚠️ {commitAuditResults.noMatch.length} commits with no ticket match (click to expand)
                  </summary>
                  <p style={{ fontSize: '10px', color: t.textLight, marginTop: '4px', marginBottom: '6px' }}>
                    Link a commit to a ticket manually by choosing the ticket below and clicking Link.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                    {commitAuditResults.noMatch.map((c, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', backgroundColor: '#FEF3C740', borderRadius: '6px', border: '1px solid #FDE68A', fontSize: '11px', flexWrap: 'wrap' }}>
                        <code style={{ color: '#92400E', fontFamily: 'monospace' }}>{c.sha}</code>
                        <span style={{ color: t.textLight, flex: '1 1 200px' }}>{c.msg}</span>
                        <span style={{ fontSize: '10px', color: t.textLight }}>best score: {(c.bestScore * 100).toFixed(0)}%</span>
                        {linkingNoMatchSha === (c.sha?.slice(0, 7) || c.sha) ? (
                          <>
                            <select
                              id={`no-match-ticket-${idx}`}
                              value={selectedLogIdForNoMatch}
                              style={{ padding: '4px 8px', borderRadius: '6px', border: `1px solid ${t.border}`, fontSize: '11px', minWidth: '160px' }}
                              onChange={(e) => setSelectedLogIdForNoMatch(e.target.value)}
                            >
                              <option value="">Choose ticket…</option>
                              {workQueue.map((tkt) => (
                                <option key={tkt.logId} value={tkt.logId}>#{tkt.ticketNumber} {tkt.userEmail || tkt.userName || ''}</option>
                              ))}
                            </select>
                            <button type="button" disabled={!selectedLogIdForNoMatch} onClick={() => { const ticket = workQueue.find(t => t.logId === selectedLogIdForNoMatch); if (ticket) linkNoMatchCommitToTicket(ticket, c); }} style={{ padding: '4px 10px', fontSize: '10px', fontWeight: '600', backgroundColor: selectedLogIdForNoMatch ? t.primary : t.border, color: '#fff', border: 'none', borderRadius: '6px', cursor: selectedLogIdForNoMatch ? 'pointer' : 'not-allowed' }}>Link</button>
                            <button type="button" onClick={() => { setLinkingNoMatchSha(null); setSelectedLogIdForNoMatch(''); }} style={{ padding: '4px 8px', fontSize: '10px', border: `1px solid ${t.border}`, borderRadius: '6px', background: t.cardBackground, cursor: 'pointer' }}>Cancel</button>
                          </>
                        ) : (
                          <button type="button" onClick={() => { setLinkingNoMatchSha(c.sha?.slice(0, 7) || c.sha); setSelectedLogIdForNoMatch(''); }} style={{ padding: '4px 10px', fontSize: '10px', fontWeight: '600', backgroundColor: t.primary, color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Link to ticket</button>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              )}
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
            <span style={{ fontSize: '10px', fontWeight: '500', backgroundColor: '#FEF3C7', color: '#92400E', padding: '2px 6px', borderRadius: '8px', marginLeft: '4px' }}>
              auto-runs on load
            </span>
          </div>
          <p style={{ fontSize: '12px', color: '#B45309', margin: '0 0 10px 0' }}>
            Automatically scans all support tickets against your work queue logs on every page load. Finds tickets that were never processed or had a user reply after being closed.
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
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#92400E', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <span>⚠️ {backlogResults.length} potentially missed ticket{backlogResults.length > 1 ? 's' : ''} found — click any ticket to preview</span>
                <button
                  type="button"
                  onClick={async () => {
                    for (const item of backlogResults) {
                      try {
                        const addToQueue = httpsCallable(functions, 'addTicketToWorkQueue');
                        await addToQueue({ ticketId: item.id });
                      } catch (_) {}
                    }
                    window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: `${backlogResults.length} tickets added to queue ✓`, type: 'success' } }));
                    setBacklogResults([]);
                    setShowBacklogScan(false);
                  }}
                  style={{
                    padding: '4px 12px',
                    backgroundColor: '#DC2626',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  ⚡ Add All {backlogResults.length} to Queue
                </button>
              </div>
              {backlogResults.map((item, idx) => {
                const isExpanded = expandedBacklogItems[item.id];
                const msgPreview = backlogMessages[item.id];
                return (
                  <div
                    key={item.id}
                    style={{
                      backgroundColor: '#fff',
                      border: '1px solid #FCD34D',
                      borderRadius: '8px',
                      marginBottom: idx < backlogResults.length - 1 ? '8px' : '0',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Header row — clickable to expand */}
                    <div
                      onClick={() => toggleBacklogItem(item.id)}
                      style={{
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        flexWrap: 'wrap',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '3px' }}>
                          <span style={{ fontWeight: '600', color: '#92400E', fontSize: '13px' }}>
                            #{item.ticketNumber || item.id.slice(-6).toUpperCase()}
                          </span>
                          <span style={{
                            fontSize: '10px', padding: '2px 7px', borderRadius: '8px', fontWeight: '600',
                            backgroundColor: item.status === 'closed' ? '#FEE2E2' : item.status === 'resolved' ? '#D1FAE5' : '#FEF3C7',
                            color: item.status === 'closed' ? '#DC2626' : item.status === 'resolved' ? '#065F46' : '#92400E'
                          }}>
                            {item.status}
                          </span>
                          <span style={{ fontSize: '11px', color: '#B45309', opacity: 0.7 }}>
                            {isExpanded ? '▲ hide' : '▼ preview'}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#B45309' }}>{item.userEmail}</div>
                        {item.subject && (
                          <div style={{ fontSize: '11px', color: '#78350F', marginTop: '2px', fontStyle: 'italic' }}>
                            "{item.subject}"
                          </div>
                        )}
                        <div style={{ fontSize: '11px', color: '#92400E', marginTop: '2px', opacity: 0.8 }}>
                          📋 {item.reason}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <a
                          href={`/admin/overview/dashboard?ticketId=${item.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{
                            padding: '5px 10px',
                            backgroundColor: 'transparent',
                            color: '#92400E',
                            border: '1px solid #FCD34D',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          <ExternalLink size={11} /> View
                        </a>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
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
                          }}
                        >
                          + Add to Queue
                        </button>
                      </div>
                    </div>

                    {/* Expanded message preview */}
                    {isExpanded && (
                      <div style={{
                        padding: '10px 12px',
                        borderTop: '1px solid #FDE68A',
                        backgroundColor: '#FFFBEB'
                      }}>
                        <div style={{ fontSize: '10px', fontWeight: '600', color: '#92400E', textTransform: 'uppercase', marginBottom: '6px' }}>
                          User Message
                        </div>
                        {msgPreview === undefined ? (
                          <div style={{ fontSize: '12px', color: '#B45309' }}>Loading…</div>
                        ) : (
                          <div style={{ fontSize: '12px', color: '#78350F', lineHeight: '1.5', whiteSpace: 'pre-wrap', maxHeight: '120px', overflowY: 'auto' }}>
                            {msgPreview}
                          </div>
                        )}
                        {item.lastMessageAt && (
                          <div style={{ fontSize: '10px', color: '#B45309', marginTop: '6px', opacity: 0.7 }}>
                            Last activity: {item.lastMessageAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
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

      {/* Open — shown when toggle is Open */}
      {!showHistory && (
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
          <Clock size={16} /> Open
        </div>

        {(() => {
          // Normalize active feedback items into a unified display shape
          const activeFeedback = (feedbackItems || [])
            .filter(f => f._status !== 'resolved')
            .map(f => {
              const d = f._date instanceof Date ? f._date : new Date(f._date || 0);
              return {
                _isFeedback: true,
                _feedbackType: f._type,
                _feedbackStatus: f._status,
                _rawFeedback: f,
                id: f.id,
                logId: `feedback-${f.id}`,
                userEmail: f._email,
                timestamp: d,
                subject: f._preview,
              };
            });

          // Build email-grouped support display items
          const emailOrder = [];
          const byEmail = new Map();
          for (const ticket of pendingTickets) {
            const key = ticket.userEmail || ticket.logId;
            if (!byEmail.has(key)) { byEmail.set(key, []); emailOrder.push(key); }
            byEmail.get(key).push(ticket);
          }
          byEmail.forEach(group => group.sort((a, b) => {
            const ta = a.timestamp?.toDate?.()?.getTime() ?? 0;
            const tb = b.timestamp?.toDate?.()?.getTime() ?? 0;
            return ta - tb;
          }));

          const getMs = (ts) => {
            if (!ts) return 0;
            if (ts instanceof Date) return ts.getTime();
            if (typeof ts?.toDate === 'function') return ts.toDate().getTime();
            if (typeof ts?.seconds === 'number') return ts.seconds * 1000;
            return 0;
          };

          // Merge support groups + feedback items, sort oldest-first
          const displayItems = [];
          for (const email of emailOrder) {
            const grp = byEmail.get(email);
            const rep = grp[grp.length - 1];
            displayItems.push({ kind: 'support', email, tickets: grp, rep, sortMs: getMs(rep.timestamp) });
          }
          for (const fi of activeFeedback) {
            displayItems.push({ kind: 'feedback', item: fi, sortMs: fi.timestamp.getTime() });
          }
          displayItems.sort((a, b) => a.sortMs - b.sortMs);

          if (displayItems.length === 0) {
            return (
              <div style={{ padding: '30px', textAlign: 'center', color: t.textLight, fontSize: '14px' }}>
                🎉 All caught up!
              </div>
            );
          }

          const subRowStyle = (isLast) => ({
            padding: '10px 14px 10px 36px',
            borderBottom: isLast ? 'none' : `1px solid ${t.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            backgroundColor: t.background,
            transition: 'background 0.15s'
          });

          const acctBadge = (info) => {
            if (!info) return null;
            let status = (info.subscriptionStatus || info.status || '').toLowerCase();
            let type = (info.subscriptionType || info.plan || info.type || '').toLowerCase();
            const sub = info.subscription;
            if (sub && typeof sub === 'object') {
              if (!status) status = (sub.status || sub.subscriptionStatus || sub.subscription_status || '').toLowerCase();
              if (!type) type = (sub.plan || sub.type || sub.subscriptionType || sub.subscription_type || sub.planType || '').toLowerCase();
            }
            const isExpiredTrial = status === 'trial_expired' || status === 'trial-expired';
            const isTrialing = status === 'trialing';
            const hasExtendedTrial = isTrialing && ((Array.isArray(info.trialExtensionHistory) && info.trialExtensionHistory.length > 0) || !!info.extendedTrial);
            const isLifetime = type === 'lifetime' || (sub?.plan && String(sub.plan).toLowerCase().includes('lifetime'));
            const isAnnual = type === 'annual' || (sub?.plan && /annual|year|yearly/i.test(String(sub.plan)));
            const isMonthly = type === 'monthly' || (sub?.plan && /monthly|month/i.test(String(sub.plan)));
            const isCanceled = status === 'canceled' || status === 'cancelled';
            const isActive = status === 'active';
            let label = '—';
            if (isLifetime) label = 'Lifetime';
            else if (isAnnual) label = 'Annual';
            else if (isMonthly) label = 'Monthly';
            else if (hasExtendedTrial) label = 'Extended trial';
            else if (isTrialing) label = 'Trial';
            else if (isExpiredTrial) label = 'Expired trial';
            else if (isCanceled) label = 'Canceled';
            else if (isActive) label = 'Active';
            else if (type) label = type.charAt(0).toUpperCase() + type.slice(1);
            else if (status && status !== 'none') label = status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
            const bg = isLifetime ? '#8B5CF620' : isAnnual ? '#06B6D420' : isMonthly ? '#3B82F620' :
                       isActive ? '#10B98120' : isCanceled ? '#EF444420' : isTrialing || hasExtendedTrial ? '#F59E0B20' : isExpiredTrial ? '#DC262620' : '#6B728020';
            const fg = isLifetime ? '#8B5CF6' : isAnnual ? '#06B6D4' : isMonthly ? '#3B82F6' :
                       isActive ? '#10B981' : isCanceled ? '#EF4444' : isTrialing || hasExtendedTrial ? '#F59E0B' : isExpiredTrial ? '#DC2626' : '#6B7280';
            const icon = isLifetime ? '👑' : isAnnual ? '📅' : isMonthly ? '📆' : isTrialing || hasExtendedTrial ? '🔄' : isExpiredTrial ? '⏱' : '👤';
            return { bg, fg, icon, label };
          };

          const statusColors = { working: { bg: '#DBEAFE', fg: '#1D4ED8' }, resolved: { bg: '#D1FAE5', fg: '#065F46' }, 'need-info': { bg: '#FEF3C7', fg: '#92400E' }, 'known-issue': { bg: '#FEE2E2', fg: '#B91C1C' } };

          return displayItems.map((di, diIdx) => {
            const isLastItem = diIdx === displayItems.length - 1;

            // ── Feedback / Bug row ──────────────────────────────────────────
            if (di.kind === 'feedback') {
              const fi = di.item;
              const isBug = fi._feedbackType === 'bug';
              const isReplying = replyingToFeedbackId === fi.id;
              return (
                <div key={fi.logId} style={{ borderBottom: isLastItem ? 'none' : `1px solid ${t.border}` }}>
                  <div style={{
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    borderLeft: isBug ? '3px solid #FB923C' : `3px solid ${t.primary}`,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Row 1: type chip + date chip + new badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '8px', fontWeight: '700', backgroundColor: isBug ? '#FFF7ED' : `${t.primary}15`, color: isBug ? '#EA580C' : t.primary }}>
                          {isBug ? '🐛 Bug' : '💡 Feedback'}
                        </span>
                        {renderDateChip(fi.timestamp)}
                        {fi._feedbackStatus === 'new' && (
                          <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '8px', fontWeight: '700', backgroundColor: '#EFF6FF', color: '#1D4ED8' }}>● New</span>
                        )}
                      </div>
                      {/* Row 2: email + preview */}
                      <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '2px' }}>{fi.userEmail}</div>
                      <div style={{ fontSize: '11px', color: t.textLight, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fi.subject}</div>
                      {/* Inline reply box */}
                      {isReplying && (
                        <div style={{ marginTop: '8px' }} onClick={e => e.stopPropagation()}>
                          <textarea
                            value={feedbackReplyText}
                            onChange={e => setFeedbackReplyText(e.target.value)}
                            placeholder="Reply will appear as 'From the Team' on the user's dashboard..."
                            rows={3}
                            style={{ width: '100%', borderRadius: '8px', border: `1px solid ${t.border}`, padding: '6px 8px', fontSize: '12px', color: t.text, backgroundColor: t.cardBackground, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                          />
                          <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                            <button
                              onClick={() => handleFeedbackReplyInQueue(fi)}
                              disabled={sendingFeedbackReply || !feedbackReplyText.trim()}
                              style={{ padding: '3px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '600', backgroundColor: t.primary, color: '#fff', border: 'none', cursor: 'pointer', opacity: (sendingFeedbackReply || !feedbackReplyText.trim()) ? 0.5 : 1 }}
                            >
                              {sendingFeedbackReply ? '...' : '✈️ Send'}
                            </button>
                            <button
                              onClick={() => { setReplyingToFeedbackId(null); setFeedbackReplyText(''); }}
                              disabled={sendingFeedbackReply}
                              style={{ padding: '3px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '600', backgroundColor: 'transparent', color: t.textLight, border: `1px solid ${t.border}`, cursor: 'pointer' }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => { setReplyingToFeedbackId(isReplying ? null : fi.id); setFeedbackReplyText(''); }}
                        style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '8px', fontWeight: '600', border: `1px solid ${t.primary}50`, backgroundColor: `${t.primary}15`, color: t.primary, cursor: 'pointer' }}
                      >
                        💬 Reply
                      </button>
                      {fi._feedbackStatus === 'new' && onFeedbackMarkReviewed && (
                        <button
                          onClick={() => onFeedbackMarkReviewed(fi._rawFeedback)}
                          style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '8px', fontWeight: '600', border: `1px solid ${t.border}`, backgroundColor: t.cardBackground, color: t.textLight, cursor: 'pointer' }}
                        >
                          👁 Reviewed
                        </button>
                      )}
                      {fi._feedbackStatus !== 'resolved' && onFeedbackMarkResolved && (
                        <button
                          onClick={() => onFeedbackMarkResolved(fi._rawFeedback)}
                          style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '8px', fontWeight: '600', border: '1px solid #6EE7B7', backgroundColor: '#D1FAE5', color: '#065F46', cursor: 'pointer' }}
                        >
                          ✅ Resolve
                        </button>
                      )}
                      {onFeedbackDelete && (
                        <button
                          onClick={() => onFeedbackDelete(fi._rawFeedback)}
                          style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '8px', fontWeight: '600', border: `1px solid ${t.border}`, backgroundColor: t.cardBackground, color: t.textLight, cursor: 'pointer' }}
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            // ── Support ticket group ────────────────────────────────────────
            const { email, tickets, rep } = di;
            const isGroup = tickets.length > 1;
            const isExpanded = !!expandedUserGroups[email];
            const badge = acctBadge(rep.userAccountInfo);

            if (!isGroup) {
              const ticket = tickets[0];
              const commitCount = (ticket.linkedCommits || []).length;
              const sc = ticket.adminStatus ? statusColors[ticket.adminStatus] : null;
              return (
                <div
                  key={ticket.logId}
                  onClick={() => openTicket(ticket)}
                  style={{
                    padding: '10px 14px',
                    borderBottom: isLastItem ? 'none' : `1px solid ${t.border}`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'background 0.15s',
                    borderLeft: sc ? `3px solid ${sc.fg}` : ticket.type === 'account_deletion_request' ? '3px solid #DC2626' : '3px solid transparent'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = t.background}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {ticket.type === 'account_deletion_request' && (
                    <Trash2 size={15} style={{ color: '#DC2626', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Row 1: ticket number + type chips */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: '700', color: t.text, fontSize: '13px' }}>
                        #{ticket.ticketNumber}{ticket.requestNumbers?.length > 1 ? ` (${ticket.requestNumbers.join(', ')})` : ''}
                      </span>
                      <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '8px', fontWeight: '700', backgroundColor: '#F1F5F9', color: '#475569' }}>🎫 Support</span>
                      {ticket.type === 'account_deletion_request' && (
                        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '8px', backgroundColor: '#FEE2E2', color: '#DC2626', fontWeight: '600' }}>🗑️ DELETION</span>
                      )}
                      {ticket.addedManually && (
                        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '8px', backgroundColor: '#FEF3C7', color: '#92400E', fontWeight: '600' }}>📌 Manual</span>
                      )}
                    </div>
                    {/* Row 2: email + date chip + account badge + commits */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', color: t.textLight }}>
                        {ticket.userEmail || ticket.userName || 'Unknown'}
                      </span>
                      {renderDateChip(ticket.timestamp)}
                      {badge && (
                        <button type="button" onClick={e => { e.stopPropagation(); setViewingUserAccount(rep.userAccountInfo); }}
                          style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600', backgroundColor: badge.bg, color: badge.fg }}>
                          {badge.icon} {badge.label}
                        </button>
                      )}
                      {commitCount > 0 ? (
                        <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '8px', backgroundColor: '#EDE9FE', color: '#6D28D9', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <GitCommit size={9} /> {commitCount} commit{commitCount > 1 ? 's' : ''} linked
                        </span>
                      ) : (
                        <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '8px', backgroundColor: '#F3F4F6', color: '#9CA3AF', fontWeight: '500' }}>
                          no commits
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Status buttons + close */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    {QUICK_RESPONSES.map(res => {
                      const isActive = ticket.adminStatus === res.id;
                      const colors = statusColors[res.id] || { bg: t.background, fg: t.text };
                      return (
                        <button
                          key={res.id}
                          type="button"
                          onClick={() => saveAdminStatusForTicket(ticket, isActive ? null : res.id)}
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '8px',
                            fontWeight: '600',
                            border: isActive ? `2px solid ${colors.fg}` : `1px solid ${t.border}`,
                            backgroundColor: isActive ? colors.bg : t.cardBackground,
                            color: isActive ? colors.fg : t.textLight,
                            cursor: 'pointer'
                          }}
                        >
                          {res.label}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      title="Close ticket"
                      onClick={e => closeTicketInline(ticket, e)}
                      style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '8px', fontWeight: '700', border: `1px solid ${t.border}`, backgroundColor: t.cardBackground, color: t.textLight, cursor: 'pointer', lineHeight: 1.4 }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            }

            // Multi-ticket group — collapsible
            return (
              <div key={email} style={{ borderBottom: isLastItem ? 'none' : `1px solid ${t.border}` }}>
                <div
                  onClick={() => setExpandedUserGroups(prev => ({ ...prev, [email]: !prev[email] }))}
                  style={{
                    padding: '12px 14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'background 0.15s',
                    backgroundColor: isExpanded ? t.background : 'transparent'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = t.background}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = isExpanded ? t.background : 'transparent'}
                >
                  <MessageSquare size={16} style={{ color: t.primary, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: '600', color: t.text, fontSize: '13px' }}>{email}</span>
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', fontWeight: '700', backgroundColor: '#E2E8F0', color: '#475569' }}>
                        {tickets.length} reports
                      </span>
                      {badge && (
                        <button type="button" onClick={e => { e.stopPropagation(); setViewingUserAccount(rep.userAccountInfo); }}
                          style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600', backgroundColor: badge.bg, color: badge.fg }}>
                          {badge.icon} {badge.label}
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', color: t.textLight }}>
                        Tickets: {tickets.map(t2 => `#${t2.ticketNumber}`).join(', ')}
                      </span>
                      {renderDateChip(tickets[0].timestamp)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <span style={{ fontSize: '11px', color: t.textLight }}>{isExpanded ? '▲ collapse' : '▼ expand'}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{
                    backgroundColor: t.background,
                    borderTop: `1px solid ${t.border}`,
                    padding: '12px 16px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px'
                  }}>
                    {tickets.map((ticket) => {
                      const subSc = ticket.adminStatus ? statusColors[ticket.adminStatus] : null;
                      const subCommitCount = (ticket.linkedCommits || []).length;
                      return (
                        <div key={ticket.logId}>
                          {/* Meta: ticket # + date + tags */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: t.textLight }}>#{ticket.ticketNumber}</span>
                            {renderDateChip(ticket.timestamp)}
                            {subSc && (
                              <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '10px', fontWeight: '600', backgroundColor: subSc.bg, color: subSc.fg }}>
                                {QUICK_RESPONSES.find(r => r.id === ticket.adminStatus)?.label}
                              </span>
                            )}
                            {ticket.addedManually && (
                              <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '6px', backgroundColor: '#FEF3C7', color: '#92400E', fontWeight: '600' }}>📌 Manual</span>
                            )}
                            {subCommitCount > 0 && (
                              <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '8px', backgroundColor: '#EDE9FE', color: '#6D28D9', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <GitCommit size={9} /> {subCommitCount} linked
                              </span>
                            )}
                          </div>

                          {/* Chat bubble */}
                          <div
                            onClick={() => openTicket(ticket)}
                            style={{
                              backgroundColor: t.cardBackground,
                              border: `1px solid ${subSc ? subSc.fg + '50' : t.border}`,
                              borderRadius: '4px 12px 12px 12px',
                              padding: '9px 13px',
                              cursor: 'pointer',
                              transition: 'box-shadow 0.15s, border-color 0.15s',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.10)'; e.currentTarget.style.borderColor = t.primary + '60'; }}
                            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = subSc ? subSc.fg + '50' : t.border; }}
                          >
                            <p style={{ fontSize: '13px', color: t.text, margin: 0, lineHeight: 1.55, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                              {ticket.subject || ticket.originalMessage || '(no message)'}
                            </p>
                          </div>

                          {/* Action row below bubble */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                            {QUICK_RESPONSES.map(res => {
                              const isActive = ticket.adminStatus === res.id;
                              const colors = statusColors[res.id] || { bg: t.background, fg: t.text };
                              return (
                                <button
                                  key={res.id}
                                  type="button"
                                  onClick={() => saveAdminStatusForTicket(ticket, isActive ? null : res.id)}
                                  style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '8px', fontWeight: '600', border: isActive ? `2px solid ${colors.fg}` : `1px solid ${t.border}`, backgroundColor: isActive ? colors.bg : t.cardBackground, color: isActive ? colors.fg : t.textLight, cursor: 'pointer' }}
                                >
                                  {res.label}
                                </button>
                              );
                            })}
                            <button
                              type="button"
                              title="Close ticket"
                              onClick={e => closeTicketInline(ticket, e)}
                              style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '8px', fontWeight: '700', border: `1px solid ${t.border}`, backgroundColor: t.cardBackground, color: t.textLight, cursor: 'pointer', lineHeight: 1.4 }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          });
        })()}
      </div>
      )}

      {/* Closed — shown when toggle is Closed */}
      {showHistory && (
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
            <CheckCircle2 size={16} /> Closed
          </div>

          {completedTickets.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: t.textLight, fontSize: '14px' }}>
              No archived tickets yet.
            </div>
          ) : completedTickets.slice(0, 50).map((ticket, idx) => (
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
                {(() => {
                  const status = adminStatus ?? selectedTicket.adminStatus;
                  if (!status) return null;
                  const statusLabel = QUICK_RESPONSES.find(r => r.id === status)?.label || status;
                  const statusPills = { working: { bg: '#DBEAFE', fg: '#1D4ED8' }, resolved: { bg: '#D1FAE5', fg: '#065F46' }, 'need-info': { bg: '#FEF3C7', fg: '#92400E' }, 'known-issue': { bg: '#FEE2E2', fg: '#B91C1C' } };
                  const sp = statusPills[status] || { bg: t.background, fg: t.text };
                  return (
                    <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '10px', backgroundColor: sp.bg, color: sp.fg, fontWeight: '600' }}>
                      {statusLabel}
                    </span>
                  );
                })()}
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
              </div>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: t.textLight }}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflow: 'auto', padding: '10px 12px' }}>
              {/* Subject */}
              {(selectedTicket.subject && selectedTicket.subject !== 'Support Request') && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '600', color: t.textLight, marginBottom: '4px', textTransform: 'uppercase' }}>
                    Subject
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: t.text }}>
                    {selectedTicket.subject}
                  </div>
                </div>
              )}
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

              {/* Status Bar — sets label + pre-fills reply */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                {QUICK_RESPONSES.map(response => {
                  const isActive = (adminStatus ?? selectedTicket.adminStatus) === response.id;
                  const statusColors = {
                    working: { bg: '#DBEAFE', border: '#3B82F6', fg: '#1D4ED8' },
                    resolved: { bg: '#D1FAE5', border: '#10B981', fg: '#065F46' },
                    'need-info': { bg: '#FEF3C7', border: '#F59E0B', fg: '#92400E' },
                    'known-issue': { bg: '#FEE2E2', border: '#EF4444', fg: '#B91C1C' }
                  };
                  const sc = statusColors[response.id] || { bg: t.background, border: t.border, fg: t.text };
                  return (
                    <button
                      key={response.id}
                      type="button"
                      onClick={() => {
                        const next = isActive ? null : response.id;
                        saveAdminStatus(next);
                        setCustomMessage(next ? response.message : customMessage);
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: isActive ? sc.bg : t.background,
                        border: `2px solid ${isActive ? sc.border : t.border}`,
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: isActive ? sc.fg : t.text,
                        cursor: 'pointer'
                      }}
                    >
                      {response.label}
                    </button>
                  );
                })}
              </div>

              {/* Admin Workspace: Notes (always visible) + Linked Commits — overflow:visible so commits dropdown can show on top */}
              <div style={{
                marginBottom: '10px',
                border: `1px solid ${t.border}`,
                borderRadius: '8px',
                overflow: 'visible',
                backgroundColor: t.background
              }}>
                <div style={{
                  padding: '8px 10px',
                  borderBottom: `1px solid ${t.border}`,
                  fontWeight: '600',
                  fontSize: '12px',
                  color: t.text,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span>📝 Admin Notes</span>
                </div>
                <div style={{ padding: '8px' }}>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Your notes about this fix... e.g. commit details (auto-saves)"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: `1px solid ${t.border}`,
                      borderRadius: '4px',
                      fontSize: '12px',
                      resize: 'vertical',
                      minHeight: '56px',
                      fontFamily: 'inherit',
                      color: t.text,
                      backgroundColor: t.cardBackground
                    }}
                  />
                  <div style={{ fontSize: '10px', color: saving ? t.primary : btnSuccess, marginTop: '2px' }}>
                    {saving ? 'Saving...' : (adminNotes ? '✓ Saved' : '')}
                  </div>

                  {/* Linked Commits */}
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '600', color: t.textLight, marginBottom: '6px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Link2 size={10} /> Linked Commits
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <button
                          type="button"
                          onClick={async () => {
                            const { owner, repo, token } = GH_CONFIG;
                            if (!owner || !repo || !token) {
                              window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'GitHub env vars not configured in .env.local', type: 'error' } }));
                              return;
                            }
                            setCommitsFetching(true);
                            setCommitsList([]);
                            try {
                              const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=15`, {
                                headers: { Authorization: `Bearer ${token}` }
                              });
                              if (!res.ok) throw new Error(res.statusText);
                              const data = await res.json();
                              setCommitsList(Array.isArray(data) ? data : []);
                              setShowCommitsDropdown(true);
                            } catch (err) {
                              console.error(err);
                              window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Failed to fetch commits. Check GitHub settings.', type: 'error' } }));
                            } finally {
                              setCommitsFetching(false);
                            }
                          }}
                          disabled={commitsFetching}
                          style={{
                            padding: '5px 10px',
                            backgroundColor: t.cardBackground,
                            border: `1px solid ${t.border}`,
                            borderRadius: '4px',
                            fontSize: '11px',
                            color: t.text,
                            cursor: commitsFetching ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <GitCommit size={12} />
                          {commitsFetching ? 'Fetching…' : 'Fetch Recent Commits'}
                          <ChevronDown size={10} />
                        </button>
                        {showCommitsDropdown && commitsList.length > 0 && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            marginTop: '4px',
                            minWidth: '280px',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            backgroundColor: t.cardBackground,
                            border: `1px solid ${t.border}`,
                            borderRadius: '6px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            zIndex: 10002
                          }}>
                            {commitsList.map((c) => (
                              <button
                                key={c.sha}
                                type="button"
                                onClick={() => {
                                  const entry = {
                                    sha: c.sha?.slice(0, 7) || c.sha,
                                    message: (c.commit?.message || '').split('\n')[0].slice(0, 80),
                                    url: c.html_url || null,
                                    linkedAt: new Date().toISOString()
                                  };
                                  const next = [...(linkedCommits.length ? linkedCommits : selectedTicket.linkedCommits || []), entry];
                                  saveLinkedCommits(next);
                                  setShowCommitsDropdown(false);
                                  setCommitsList([]);
                                }}
                                style={{
                                  display: 'block',
                                  width: '100%',
                                  padding: '8px 10px',
                                  textAlign: 'left',
                                  border: 'none',
                                  borderBottom: `1px solid ${t.border}`,
                                  backgroundColor: 'transparent',
                                  fontSize: '11px',
                                  color: t.text,
                                  cursor: 'pointer'
                                }}
                              >
                                <code style={{ marginRight: '6px' }}>{c.sha?.slice(0, 7)}</code>
                                {(c.commit?.message || '').split('\n')[0].slice(0, 50)}…
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flex: 1, minWidth: '120px' }}>
                        <input
                          type="text"
                          value={manualCommitText}
                          onChange={(e) => setManualCommitText(e.target.value)}
                          placeholder="Paste hash or note"
                          style={{
                            flex: 1,
                            padding: '5px 8px',
                            border: `1px solid ${t.border}`,
                            borderRadius: '4px',
                            fontSize: '11px',
                            color: t.text,
                            backgroundColor: t.cardBackground
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!manualCommitText.trim()) return;
                            const entry = {
                              sha: 'manual',
                              message: manualCommitText.trim(),
                              url: null,
                              linkedAt: new Date().toISOString()
                            };
                            const current = linkedCommits.length ? linkedCommits : (selectedTicket.linkedCommits || []);
                            saveLinkedCommits([...current, entry]);
                            setManualCommitText('');
                          }}
                          style={{
                            padding: '5px 10px',
                            backgroundColor: btnPrimary,
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Plus size={12} /> Link
                        </button>
                      </div>
                    </div>
                    {(linkedCommits.length ? linkedCommits : selectedTicket.linkedCommits || []).map((lc, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 8px',
                          marginRight: '6px',
                          marginBottom: '6px',
                          backgroundColor: t.cardBackground,
                          border: `1px solid ${t.border}`,
                          borderRadius: '6px',
                          fontSize: '11px'
                        }}
                      >
                        {lc.sha === 'manual' ? (
                          <span style={{ color: t.text }}>📝 {lc.message}</span>
                        ) : (
                          <>
                            {lc.url ? (
                              <a href={lc.url} target="_blank" rel="noopener noreferrer" style={{ color: t.primary, fontWeight: '600' }}>
                                <code>{lc.sha}</code>
                              </a>
                            ) : (
                              <code>{lc.sha}</code>
                            )}
                            <span style={{ color: t.textLight }}>•</span>
                            <span style={{ color: t.text }}>{lc.message}</span>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            const current = linkedCommits.length ? linkedCommits : (selectedTicket.linkedCommits || []);
                            const next = current.filter((_, i) => i !== idx);
                            saveLinkedCommits(next);
                          }}
                          style={{
                            padding: '2px',
                            background: 'none',
                            border: 'none',
                            color: t.textLight,
                            cursor: 'pointer',
                            display: 'flex'
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
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
              justifyContent: 'flex-end',
              gap: '8px'
            }}>
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
