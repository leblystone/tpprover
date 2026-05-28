import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getFirestore, getDoc, where, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../config/firebase';
import { getUserByEmail, closeSupportTicketFromWorkQueue } from '../../services/firebase';
import AdminLoader from './AdminLoader';
import CustomDropdown from '../common/inputs/CustomDropdown';
import UserReportsInbox from './UserReportsInbox';
import WorkQueueToolsPanels from './WorkQueueToolsPanels';
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

const plainStatusLabel = (id) => {
  const res = QUICK_RESPONSES.find(r => r.id === id);
  if (!res) return '';
  return res.label.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
};

const ADMIN_STATUS_OPTIONS = [
  { value: '', label: 'Set status' },
  ...QUICK_RESPONSES.map(r => ({ value: r.id, label: plainStatusLabel(r.id) })),
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
  const [allMessages, setAllMessages] = useState([]);
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
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedQueueItem, setSelectedQueueItem] = useState(null);
  const [selectedUserEmail, setSelectedUserEmail] = useState(null);
  const [showTools, setShowTools] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [closeArmed, setCloseArmed] = useState(false);
  const [closingTicket, setClosingTicket] = useState(false);
  const [deletingReport, setDeletingReport] = useState(false);
  const [markingReviewed, setMarkingReviewed] = useState(false);

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
      setLoadError(err?.message || 'Failed to load user reports');
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

  // Live messages — all tickets for the selected user, merged chronologically
  useEffect(() => {
    setAllMessages([]);
    const userEmail = selectedUserEmail;
    if (!userEmail) return;

    // All support tickets in the queue (pending + completed) for this user
    const userTickets = workQueueRef.current.filter(
      t => t.userEmail?.trim().toLowerCase() === userEmail && t.ticketId
    );
    if (userTickets.length === 0) return;

    const messagesByTicket = new Map();
    const tsToMs = (ts) => {
      if (!ts) return 0;
      if (ts.toMillis) return ts.toMillis();
      if (ts.seconds) return ts.seconds * 1000;
      if (ts instanceof Date) return ts.getTime();
      return 0;
    };
    const rebuild = () => {
      const flat = [];
      for (const msgs of messagesByTicket.values()) flat.push(...msgs);
      flat.sort((a, b) => tsToMs(a.createdAt) - tsToMs(b.createdAt));
      setAllMessages(flat);
    };

    const unsubscribers = userTickets.map((ticket) => {
      const messagesRef = collection(db, 'supportTickets', ticket.ticketId, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'asc'));
      return onSnapshot(
        q,
        (snapshot) => {
          messagesByTicket.set(ticket.ticketId, snapshot.docs.map(d => ({
            id: d.id,
            ...d.data(),
            _ticketId: ticket.ticketId,
            _ticketNumber: ticket.ticketNumber || ticket.ticketId.slice(-6).toUpperCase(),
            _ticketType: ticket.type || 'support',
            _ticketStatus: ticket.adminStatus || 'open',
          })));
          rebuild();
        },
        (err) => console.error('Error loading ticket messages:', err)
      );
    });

    return () => unsubscribers.forEach(fn => fn());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserEmail]);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages]);

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
        detail: { message: `Ticket #${ticket.ticketNumber || ticket.id.slice(-6)} added to user reports ✓`, type: 'success' }
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
    setDeleteArmed(false);
    setCloseArmed(false);
  };

  const selectUser = useCallback((email) => {
    const normalized = email?.trim().toLowerCase() || null;
    setSelectedUserEmail(normalized);
    setSelectedQueueItem(null);
    setSelectedTicket(null);
    setAdminNotes('');
    setAdminStatusLocal(null);
    setLinkedCommitsLocal([]);
    setCustomMessage('');
    setDeleteArmed(false);
    setCloseArmed(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeModal = () => {
    setSelectedQueueItem(null);
    setSelectedTicket(null);
    setAdminNotes('');
    setAdminStatusLocal(null);
    setLinkedCommitsLocal([]);
    setCustomMessage('');
    setShowCommitsDropdown(false);
    setCommitsList([]);
    setManualCommitText('');
    setDeleteArmed(false);
    setCloseArmed(false);
  };

  const getMs = (ts) => {
    if (!ts) return 0;
    if (ts instanceof Date) return ts.getTime();
    if (typeof ts?.toDate === 'function') return ts.toDate().getTime();
    if (typeof ts?.seconds === 'number') return ts.seconds * 1000;
    return 0;
  };

  const getTypeCategory = (typeLabel) => {
    if (typeLabel === 'Bug') return 'bug';
    if (typeLabel === 'Suggestion') return 'suggestion';
    if (typeLabel === 'Deletion') return 'deletion';
    return 'support';
  };

  const buildUnifiedItems = useCallback(() => {
    const items = [];
    const tickets = showHistory ? completedTickets : pendingTickets;

    for (const ticket of tickets) {
      const email = (ticket.userEmail || ticket.logId || 'unknown').trim().toLowerCase();
      const typeLabel =
        ticket.type === 'account_deletion_request' ? 'Deletion'
        : ticket.type === 'bug' ? 'Bug'
        : ticket.type === 'suggestion' ? 'Suggestion'
        : 'Support';
      items.push({
        kind: 'support',
        email: ticket.userEmail || email,
        ticketNumber: ticket.ticketNumber,
        dateMs: getMs(ticket.timestamp) || getMs(ticket.markedFixedAt),
        message: ticket.subject || ticket.originalMessage || '(no message)',
        typeLabel,
        typeCategory: getTypeCategory(typeLabel),
        adminStatus: ticket.adminStatus || null,
        feedbackStatus: null,
        raw: ticket,
        userAccountInfo: ticket.userAccountInfo,
      });
    }

    if (!showHistory) {
      for (const f of (feedbackItems || []).filter((x) => x._status !== 'resolved')) {
        const d = f._date instanceof Date ? f._date : new Date(f._date || 0);
        const email = (f._email || 'unknown').trim().toLowerCase();
        const typeLabel = f._type === 'bug' ? 'Bug' : 'Suggestion';
        items.push({
          kind: 'feedback',
          email: f._email || email,
          ticketNumber: null,
          dateMs: d.getTime(),
          message: f._preview || f.message || f.feedback || '(no message)',
          typeLabel,
          typeCategory: getTypeCategory(typeLabel),
          adminStatus: null,
          feedbackStatus: f._status || 'new',
          raw: {
            _isFeedback: true,
            _feedbackType: f._type,
            _feedbackStatus: f._status,
            _rawFeedback: f,
            id: f.id,
            logId: `feedback-${f.id}`,
            userEmail: f._email,
            timestamp: d,
            subject: f._preview,
          },
          userAccountInfo: null,
        });
      }
    }

    return items.sort((a, b) => b.dateMs - a.dateMs);
  }, [showHistory, pendingTickets, completedTickets, feedbackItems]);

  const allUnifiedItems = useMemo(() => buildUnifiedItems(), [buildUnifiedItems]);

  const typeCounts = useMemo(() => {
    const counts = { all: allUnifiedItems.length, bug: 0, suggestion: 0, support: 0, deletion: 0 };
    for (const item of allUnifiedItems) {
      if (counts[item.typeCategory] !== undefined) counts[item.typeCategory]++;
    }
    return counts;
  }, [allUnifiedItems]);

  const filteredItems = useMemo(() => {
    if (typeFilter === 'all') return allUnifiedItems;
    return allUnifiedItems.filter((item) => item.typeCategory === typeFilter);
  }, [allUnifiedItems, typeFilter]);

  const openCount =
    pendingTickets.length + (feedbackItems || []).filter((f) => f._status !== 'resolved').length;
  const closedCount = completedTickets.length;

  const getTierBadge = (info) => {
    if (!info) return null;
    let status = (info.subscriptionStatus || info.status || '').toLowerCase();
    let type = (info.subscriptionType || info.plan || info.type || '').toLowerCase();
    const sub = info.subscription;
    if (sub && typeof sub === 'object') {
      if (!status) status = (sub.status || sub.subscriptionStatus || sub.subscription_status || '').toLowerCase();
      if (!type) type = (sub.plan || sub.type || sub.subscriptionType || sub.subscription_type || sub.planType || '').toLowerCase();
    }
    const isLifetime = type === 'lifetime' || (sub?.plan && String(sub.plan).toLowerCase().includes('lifetime'));
    const isMonthly = type === 'monthly' || (sub?.plan && /monthly|month/i.test(String(sub.plan)));
    let label = '—';
    if (isLifetime) label = 'Lifetime';
    else if (isMonthly) label = 'Monthly';
    else if (type === 'annual') label = 'Annual';
    else if (status === 'trialing') label = 'Trial';
    else if (status === 'active') label = 'Active';
    else if (status) label = status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
    const bg = isLifetime ? '#8B5CF620' : isMonthly ? '#3B82F620' : '#6B728020';
    const fg = isLifetime ? '#8B5CF6' : isMonthly ? '#3B82F6' : '#6B7280';
    return { bg, fg, label };
  };

  const selectQueueItem = (item) => {
    setSelectedQueueItem(item);
    setSelectedUserEmail(item.email?.trim().toLowerCase() || null);
    setDeleteArmed(false);
    setCloseArmed(false);
    if (item.kind === 'support') {
      openTicket(item.raw);
    } else {
      setSelectedTicket(item.raw);
      setAdminNotes('');
      setAdminStatusLocal(null);
      setLinkedCommitsLocal([]);
      setCustomMessage('');
    }
  };

  useEffect(() => {
    if (!selectedQueueItem) return;
    const still = allUnifiedItems.some((i) => {
      if (i.kind !== selectedQueueItem.kind) return false;
      if (i.kind === 'feedback') return i.raw?.id === selectedQueueItem.raw?.id;
      return i.raw?.logId === selectedQueueItem.raw?.logId;
    });
    if (!still) closeModal();
  }, [allUnifiedItems, selectedQueueItem]);

  const handleSendReplyUnified = async () => {
    if (!selectedQueueItem || !customMessage.trim()) return;
    if (selectedQueueItem.kind === 'feedback') {
      setSending(true);
      try {
        await onFeedbackReply?.(selectedQueueItem.raw._rawFeedback, customMessage.trim());
        setCustomMessage('');
        window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Message sent!', type: 'success' } }));
      } catch (err) {
        window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: err?.message || 'Failed to send', type: 'error' } }));
      } finally {
        setSending(false);
      }
    } else {
      await sendMessage();
    }
  };

  const handleCloseFromPanel = async () => {
    if (!selectedQueueItem) return;
    setClosingTicket(true);
    try {
      if (selectedQueueItem.kind === 'feedback') {
        const fb = feedbackDocFromQueueItem(selectedQueueItem);
        if (onFeedbackMarkResolved && fb?.id) await onFeedbackMarkResolved(fb);
      } else {
        await closeTicket();
        return;
      }
      closeModal();
      setCloseArmed(false);
    } catch (err) {
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: err?.message || 'Failed', type: 'error' } }));
    } finally {
      setClosingTicket(false);
    }
  };

  const handleDeleteFromPanel = async () => {
    if (!selectedQueueItem) return;
    setDeletingReport(true);
    try {
      if (selectedQueueItem.kind === 'feedback') {
        const fb = feedbackDocFromQueueItem(selectedQueueItem);
        if (onFeedbackDelete && fb?.id) await onFeedbackDelete(fb);
      } else if (selectedQueueItem.typeLabel === 'Deletion') {
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { message: 'Process account deletions from Settings → Deletions', type: 'info' },
        }));
      } else {
        await closeTicketInline(selectedQueueItem.raw);
      }
      closeModal();
      setDeleteArmed(false);
    } catch (err) {
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: err?.message || 'Delete failed', type: 'error' } }));
    } finally {
      setDeletingReport(false);
    }
  };

  const handleMarkReviewedPanel = async () => {
    if (!selectedQueueItem || selectedQueueItem.kind !== 'feedback') return;
    setMarkingReviewed(true);
    try {
      const fb = feedbackDocFromQueueItem(selectedQueueItem);
      if (onFeedbackMarkReviewed && fb?.id) await onFeedbackMarkReviewed(fb);
    } catch (err) {
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: err?.message || 'Failed', type: 'error' } }));
    } finally {
      setMarkingReviewed(false);
    }
  };

  const handleQuickResponse = (response) => {
    const next = (adminStatus ?? selectedTicket?.adminStatus) === response.id ? null : response.id;
    if (selectedQueueItem?.kind === 'support') {
      saveAdminStatus(next);
    } else {
      setAdminStatusLocal(next);
    }
    if (next) setCustomMessage(response.message);
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
    if (!selectedTicket?.logId) return;
    
    setSending(true);
    try {
      // 1. Call cloud function if ticketId is available (updates supportTickets doc)
      if (selectedTicket.ticketId) {
        try {
          await closeSupportTicketFromWorkQueue(
            selectedTicket.ticketId,
            selectedTicket.logId,
            adminNotes
          );
        } catch (cfErr) {
          console.warn('[closeTicket] cloud function failed, falling back to direct Firestore update:', cfErr);
        }
      }

      // 2. Always mark the primary log entry as fixed in Firestore
      const logRef = doc(db, 'ai_worker_logs', selectedTicket.logId);
      await updateDoc(logRef, { markedFixed: true, markedFixedAt: serverTimestamp(), adminNotes });

      // 3. Mark all sibling log entries with the same ticketId as fixed
      //    (prevents them from reappearing when onSnapshot refires)
      if (selectedTicket.ticketId) {
        const siblingQ = query(collection(db, 'ai_worker_logs'), where('ticketId', '==', selectedTicket.ticketId));
        const siblingSnap = await getDocs(siblingQ);
        await Promise.all(
          siblingSnap.docs
            .filter(d => d.id !== selectedTicket.logId)
            .map(d => updateDoc(d.ref, { markedFixed: true, markedFixedAt: serverTimestamp() }))
        );
      }

      // 4. Update local state immediately so UI doesn't flicker
      applyClosedToLocalQueue(selectedTicket);

      const closed = { ticketId: selectedTicket.ticketId, ticketNumber: selectedTicket.ticketNumber };
      closeModal();
      setJustClosedTicket(closed);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: `#${selectedTicket.ticketNumber} closed`, type: 'success' }
      }));
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

  const feedbackDocFromQueueItem = (item) => {
    const raw = item?.raw;
    return raw?._rawFeedback || raw;
  };

  const applyClosedToLocalQueue = (ticket) => {
    setWorkQueue(prev => {
      const next = prev.map(t =>
        (t.logId === ticket.logId || (ticket.ticketId && t.ticketId === ticket.ticketId))
          ? { ...t, markedFixed: true, markedFixedAt: new Date() }
          : t
      );
      _wqCache = next;
      _saveCache(next, _costsCache);
      return next;
    });
  };

  const closeTicketInline = async (ticket, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!ticket?.logId) {
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Cannot close: missing queue log id', type: 'error' } }));
      return;
    }
    try {
      if (ticket.ticketId) {
        try {
          await closeSupportTicketFromWorkQueue(ticket.ticketId, ticket.logId, '');
        } catch (cfErr) {
          console.warn('[closeTicketInline] cloud close failed, updating logs in Firestore:', cfErr);
        }
      }

      const logRef = doc(db, 'ai_worker_logs', ticket.logId);
      await updateDoc(logRef, {
        markedFixed: true,
        markedFixedAt: serverTimestamp(),
      });

      if (ticket.ticketId) {
        const siblingQ = query(collection(db, 'ai_worker_logs'), where('ticketId', '==', ticket.ticketId));
        const siblingSnap = await getDocs(siblingQ);
        await Promise.all(
          siblingSnap.docs
            .filter(d => d.id !== ticket.logId)
            .map(d => updateDoc(d.ref, { markedFixed: true, markedFixedAt: serverTimestamp() }))
        );
      }

      applyClosedToLocalQueue(ticket);
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: `#${ticket.ticketNumber} closed`, type: 'success' } }));
    } catch (err) {
      console.error('[closeTicketInline] failed:', err);
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: err?.message || 'Failed to close', type: 'error' } }));
    }
  };

  const closeQueueItem = async (item, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    try {
      if (item.kind === 'support') {
        await closeTicketInline(item.raw, e);
      } else if (onFeedbackMarkResolved) {
        const fb = feedbackDocFromQueueItem(item);
        if (!fb?.id) {
          window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Cannot resolve: missing feedback id', type: 'error' } }));
          return;
        }
        await onFeedbackMarkResolved(fb);
      }
    } catch (err) {
      console.error('[closeQueueItem] failed:', err);
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: err?.message || 'Action failed', type: 'error' } }));
    }
  };

  const closeAllForUser = async (items, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    let closed = 0;
    let failed = 0;
    for (const item of items) {
      try {
        if (item.kind === 'support') {
          const ticket = item.raw;
          if (!ticket?.logId) { failed++; continue; }
          if (ticket.ticketId) {
            try {
              await closeSupportTicketFromWorkQueue(ticket.ticketId, ticket.logId, '');
            } catch (cfErr) {
              console.warn('[closeAllForUser] cloud close failed:', cfErr);
            }
          }
          await updateDoc(doc(db, 'ai_worker_logs', ticket.logId), {
            markedFixed: true,
            markedFixedAt: serverTimestamp(),
          });
          if (ticket.ticketId) {
            const siblingQ = query(collection(db, 'ai_worker_logs'), where('ticketId', '==', ticket.ticketId));
            const siblingSnap = await getDocs(siblingQ);
            await Promise.all(
              siblingSnap.docs
                .filter(d => d.id !== ticket.logId)
                .map(d => updateDoc(d.ref, { markedFixed: true, markedFixedAt: serverTimestamp() }))
            );
          }
          applyClosedToLocalQueue(ticket);
          closed++;
        } else if (onFeedbackMarkResolved) {
          const fb = feedbackDocFromQueueItem(item);
          if (!fb?.id) { failed++; continue; }
          await onFeedbackMarkResolved(fb);
          closed++;
        }
      } catch (err) {
        failed++;
        console.error('closeAllForUser item failed:', err);
      }
    }
    const msg = failed > 0
      ? `Closed ${closed} item(s); ${failed} failed`
      : `Closed ${closed} item(s) for this user`;
    window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: msg, type: failed > 0 ? 'warning' : 'success' } }));
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
    return <AdminLoader theme={t} message="Loading user reports…" />;
  }

  if (loadError) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
        <div style={{ fontWeight: '600', color: '#DC2626', marginBottom: '6px' }}>User reports failed to load</div>
        <div style={{ fontSize: '12px', color: t.textLight, marginBottom: '16px', fontFamily: 'monospace', backgroundColor: '#FEF2F2', padding: '8px 12px', borderRadius: '6px', display: 'inline-block' }}>
          {loadError}
        </div>
        <div style={{ fontSize: '12px', color: t.textLight }}>
          Check Firestore rules for <code>ai_worker_logs</code> collection, then refresh the page.
        </div>
      </div>
    );
  }

  const formatRelativeTimeMs = (dateMs) => {
    if (!dateMs) return '';
    return formatRelativeTime(new Date(dateMs));
  };

  const reopenedBanner = reopenedTickets.length > 0 ? (
    <div style={{ padding: '10px 14px', backgroundColor: '#FFF7ED', borderBottom: '1px solid #FED7AA', fontSize: '12px', color: '#92400E' }}>
      <strong>{reopenedTickets.length}</strong> reopened ticket(s) waiting for Ghosty — they will appear in Open shortly.
    </div>
  ) : null;

  const toolsContent = (
    <WorkQueueToolsPanels
      t={t}
      GH_CONFIG={GH_CONFIG}
      showBacklogScan={showBacklogScan}
      setShowBacklogScan={setShowBacklogScan}
      backlogScanning={backlogScanning}
      runBacklogScan={runBacklogScan}
      backlogResults={backlogResults}
      expandedBacklogItems={expandedBacklogItems}
      toggleBacklogItem={toggleBacklogItem}
      backlogMessages={backlogMessages}
      showAddMissed={showAddMissed}
      setShowAddMissed={setShowAddMissed}
      addMissedSearch={addMissedSearch}
      setAddMissedSearch={setAddMissedSearch}
      searchMissedTicket={searchMissedTicket}
      addMissedSearching={addMissedSearching}
      addMissedError={addMissedError}
      addMissedResult={addMissedResult}
      addMissedTicketToQueue={addMissedTicketToQueue}
      addMissedAdding={addMissedAdding}
      showCommitAudit={showCommitAudit}
      setShowCommitAudit={setShowCommitAudit}
      commitAuditDays={commitAuditDays}
      setCommitAuditDays={setCommitAuditDays}
      commitAuditRunning={commitAuditRunning}
      runCommitAudit={runCommitAudit}
      commitAuditResults={commitAuditResults}
      setCommitAuditResults={setCommitAuditResults}
      workQueue={workQueue}
      linkingNoMatchSha={linkingNoMatchSha}
      setLinkingNoMatchSha={setLinkingNoMatchSha}
      selectedLogIdForNoMatch={selectedLogIdForNoMatch}
      setSelectedLogIdForNoMatch={setSelectedLogIdForNoMatch}
      linkNoMatchCommitToTicket={linkNoMatchCommitToTicket}
      openTicket={openTicket}
    />
  );

  const isFeedbackSelected = selectedQueueItem?.kind === 'feedback';

  return (
    <div style={{ padding: '0', maxWidth: '100%', margin: '0 auto' }}>
      <UserReportsInbox
        theme={t}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        typeCounts={typeCounts}
        showHistory={showHistory}
        setShowHistory={setShowHistory}
        openCount={openCount}
        closedCount={closedCount}
        filteredItems={filteredItems}
        selectedUserEmail={selectedUserEmail}
        onSelectUser={selectUser}
        selectedQueueItem={selectedQueueItem}
        onSelectItem={selectQueueItem}
        selectedTicket={selectedTicket}
        ticketMessages={allMessages}
        formatRelativeTime={formatRelativeTimeMs}
        getTierBadge={getTierBadge}
        showTools={showTools}
        setShowTools={setShowTools}
        toolsContent={toolsContent}
        reopenedBanner={reopenedBanner}
        adminStatus={adminStatus ?? selectedTicket?.adminStatus}
        adminStatusOptions={ADMIN_STATUS_OPTIONS}
        onStatusChange={saveAdminStatus}
        quickResponses={QUICK_RESPONSES}
        onQuickResponse={handleQuickResponse}
        customMessage={customMessage}
        setCustomMessage={setCustomMessage}
        onSendReply={handleSendReplyUnified}
        sending={sending || sendingFeedbackReply}
        adminNotes={adminNotes}
        setAdminNotes={setAdminNotes}
        savingNotes={saving}
        onCloseTicket={handleCloseFromPanel}
        closingTicket={closingTicket || sending}
        closeArmed={closeArmed}
        setCloseArmed={setCloseArmed}
        deleteArmed={deleteArmed}
        setDeleteArmed={setDeleteArmed}
        onDelete={handleDeleteFromPanel}
        deleting={deletingReport}
        onMarkReviewed={isFeedbackSelected && onFeedbackMarkReviewed ? handleMarkReviewedPanel : null}
        markingReviewed={markingReviewed}
        isFeedback={isFeedbackSelected}
        conversationEndRef={conversationEndRef}
        plainStatusLabel={plainStatusLabel}
      />

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
            padding: '16px',
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
              border: `1px solid ${t.border}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: t.text }}>Ticket closed</h3>
              <p style={{ margin: '8px 0 0', fontSize: '14px', color: t.textLight }}>#{justClosedTicket.ticketNumber}</p>
            </div>
            <button
              type="button"
              onClick={() => setJustClosedTicket(null)}
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: t.primary,
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

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
            padding: '16px',
          }}
          onClick={() => setViewingUserAccount(null)}
        >
          <div
            style={{
              maxWidth: '28rem',
              width: '100%',
              borderRadius: '12px',
              border: `1px solid ${t.border}`,
              backgroundColor: t.cardBackground,
              padding: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontWeight: '600', color: t.text }}>User Account</h3>
              <button type="button" onClick={() => setViewingUserAccount(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color={t.textLight} />
              </button>
            </div>
            <p style={{ fontSize: '14px', color: t.text, margin: '0 0 8px' }}>{viewingUserAccount.email}</p>
            <p style={{ fontSize: '12px', color: t.textLight, margin: 0 }}>
              {viewingUserAccount.subscriptionStatus} · {viewingUserAccount.subscriptionType || '—'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
