/**
 * Research reminder scheduler — cost-efficient push delivery.
 *
 * Step 1: Time-gate before loading userData (only "open mailbox" at delivery time).
 * Step 2: Query users with researchRemindersActive instead of all users.
 * Step 3: researchReminderQueue collection — cron asks "who is due in this 15-min window?"
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const pushNotifications = require('./pushNotifications');

const QUEUE_COLLECTION = 'researchReminderQueue';
const WINDOW_MS = 15 * 60 * 1000;
const QUEUE_HORIZON_DAYS = 2;
const BACKFILL_BATCH = 25;

// ── Timezone helpers ───────────────────────────────────────────────

function getLocalTimeParts(date, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
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
  };
}

function zonedTimeToUtc({ year, month, day, hour, minute }, timeZone) {
  let guess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  for (let i = 0; i < 4; i++) {
    const actual = getLocalTimeParts(new Date(guess), timeZone);
    const targetMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
    const actualMs = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, 0, 0);
    const diff = targetMs - actualMs;
    if (diff === 0) break;
    guess += diff;
  }
  return new Date(guess);
}

function parseTimeHHMM(timeStr) {
  const [h, m] = String(timeStr || '08:00').split(':').map(Number);
  return { hour: h || 0, minute: m || 0 };
}

function roundMinuteTo15(minute) {
  return Math.floor(minute / 15) * 15;
}

function isWithinWindow(currentHour, currentMinute, targetHour, targetMinute) {
  if (currentHour !== targetHour) return false;
  return roundMinuteTo15(currentMinute) === roundMinuteTo15(targetMinute);
}

function isTimeStringInWindow(currentHour, currentMinute, timeStr) {
  const { hour, minute } = parseTimeHHMM(timeStr);
  return isWithinWindow(currentHour, currentMinute, hour, minute);
}

// ── User flags (Step 2) ────────────────────────────────────────────

function computeResearchRemindersActive(notificationSettings = {}, fcmToken = null) {
  const pushOn =
    notificationSettings.push === true ||
    notificationSettings.pushEnabled === true ||
    !!fcmToken;
  if (!pushOn) return false;
  // Active if master is on, either sub-toggle is on, or custom protocol reminders exist
  return (
    notificationSettings.researchReminders === true ||
    notificationSettings.researchRemindersAM === true ||
    notificationSettings.researchRemindersPM === true ||
    notificationSettings.hasCustomProtocolReminders === true
  );
}

function extractCustomReminderMeta(protocols = []) {
  const times = new Set();
  for (const protocol of protocols) {
    if (protocol.active === false || !protocol.peptides) continue;
    for (const peptide of protocol.peptides) {
      if (peptide.frequency?.customReminder === true && peptide.frequency?.reminderTime) {
        times.add(peptide.frequency.reminderTime);
      }
    }
  }
  return {
    hasCustomProtocolReminders: times.size > 0,
    customReminderTimes: [...times].sort(),
  };
}

/**
 * Step 1 — can this user possibly get a push this 15-min run? (no userData read needed)
 * Also handles legacy users who have researchReminders:true but AM/PM sub-toggles
 * were never explicitly set (treats them as both enabled at default times).
 */
function couldUserHaveReminderThisRun(userDocData, now = new Date()) {
  const ns = userDocData.notificationSettings || {};
  const tz = userDocData.settings?.region?.timeZone || 'America/New_York';
  const { hour, minute } = getLocalTimeParts(now, tz);

  // Legacy fallback: master on but sub-toggles were never set → treat as AM+PM enabled
  const legacyMasterOnly =
    ns.researchReminders === true &&
    ns.researchRemindersAM !== true &&
    ns.researchRemindersPM !== true;

  const effectiveAM = ns.researchRemindersAM === true || legacyMasterOnly;
  const effectivePM = ns.researchRemindersPM === true || legacyMasterOnly;

  if (effectiveAM) {
    const am = ns.researchReminderTimeAM || '08:00';
    if (isTimeStringInWindow(hour, minute, am)) return true;
  }
  if (effectivePM) {
    const pm = ns.researchReminderTimePM || '18:00';
    if (isTimeStringInWindow(hour, minute, pm)) return true;
  }

  const customTimes = userDocData.customReminderTimes || ns.customReminderTimes || [];
  for (const t of customTimes) {
    if (isTimeStringInWindow(hour, minute, t)) return true;
  }

  // Titration always runs at AM reminder window
  const titrationTime = ns.researchReminderTimeAM || '08:00';
  if (isTimeStringInWindow(hour, minute, titrationTime)) return true;

  return false;
}

