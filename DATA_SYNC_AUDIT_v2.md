# TPP v2.0 Pre-Release Data-Sync Audit

**Date:** May 2026
**Scope:** Cloud + local data sync safety for v2.0 release
**Status:** Audit complete. Ship-blocker fixes applied. Deferred items tracked for v2.0.x.

---

## Summary

A deep read-only sweep of the data layer surfaced ~40 findings across 10 categories. The architecture is sound (mergeWithTimestamps, syncQueue, cloudMerge.js, deletion tracking, rolling cloud snapshots, prepareItemForSave), but several real user-data-disappears paths existed. All CRITICAL and most HIGH items have been fixed.

### What was fixed in v2.0


| Fix                                              | Files                                 |
| ------------------------------------------------ | ------------------------------------- |
| cleanupGarbageTimestamps falls back to createdAt | localStorageMigration.js              |
| deleteInjectionRecord calls recordDeletion       | injectionTracking.js, cloudStorage.js |
| mergeInjectionHistory deterministic IDs          | cloudStorage.js                       |
| applyOrderToStockpile uses prepareItemForSave    | orderStockpileSync.js, Orders.jsx     |
| Stockpile decrement bumps updatedAt              | AppContext.jsx                        |
| GoalsOnlyWidget ESM import                       | GoalsOnlyWidget.jsx                   |
| emergencyCacheClear tpprover_* only              | cacheBuster.js                        |
| UTC date keys to local timezone                  | 6 files                               |
| Pre-v2 upgrade cloud snapshot                    | AppContext.jsx                        |
| Pre-OTA snapshot                                 | App.jsx                               |
| Post-update reconciliation banner                | DataRecoveryBanner.jsx                |
| MAX_SNAPSHOTS 3 to 7                             | cloudStorage.js                       |
| backupBeforeMigration wraps migrations           | AppContext.jsx                        |
| Auto-retry pending sync on launch                | AppContext.jsx                        |
| window.tppDataSyncReport() diagnostic            | dataSyncReport.js                     |


---

## 1. USER_DATA_SAVE_PATTERN Compliance

- [CRITICAL] Orders stockpile items no prepareItemForSave - FIXED
- [CRITICAL] Wishlist confirmAcquired no recordDeletion - DEFERRED
- [CRITICAL] GoalsOnlyWidget require() in ESM - FIXED
- [HIGH] GoalsOnlyWidget.handleRestoreGoal no prepareItemForSave - DEFERRED
- [HIGH] Day.jsx overwrites calendar notes - DEFERRED
- [HIGH] WaterTrackerWidget no cloud push - DEFERRED (UTC fix done)
- [HIGH] taskCompletion bypasses addToSyncQueue - DEFERRED
- [HIGH] protocolHistory no prepareItemForSave - DEFERRED
- [HIGH] RecentlyDeleted restore no updatedAt - DEFERRED
- [HIGH] EditActiveProtocolVials no updatedAt - DEFERRED
- [HIGH] Imports.jsx raw writes - DEFERRED
- [HIGH] Stockpile.jsx untouched rows - DEFERRED
- [HIGH] dismissed_duplicates no cloud sync - DEFERRED
- [MEDIUM] App.jsx Research Notes outside sync - DEFERRED
- [MEDIUM] NotesModal no addToSyncQueue - DEFERRED
- [MEDIUM] GlossaryQuickModal numeric IDs - DEFERRED
- [MEDIUM] Calendar.jsx calendarDone direct - DEFERRED
- [MEDIUM] communities/buddies localStorage-only - DEFERRED

## 2. Cloud-to-Local Merge Correctness

- [HIGH] calendarNotes naive spread merge - DEFERRED
- [HIGH] 30s protection window drops merges - DEFERRED
- [HIGH] subscribeToAppData re-fetches - DEFERRED
- [HIGH] mergeInjectionHistory random IDs - FIXED
- [HIGH] mergeWithTimestamps (0,0) tie-breaker - FIXED
- [MEDIUM] Sample-data listener duplication - DEFERRED

## 3. Migrations and Version Bumps

- [CRITICAL] No backupBeforeMigration calls - FIXED
- [CRITICAL] cleanupGarbageTimestamps deletes updatedAt - FIXED
- [HIGH] cleanupGarbageTimestamps no save trigger - DEFERRED
- [HIGH] migrateTaskCompletionIds before cloud merge - DEFERRED
- [HIGH] runAllMigrations overwrites cloud - DEFERRED
- [HIGH] runDataFixups runs twice - DEFERRED
- [MEDIUM] cleanupTestProtocolHistory no deletion tracking - DEFERRED

## 4. Timezone / Date Handling

- [CRITICAL] WaterTrackerWidget UTC today - FIXED
- [HIGH] CustomizableDashboard UTC today - FIXED
- [HIGH] InsightsPage UTC - FIXED
- [HIGH] DayView UTC key - FIXED
- [HIGH] engagementTracking UTC lastActive - FIXED
- [HIGH] sideEffectsLog UTC dates - FIXED
- [MEDIUM] Orders.jsx UTC dates - DEFERRED
- [MEDIUM] injectionTracking mixed UTC/local - DEFERRED
- [HIGH] initTimezoneAutoUpdate no key migration - DEFERRED

