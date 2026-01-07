/**
 * Returns today's date in YYYY-MM-DD format using LOCAL timezone.
 * This avoids the timezone bug with toISOString() which converts to UTC.
 * @param {Date} [date] - Optional date object, defaults to today
 * @returns {string} Date in YYYY-MM-DD format
 */
export function getLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns a timestamp string in ISO format but preserving LOCAL timezone.
 * This avoids the timezone bug where toISOString() converts to UTC, which can
 * cause the date to shift when displayed to the user.
 * @param {Date} [date] - Optional date object, defaults to current date/time
 * @returns {string} ISO-like timestamp string preserving local date/time
 */
export function getLocalTimestamp(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  // Format: YYYY-MM-DDTHH:mm:ss.sss (no Z suffix, preserving local time)
  return `${y}-${m}-${d}T${h}:${min}:${s}.${ms}`;
}

export function formatMMDDYYYY(value) {
  if (!value) return '';
  try {
    if (value instanceof Date) {
      const y = value.getFullYear();
      const m = String(value.getMonth() + 1).padStart(2, '0');
      const d = String(value.getDate()).padStart(2, '0');
      return `${m}/${d}/${y}`;
    }
    const s = String(value);
    // Handle YYYY-MM-DD format (date only)
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split('-');
      return `${m}/${d}/${y}`;
    }
    // Handle timestamp format (YYYY-MM-DDTHH:mm:ss.sss or YYYY-MM-DDTHH:mm:ss.sssZ)
    // Extract just the date part before 'T' or use the full string
    const datePart = s.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      const [y, m, d] = datePart.split('-');
      return `${m}/${d}/${y}`;
    }
    // try Date parse fallback (handles both UTC and local timestamps)
    const dt = new Date(s);
    if (!isNaN(dt.getTime())) {
      // Use local date components to preserve the user's timezone
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      return `${m}/${d}/${y}`;
    }
  } catch {}
  return String(value);
}