function slotKeysForUserThisRun(userDocData, now = new Date()) {
  const ns = userDocData.notificationSettings || {};
  const tz = userDocData.settings?.region?.timeZone || 'America/New_York';
  const { hour, minute } = getLocalTimeParts(now, tz);
  const keys = new Set();

  if (ns.researchRemindersAM === true) {
    const am = ns.researchReminderTimeAM || '08:00';
    if (isTimeStringInWindow(hour, minute, am)) keys.add('AM');
  }
  if (ns.researchRemindersPM === true) {
    const pm = ns.researchReminderTimePM || '18:00';
    if (isTimeStringInWindow(hour, minute, pm)) keys.add('PM');
  }

  const customTimes = userDocData.customReminderTimes || ns.customReminderTimes || [];
  for (const t of customTimes) {
    if (isTimeStringInWindow(hour, minute, t)) keys.add(`custom:${t}`);
  }

  const titrationTime = ns.researchReminderTimeAM || '08:00';
  if (isTimeStringInWindow(hour, minute, titrationTime)) keys.add('titration');

  return keys;
}

// ── Build today's task list from userData ──────────────────────────

function buildTodayTasks(userDataObj, userTimezone, now = new Date()) {
  const protocols = userDataObj?.protocols || [];
  const supplements = userDataObj?.supplements || [];
  const local = getLocalTimeParts(now, userTimezone);
  const userToday = new Date(local.year, local.month - 1, local.day);
  userToday.setHours(0, 0, 0, 0);

  const todayPeptides = [];
  const todaySupplements = [];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDayName = dayNames[userToday.getDay()];

  for (const protocol of protocols) {
    if (protocol.active === false || !protocol.startDate) continue;
    const startDate = new Date(protocol.startDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = protocol.endDate ? new Date(protocol.endDate) : null;
    if (endDate) endDate.setHours(23, 59, 59, 999);
    if (userToday < startDate || (endDate && userToday > endDate)) continue;

    if (protocol.peptides) {
      protocol.peptides.forEach((peptide) => {
        if (peptide.frequency?.time) {
          peptide.frequency.time.forEach((time) => {
            todayPeptides.push({
              name: peptide.name || 'Peptide',
              dose: peptide.dosage?.amount || '',
              unit: peptide.dosage?.unit || 'mcg',
              time,
              type: 'peptide',
              customReminder: peptide.frequency.customReminder === true,
              reminderTime: peptide.frequency.reminderTime || null,
            });
          });
        }
      });
    }
  }

  for (const supplement of supplements) {
    const isScheduledToday =
      !supplement.days ||
      supplement.days.length === 0 ||
      supplement.days.some((day) => {
        const normalizedDay = day.toLowerCase();
        const normalizedCurrentDay = currentDayName.toLowerCase();
        return (
          normalizedDay === normalizedCurrentDay ||
          normalizedDay === normalizedCurrentDay.substring(0, 3)
        );
      });
    if (!isScheduledToday) continue;
    const schedule = Array.isArray(supplement.schedule)
      ? supplement.schedule
      : supplement.schedule === 'PM'
        ? ['PM']
        : ['AM'];
    schedule.forEach((time) => {
      todaySupplements.push({
        name: supplement.name || 'Supplement',
        dose: supplement.dose || '',
        time,
        type: 'supplement',
      });
    });
  }

  const todayKey = `${local.year}-${String(local.month).padStart(2, '0')}-${String(local.day).padStart(2, '0')}`;
  const taskCompletion = userDataObj?.taskCompletion || {};
  const todayCompletionData = taskCompletion[todayKey] || {};

  const generateTaskId = (task) => {
    const { name, dose, unit, type, time } = task;
    const taskId = `${type}-${name}-${dose}-${unit}-${time}`;
    return taskId.toLowerCase().replace(/\s+/g, '-');
  };

  const isTaskCompleted = (taskId, timeSlot) => {
    const taskData = todayCompletionData[timeSlot]?.[taskId];
    if (taskData === true) return true;
    if (taskData && typeof taskData === 'object' && taskData.completed === true) return true;
    return false;
  };

  const incompletePeptidesAM = todayPeptides.filter((p) => {
    if (p.time !== 'AM') return false;
    return !isTaskCompleted(generateTaskId(p), 'AM');
  });
  const incompleteSupplementsAM = todaySupplements.filter((s) => {
    if (s.time !== 'AM') return false;
    return !isTaskCompleted(generateTaskId(s), 'AM');
  });
  const incompletePeptidesPM = todayPeptides.filter((p) => {
    if (p.time !== 'PM') return false;
    return !isTaskCompleted(generateTaskId(p), 'PM');
  });
  const incompleteSupplementsPM = todaySupplements.filter((s) => {
    if (s.time !== 'PM') return false;
    return !isTaskCompleted(generateTaskId(s), 'PM');
  });

  return {
    local,
    todayKey,
    incompletePeptidesAM,
    incompleteSupplementsAM,
    incompletePeptidesPM,
    incompleteSupplementsPM,
    totalItems: todayPeptides.length + todaySupplements.length,
  };
}

function buildNotificationBody(peptides, supplements, label) {
  const peptideNames = peptides.map((p) => {
    const dose = p.dose && p.unit ? ` (${p.dose} ${p.unit})` : '';
    return `${p.name}${dose}`;
  });
  const supplementNameList = supplements.map((s) => s.name);
  const allItems = [...peptideNames, ...supplementNameList];
  if (allItems.length === 0) return null;
  if (allItems.length <= 3) return `${label}: ${allItems.join(', ')}`;
  const shown = allItems.slice(0, 3).join(', ');
  return `${label}: ${shown} +${allItems.length - 3} more`;
}

async function loadTemplate(templateType, notificationPeptides, notificationSupplements, defaultTitle, defaultBody) {
  let title = defaultTitle;
  let body = defaultBody;
  try {
    const templateDoc = await admin.firestore().collection('notificationTemplates').doc(templateType).get();
    if (templateDoc.exists) {
      const template = templateDoc.data();
      title = template.title || title;
      if (template.body) {
        const peptideNames = notificationPeptides.map((p) => p.name);
        const supplementNameList = notificationSupplements.map((s) => s.name);
        const templateBody = template.body
          .replace(/{peptideCount}/g, notificationPeptides.length.toString())
          .replace(/{supplementCount}/g, notificationSupplements.length.toString())
          .replace(/{peptideList}/g, peptideNames.join(', ') || 'none')
          .replace(/{supplementList}/g, supplementNameList.join(', ') || 'none');
        if (templateBody.trim()) body = templateBody;
      }
    }
  } catch (err) {
    logger.warn(`Could not load template ${templateType}:`, err.message);
  }
  return { title, body };
}

// ── Titration (merged into single user pass) ───────────────────────

function processTitrationReminders(userId, userDataObj, userTimezone, now, promises, activeSlots) {
  if (activeSlots && !activeSlots.has('titration')) return;

  const local = getLocalTimeParts(now, userTimezone);
  const today = new Date(local.year, local.month - 1, local.day);
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const titrationProtocols = userDataObj?.protocols || [];

  const getPhaseDays = (phase) => {
    const unit = String(phase.durationUnit || 'day').toLowerCase();
    if (unit === 'ongoing') return 0;
    const count = Number(phase.durationCount) || 0;
    if (unit.includes('week')) return count * 7;
    if (unit.includes('month')) return count * 30;
    return count;
  };

  const getElapsedDays = (protocol, peptide, targetDate) => {
    const startDate = new Date(protocol.startDate);
    startDate.setHours(0, 0, 0, 0);
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);
    let elapsed = Math.floor((target - startDate) / (1000 * 60 * 60 * 24));
    if (elapsed < 0) return null;
    elapsed += Number(peptide.titrationDaysOffset) || 0;
    if (peptide.titrationHeldAt) {
      const held = new Date(peptide.titrationHeldAt);
      held.setHours(0, 0, 0, 0);
      const heldDays = Math.floor((held - startDate) / (1000 * 60 * 60 * 24));
      if (heldDays >= 0) elapsed = heldDays + (Number(peptide.titrationDaysOffset) || 0);
    }
    return Math.max(0, elapsed);
  };

  const getDoseForDate = (protocol, peptide, targetDate) => {
    const isFixed =
      peptide.dosageScheduleType === 'fixed' ||
      !peptide.titration ||
      !Array.isArray(peptide.titration) ||
      peptide.titration.length === 0;
    if (isFixed) return { dose: peptide.dosage?.amount || '', unit: peptide.dosage?.unit || '' };
    const daysElapsed = getElapsedDays(protocol, peptide, targetDate);
    if (daysElapsed === null) return { dose: peptide.dosage?.amount || '', unit: peptide.dosage?.unit || '' };
    let cumulativeDays = 0;
    for (let i = 0; i < peptide.titration.length; i++) {
      const phase = peptide.titration[i];
      const isLast = i === peptide.titration.length - 1;
      let pDays = getPhaseDays(phase);
      if (pDays <= 0) {
        if (isLast) return { dose: phase.dose || '', unit: phase.doseUnit || '' };
        pDays = 1;
      }
      if (daysElapsed < cumulativeDays + pDays) return { dose: phase.dose || '', unit: phase.doseUnit || '' };
      cumulativeDays += pDays;
    }
    const lastPhase = peptide.titration[peptide.titration.length - 1];
    return { dose: lastPhase.dose || '', unit: lastPhase.doseUnit || '' };
  };

  for (const protocol of titrationProtocols) {
    if (protocol.active === false || !protocol.startDate) continue;
    const startDate = new Date(protocol.startDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = protocol.endDate ? new Date(protocol.endDate) : null;
    if (endDate) endDate.setHours(23, 59, 59, 999);
    if (today < startDate || (endDate && today > endDate)) continue;
    if (!protocol.peptides) continue;

    for (const peptide of protocol.peptides) {
      if (!peptide.titration || !Array.isArray(peptide.titration) || peptide.titration.length < 2) continue;
      if (peptide.dosageScheduleType === 'fixed') continue;

      const todayDose = getDoseForDate(protocol, peptide, today);
      const yesterdayDose = getDoseForDate(protocol, peptide, yesterday);
      if (
        String(todayDose.dose) === String(yesterdayDose.dose) &&
        String(todayDose.unit) === String(yesterdayDose.unit)
      ) {
        continue;
      }

      const oldDoseStr = `${yesterdayDose.dose} ${yesterdayDose.unit}`.trim();
      const newDoseStr = `${todayDose.dose} ${todayDose.unit}`.trim();
      const peptideName = peptide.name || 'Peptide';
      logger.info(`Titration dose change for ${userId}: ${peptideName} ${oldDoseStr} → ${newDoseStr}`);

      promises.push(
        pushNotifications.sendPushNotificationByType(userId, 'researchReminders', {
          title: '📈 Dose Change Today!',
          body: `Your ${peptideName} dose changes today: ${oldDoseStr} → ${newDoseStr}. Check your protocol for details.`,
          appUrl: 'https://thepepplanner.com/app/protocols',
        })
      );
    }
  }
}

// ── Process one user (loads userData only when called) ─────────────

async function processUserResearchReminders(userId, userDoc, userDataObj, now, promises, activeSlots = null) {
  const userData = userDoc.data();
  const userTimezone = userData.settings?.region?.timeZone || 'America/New_York';
  const ns = userData.notificationSettings || {};

  if (!userDataObj) return { skipped: true, reason: 'no_user_data' };

  const tasks = buildTodayTasks(userDataObj, userTimezone, now);
  if (tasks.totalItems === 0) return { skipped: true, reason: 'no_tasks_today' };

  const { hour: currentHour, minute: currentMinute } = getLocalTimeParts(now, userTimezone);
  const isWithinWindowLocal = (targetHour, targetMinute) =>
    isWithinWindow(currentHour, currentMinute, targetHour, targetMinute);

  const {
    incompletePeptidesAM,
    incompleteSupplementsAM,
    incompletePeptidesPM,
    incompleteSupplementsPM,
  } = tasks;

  const allIncompletePeptides = [...incompletePeptidesAM, ...incompletePeptidesPM];
  const customTimePeptides = allIncompletePeptides.filter((p) => p.customReminder && p.reminderTime);
  const peptidesByCustomTime = {};
  for (const peptide of customTimePeptides) {
    const time = peptide.reminderTime;
    if (!peptidesByCustomTime[time]) peptidesByCustomTime[time] = [];
    peptidesByCustomTime[time].push(peptide);
  }

  // Custom reminders
  for (const [customTime, peptides] of Object.entries(peptidesByCustomTime)) {
    const slotKey = `custom:${customTime}`;
    if (activeSlots && !activeSlots.has(slotKey)) continue;
    const [cHour, cMinute] = customTime.split(':').map(Number);
    if (!isWithinWindowLocal(cHour, cMinute)) continue;
    const body = buildNotificationBody(peptides, [], 'Reminder');
    if (!body) continue;
    promises.push(
      pushNotifications.sendPushNotificationByType(userId, 'researchReminders', {
        title: `🔔 ${peptides.length === 1 ? peptides[0].name : 'Research'} Reminder`,
        body,
        peptides,
        supplements: [],
        peptideCount: peptides.length,
        supplementCount: 0,
        appUrl: 'https://thepepplanner.com/app/dashboard',
      })
    );
  }

  // Global AM / PM
  const globalPeptidesAM = incompletePeptidesAM.filter((p) => !p.customReminder || !p.reminderTime);
  const globalPeptidesPM = incompletePeptidesPM.filter((p) => !p.customReminder || !p.reminderTime);
  const [amHour, amMinute] = (ns.researchReminderTimeAM || '08:00').split(':').map(Number);
  const [pmHour, pmMinute] = (ns.researchReminderTimePM || '18:00').split(':').map(Number);

  // Legacy fallback: master on but sub-toggles never explicitly set
  const legacyMasterOnly =
    ns.researchReminders === true &&
    ns.researchRemindersAM !== true &&
    ns.researchRemindersPM !== true;

  const matchesAM =
    (!activeSlots || activeSlots.has('AM')) &&
    (ns.researchRemindersAM === true || legacyMasterOnly) &&
    isWithinWindowLocal(amHour, amMinute);
  const matchesPM =
    (!activeSlots || activeSlots.has('PM')) &&
    (ns.researchRemindersPM === true || legacyMasterOnly) &&
    isWithinWindowLocal(pmHour, pmMinute);

  let notificationType = '';
  let notificationPeptides = [];
  let notificationSupplements = [];

  if (matchesAM && (globalPeptidesAM.length > 0 || incompleteSupplementsAM.length > 0)) {
    notificationType = 'AM';
    notificationPeptides = globalPeptidesAM;
    notificationSupplements = incompleteSupplementsAM;
  } else if (matchesPM && (globalPeptidesPM.length > 0 || incompleteSupplementsPM.length > 0)) {
    notificationType = 'PM';
    notificationPeptides = globalPeptidesPM;
    notificationSupplements = incompleteSupplementsPM;
  }

  if (notificationType) {
    const timeLabel = notificationType === 'AM' ? 'Morning' : 'Evening';
    const defaultTitle = notificationType === 'AM' ? '☀️ Morning Research Reminder' : '🌙 Evening Research Reminder';
    const defaultBody = buildNotificationBody(
      notificationPeptides,
      notificationSupplements,
      `${timeLabel} research`
    );
    if (defaultBody) {
      const templateType = notificationType === 'AM' ? 'researchReminderAM' : 'researchReminderPM';
      const { title, body } = await loadTemplate(
        templateType,
        notificationPeptides,
        notificationSupplements,
        defaultTitle,
        defaultBody
      );
      promises.push(
        pushNotifications.sendPushNotificationByType(userId, 'researchReminders', {
          title,
          body,
          peptides: notificationPeptides,
          supplements: notificationSupplements,
          peptideCount: notificationPeptides.length,
          supplementCount: notificationSupplements.length,
          appUrl: 'https://thepepplanner.com/app/dashboard',
        })
      );
    }
  }

  processTitrationReminders(userId, userDataObj, userTimezone, now, promises, activeSlots);
  return { processed: true };
}

// ── Step 3: Reminder queue ─────────────────────────────────────────

function buildSlotList(userDocData, userDataObj) {
  const ns = userDocData.notificationSettings || {};
  const tz = userDocData.settings?.region?.timeZone || 'America/New_York';
  const slots = [];

  // Legacy fallback: master on but AM/PM sub-toggles never explicitly set
  const legacyMasterOnly =
    ns.researchReminders === true &&
    ns.researchRemindersAM !== true &&
    ns.researchRemindersPM !== true;

  const useAM = ns.researchRemindersAM === true || legacyMasterOnly;
  const usePM = ns.researchRemindersPM === true || legacyMasterOnly;

  if (useAM) {
    slots.push({ slotKey: 'AM', slotType: 'AM', slotTime: ns.researchReminderTimeAM || '08:00', timezone: tz });
  }
  if (usePM) {
    slots.push({ slotKey: 'PM', slotType: 'PM', slotTime: ns.researchReminderTimePM || '18:00', timezone: tz });
  }

  const customMeta = userDataObj
    ? extractCustomReminderMeta(userDataObj.protocols)
    : {
        customReminderTimes: userDocData.customReminderTimes || [],
      };
  for (const t of customMeta.customReminderTimes || []) {
    slots.push({ slotKey: `custom:${t}`, slotType: 'custom', slotTime: t, timezone: tz });
  }

  if (ns.researchRemindersAM === true || ns.researchReminders === true) {
    slots.push({
      slotKey: 'titration',
      slotType: 'titration',
      slotTime: ns.researchReminderTimeAM || '08:00',
      timezone: tz,
    });
  }

  return slots;
}

async function syncResearchReminderQueue(userId) {
  const db = admin.firestore();
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) return { success: false, reason: 'no_user' };

  const userDocData = userDoc.data();
  const userDataDoc = await db.collection('userData').doc(userId).get();
  const userDataObj = userDataDoc.exists ? userDataDoc.data() : null;

  const customMeta = userDataObj
    ? extractCustomReminderMeta(userDataObj.protocols)
    : { hasCustomProtocolReminders: false, customReminderTimes: userDocData.customReminderTimes || [] };

  const researchRemindersActive = computeResearchRemindersActive(
    {
      ...userDocData.notificationSettings,
      hasCustomProtocolReminders: customMeta.hasCustomProtocolReminders,
    },
    userDocData.fcmToken
  );

  const userPatch = {
    researchRemindersActive,
    hasCustomProtocolReminders: customMeta.hasCustomProtocolReminders,
    customReminderTimes: customMeta.customReminderTimes,
    reminderQueueSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await db.collection('users').doc(userId).set(userPatch, { merge: true });

  if (!researchRemindersActive) {
    const pending = await db.collection(QUEUE_COLLECTION).where('userId', '==', userId).where('status', '==', 'pending').get();
    const batch = db.batch();
    pending.docs.forEach((d) => batch.delete(d.ref));
    if (!pending.empty) await batch.commit();
    return { success: true, queued: 0, active: false };
  }

  const slots = buildSlotList({ ...userDocData, ...userPatch, customReminderTimes: customMeta.customReminderTimes }, userDataObj);
  const now = new Date();
  const entries = [];

  for (let dayOffset = 0; dayOffset < QUEUE_HORIZON_DAYS; dayOffset++) {
    for (const slot of slots) {
      const baseLocal = getLocalTimeParts(now, slot.timezone);
      const targetDay = new Date(baseLocal.year, baseLocal.month - 1, baseLocal.day);
      targetDay.setDate(targetDay.getDate() + dayOffset);
      const { hour, minute } = parseTimeHHMM(slot.slotTime);
      const dueAt = zonedTimeToUtc(
        {
          year: targetDay.getFullYear(),
          month: targetDay.getMonth() + 1,
          day: targetDay.getDate(),
          hour,
          minute: roundMinuteTo15(minute),
        },
        slot.timezone
      );

      if (dueAt.getTime() < now.getTime() - WINDOW_MS) continue;

      const localDateKey = `${targetDay.getFullYear()}-${String(targetDay.getMonth() + 1).padStart(2, '0')}-${String(targetDay.getDate()).padStart(2, '0')}`;
      entries.push({
        id: `${userId}_${slot.slotKey}_${localDateKey}`,
        userId,
        slotKey: slot.slotKey,
        slotType: slot.slotType,
        slotTime: slot.slotTime,
        timezone: slot.timezone,
        localDateKey,
        dueAt: admin.firestore.Timestamp.fromDate(dueAt),
        status: 'pending',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  const batch = db.batch();
  const pending = await db.collection(QUEUE_COLLECTION).where('userId', '==', userId).where('status', '==', 'pending').get();
  pending.docs.forEach((d) => batch.delete(d.ref));
  for (const entry of entries) {
    batch.set(db.collection(QUEUE_COLLECTION).doc(entry.id), entry, { merge: true });
  }
  await batch.commit();

  return { success: true, queued: entries.length, active: true };
}

async function markQueueEntriesProcessed(queueDocs, status = 'sent') {
  if (!queueDocs || queueDocs.length === 0) return;
  const db = admin.firestore();
  const batch = db.batch();
  for (const doc of queueDocs) {
    batch.update(doc.ref, {
      status,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
}

async function backfillStaleQueues(limit = BACKFILL_BATCH) {
  const db = admin.firestore();
  const snap = await db.collection('users').limit(limit * 5).get();

  let synced = 0;
  for (const doc of snap.docs) {
    if (synced >= limit) break;
    const data = doc.data();

    // One-time migration: compute flags + queue for users not yet synced
    if (data.reminderQueueSyncedAt === undefined || data.researchRemindersActive === undefined) {
      await syncResearchReminderQueue(doc.id);
      synced++;
      continue;
    }

    if (!data.researchRemindersActive) continue;
    const syncedAt = data.reminderQueueSyncedAt?.toDate?.() || null;
    const stale = !syncedAt || Date.now() - syncedAt.getTime() > 24 * 60 * 60 * 1000;
    if (!stale) continue;
    await syncResearchReminderQueue(doc.id);
    synced++;
  }
  if (synced > 0) logger.info(`research_reminder_queue backfill: synced ${synced} users`);
  return synced;
}

// ── Main cron ──────────────────────────────────────────────────────

async function runScheduledResearchReminders() {
  const db = admin.firestore();
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MS);
  const promises = [];
  const processedUserIds = new Set();

  // Step 3: calendar queue — who is due in this 15-min window?
  const dueSnap = await db
    .collection(QUEUE_COLLECTION)
    .where('status', '==', 'pending')
    .where('dueAt', '>', admin.firestore.Timestamp.fromDate(windowStart))
    .where('dueAt', '<=', admin.firestore.Timestamp.fromDate(now))
    .limit(500)
    .get();

  logger.info(`research_reminders: ${dueSnap.size} queue entries due this window`);

  const queueByUser = new Map();
  for (const doc of dueSnap.docs) {
    const entry = doc.data();
    if (!queueByUser.has(entry.userId)) queueByUser.set(entry.userId, { docs: [], slots: new Set() });
    const bucket = queueByUser.get(entry.userId);
    bucket.docs.push(doc);
    bucket.slots.add(entry.slotKey);
  }

  for (const [userId, { docs, slots }] of queueByUser) {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      await markQueueEntriesProcessed(docs, 'skipped');
      continue;
    }
    const userDataDoc = await db.collection('userData').doc(userId).get();
    await processUserResearchReminders(
      userId,
      userDoc,
      userDataDoc.exists ? userDataDoc.data() : null,
      now,
      promises,
      slots
    );
    await markQueueEntriesProcessed(docs, 'sent');
    processedUserIds.add(userId);
  }

  // Step 2 + 1 fallback: active users not handled by queue (migration / missed sync)
  const activeSnap = await db.collection('users').where('researchRemindersActive', '==', true).limit(500).get();

  for (const userDoc of activeSnap.docs) {
    const userId = userDoc.id;
    if (processedUserIds.has(userId)) continue;

    const userDocData = userDoc.data();
    if (!couldUserHaveReminderThisRun(userDocData, now)) continue;

    if (!userDocData.reminderQueueSyncedAt) {
      await syncResearchReminderQueue(userId);
    }

    const activeSlots = slotKeysForUserThisRun(userDocData, now);
    if (activeSlots.size === 0) continue;

    const userDataDoc = await db.collection('userData').doc(userId).get();
    await processUserResearchReminders(
      userId,
      userDoc,
      userDataDoc.exists ? userDataDoc.data() : null,
      now,
      promises,
      activeSlots
    );
    processedUserIds.add(userId);
  }

  await backfillStaleQueues(BACKFILL_BATCH);

  const results = await Promise.allSettled(promises);
  const successful = results.filter((r) => r.status === 'fulfilled' && r.value?.success).length;
  logger.info(`research_reminders done: sent ${successful}/${results.length}, processed ${processedUserIds.size} users`);
  return { success: true, sent: successful, total: results.length, usersProcessed: processedUserIds.size };
}

// ── Exports ────────────────────────────────────────────────────────

exports.scheduledResearchReminders = onSchedule(
  {
    schedule: '*/15 * * * *',
    timeZone: 'UTC',
    memory: '512MiB',
    timeoutSeconds: 540,
    secrets: ['RESEND_API_KEY'],
  },
  async () => {
    logger.info('Running scheduled research reminders (queue + time-gated)...');
    try {
      return await runScheduledResearchReminders();
    } catch (error) {
      logger.error('Error in scheduled research reminders:', error);
      return { success: false, error: error.message };
    }
  }
);

exports.onUserResearchReminderSync = onDocumentUpdated('users/{userId}', async (event) => {
  const before = event.data?.before?.data() || {};
  const after = event.data?.after?.data() || {};
  const nsBefore = JSON.stringify(before.notificationSettings || {});
  const nsAfter = JSON.stringify(after.notificationSettings || {});
  const tzBefore = before.settings?.region?.timeZone;
  const tzAfter = after.settings?.region?.timeZone;
  if (nsBefore === nsAfter && tzBefore === tzAfter && before.fcmToken === after.fcmToken) return null;
  try {
    await syncResearchReminderQueue(event.params.userId);
  } catch (err) {
    logger.warn('onUserResearchReminderSync failed:', err.message);
  }
  return null;
});

exports.onUserDataResearchReminderSync = onDocumentUpdated('userData/{userId}', async (event) => {
  const before = event.data?.before?.data() || {};
  const after = event.data?.after?.data() || {};
  const protocolsChanged = JSON.stringify(before.protocols) !== JSON.stringify(after.protocols);
  const supplementsChanged = JSON.stringify(before.supplements) !== JSON.stringify(after.supplements);
  if (!protocolsChanged && !supplementsChanged) return null;
  try {
    await syncResearchReminderQueue(event.params.userId);
  } catch (err) {
    logger.warn('onUserDataResearchReminderSync failed:', err.message);
  }
  return null;
});

// ── One-time autoscan: fix all existing users ─────────────────────
//
// Finds every user who has Research Reminders turned on but whose
// AM and/or PM sub-toggles were never saved (old default was false).
// Sets both to true so they start receiving pushes, then rebuilds
// their reminder queue so they're queued up immediately.
// Run once from the admin panel or Firebase console.
//
exports.fixResearchReminderDefaults = onCall(
  { timeoutSeconds: 540, memory: '512MiB' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be signed in.');

    const db = admin.firestore();
    const usersSnap = await db.collection('users').get();

    let fixed = 0;
    let alreadyOk = 0;
    let skipped = 0;

    for (const userDoc of usersSnap.docs) {
      const data = userDoc.data();
      const ns = data.notificationSettings || {};

      // Skip users with push entirely off and no FCM token
      const pushOn = ns.push === true || ns.pushEnabled === true || !!data.fcmToken;
      if (!pushOn) { skipped++; continue; }

      const masterOn = ns.researchReminders === true;
      const amOn = ns.researchRemindersAM === true;
      const pmOn = ns.researchRemindersPM === true;

      // No reminder intent at all — skip
      if (!masterOn && !amOn && !pmOn) { skipped++; continue; }

      if (amOn || pmOn) {
        // Already has explicit sub-toggles — just make sure queue exists
        if (!data.reminderQueueSyncedAt) {
          await syncResearchReminderQueue(userDoc.id);
        }
        alreadyOk++;
        continue;
      }

      // Master is on but AM/PM were never saved → fix them
      await db.collection('users').doc(userDoc.id).set(
        {
          notificationSettings: {
            researchRemindersAM: true,
            researchRemindersPM: true,
          },
          researchRemindersActive: true,
        },
        { merge: true }
      );
      await syncResearchReminderQueue(userDoc.id);
      fixed++;

      logger.info(`fixResearchReminderDefaults: fixed user ${userDoc.id}`);
    }

    logger.info(`fixResearchReminderDefaults done — fixed: ${fixed}, already ok: ${alreadyOk}, skipped: ${skipped}`);
    return { success: true, fixed, alreadyOk, skipped, total: usersSnap.size };
  }
);

module.exports.syncResearchReminderQueue = syncResearchReminderQueue;
module.exports.runScheduledResearchReminders = runScheduledResearchReminders;
module.exports.computeResearchRemindersActive = computeResearchRemindersActive;
module.exports.couldUserHaveReminderThisRun = couldUserHaveReminderThisRun;
