import { parseDateString, normalizeToMidnight, getDayDifference, getLocalDateString, formatMMDDYYYY } from './date';

/**
 * Resolve a protocol's run end date (for washout window math).
 * Prefers stored endDate; falls back to startDate + duration when needed.
 */
function resolveProtocolEndDate(protocol) {
  if (!protocol) return null;
  if (protocol.endDate) {
    const parsed = parseDateString(protocol.endDate);
    if (parsed) return normalizeToMidnight(parsed);
  }
  if (!protocol.startDate || protocol.duration?.noEnd === true) return null;
  if (!(Number(protocol.duration?.count) > 0)) return null;

  const start = normalizeToMidnight(parseDateString(protocol.startDate));
  if (!start) return null;

  const end = new Date(start);
  const unit = String(protocol.duration.unit || 'week').toLowerCase();
  const count = Number(protocol.duration.count) || 0;
  if (unit.includes('day')) end.setDate(end.getDate() + count - 1);
  else if (unit.includes('week')) end.setDate(end.getDate() + (count * 7) - 1);
  else if (unit.includes('month')) {
    end.setMonth(end.getMonth() + count);
    end.setDate(end.getDate() - 1);
  } else {
    return null;
  }
  return normalizeToMidnight(end);
}

/**
 * Compute washout [start, end] inclusive dates for a protocol, or null if none.
 */
export function getWashoutWindow(protocol) {
  if (!protocol?.washout?.enabled) return null;
  // Never-started drafts are not in washout
  if (protocol.active === false && !protocol.endType) return null;

  const endDt = resolveProtocolEndDate(protocol);
  if (!endDt) return null;

  const wCount = Number(protocol.washout.count) || 0;
  if (wCount <= 0) return null;

  const washStart = new Date(endDt.getFullYear(), endDt.getMonth(), endDt.getDate() + 1);
  const washEnd = new Date(washStart);
  const wUnit = String(protocol.washout.unit || 'week').toLowerCase();
  if (wUnit.includes('day')) washEnd.setDate(washEnd.getDate() + wCount - 1);
  else if (wUnit.includes('week')) washEnd.setDate(washEnd.getDate() + (wCount * 7) - 1);
  else if (wUnit.includes('month')) {
    washEnd.setMonth(washEnd.getMonth() + wCount);
    washEnd.setDate(washEnd.getDate() - 1);
  } else {
    return null;
  }

  return {
    washStart: normalizeToMidnight(washStart),
    washEnd: normalizeToMidnight(washEnd),
    endDate: endDt,
  };
}

/**
 * If the protocol is currently inside its washout window, return details for UI nudges.
 * @returns {null | { washStart, washEnd, daysRemaining, endsToday, endLabel, name }}
 */
export function getActiveWashoutInfo(protocol, asOf = new Date()) {
  const window = getWashoutWindow(protocol);
  if (!window) return null;

  const today = normalizeToMidnight(asOf instanceof Date ? asOf : parseDateString(asOf) || new Date());
  if (!today) return null;

  const { washStart, washEnd } = window;
  if (today < washStart || today > washEnd) return null;

  const daysRemaining = getDayDifference(today, washEnd);
  const name = protocol.protocolName || protocol.name || 'This protocol';

  return {
    washStart,
    washEnd,
    daysRemaining: daysRemaining ?? 0,
    endsToday: daysRemaining === 0,
    endLabel: formatMMDDYYYY(getLocalDateString(washEnd)),
    name,
  };
}
