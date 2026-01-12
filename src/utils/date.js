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

/**
 * Parses a date string into a local Date object.
 * Handles YYYY-MM-DD format in local time to avoid timezone conversion issues.
 * @param {string|Date} dateString - Date string (YYYY-MM-DD) or Date object
 * @returns {Date|null} Parsed Date object in local time, or null if invalid
 */
export function parseDateString(dateString) {
    if (!dateString) return null;
    if (dateString instanceof Date) return dateString;
    if (typeof dateString !== 'string') return new Date(dateString);
    const parts = dateString.split('-');
    if (parts.length !== 3) return new Date(dateString); // Fallback for other formats
    const [year, month, day] = parts.map(Number);
    // Create date in local timezone (month is 0-indexed)
    return new Date(year, month - 1, day);
}

/**
 * Normalizes a date to midnight in local time.
 * CRITICAL: This ensures we're always working with the correct calendar day
 * and prevents timezone-related day boundary issues.
 * @param {Date} date - Date object to normalize
 * @returns {Date|null} Normalized Date object set to midnight local time, or null if invalid
 */
export function normalizeToMidnight(date) {
    if (!date) return null;
    // Extract year/month/day in local time to avoid any timezone conversion issues
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    // Create new date with all time components explicitly set to 0
    const normalized = new Date(year, month, day, 0, 0, 0, 0);
    return normalized;
}

/**
 * Calculates the difference in days between two dates.
 * Uses normalized dates to ensure accurate day calculations.
 * @param {Date} date1 - First date (earlier date)
 * @param {Date} date2 - Second date (later date)
 * @returns {number|null} Number of days difference (date2 - date1), or null if invalid
 */
export function getDayDifference(date1, date2) {
    const normalized1 = normalizeToMidnight(date1);
    const normalized2 = normalizeToMidnight(date2);
    if (!normalized1 || !normalized2) return null;
    return Math.floor((normalized2 - normalized1) / (1000 * 60 * 60 * 24));
}

/**
 * Formats a date to include both date and time
 * @param {Date} date - Date object to format
 * @returns {string} Formatted date string (MM/DD/YYYY HH:MM AM/PM)
 */
export function formatDateTime(date) {
  if (!date) return '';
  try {
    if (!(date instanceof Date)) {
      date = new Date(date);
    }
    if (isNaN(date.getTime())) return '';
    
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const y = date.getFullYear();
    let h = date.getHours();
    const min = String(date.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; // the hour '0' should be '12'
    const hour = String(h).padStart(2, '0');
    
    return `${m}/${d}/${y} ${hour}:${min} ${ampm}`;
  } catch {
    return '';
  }
}

