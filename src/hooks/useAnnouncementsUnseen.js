import { useState, useEffect, useMemo, useCallback } from 'react';
import { getAnnouncements } from '../services/firebase';
import {
  ANNOUNCEMENTS_LAST_SEEN_KEY,
  ANNOUNCEMENTS_SEEN_EVENT,
  countUnseenAnnouncements,
  getAnnouncementsLastSeenMs,
  markAnnouncementsSeen,
} from '../utils/announcementSeen';

/**
 * Keeps the announcements list in sync (cache + Firestore) and counts posts
 * newer than tpprover_announcements_last_seen — same rules as NotificationBell.
 */
export function useAnnouncementsUnseen() {
  const [announcements, setAnnouncements] = useState(() => {
    try {
      const saved = localStorage.getItem('tpprover_announcements');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [seenAt, setSeenAt] = useState(() => getAnnouncementsLastSeenMs());

  const refreshSeen = useCallback(() => {
    setSeenAt(getAnnouncementsLastSeenMs());
  }, []);

  useEffect(() => {
    const onSeen = (e) => {
      const fromEvent = e?.detail?.lastSeenMs;
      if (typeof fromEvent === 'number' && Number.isFinite(fromEvent)) {
        setSeenAt(fromEvent);
        return;
      }
      refreshSeen();
    };
    const onStorage = (e) => {
      if (e.key === ANNOUNCEMENTS_LAST_SEEN_KEY) {
        refreshSeen();
      }
      if (e.key === 'tpprover_announcements' && e.newValue) {
        try {
          setAnnouncements(JSON.parse(e.newValue));
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener(ANNOUNCEMENTS_SEEN_EVENT, onSeen);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(ANNOUNCEMENTS_SEEN_EVENT, onSeen);
      window.removeEventListener('storage', onStorage);
    };
  }, [refreshSeen]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getAnnouncements();
        if (cancelled || !list?.length) return;
        setAnnouncements(list);
        try {
          localStorage.setItem('tpprover_announcements', JSON.stringify(list));
        } catch {
          // ignore
        }
      } catch {
        // keep cache
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // If the sheet is open and a late network refresh brings newer posts into this
  // hook's list, bump last-seen so the nav badge can't resurrect mid-view.
  useEffect(() => {
    const onOpened = () => {
      try {
        sessionStorage.setItem('tpp_announcements_sheet_open', '1');
      } catch {
        /* ignore */
      }
    };
    const onClosed = () => {
      try {
        sessionStorage.removeItem('tpp_announcements_sheet_open');
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('tpp:open-announcements', onOpened);
    window.addEventListener('tpp:announcements-sheet-closed', onClosed);
    return () => {
      window.removeEventListener('tpp:open-announcements', onOpened);
      window.removeEventListener('tpp:announcements-sheet-closed', onClosed);
    };
  }, []);

  useEffect(() => {
    if (!announcements?.length) return;
    let sheetOpen = false;
    try {
      sheetOpen = sessionStorage.getItem('tpp_announcements_sheet_open') === '1';
    } catch {
      sheetOpen = false;
    }
    if (!sheetOpen) return;
    const next = markAnnouncementsSeen(announcements);
    setSeenAt(next);
  }, [announcements]);

  const unseenCount = useMemo(
    () => countUnseenAnnouncements(announcements, seenAt),
    [announcements, seenAt]
  );

  return { unseenCount, announcements };
}
