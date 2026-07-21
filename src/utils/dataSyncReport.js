/**
 * Runtime Data-Sync Diagnostic
 *
 * Exposes `window.tppDataSyncReport()` which prints a structured summary of
 * the current user's sync health: localStorage vs cloud counts, items missing
 * id/updatedAt, sync queue depth, timezone mismatches, and snapshot status.
 *
 * Loaded by debugUtils.js (or imported anywhere) — zero impact on production
 * unless explicitly called from the browser console.
 */

import { getSyncQueueDiagnostics } from './syncQueue';
import { diagnoseDataBleed } from './dataBleedDiagnostic';

const ENTITY_KEYS = {
  protocols:       'tpprover_protocols',
  orders:          'tpprover_orders',
  stockpile:       'tpprover_stockpile',
  vendors:         'tpprover_vendors',
  supplements:     'tpprover_supplements',
  reconItems:      'tpprover_recon_items',
  reconHistory:    'tpprover_recon_history',
  metrics:         'tpprover_metrics',
  scheduledBuys:   'tpprover_scheduled_buys',
  protocolHistory: 'tpprover_protocol_history',
  injectionHistory:'tpprover_injection_history',
  wishlist:        'tpprover_wishlist',
  userNotes:       'tpprover_user_notes',
  userGoals:       'tpprover_user_goals',
};

const OBJECT_KEYS = {
  calendarNotes:   'tpprover_calendar_notes',
  taskCompletion:  'tpprover_task_completion',
  waterTracker:    'tpprover_water_tracker',
  calendarDone:    'tpprover_calendar_done',
  taskStreak:      'tpprover_task_streak_v1',
  hydrationStreak: 'tpprover_hydration_streak_v1',
  injectionStats:  'tpprover_injection_stats',
  taskScheduleSkips: 'tpprover_task_skips',
  taskScheduleExtras: 'tpprover_task_extras',
  taskScheduleMoves: 'tpprover_task_schedule_overrides',
};

