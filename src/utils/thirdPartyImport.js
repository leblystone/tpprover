/**
 * Third-party CSV import helpers (Shotsy & Peppedia).
 * CSV only — merges into existing local data (does not replace).
 */

import { prepareItemForSave } from './userDataSave';

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Parse a CSV string into { headers, rows }.
 * Handles BOM and quoted fields.
 */
export function parseCSV(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('File is empty');
  }

  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) {
    throw new Error('File is empty');
  }

  const firstLine = lines[0].startsWith('\uFEFF') ? lines[0].slice(1) : lines[0];
  const headers = parseCSVLine(firstLine).map((h) => h.trim());
  const rows = lines.slice(1).map((line, index) => {
    const values = parseCSVLine(line);
    const row = { _rowIndex: index };
    headers.forEach((header, i) => {
      row[header] = (values[i] ?? '').trim();
    });
    return row;
  }).filter((row) =>
    headers.some((h) => row[h] && String(row[h]).trim() !== '')
  );

  return { headers, rows };
}

function toDateKey(dateStr) {
  if (!dateStr) return null;
  // Accept YYYY-MM-DD, MM/DD/YYYY, or full ISO
  const cleaned = String(dateStr).trim();
  const isoMatch = cleaned.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];

  const slash = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) {
    const [, m, d, y] = slash;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const d = new Date(cleaned);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }
  return null;
}

function toISODate(dateStr, timeStr) {
  const dateKey = toDateKey(dateStr);
  if (!dateKey) return new Date().toISOString();

  const time = (timeStr || '00:00:00').trim();
  // Shotsy often uses HH:MM or HH:MM:SS (UTC)
  const timeNorm = /^\d{1,2}:\d{2}/.test(time) ? time : '00:00:00';
  const candidate = `${dateKey}T${timeNorm.includes(':') && timeNorm.split(':').length === 2 ? `${timeNorm}:00` : timeNorm}Z`;
  const d = new Date(candidate);
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  return `${dateKey}T00:00:00.000Z`;
}

function parseNumber(val) {
  if (val == null || val === '') return null;
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function getCol(row, ...aliases) {
  for (const alias of aliases) {
    if (row[alias] != null && String(row[alias]).trim() !== '') return String(row[alias]).trim();
  }
  // Case-insensitive fallback
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const found = keys.find((k) => k.toLowerCase() === alias.toLowerCase());
    if (found && row[found] != null && String(row[found]).trim() !== '') {
      return String(row[found]).trim();
    }
  }
  return '';
}

/**
 * Detect whether headers look like a Shotsy export.
 */
export function looksLikeShotsy(headers = []) {
  const lower = headers.map((h) => h.toLowerCase());
  const hasDate = lower.some((h) => h.includes('date'));
  const hasShot = lower.some((h) => h === 'shot' || h.includes('shot'));
  const hasSite = lower.some((h) => h === 'site');
  return hasDate && (hasShot || hasSite);
}

/**
 * Convert Shotsy CSV rows into TPP-shaped payloads (not yet merged).
 */