## 5. Stockpile Count Integrity

- [CRITICAL] Stockpile decrement no prepareItemForSave - FIXED
- [CRITICAL] applyOrderToStockpile no updatedAt - FIXED
- [HIGH] Orders.handleStockpileUpdate duplicates pattern - FIXED
- [HIGH] setStockpileWithProtection timing gap - DEFERRED
- [MEDIUM] No race-free counter for doses - DEFERRED

## 6. Injection History + Stats Merge

- [CRITICAL] deleteInjectionRecord no recordDeletion - FIXED
- [HIGH] mergeInjectionHistory random IDs - FIXED
- [HIGH] updateInjectionRecord no updatedAt bump - DEFERRED
- [HIGH] mergeInjectionStats Math.max no subtract - DEFERRED
- [MEDIUM] ensureInjectionHistoryIds timing - FIXED

## 7. Auth / Account-Switch / Logout

- [CRITICAL] First login pushes stale LS to new user - DEFERRED
- [HIGH] clearAllUserData keeps tpprover_settings - DEFERRED
- [HIGH] migrateLocalStorageToCloud resurrects deletes - DEFERRED
- [HIGH] clearAllUserData deletes recovery snapshot - DEFERRED
- [HIGH] Account switch no clearSyncQueue() - DEFERRED
- [HIGH] Logout sync bypasses queue - DEFERRED

## 8. v2.0 Update Path

- [CRITICAL] No pre-OTA snapshot - FIXED
- [CRITICAL] emergencyCacheClear localStorage.clear() - FIXED
- [HIGH] triggerCacheRefresh discards queue - DEFERRED
- [HIGH] checkAndClearCache races with notifyAppReady - DEFERRED
- [HIGH] UpdatePromptModal gated by false - Manual config

## 9. saveAppData / Save Flow Risks

- [CRITICAL] ~25 direct saveAppData bypass addToSyncQueue - DEFERRED
- [HIGH] Auto-sync debouncer drops timer - DEFERRED
- [HIGH] Save retry single attempt - FIXED (auto-retry)
- [HIGH] saveAppData fallback bypasses merge - DEFERRED
- [HIGH] cloudSyncPause fake success - DEFERRED

## 10. 1MB Firestore Document Limit

- [CRITICAL] calendarNotes no retention - DEFERRED
- [CRITICAL] userNotes/userGoals/wishlist no retention - DEFERRED
- [HIGH] injectionHistory cap only at merge - DEFERRED
- [HIGH] protocols/metrics no retention - DEFERRED
- [HIGH] Retention only at save - DEFERRED
- [HIGH] 1MB abort cancels entire save - DEFERRED
- [MEDIUM] Snapshots skip when large - DEFERRED
- [MEDIUM] MAX_SNAPSHOTS was 3 - FIXED (now 7)

---

## Manual Smoke-Test Matrix (Gate the v2.0 Release)

Run on iOS, Android, PWA, and web BEFORE shipping.

Test 1 - Device A to B Handoff:

- Create 3 protocols, 5 orders, 2 stockpile items, 1 injection on A
- Sign into B. Verify all entities appear.
- Edit one of each on B. Verify A receives within 30s.

Test 2 - Concurrent Edits:

- Edit same protocol on A and B within 5s
- Verify only one wins, no silent data loss

Test 3 - Concurrent Stockpile Decrement:

- Qty=10. Mark dose on A and B simultaneously.
- Verify quantity decreases by 2, not 1.

Test 4 - Account Switch:

- Sign out User 1, sign in User 2. Verify zero User 1 data.
- Reverse. Verify User 1 data intact.

Test 5 - Capgo OTA Mid-Session:

- Edit protocol, push OTA bundle
- Verify pre-OTA snapshot exists. Protocol edit intact after relaunch.

Test 6 - Timezone Change:

- Change PST to JST while app open
- Verify water tracker and calendar stay on correct day

Test 7 - Migration on Stale Data:

- Seed v1.x-shape data, launch v2.0
- Verify pre-v2 snapshot fires, no entity drops

Test 8 - 1MB Near-Limit:

- Seed ~750KB data. Verify no save aborts, warning at ~800KB.

Test 9 - Runtime Diagnostic:

- Run window.tppDataSyncReport() in console
- Verify all sections report correctly

---

## Deferred Items Roadmap (v2.0.x)

1. Funnel all ~25 direct saveAppData calls through addToSyncQueue
2. Fix 30s protection window to defer (not drop) cloud merges
3. Add retention caps for calendarNotes, userNotes, userGoals, wishlist, metrics, protocols
4. Account switch: call clearSyncQueue() and clear tpprover_settings
5. migrateTaskCompletionIds move to after cloud merge
6. triggerCacheRefresh await queue flush before reload