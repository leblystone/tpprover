export function appendStockEvent(event) {
  try {
    const now = new Date().toISOString();
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const rec = { id: uniqueId, date: now, ...event };
    const raw = localStorage.getItem('tpprover_stockpile_history');
    const arr = raw ? JSON.parse(raw) : [];
    arr.unshift(rec);
    localStorage.setItem('tpprover_stockpile_history', JSON.stringify(arr));
  } catch {}
}

export function getStockHistory() {
  try { return JSON.parse(localStorage.getItem('tpprover_stockpile_history') || '[]'); } catch { return []; }
}