export function mapShotsyRows(rows) {
  const injectionHistory = [];
  const metrics = [];
  const waterTracker = {};
  const userNotes = [];
  const seenNotes = new Set();

  for (const row of rows) {
    const dateRaw = getCol(row, 'Date (UTC)', 'Date', 'date');
    const timeRaw = getCol(row, 'Time (UTC)', 'Time', 'time');
    const dateKey = toDateKey(dateRaw);
    const iso = toISODate(dateRaw, timeRaw);

    const shot = getCol(row, 'Shot', 'shot', 'Medication', 'Peptide');
    const site = getCol(row, 'Site', 'site', 'Injection Site');
    const shotNotes = getCol(row, 'Shot Notes', 'Shot Notes ', 'Notes');
    const weight = parseNumber(getCol(row, 'Recorded Weight', 'Weight', 'weight'));
    const water = parseNumber(getCol(row, 'Water', 'water'));
    const dayNotes = getCol(row, 'Day Notes', 'Day Note', 'Daily Notes');

    if (shot || site) {
      injectionHistory.push(
        prepareItemForSave(
          {
            taskName: shot || 'Imported shot',
            taskType: 'peptide',
            injectionSite: site || '',
            date: iso,
            dateKey: dateKey || iso.slice(0, 10),
            timeSlot: (() => {
              try {
                const h = new Date(iso).getUTCHours();
                return h < 12 ? 'AM' : 'PM';
              } catch {
                return 'AM';
              }
            })(),
            timestamp: iso,
            notes: shotNotes || '',
            source: 'shotsy',
          },
          { isNew: true }
        )
      );
    }

    if (weight != null && dateKey) {
      metrics.push(
        prepareItemForSave(
          {
            type: 'weight',
            name: 'Weight',
            value: weight,
            unit: 'lb',
            date: iso,
            notes: 'Imported from another peptide app',
            source: 'shotsy',
          },
          { isNew: true }
        )
      );
    }

    if (water != null && dateKey) {
      // Shotsy water is typically ounces; store as amount with unit oz
      waterTracker[dateKey] = {
        glasses: water,
        amount: water,
        goal: 64,
        unit: 'oz',
        lastUpdated: iso,
        source: 'shotsy',
      };
    }

    if (dayNotes && dateKey && !seenNotes.has(`${dateKey}:${dayNotes}`)) {
      seenNotes.add(`${dateKey}:${dayNotes}`);
      userNotes.push(
        prepareItemForSave(
          {
            noteKind: 'text',
            title: `Imported note — ${dateKey}`,
            content: dayNotes,
            createdAt: iso,
            source: 'shotsy',
          },
          { isNew: true }
        )
      );
    }
  }

  return { injectionHistory, metrics, waterTracker, userNotes };
}

/** Peppedia field options for column mapping */
export const PEPPEDIA_FIELD_OPTIONS = [
  { value: 'name', label: 'Name / Peptide' },
  { value: 'quantity', label: 'Quantity' },
  { value: 'mg', label: 'Amount (mg)' },
  { value: 'expiration', label: 'Expiration' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'noteTitle', label: 'Note Title' },
  { value: 'noteContent', label: 'Note Content' },
  { value: 'metricType', label: 'Metric Type' },
  { value: 'metricValue', label: 'Metric Value' },
  { value: 'metricUnit', label: 'Metric Unit' },
  { value: 'date', label: 'Date' },
  { value: 'skip', label: 'Skip' },
];

/**
 * Auto-detect Peppedia-style column mapping from headers.
 */
export function autoDetectPeppediaMapping(headers = []) {
  const mapping = {};
  headers.forEach((header) => {
    const h = header.toLowerCase();
    if (h.includes('name') || h.includes('peptide') || h.includes('compound') || h.includes('item')) {
      mapping[header] = 'name';
    } else if (h.includes('qty') || h.includes('quantity') || h.includes('count') || h.includes('stock') || h.includes('vial')) {
      mapping[header] = 'quantity';
    } else if (h === 'mg' || h.includes('amount') || h.includes('dose') || h.includes('strength')) {
      mapping[header] = 'mg';
    } else if (h.includes('expir') || h.includes('expiry') || h.includes('best by')) {
      mapping[header] = 'expiration';
    } else if (h.includes('vendor') || h.includes('source') || h.includes('supplier')) {
      mapping[header] = 'vendor';
    } else if (h.includes('title') || h === 'subject') {
      mapping[header] = 'noteTitle';
    } else if (h.includes('note') || h.includes('journal') || h.includes('content') || h.includes('body') || h.includes('description')) {
      mapping[header] = 'noteContent';
    } else if (h.includes('metric') && h.includes('type')) {
      mapping[header] = 'metricType';
    } else if ((h.includes('weight') || h.includes('value') || h.includes('metric')) && !h.includes('type')) {
      mapping[header] = 'metricValue';
    } else if (h.includes('unit')) {
      mapping[header] = 'metricUnit';
    } else if (h.includes('date') || h.includes('time')) {
      mapping[header] = 'date';
    } else {
      mapping[header] = 'skip';
    }
  });
  return mapping;
}

/**
 * Map Peppedia CSV rows using user-confirmed column mapping.
 */
