# User Data Save & Sync Pattern

This doc defines the **single, consistent** way the app saves and syncs user data so it works across devices and platforms. All new user-entry features **must** follow this pattern.

---

## 1. Intended model (local-first, timestamp-based sync)

- **Local first**: On create/update, (1) update React state, (2) write to the matching `tpprover_*` localStorage key, (3) cloud sync runs (AppContext effect calls `saveAppData`). If the network fails, data is still in state + localStorage.
- **Timestamp rule**: Every user-editable item has a stable `id` and `updatedAt` (client timestamp: `Date.now()` or `new Date().toISOString()`). On sync, the app merges local vs server by `updatedAt` and keeps the **newer** version per `id`, so multi-device does not overwrite newer data.
- **Cloud**: AppContext sync effect builds `userData` from state + localStorage and calls `saveAppData(userId, userData)`. `saveAppData` loads server data, runs `ensureTimestamps`, merges with `mergeWithTimestamps`, then writes to Firestore.

---

## 2. Three steps for every synced create/update

1. **Set `id` and `updatedAt`** on the item (use `prepareItemForSave()` from `src/utils/userDataSave.js`).
2. **Update React state** (e.g. `setProtocols`, `setStockpile`) with the new/updated list.
3. **Update the matching `tpprover_*` localStorage key** so the change survives refresh/offline.

Cloud sync is triggered automatically when state changes (AppContext effect). For data that lives only in localStorage (e.g. protocolHistory, wishlist), include it in the payload passed to `saveAppData`; the sync effect already reads those keys from localStorage and sends them.

---

## 3. Synced vs local-only data

For the full list of data keys and entity shapes, see [SCHEMA.md](SCHEMA.md).

**Synced (in `saveAppData` / cloud):**  
protocols, reconItems, reconHistory, supplements, orders, metrics, vendors, stockpile, scheduledBuys, protocolHistory, calendarNotes, taskCompletion, calendarDone, injectionHistory, injectionStats, deletionTracking, wishlist, **userNotes**, **userGoals**, **waterTracker**.

**Local-only (not in `saveAppData`):**  
Dashboard layout (`tpprover_dashboard_layout`) and other UI/preference keys. These do not sync across devices.

---

## 4. Adding a new synced entity (three places)

To add a new type of user data that should sync across devices:

1. **cloudStorage.js**: Add the key to `saveAppData` (in `timestampedData`, merge block if array, and fallback). Use `ensureTimestamps` for arrays and `mergeWithTimestamps` for conflict resolution. Add to `loadAppData` return (it loads the full doc).
2. **AppContext.jsx**: Include the key in the sync effect’s `userData` (from state or localStorage). If it’s in state, add the state and setter and include it in the effect dependency array. When loading from cloud, apply `cloudAppData.newKey` to state or localStorage as appropriate.
3. **clearUserData**: No change needed (clearAllUserData already clears all `tpprover_*` except theme/settings). If you introduce a new storage key, ensure it’s not in `KEYS_TO_KEEP` in `clearUserData.js` unless it’s intentionally kept on logout.

Use **`prepareItemForSave(item)`** from `src/utils/userDataSave.js` for any new create/update so every item has `id` and `updatedAt`.

---

## 5. Enforcement checklist (for PRs that touch user data)

If your PR adds or changes **saving of user data**, confirm:

- [ ] New/updated items have `id` and `updatedAt` (use `prepareItemForSave` or set explicitly).
- [ ] Synced data is updated via the correct context setter and the matching `tpprover_*` localStorage key.
- [ ] If adding a new synced entity, all three places above (cloudStorage, AppContext, clear logic) are updated.
- [ ] You did not bypass the pattern (e.g. direct Firestore write or localStorage-only for data that should sync).

---

## 6. Helper API

- **`prepareItemForSave(item)`** – Ensures `id` and `updatedAt`; use for every create/update of a synced item.  
  From: `src/utils/userDataSave.js`
- **`ensureItemTimestamp(item)`** – Same as above (alias).  
  From: `src/utils/userDataSave.js`

In development, the app may log a warning if an array item is saved without `updatedAt` to catch missing timestamps early.
