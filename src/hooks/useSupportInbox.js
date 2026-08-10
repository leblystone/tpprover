import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  subscribeUserTickets,
  markTicketAsRead,
  getUserAdminMessages,
  markAdminMessageAsRead,
} from '../services/firebase';
import {
  pickVisibleTicket,
  pickOpenSupportTicket,
  ticketHasUnreadResponse,
  pickVisibleAdminMessage,
  adminMessageIsUnread,
  isTicketOpen,
  countUnreadTicketMessages,
  convertTimestamp,
} from '../utils/supportInbox';

/**
 * Live support inbox for the signed-in user:
 * - From the Team (adminMessages)
 * - Open / recent support tickets
 * - Unread counts + “Support has responded!” nudge for Support nav
 */
export function useSupportInbox() {
  const { user } = useAppContext();
  const email = user?.email || null;

  const [allTickets, setAllTickets] = useState([]);
  const [openTicket, setOpenTicket] = useState(null);
  const [hasUnreadResponse, setHasUnreadResponse] = useState(false);

  const [adminMessage, setAdminMessage] = useState(null);
  const [hasUnreadAdminMessage, setHasUnreadAdminMessage] = useState(false);
  const [devPreviewMessages, setDevPreviewMessages] = useState(null);

  const previewLockRef = useRef(false);
  const nudgedToastIdsRef = useRef(new Set());
  const viewingSupportRef = useRef(false);

  const applyTickets = useCallback((tickets) => {
    if (previewLockRef.current) return;
    const list = tickets || [];
    setAllTickets(list);
    const visible = pickVisibleTicket(list);
    setOpenTicket(visible || null);
    setHasUnreadResponse(visible ? ticketHasUnreadResponse(visible) : false);
  }, []);

  const loadAdminMessages = useCallback(async () => {
    if (!email || previewLockRef.current) return;
    try {
      const messages = await getUserAdminMessages(email);
      if (previewLockRef.current) return;
      const visible = pickVisibleAdminMessage(messages);
      setAdminMessage(visible || null);
      setHasUnreadAdminMessage(visible ? adminMessageIsUnread(visible) : false);
    } catch (err) {
      console.error('Failed to load admin messages:', err);
    }
  }, [email]);

  useEffect(() => {
    if (!email) {
      setAllTickets([]);
      setOpenTicket(null);
      setHasUnreadResponse(false);
      return undefined;
    }
    return subscribeUserTickets(email, applyTickets);
  }, [email, applyTickets]);

  useEffect(() => {
    if (!email) {
      setAdminMessage(null);
      setHasUnreadAdminMessage(false);
      return undefined;
    }
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await loadAdminMessages();
    };
    const timeoutId = setTimeout(run, 400);
    const intervalId = setInterval(run, 60000);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [email, loadAdminMessages]);

  const openSupportTicket = useMemo(
    () => pickOpenSupportTicket(allTickets) || (openTicket?.type === 'support' && isTicketOpen(openTicket) ? openTicket : null),
    [allTickets, openTicket]
  );

  const markTicketRead = useCallback(async () => {
    const ticket = openSupportTicket || openTicket;
    if (!ticket) return;
    try {
      if (ticket._devPreview || String(ticket.id || '').startsWith('dev-preview-')) {
        setHasUnreadResponse(false);
        window.dispatchEvent(new CustomEvent('tpp:support-inbox-changed'));
        return;
      }
      await markTicketAsRead(ticket.id);
      localStorage.setItem(`ticket_${ticket.id}_lastRead`, new Date().toISOString());
      setHasUnreadResponse(false);
      window.dispatchEvent(new CustomEvent('tpp:support-inbox-changed'));
    } catch (err) {
      console.error('Failed to mark ticket as read:', err);
    }
  }, [openSupportTicket, openTicket]);

  const markAdminMessageRead = useCallback(async () => {
    if (!adminMessage) return;
    try {
      if (adminMessage._devPreview || String(adminMessage.id || '').startsWith('dev-preview-')) {
        setHasUnreadAdminMessage(false);
        window.dispatchEvent(new CustomEvent('tpp:support-inbox-changed'));
        return;
      }
      await markAdminMessageAsRead(adminMessage.id);
      setHasUnreadAdminMessage(false);
      window.dispatchEvent(new CustomEvent('tpp:support-inbox-changed'));
    } catch (err) {
      console.error('Failed to mark admin message as read:', err);
    }
  }, [adminMessage]);

  const shouldDeepLinkToChat = useMemo(
    () => !!openSupportTicket && isTicketOpen(openSupportTicket),
    [openSupportTicket]
  );

  const supportTicketUnread = useMemo(() => {
    if (!openSupportTicket) return 0;
    return countUnreadTicketMessages(openSupportTicket);
  }, [openSupportTicket]);

  const unreadMessageCount = supportTicketUnread;

  const nudgeSupportResponded = supportTicketUnread > 0;

  const hasOpenRequest = useMemo(
    () => !!openSupportTicket && isTicketOpen(openSupportTicket),
    [openSupportTicket]
  );

  const unreadCount = useMemo(() => {
    let n = 0;
    if (hasUnreadAdminMessage) n += 1;
    n += unreadMessageCount;
    return n;
  }, [hasUnreadAdminMessage, unreadMessageCount]);

  // Track whether Support modal is open — don't toast over an already-visible thread
  useEffect(() => {
    const onViewing = (e) => {
      viewingSupportRef.current = !!e?.detail?.viewing;
    };
    window.addEventListener('tpp:support-viewing', onViewing);
    return () => window.removeEventListener('tpp:support-viewing', onViewing);
  }, []);

  // Toast on each new support reply (keyed by response time, not just ticket id)
  useEffect(() => {
    if (!nudgeSupportResponded || !openSupportTicket?.id) return;
    if (viewingSupportRef.current) return;

    const responseAt =
      convertTimestamp(openSupportTicket.lastAdminMessageAt) ||
      convertTimestamp(openSupportTicket.lastMessageAt);
    const responseKey = responseAt ? String(responseAt.getTime()) : 'unread';
    const toastKey = `${openSupportTicket.id}:${responseKey}`;

    if (nudgedToastIdsRef.current.has(toastKey)) return;
    try {
      const storageKey = `tpp_support_nudge_toast_${toastKey}`;
      if (sessionStorage.getItem(storageKey)) {
        nudgedToastIdsRef.current.add(toastKey);
        return;
      }
      sessionStorage.setItem(storageKey, '1');
    } catch {
      /* ignore */
    }
    nudgedToastIdsRef.current.add(toastKey);
    window.dispatchEvent(
      new CustomEvent('tpp:toast', {
        detail: {
          message: 'Support has responded! Tap to open.',
          type: 'info',
          duration: 6000,
          actionEvent: 'tpp:open-support',
        },
      })
    );
  }, [
    nudgeSupportResponded,
    openSupportTicket?.id,
    openSupportTicket?.lastAdminMessageAt,
    openSupportTicket?.lastMessageAt,
  ]);

  /** Dev preview: inject mock inbox items without writing to Firestore. */
  const applyDevPreview = useCallback((kind) => {
    previewLockRef.current = true;
    const now = Date.now();

    if (kind === 'clear') {
      previewLockRef.current = false;
      setAdminMessage(null);
      setHasUnreadAdminMessage(false);
      setOpenTicket(null);
      setAllTickets([]);
      setHasUnreadResponse(false);
      setDevPreviewMessages(null);
      if (email) {
        loadAdminMessages();
      }
      return;
    }

    if (kind === 'from-team-unread' || kind === 'from-team-read' || kind === 'both') {
      const unread = kind !== 'from-team-read';
      setAdminMessage({
        id: 'dev-preview-admin-msg',
        message:
          "Hey — thanks for writing in. We looked into this on our side and wanted to share a quick update.\n\nYou're all set for now; reply via Support if anything else comes up.\n\n(Dev preview — not a real message.)",
        createdAt: { toDate: () => new Date(now) },
        userReadAt: unread
          ? null
          : {
              toMillis: () => now - 60 * 60 * 1000,
              toDate: () => new Date(now - 60 * 60 * 1000),
            },
        _devPreview: true,
      });
      setHasUnreadAdminMessage(unread);
    }

    if (kind === 'support-unread' || kind === 'support-read' || kind === 'both') {
      const unread = kind !== 'support-read';
      const ticket = {
        id: 'dev-preview-support-ticket',
        ticketNumber: 'PREV01',
        type: 'support',
        status: 'open',
        subject: 'Dev preview — support thread',
        createdAt: new Date(now - 3 * 60 * 60 * 1000),
        updatedAt: new Date(now - 5 * 60 * 1000),
        lastMessageAt: new Date(now - 5 * 60 * 1000),
        lastMessagePreview: 'Thanks for reaching out! Happy to help…',
        userReadAt: unread ? null : new Date(now - 2 * 60 * 1000),
        _devPreview: true,
      };
      const messages = [
        {
          id: 'dev-preview-msg-1',
          message: 'Hi — I have a question about my protocol schedule and vial tracking.',
          text: 'Hi — I have a question about my protocol schedule and vial tracking.',
          senderType: 'user',
          senderName: 'You',
          createdAt: new Date(now - 3 * 60 * 60 * 1000),
        },
        {
          id: 'dev-preview-msg-2',
          message:
            "Thanks for reaching out! Happy to help.\n\nFor schedule changes, open the protocol card → Edit → adjust days/doses. Vial levels update from logged doses automatically.\n\nLet us know if that clears it up!",
          text: "Thanks for reaching out! Happy to help.\n\nFor schedule changes, open the protocol card → Edit → adjust days/doses. Vial levels update from logged doses automatically.\n\nLet us know if that clears it up!",
          senderType: 'admin',
          senderName: 'The Pep Planner Team',
          createdAt: new Date(now - 5 * 60 * 1000),
        },
      ];
      setOpenTicket(ticket);
      setAllTickets([ticket]);
      setHasUnreadResponse(unread);
      setDevPreviewMessages(messages);
      if (unread) {
        try {
          localStorage.removeItem(`ticket_${ticket.id}_lastRead`);
        } catch {
          /* ignore */
        }
      } else {
        try {
          localStorage.setItem(`ticket_${ticket.id}_lastRead`, new Date().toISOString());
        } catch {
          /* ignore */
        }
      }
    }
  }, [email, loadAdminMessages]);

  useEffect(() => {
    const onPreview = (e) => {
      const kind = e?.detail?.kind;
      if (!kind) return;
      applyDevPreview(kind);
    };
    const onChanged = () => {
      if (previewLockRef.current) {
        setHasUnreadAdminMessage(false);
        setHasUnreadResponse(false);
        return;
      }
      loadAdminMessages();
      setOpenTicket((t) => {
        if (t) setHasUnreadResponse(ticketHasUnreadResponse(t));
        return t;
      });
    };
    window.addEventListener('tpp:dev-preview-support-inbox', onPreview);
    window.addEventListener('tpp:support-inbox-changed', onChanged);
    return () => {
      window.removeEventListener('tpp:dev-preview-support-inbox', onPreview);
      window.removeEventListener('tpp:support-inbox-changed', onChanged);
    };
  }, [applyDevPreview, loadAdminMessages]);

  return {
    allTickets,
    openTicket,
    openSupportTicket,
    hasUnreadResponse,
    adminMessage,
    hasUnreadAdminMessage,
    hasOpenRequest,
    unreadCount,
    unreadMessageCount,
    shouldDeepLinkToChat,
    nudgeSupportResponded,
    markTicketRead,
    markAdminMessageRead,
    refreshAdminMessages: loadAdminMessages,
    applyDevPreview,
    devPreviewMessages,
  };
}