export function mapPeppediaRows(rows, columnMapping = {}) {
  const stockpile = [];
  const userNotes = [];
  const metrics = [];

  for (const row of rows) {
    const mapped = {
      name: '',
      quantity: '',
      mg: '',
      expiration: '',
      vendor: '',
      noteTitle: '',
      noteContent: '',
      metricType: '',
      metricValue: '',
      metricUnit: '',
      date: '',
    };

    Object.keys(columnMapping).forEach((csvCol) => {
      const field = columnMapping[csvCol];
      if (field && field !== 'skip' && row[csvCol] != null) {
        mapped[field] = String(row[csvCol]).trim();
      }
    });

    const dateKey = toDateKey(mapped.date);
    const iso = mapped.date ? toISODate(mapped.date) : new Date().toISOString();

    // Stockpile row if name + (quantity or mg)
    if (mapped.name && (mapped.quantity || mapped.mg)) {
      stockpile.push(
        prepareItemForSave(
          {
            name: mapped.name,
            mg: mapped.mg || '',
            quantity: mapped.quantity || '1',
            vendor: mapped.vendor || '',
            cost: '',
            unit: 'vial',
            mgUnit: 'mg',
            date: mapped.expiration || '',
            vendorId: null,
            purity: '',
            capColor: '',
            batchNumber: '',
            documentation: [],
            source: 'peppedia',
          },
          { isNew: true }
        )
      );
    }

    // Journal / notes
    if (mapped.noteContent || (mapped.noteTitle && !mapped.name)) {
      userNotes.push(
        prepareItemForSave(
          {
            noteKind: 'text',
            title: mapped.noteTitle || mapped.name || `Imported note — ${dateKey || 'note'}`,
            content: mapped.noteContent || '',
            createdAt: iso,
            source: 'peppedia',
          },
          { isNew: true }
        )
      );
    }

    // Metrics
    const metricVal = parseNumber(mapped.metricValue);
    if (metricVal != null) {
      const type = (mapped.metricType || 'weight').toLowerCase().replace(/\s+/g, '_');
      metrics.push(
        prepareItemForSave(
          {
            type: type.includes('weight') ? 'weight' : type,
            name: mapped.metricType || 'Weight',
            value: metricVal,
            unit: mapped.metricUnit || (type.includes('weight') ? 'lb' : ''),
            date: iso,
            notes: 'Imported from another peptide app',
            source: 'peppedia',
          },
          { isNew: true }
        )
      );
    }
  }

  return { stockpile, userNotes, metrics };
}

