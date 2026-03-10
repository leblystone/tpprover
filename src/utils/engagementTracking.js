/**
 * Per-user engagement and activation milestone tracking.
 * Writes to Firestore users/{uid} — milestones (first-time only) and engagement (rolling).
 */
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

const USERS_COLLECTION = 'users';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Normalize to YYYY-MM-DD for day comparison */
function toDateKey(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : (date?.toDate ? date.toDate() : new Date(date));
  return d.toISOString().slice(0, 10);
}

/**
 * Track engagement: login (streak + active days) or first-time milestones.
 * @param {string} uid - User ID
 * @param {string} action - 'login' | 'firstProtocolCreated' | 'firstOrderAdded' | 'firstStockpileItem' | 'firstCalendarView' | 'onboardingCompleted' | 'sevenDayStreak'
 */
export async function trackEngagement(uid, action) {
  if (!uid || !action) return;
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(userRef);
    const data = snap.exists() ? snap.data() : {};

    if (action === 'login') {
      await updateEngagementForLogin(userRef, data);
      return;
    }

    if (action === 'firstCalendarView') {
      const todayKey = toDateKey(new Date());
      const lastView = (data.engagement || {}).lastCalendarViewDate;
      if (lastView === todayKey) return;
      await setMilestoneOnce(userRef, data, 'firstCalendarView');
      await updateDoc(userRef, {
        'engagement.lastCalendarViewDate': todayKey,
        lastActive: serverTimestamp()
      });
      return;
    }

    const milestoneMap = {
      firstProtocolCreated: 'milestones.firstProtocolCreated',
      firstOrderAdded: 'milestones.firstOrderAdded',
      firstStockpileItem: 'milestones.firstStockpileItem',
      onboardingCompleted: 'milestones.onboardingCompleted',
      sevenDayStreak: 'milestones.sevenDayStreak'
    };
    const path = milestoneMap[action];
    if (path) await setMilestoneOnce(userRef, data, path.replace('milestones.', ''));
  } catch (err) {
    if (import.meta.env?.DEV) console.warn('engagementTracking:', err);
  }
}

async function updateEngagementForLogin(userRef, data) {
  const now = new Date();
  const todayKey = toDateKey(now);
  const engagement = data.engagement || {};
  const lastActiveRaw = engagement.lastActiveDate ?? data.lastActive;
  const lastActiveKey = lastActiveRaw
    ? toDateKey(lastActiveRaw)
    : null;

  if (lastActiveKey === todayKey) {
    await updateDoc(userRef, {
      'engagement.loginCount': (engagement.loginCount ?? 0) + 1,
      'engagement.lastActiveDate': now.toISOString().slice(0, 10),
      lastActive: serverTimestamp()
    });
    return;
  }

  const yesterday = new Date(now.getTime() - MS_PER_DAY);
  const yesterdayKey = toDateKey(yesterday);
  const currentStreak = engagement.currentStreak ?? 0;
  const newStreak = lastActiveKey === yesterdayKey ? currentStreak + 1 : 1;
  const totalActiveDays = (engagement.totalActiveDays ?? 0) + 1;
  const longestStreak = Math.max(engagement.longestStreak ?? 0, newStreak);

  const updates = {
    'engagement.lastActiveDate': todayKey,
    'engagement.currentStreak': newStreak,
    'engagement.longestStreak': longestStreak,
    'engagement.totalActiveDays': totalActiveDays,
    'engagement.loginCount': (engagement.loginCount ?? 0) + 1,
    lastActive: serverTimestamp()
  };

  if (newStreak >= 7) {
    const milestones = data.milestones || {};
    if (!milestones.sevenDayStreak) {
      updates['milestones.sevenDayStreak'] = serverTimestamp();
    }
  }

  await updateDoc(userRef, updates);
}

async function setMilestoneOnce(userRef, data, milestoneKey) {
  const milestones = data.milestones || {};
  if (milestones[milestoneKey]) return;
  await updateDoc(userRef, {
    [`milestones.${milestoneKey}`]: serverTimestamp(),
    lastActive: serverTimestamp()
  });
}

/**
 * Call after saving app data to record first-time milestones when applicable.
 * @param {string} uid - User ID
 * @param {{ protocols?: any[], orders?: any[], stockpile?: any[] }} saved - Shape of what was saved (length used to detect first time)
 */
export async function trackMilestonesFromSave(uid, saved) {
  if (!uid) return;
  try {
    if (saved.protocols?.length) await trackEngagement(uid, 'firstProtocolCreated');
    if (saved.orders?.length) await trackEngagement(uid, 'firstOrderAdded');
    if (saved.stockpile?.length) await trackEngagement(uid, 'firstStockpileItem');
  } catch (err) {
    if (import.meta.env?.DEV) console.warn('trackMilestonesFromSave:', err);
  }
}
