/**
 * Shared weekly analytics digest builder for reminder emails.
 * Used by scheduled sends, admin test sends, and preview helpers.
 */

const EMPTY_SUMMARY = {
  hasData: false,
  activeProtocols: [],
  lowStockCount: 0,
  lowStockItems: [],
  thisWeekTotal: 0,
  lastWeekTotal: 0,
  thisWeekDays: 0,
  lastWeekDays: 0,
  delta: 0,
  daysDelta: 0,
};

function buildWeeklyResearchSummary(userDataObj, userTimezone = 'America/New_York') {
  const taskCompletion = userDataObj?.taskCompletion || {};
  const protocols = userDataObj?.protocols || [];
  const stockpile = userDataObj?.stockpile || [];

  const toDateKey = (d) => {
    const s = d.toLocaleString('en-US', {
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const [m, dy, y] = s.split('/');
    return `${y}-${m.padStart(2, '0')}-${dy.padStart(2, '0')}`;
  };

  const now = new Date();
  const thisWeekKeys = [];
  const lastWeekKeys = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    thisWeekKeys.push(toDateKey(d));
  }
  for (let i = 7; i < 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    lastWeekKeys.push(toDateKey(d));
  }

  const countCompletionsForDay = (dateKey) => {
    const day = taskCompletion[dateKey];
    if (!day) return 0;
    let n = 0;
    for (const slot of Object.values(day)) {
      if (slot && typeof slot === 'object') {
        for (const val of Object.values(slot)) {
          if (val === true || (val && typeof val === 'object' && val.completed === true)) n++;
        }
      }
    }
    return n;
  };

  const thisWeekTotal = thisWeekKeys.reduce((s, k) => s + countCompletionsForDay(k), 0);
  const lastWeekTotal = lastWeekKeys.reduce((s, k) => s + countCompletionsForDay(k), 0);
  const thisWeekDays = thisWeekKeys.filter((k) => countCompletionsForDay(k) > 0).length;
  const lastWeekDays = lastWeekKeys.filter((k) => countCompletionsForDay(k) > 0).length;

  const activeProtocols = protocols
    .filter((p) => p.active !== false)
    .map((p) => p.name || p.peptides?.[0]?.name || null)
    .filter(Boolean)
    .slice(0, 4);

  const lowStockItems = stockpile
    .filter((item) => {
      const q = Number(item.quantity) || 0;
      return q <= 3 && q > 0;
    })
    .map((item) => item.name || 'Item')
    .slice(0, 3);

  return {
    thisWeekTotal,
    lastWeekTotal,
    thisWeekDays,
    lastWeekDays,
    delta: thisWeekTotal - lastWeekTotal,
    daysDelta: thisWeekDays - lastWeekDays,
    activeProtocols,
    lowStockCount: lowStockItems.length,
    lowStockItems,
    hasData: thisWeekTotal > 0 || lastWeekTotal > 0 || activeProtocols.length > 0,
  };
}

/**
 * Resolve firstName + summary for a user email from Firestore.
 */
async function fetchWeeklyPayloadForEmail(db, userEmail) {
  if (!userEmail) {
    return { firstName: 'Researcher', summary: { ...EMPTY_SUMMARY } };
  }

  const usersSnap = await db.collection('users').where('email', '==', userEmail).limit(1).get();
  if (usersSnap.empty) {
    return { firstName: 'Researcher', summary: { ...EMPTY_SUMMARY } };
  }

  const userDoc = usersSnap.docs[0];
  const userData = userDoc.data();
  const userId = userDoc.id;
  const firstName = userData.displayName
    ? userData.displayName.split(' ')[0]
    : (userData.email || userEmail).split('@')[0];

  let summary = { ...EMPTY_SUMMARY };
  try {
    const userDataDoc = await db.collection('userData').doc(userId).get();
    if (userDataDoc.exists) {
      const userTimezone = userData.settings?.region?.timeZone || 'America/New_York';
      summary = buildWeeklyResearchSummary(userDataDoc.data(), userTimezone);
    }
  } catch (_) {}

  return { firstName: firstName || 'Researcher', summary };
}

/**
 * Resolve firstName + summary by Firebase UID (preferred for manual sends).
 */
async function fetchWeeklyPayloadForUserId(db, userId) {
  if (!userId) {
    return { firstName: 'Researcher', summary: { ...EMPTY_SUMMARY } };
  }

  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    return { firstName: 'Researcher', summary: { ...EMPTY_SUMMARY } };
  }

  const userData = userDoc.data();
  const userEmail = userData.email || '';
  const firstName = userData.displayName
    ? userData.displayName.split(' ')[0]
    : (userEmail || 'Researcher').split('@')[0];

  let summary = { ...EMPTY_SUMMARY };
  try {
    const userDataDoc = await db.collection('userData').doc(userId).get();
    if (userDataDoc.exists) {
      const ud = userDataDoc.data();
      const userTimezone = ud.settings?.region?.timeZone || 'America/New_York';
      summary = buildWeeklyResearchSummary(ud, userTimezone);
    }
  } catch (_) {}

  return { firstName: firstName || 'Researcher', summary };
}

module.exports = {
  EMPTY_SUMMARY,
  buildWeeklyResearchSummary,
  fetchWeeklyPayloadForEmail,
  fetchWeeklyPayloadForUserId,
};