function safeParse(lsKey) {
  try {
    const raw = localStorage.getItem(lsKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function countItems(parsed) {
  if (Array.isArray(parsed)) return parsed.length;
  if (parsed && typeof parsed === 'object') return Object.keys(parsed).length;
  return 0;
}

function auditArray(parsed) {
  if (!Array.isArray(parsed)) return { count: 0, missingId: 0, missingUpdatedAt: 0, garbageUpdatedAt: 0 };
  let missingId = 0;
  let missingUpdatedAt = 0;
  let garbageUpdatedAt = 0;
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    if (!item.id) missingId++;
    if (!item.updatedAt) {
      missingUpdatedAt++;
    } else if (typeof item.updatedAt === 'object') {
      garbageUpdatedAt++;
    }
  }
  return { count: parsed.length, missingId, missingUpdatedAt, garbageUpdatedAt };
}

function checkTimezone() {
  const d = new Date();
  const utcKey = d.toISOString().slice(0, 10);
  const localKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return {
    localTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    utcDateKey: utcKey,
    localDateKey: localKey,
    mismatch: utcKey !== localKey,
  };
}

export async function tppDataSyncReport() {
  console.group('📊 TPP Data Sync Report');

  // 1. Entity counts (local)
  console.group('📦 Local Entity Counts & Quality');
  const entityReport = {};
  for (const [name, lsKey] of Object.entries(ENTITY_KEYS)) {
    const parsed = safeParse(lsKey);
    const audit = auditArray(parsed);
    entityReport[name] = audit;
    const issues = [];
    if (audit.missingId > 0) issues.push(`${audit.missingId} missing id`);
    if (audit.missingUpdatedAt > 0) issues.push(`${audit.missingUpdatedAt} missing updatedAt`);
    if (audit.garbageUpdatedAt > 0) issues.push(`${audit.garbageUpdatedAt} garbage updatedAt`);
    const issueStr = issues.length > 0 ? ` ⚠️ ${issues.join(', ')}` : '';
    console.log(`  ${name}: ${audit.count} items${issueStr}`);
  }
  for (const [name, lsKey] of Object.entries(OBJECT_KEYS)) {
    const parsed = safeParse(lsKey);
    const count = countItems(parsed);
    console.log(`  ${name}: ${count} keys`);
  }
  console.groupEnd();

  // 2. Cloud comparison
  console.group('☁️ Cloud Comparison');
  try {
    const userStr = localStorage.getItem('tpprover_user');
    const user = userStr ? JSON.parse(userStr) : null;
    if (user?.uid) {
      const { loadAppData, loadCloudSnapshotList, getLastCloudSyncTime } = await import('../services/cloudStorage');
      const [cloudData, snapshots, lastSync] = await Promise.all([
        loadAppData(user.uid),
        loadCloudSnapshotList(user.uid),
        getLastCloudSyncTime(user.uid),
      ]);

      if (cloudData) {
        for (const [name] of Object.entries(ENTITY_KEYS)) {
          const cloudArr = cloudData[name];
          const cloudCount = Array.isArray(cloudArr) ? cloudArr.length : 0;
          const localCount = entityReport[name]?.count || 0;
          const diff = localCount - cloudCount;
          const flag = Math.abs(diff) > 5 ? ' ⚠️' : '';
          console.log(`  ${name}: local=${localCount} cloud=${cloudCount} diff=${diff > 0 ? '+' : ''}${diff}${flag}`);
        }
      } else {
        console.log('  No cloud data found for this user');
      }

      console.log(`  Last cloud sync: ${lastSync ? new Date(lastSync).toLocaleString() : 'never'}`);
      console.log(`  Cloud snapshots: ${snapshots.length} (max 7)`);
      snapshots.forEach((s, i) => {
        console.log(`    ${i + 1}. ${s.reason} — ${s.createdAt} (${s.totalItems || '?'} items)`);
      });
    } else {
      console.log('  No authenticated user — skipping cloud comparison');
    }
  } catch (e) {
    console.warn('  Cloud comparison failed:', e.message);
  }
  console.groupEnd();

  // 3. Sync queue
  console.group('🔄 Sync Queue');
  const queueDiag = getSyncQueueDiagnostics();
  console.log(`  Queue length: ${queueDiag.queueLength}`);
  console.log(`  Processing: ${queueDiag.processing}`);
  console.log(`  Total processed: ${queueDiag.stats.totalProcessed}`);
  console.log(`  Total failed: ${queueDiag.stats.totalFailed}`);
  console.log(`  High water mark: ${queueDiag.stats.queueHighWater}`);
  const syncPending = localStorage.getItem('tpprover_sync_pending');
  console.log(`  Pending flag: ${syncPending ? `YES (since ${new Date(Number(syncPending)).toLocaleString()})` : 'no'}`);
  console.groupEnd();

  // 4. Timezone
  console.group('🌐 Timezone');
  const tz = checkTimezone();
  console.log(`  Timezone: ${tz.localTimezone}`);
  console.log(`  UTC date key: ${tz.utcDateKey}`);
  console.log(`  Local date key: ${tz.localDateKey}`);
  if (tz.mismatch) {
    console.warn('  ⚠️ UTC and local date keys differ — date-keyed entities (water, calendar, tasks) may show wrong day');
  } else {
    console.log('  ✅ No mismatch');
  }
  console.groupEnd();

  // 5. Data bleed diagnostic
  console.group('🔍 Data Bleed Check');
  const bleed = diagnoseDataBleed();
  if (bleed.issues.length > 0) {
    bleed.issues.forEach(i => console.error(`  CRITICAL: ${i.message}`, i.details));
  }
  if (bleed.warnings.length > 0) {
    bleed.warnings.forEach(w => console.warn(`  Warning: ${typeof w === 'string' ? w : w.message}`));
  }
  if (bleed.issues.length === 0 && bleed.warnings.length === 0) {
    console.log('  ✅ No data bleed issues detected');
  }
  console.groupEnd();

  console.groupEnd();

  return { entityReport, queueDiag, timezone: tz, bleed };
}

if (typeof window !== 'undefined') {
  window.tppDataSyncReport = tppDataSyncReport;
}
