/**
 * Shared timezone helpers for scheduled emails / reminders.
 * Prefer each user's settings.region.timeZone over a global admin default.
 */

function getLocalTimeParts(date, timeZone) {
  const tz = timeZone || 'America/New_York';
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'long',
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value])
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour === '24' ? '0' : parts.hour),
    minute: Number(parts.minute),
    weekday: parts.weekday, // e.g. "Sunday"
  };
}

function localDateKey(date, timeZone) {
  const p = getLocalTimeParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

function parseTimeHHMM(timeStr) {
  const [h, m] = String(timeStr || '09:00').split(':').map(Number);
  return { hour: Number.isFinite(h) ? h : 9, minute: Number.isFinite(m) ? m : 0 };
}

/** True when the local clock hour matches the configured send hour (hourly cron). */
function isLocalHourMatch(date, timeZone, timeStr) {
  const local = getLocalTimeParts(date, timeZone);
  const { hour } = parseTimeHHMM(timeStr);
  return local.hour === hour;
}

function daysBetweenDateKeys(fromKey, toKey) {
  const [fy, fm, fd] = fromKey.split('-').map(Number);
  const [ty, tm, td] = toKey.split('-').map(Number);
  const fromMs = Date.UTC(fy, fm - 1, fd);
  const toMs = Date.UTC(ty, tm - 1, td);
  return Math.round((toMs - fromMs) / 86400000);
}

/**
 * Resolve timezone from users doc and/or userData doc.
 */
async function resolveUserTimezone(db, userId, userDocData = null) {
  const fromUsers = userDocData?.settings?.region?.timeZone;
  if (fromUsers) return fromUsers;
  try {
    const snap = await db.collection('userData').doc(userId).get();
    const tz = snap.exists ? snap.data()?.settings?.region?.timeZone : null;
    if (tz) return tz;
  } catch (_) {}
  return 'America/New_York';
}

/**
 * Load one trigger config from emailTemplates/_triggers with defaults.
 */
async function loadTriggerConfig(db, key, defaults = {}) {
  const base = {
    enabled: true,
    sendTime: '09:00',
    time: '11:00',
    daysBefore: 2,
    dayOfWeek: 'Sunday',
    ...defaults,
  };
  try {
    const snap = await db.collection('emailTemplates').doc('_triggers').get();
    if (!snap.exists) return base;
    const saved = snap.data()?.[key] || {};
    return { ...base, ...saved };
  } catch (_) {
    return base;
  }
}

module.exports = {
  getLocalTimeParts,
  localDateKey,
  parseTimeHHMM,
  isLocalHourMatch,
  daysBetweenDateKeys,
  resolveUserTimezone,
  loadTriggerConfig,
};
