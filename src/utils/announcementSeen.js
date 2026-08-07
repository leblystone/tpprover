/**
 * Shared announcements "last seen" helpers — BottomNavigation / NotificationBell /
 * AnnouncementsSheet must use the same date + storage rules.
 */

export const ANNOUNCEMENTS_LAST_SEEN_KEY = 'tpprover_announcements_last_seen';
export const ANNOUNCEMENTS_SEEN_EVENT = 'tpp:announcements-seen';

/** Normalize Firestore Timestamp / Date / ISO / ms into epoch ms (0 if invalid). */
export function announcementDateMs(value) {
  if (value == null || value === '') return 0;
  if (typeof value === 'number' && Number.isFinite(value)) {
    // Heuristic: seconds vs milliseconds
    return value < 1e12 ? Math.round(value * 1000) : value;
  }
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isFinite(t) ? t : 0;
  }
  if (typeof value?.toMillis === 'function') {
    try {
      const t = value.toMillis();
      return Number.isFinite(t) ? t : 0;
    } catch {
      /* ignore */
    }
  }
  if (typeof value?.toDate === 'function') {
    try {
      const t = value.toDate().getTime();
      return Number.isFinite(t) ? t : 0;
    } catch {
      /* ignore */
    }
  }
  if (typeof value?.seconds === 'number') {
    return value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6);
  }
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

export function maxAnnouncementDateMs(list) {
  let max = 0;
  for (const a of list || []) {
    const t = announcementDateMs(a?.date);
    if (t > max) max = t;
  }
  return max;
}

export function getAnnouncementsLastSeenMs() {
  try {
    const raw = localStorage.getItem(ANNOUNCEMENTS_LAST_SEEN_KEY);
    if (raw == null || raw === '') return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

/**
 * Bump last-seen to at least the latest post (never decreases).
 * Dispatches tpp:announcements-seen so all badge consumers refresh.
 */
export function markAnnouncementsSeen(listOrMs) {
  const latest =
    typeof listOrMs === 'number' ? (Number.isFinite(listOrMs) ? listOrMs : 0) : maxAnnouncementDateMs(listOrMs);
  const prev = getAnnouncementsLastSeenMs();
  const next = Math.max(prev, latest || 0);
  if (!next) return prev;
  try {
    localStorage.setItem(ANNOUNCEMENTS_LAST_SEEN_KEY, String(next));
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(
      new CustomEvent(ANNOUNCEMENTS_SEEN_EVENT, { detail: { lastSeenMs: next } })
    );
  } catch {
    /* ignore */
  }
  return next;
}

export function countUnseenAnnouncements(list, seenAt = getAnnouncementsLastSeenMs()) {
  if (!list?.length) return 0;
  const floor = Number.isFinite(seenAt) ? seenAt : 0;
  return list.filter((a) => {
    const d = announcementDateMs(a?.date);
    return d > 0 && d > floor;
  }).length;
}
