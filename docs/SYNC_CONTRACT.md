# Sync Contract — Rules for Cross-Device Data

**Purpose:** One place that defines what every synced change must do so new code doesn’t reintroduce data loss or no-sync bugs. Before merging sync-related changes, run the steps in [SYNC_SMOKE_TEST.md](SYNC_SMOKE_TEST.md).

---

## 1. Rules for any new or updated synced data

When you add or change code that **creates, updates, or deletes** user data that syncs to the cloud:

1. **Use `prepareItemForSave()`** for every new or edited item (from `src/utils/userDataSave.js`). Use `{ isNew: true }` for newly created items.
2. **Use `skipMerge: false`** for all critical actions (user-initiated saves that must sync immediately and resolve conflicts by timestamp). Use `skipMerge: true` only when you intentionally overwrite (e.g. full restore).
3. **Use the same merge path** as existing types: saves go through `saveAppData()` in `src/services/cloudStorage.js`, which uses timestamp-based merge and deletion tracking. Don’t bypass it with direct Firestore writes for user data.
4. **Record deletions** when removing items: use `recordDeletion()` from `src/utils/deletionTracking.js` so other devices know to remove the item.
5. **Protection windows** are applied in `AppContext` for each data type (30s). New data types need a protection ref and guard in the listener so the real-time cloud update doesn’t overwrite a recent local edit.

**Where merge lives:** `src/services/cloudStorage.js` — `saveAppData()`, `mergeWithTimestamps()`, and type-specific merge helpers.

---

## 2. Critical actions by data type (one-pager)

Use this when adding or changing flows. Every critical action must use `prepareItemForSave` + `skipMerge: false` (and `recordDeletion` when deleting).

| Data type | Critical actions | Notes |
|-----------|------------------|--------|
| **Orders** | Create order, update status (Pending→Shipped→Delivered), delete order, tracking updates | Orders.jsx |
| **Recon** | Start recon, complete recon (mark as used), create/edit/delete recon item, remove draft | Recon.jsx |
| **Protocols** | Start protocol, end protocol, edit protocol, manage modal save, CSV import | Protocols.jsx, AppContext updateProtocolWithForceSync |
| **Stockpile** | Add item, remove item, bulk merge, link to protocol | Stockpile.jsx |
| **Scheduled Buys** | Add scheduled buy, delete scheduled buy | ScheduledBuysPanel.jsx |
| **Calendar Notes** | Add/edit/delete note for a date | Calendar notes helpers, replaceCalendarNotesForDate |
| **User Notes** | Create, edit, delete note | NotesModal, NotesWidget |
| **Goals** | Add goal, edit goal | CustomizableDashboard, GoalsOnlyWidget |
| **Supplements** | Add, edit, delete supplement | AppContext setSupplementsWithProtection path |
| **Vendors** | Add vendor, edit vendor, delete vendor | Vendors.jsx |
| **Task completion / Calendar done** | Toggle task done | taskCompletion.js, calendarDone — already timestamp-based |
| **Injection history / stats** | Log injection, update stats | injectionTracking.js, merge in cloudStorage |
| **Water tracker** | Log water, change goal/unit | WaterTrackerWidget, mergeWaterTracker |
| **Wishlist** | Add, remove item | Wishlist, wishlist sync trigger |
| **Protocol history** | Add/update history entry | protocolHistory.js, synced via app data |

**Debounced (non–critical) path:** Typing in forms, frequent metric updates, and similar flows use the standard auto-save (500ms debounce + queue). They still must use `prepareItemForSave` for any new/edited item and must not use `skipMerge: true` for those payloads unless it’s an intentional full overwrite.

---

## 3. Before merging sync-related PRs

1. Run the scenarios in [SYNC_SMOKE_TEST.md](SYNC_SMOKE_TEST.md).
2. Confirm no new code path writes user data directly to Firestore for the types above (all should go through `saveAppData`).
3. Confirm new or updated create/edit/delete flows use `prepareItemForSave` and `skipMerge: false` (and `recordDeletion` where applicable).
