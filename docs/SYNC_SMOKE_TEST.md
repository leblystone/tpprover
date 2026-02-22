# Sync smoke test — run before every release that touches data

**When to run:** Before merging sync-related PRs and before each release that changes sync, save, or merge logic. Use two browsers (e.g. Chrome + Edge) or two devices logged in as the same user.

---

## Setup

1. Log in as the same user in **Browser A** and **Browser B** (or Device A and B).
2. Open the app in both; wait until the Topbar shows **Saved** (not "Syncing…").
3. Keep both windows visible so you can see updates within a few seconds.

---

## Test 1: Order status change (A → B)

1. **Browser A:** Go to Orders. Create an order or pick an existing one. Change status (e.g. Pending → Shipped).
2. **Browser B:** Within 5–10 seconds, Orders should show the same status without refresh.
3. **Pass:** Status on B matches A.

---

## Test 2: Recon – mark as used (A → B)

1. **Browser A:** Go to Recon (Peptide Calculator / In Use). Start a recon or pick a draft. Use **Mark as used** (or complete recon) so the item moves to history.
2. **Browser B:** Within 5–10 seconds, the item should disappear from In Use (or draft list) and appear in history if that view exists.
3. **Pass:** B’s Recon list matches A (no “ghost” vial reappearing).

---

## Test 3: Protocol end (A → B)

1. **Browser A:** Go to Protocols. End an active protocol (use End Protocol or equivalent).
2. **Browser B:** Within 5–10 seconds, that protocol should show as ended (e.g. in Activity/History) without refresh.
3. **Pass:** Protocol state on B matches A.

---

## Test 4: Same item edited on both (conflict)

1. **Browser A:** Open one protocol (or order) and change one field (e.g. notes). Save.
2. **Browser B:** Open the same protocol/order and change a different field (e.g. name). Save.
3. **Pass:** After both sync, the latest save wins for the field that was edited last; no crash and no total overwrite of the other device’s change. (Exact behavior depends on timestamp merge; we care that nothing is lost and no error.)

---

## Test 5: Offline → online (A only)

1. **Browser A:** Turn off network (e.g. DevTools → Network → Offline, or airplane mode on phone).
2. **Browser A:** Make a change (e.g. add a calendar note, or change an order status). Topbar should show **Offline – will sync when back** (or similar).
3. **Browser A:** Turn network back on. Within 10–15 seconds, Topbar should show **Saved** or **Syncing…** then **Saved**.
4. **Browser B:** Refresh or wait; the change from A should appear.
5. **Pass:** Change from A appears on B after A is back online.

---

## Test 6: Sync status and retry (optional)

1. **Browser A:** Simulate failure (e.g. disconnect, make a change, reconnect; or use a build that fails save once). Topbar should show an error state and **Tap to retry** (or similar).
2. Tap **Retry**. Topbar should show **Syncing…** then **Saved**.
3. **Browser B:** Change from A should appear.
4. **Pass:** Retry triggers sync and B sees the data.

---

## Test 7: Calendar note (A → B)

1. **Browser A:** Go to Calendar. Add or edit a note on a date. Save.
2. **Browser B:** Within 5–10 seconds, that date should show the note (or updated text) without refresh.
3. **Pass:** Calendar note on B matches A.

---

## Test 8: Task completion (A → B)

1. **Browser A:** Go to Calendar or Today’s tasks. Mark a task as done (checkmark).
2. **Browser B:** Within 5–10 seconds, the same task should show as done without refresh.
3. **Pass:** Task completion state on B matches A.

---

## Quick checklist (minimal before release)

- [ ] Test 1 – Order status A→B  
- [ ] Test 2 – Recon mark as used A→B  
- [ ] Test 3 – Protocol end A→B  
- [ ] Test 5 – Offline then online on A, then check B  
- [ ] No console errors during tests (red errors in DevTools)

If any test fails, fix or document before release. For deeper changes, run all eight tests.
