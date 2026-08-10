/**
 * Shared visibility / unread helpers for user-facing support inbox
 * (From the Team adminMessages + Support tickets).
 */

export function convertTimestamp(timestamp) {
  if (!timestamp) return null;
  try {
    if (timestamp?.toDate) return timestamp.toDate();
    if (timestamp?.toMillis) return new Date(timestamp.toMillis());
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp === 'string' || typeof timestamp === 'number') return new Date(timestamp);
    return new Date(timestamp);
  } catch {
    return null;
  }
}

export function isTicketOpen(ticket) {
  const s = ticket?.status;
  return s === 'new' || s === 'in-progress' || s === 'open';
}

export function isTicketClosed(ticket) {
  const s = ticket?.status;
  return s === 'closed' || s === 'resolved';
}

/** Closed tickets stay visible for 24h after close (same rules as former Topbar chip). */
export function shouldShowClosedTicket(ticket) {
  if (!isTicketClosed(ticket)) return false;

  const now = new Date();
  let closedAt = convertTimestamp(ticket.closedAt);
  const updatedAt = convertTimestamp(ticket.updatedAt);
  const readAt = convertTimestamp(ticket.userReadAt);

  if ((!closedAt || isNaN(closedAt.getTime())) && isTicketClosed(ticket)) {
    if (updatedAt && !isNaN(updatedAt.getTime())) {
      if (!readAt || isNaN(readAt.getTime()) || updatedAt.getTime() < readAt.getTime()) {
        closedAt = updatedAt;
      }
    }
  }

  if ((!closedAt || isNaN(closedAt.getTime())) && isTicketClosed(ticket)) {
    const createdAt = convertTimestamp(ticket.createdAt);
    if (createdAt && !isNaN(createdAt.getTime())) closedAt = createdAt;
  }

  if (closedAt && !isNaN(closedAt.getTime())) {
    const hoursSinceClosed = (now.getTime() - closedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceClosed >= 24) return false;
  }

  if (!closedAt || isNaN(closedAt.getTime())) {
    if (!readAt || isNaN(readAt.getTime())) return false;
    const hoursSinceRead = (now.getTime() - readAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceRead >= 24) return false;
    if (updatedAt && !isNaN(updatedAt.getTime()) && updatedAt.getTime() < readAt.getTime()) {
      const hoursSinceUpdated = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceUpdated >= 24) return false;
      return true;
    }
    return false;
  }

  return true;
}

export function isSupportTypeTicket(ticket) {
  return ticket?.type === 'support';
}

/** Open support-type ticket only (not bug/suggestion-linked). */
export function pickOpenSupportTicket(tickets) {
  if (!Array.isArray(tickets) || tickets.length === 0) return null;
  for (const t of tickets) {
    if (isTicketOpen(t) && isSupportTypeTicket(t)) return t;
  }
  return null;
}

/**
 * Prefer an open support-type ticket; else any open ticket;
 * else a closed ticket still within the 24h window.
 */
export function pickVisibleTicket(tickets) {
  if (!Array.isArray(tickets) || tickets.length === 0) return null;
  const openSupport = pickOpenSupportTicket(tickets);
  if (openSupport) return openSupport;
  for (const t of tickets) {
    if (isTicketOpen(t)) return t;
  }
  for (const t of tickets) {
    if (shouldShowClosedTicket(t)) return t;
  }
  return null;
}

/** Unread admin replies on a ticket; falls back to 1 when unread but no count. */
export function countUnreadTicketMessages(ticket) {
  if (!ticket || !ticketHasUnreadResponse(ticket)) return 0;
  const n = ticket.unreadAdminMessageCount ?? ticket.unreadMessageCount;
  if (typeof n === 'number' && n > 0) return Math.floor(n);
  return 1;
}

export function ticketHasUnreadResponse(ticket) {
  if (!ticket) return false;
  if (isTicketOpen(ticket)) {
    const lastRead = localStorage.getItem(`ticket_${ticket.id}_lastRead`);
    const lastReadTime = lastRead ? new Date(lastRead) : new Date(0);

    // Prefer admin/team reply timestamp so the user's own sends don't look like "Support responded"
    const lastAdminTime = convertTimestamp(ticket.lastAdminMessageAt);
    if (lastAdminTime && !isNaN(lastAdminTime.getTime())) {
      return lastAdminTime.getTime() > lastReadTime.getTime();
    }

    // Legacy / Ghosty paths that only bump lastMessageAt
    const lastMessageTime = convertTimestamp(ticket.lastMessageAt);
    if (lastMessageTime && !isNaN(lastMessageTime.getTime())) {
      return lastMessageTime.getTime() > lastReadTime.getTime();
    }
    return false;
  }
  if (isTicketClosed(ticket)) {
    return !ticket.userReadAt || ticket.userReadAt === null;
  }
  return false;
}

/** Unread, or read within last 24 hours — same as former Topbar chip. */
export function pickVisibleAdminMessage(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return null;
  const now = Date.now();
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

  for (const msg of messages) {
    if (!msg.userReadAt || msg.userReadAt === null) return msg;
    const readAt = msg.userReadAt?.toMillis
      ? msg.userReadAt.toMillis()
      : (msg.userReadAt?.toDate ? msg.userReadAt.toDate().getTime() : new Date(msg.userReadAt).getTime());
    if (readAt >= twentyFourHoursAgo) return msg;
  }
  return null;
}

export function adminMessageIsUnread(message) {
  if (!message) return false;
  return !message.userReadAt || message.userReadAt === null;
}

export function ticketSnippet(ticket) {
  if (!ticket) return '';
  const raw = ticket.lastMessagePreview || ticket.subject || ticket.message || '';
  const text = String(raw).trim();
  if (!text) return 'Open conversation';
  return text.length > 90 ? `${text.slice(0, 90)}…` : text;
}

export function adminMessageSnippet(message) {
  if (!message?.message) return 'Personal message from the team';
  const text = String(message.message).replace(/\s+/g, ' ').trim();
  return text.length > 90 ? `${text.slice(0, 90)}…` : text;
}