function safeParse(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * Merge Shotsy-mapped data into localStorage (append + dedupe).
 * Dedupes injections by dateKey+site+taskName; metrics by date+type+value; water by dateKey.
 */
export function mergeShotsyIntoLocalStorage(mapped) {
  const counts = {
    injectionHistory: 0,
    metrics: 0,
    waterTracker: 0,
    userNotes: 0,
  };

  // Injections
  const existingInj = safeParse('tpprover_injection_history', []);
  const injKeys = new Set(
    existingInj.map(
      (r) => `${r.dateKey || ''}|${(r.injectionSite || '').toLowerCase()}|${(r.taskName || '').toLowerCase()}`
    )
  );
  const newInj = [];
  for (const rec of mapped.injectionHistory || []) {
    const key = `${rec.dateKey || ''}|${(rec.injectionSite || '').toLowerCase()}|${(rec.taskName || '').toLowerCase()}`;
    if (!injKeys.has(key)) {
      injKeys.add(key);
      newInj.push(rec);
      counts.injectionHistory += 1;
    }
  }
  if (newInj.length) {
    localStorage.setItem(
      'tpprover_injection_history',
      JSON.stringify([...newInj, ...existingInj])
    );
  }

  // Metrics
  const existingMetrics = safeParse('tpprover_metrics', []);
  const metricKeys = new Set(
    existingMetrics.map(
      (m) => `${(m.date || '').slice(0, 10)}|${m.type || ''}|${m.value}`
    )
  );
  const newMetrics = [];
  for (const m of mapped.metrics || []) {
    const key = `${(m.date || '').slice(0, 10)}|${m.type || ''}|${m.value}`;
    if (!metricKeys.has(key)) {
      metricKeys.add(key);
      newMetrics.push(m);
      counts.metrics += 1;
    }
  }
  if (newMetrics.length) {
    localStorage.setItem(
      'tpprover_metrics',
      JSON.stringify([...existingMetrics, ...newMetrics])
    );
  }

  // Water — only fill dates that don't already have intake
  const existingWater = safeParse('tpprover_water_tracker', {});
  let waterAdded = 0;
  for (const [dateKey, entry] of Object.entries(mapped.waterTracker || {})) {
    const existing = existingWater[dateKey];
    const existingAmount = existing
      ? Number(existing.amount ?? existing.glasses ?? 0)
      : 0;
    if (!existing || existingAmount === 0) {
      existingWater[dateKey] = entry;
      waterAdded += 1;
    }
  }
  if (waterAdded) {
    localStorage.setItem('tpprover_water_tracker', JSON.stringify(existingWater));
  }
  counts.waterTracker = waterAdded;

  // Notes
  const existingNotes = safeParse('tpprover_user_notes', []);
  const noteKeys = new Set(
    existingNotes.map((n) => `${(n.title || '').toLowerCase()}|${(n.content || '').slice(0, 80)}`)
  );
  const newNotes = [];
  for (const n of mapped.userNotes || []) {
    const key = `${(n.title || '').toLowerCase()}|${(n.content || '').slice(0, 80)}`;
    if (!noteKeys.has(key)) {
      noteKeys.add(key);
      newNotes.push(n);
      counts.userNotes += 1;
    }
  }
  if (newNotes.length) {
    localStorage.setItem(
      'tpprover_user_notes',
      JSON.stringify([...newNotes, ...existingNotes])
    );
  }

  return counts;
}

/**
 * Merge Peppedia-mapped data into localStorage.
 */
export function mergePeppediaIntoLocalStorage(mapped) {
  const counts = {
    stockpile: 0,
    userNotes: 0,
    metrics: 0,
  };

  const existingStock = safeParse('tpprover_stockpile', []);
  const stockKeys = new Set(
    existingStock.map(
      (s) => `${(s.name || '').toLowerCase()}|${s.mg || ''}|${s.quantity || ''}|${s.vendor || ''}`
    )
  );
  const newStock = [];
  for (const item of mapped.stockpile || []) {
    const key = `${(item.name || '').toLowerCase()}|${item.mg || ''}|${item.quantity || ''}|${item.vendor || ''}`;
    if (!stockKeys.has(key)) {
      stockKeys.add(key);
      newStock.push(item);
      counts.stockpile += 1;
    }
  }
  if (newStock.length) {
    localStorage.setItem(
      'tpprover_stockpile',
      JSON.stringify([...existingStock, ...newStock])
    );
  }

  const existingNotes = safeParse('tpprover_user_notes', []);
  const noteKeys = new Set(
    existingNotes.map((n) => `${(n.title || '').toLowerCase()}|${(n.content || '').slice(0, 80)}`)
  );
  const newNotes = [];
  for (const n of mapped.userNotes || []) {
    const key = `${(n.title || '').toLowerCase()}|${(n.content || '').slice(0, 80)}`;
    if (!noteKeys.has(key)) {
      noteKeys.add(key);
      newNotes.push(n);
      counts.userNotes += 1;
    }
  }
  if (newNotes.length) {
    localStorage.setItem(
      'tpprover_user_notes',
      JSON.stringify([...newNotes, ...existingNotes])
    );
  }

  const existingMetrics = safeParse('tpprover_metrics', []);
  const metricKeys = new Set(
    existingMetrics.map(
      (m) => `${(m.date || '').slice(0, 10)}|${m.type || ''}|${m.value}`
    )
  );
  const newMetrics = [];
  for (const m of mapped.metrics || []) {
    const key = `${(m.date || '').slice(0, 10)}|${m.type || ''}|${m.value}`;
    if (!metricKeys.has(key)) {
      metricKeys.add(key);
      newMetrics.push(m);
      counts.metrics += 1;
    }
  }
  if (newMetrics.length) {
    localStorage.setItem(
      'tpprover_metrics',
      JSON.stringify([...existingMetrics, ...newMetrics])
    );
  }

  return counts;
}

export function totalImportCount(counts = {}) {
  return Object.values(counts).reduce((sum, n) => sum + (Number(n) || 0), 0);
}
