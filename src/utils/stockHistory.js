export function appendStockEvent(event) {
  try {
    const now = new Date().toISOString()
    const rec = { id: Date.now(), date: now, ...event }
    const raw = localStorage.getItem('tpprover_stockpile_history')
    const arr = raw ? JSON.parse(raw) : []
    arr.unshift(rec)
    localStorage.setItem('tpprover_stockpile_history', JSON.stringify(arr))
  } catch {}
}

export function getStockHistory() {
  try { return JSON.parse(localStorage.getItem('tpprover_stockpile_history') || '[]') } catch { return [] }
}


