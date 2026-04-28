import { useState, useEffect, useMemo, useCallback } from 'react';
import { getAnnouncements } from '../services/firebase';

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
  const [seenAt, setSeenAt] = useState(() => {
    try {
      const raw = localStorage.getItem('tpprover_announcements_last_seen');
      return raw ? Number(raw) : 0;
    } catch {
      return 0;
    }
  });

  const refreshSeen = useCallback(() => {
    try {
      const raw = localStorage.getItem('tpprover_announcements_last_seen');
      setSeenAt(raw ? Number(raw) : 0);
    } catch {
      setSeenAt(0);
    }
  }, []);

  useEffect(() => {
    const onSeen = () => refreshSeen();
    const onStorage = (e) => {
      if (e.key === 'tpprover_announcements_last_seen') {
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
    window.addEventListener('tpp:announcements-seen', onSeen);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('tpp:announcements-seen', onSeen);
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

  const unseenCount = useMemo(() => {
    if (!announcements?.length) return 0;
    return announcements.filter((a) => {
      const d = a?.date ? new Date(a.date).getTime() : 0;
      return d > 0 && d > seenAt;
    }).length;
  }, [announcements, seenAt]);

  return { unseenCount, announcements };
}
