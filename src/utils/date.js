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
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split('-');
      return `${m}/${d}/${y}`;
    }
    // try Date parse fallback
    const dt = new Date(s);
    if (!isNaN(dt.getTime())) {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      return `${m}/${d}/${y}`;
    }
  } catch {}
  return String(value);
}


