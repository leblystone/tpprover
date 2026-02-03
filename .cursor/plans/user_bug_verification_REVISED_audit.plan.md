---
name: ""
overview: ""
todos: []
isProject: false
---

# User Bug Verification – REVISED Plan (Commit Audit Complete)

## Audit Summary

Past commits were audited to verify whether the five reported bugs have already been addressed. Findings below.

---

## "Unnamed Protocol" on Start (Your Issue – Different from Z071/Z072)

**Status: FIXED in fabf10c (Jan 27, 2026)**

**What was fixed (commit fabf10c – "Fix protocol date calculation"):**

1. **Always look up fresh protocol** – Wizard now receives protocol from `protocols.find(p => p.id === startConfirm.id)` instead of potentially stale `startConfirm`, so the full protocol (including name) is passed in.
2. **Merge with original to preserve fields** – Before saving, we merge `originalProtocol` with `finalizedProtocol` and explicitly preserve: `protocolName`, `peptides`, `purpose`, `duration`.
3. **Validation** – Pre-save checks ensure name and peptides exist before starting.

**Why you needed to restore:** The fix prevents *future* bad saves. If the protocol had already been saved as "Unnamed" (e.g. before the fix, or from a sync overwrite), restoring from history was needed to recover the correct data.

**Potential remaining gap:** The `saveProtocolHistoryEntry` call still uses `finalizedProtocol.protocolName` for the history entry. If the merge restored the name from `originalProtocol` but `finalizedProtocol` had none, the *main protocol* would be correct, but the *history entry* could still show "Unnamed Protocol". Using `toSave.protocolName` or `mergedProtocol.protocolName` there would align history with the saved protocol.

---

## Z071 / Z072: Protocol Editing Erases Data (Edit Flow – Different Bug)

**Status: NOT FIXED**

**Relevant commits found:**

- `ef0a42b` – Fix protocol AM/PM **time selection** persistence (handleFrequencyChange)
- `fa52d5e` – Fix initialization error, move save event listener after handleFinalSave
- `60f87f2` – Add Save Changes button to Edit tab with event-based save
- `631a320` – Embed ProtocolEditorModal in Edit tab
- `d8cdbc5` – Fix auto-save across modals, ProtocolEditorModal error handling
- `0dff43e` – Fix protocol **name display in deleted items** (use protocolName)

**Conclusion:** No commit addresses protocol/peptide **name or dosage being erased on edit**. The “protocol name in deleted items” fix is different. The AM/PM persistence fix targets frequency only.

**Action:** Implement protocol name migration (`name` → `protocolName`) and peptide field preservation in `ProtocolEditorModal` as originally planned.

---

## Z073: Subscription “Update” Prompt Despite Active Subscription

**Status: PARTIALLY ADDRESSED – NEEDS VERIFICATION**

**Relevant commits found:**

- `b5beae3` – Fetch subscription from userSubscriptions collection
- `d85372f` – Fix nested subscription object parsing
- `edfba83` – Fix lifetime users showing as expired after redemption
- `80ea699` – Prevent trial lockout for lifetime and all subscription types
- `a3685bf` – Fix subscription status infinite loop and flickering
- `2c84ec2` – Improve Google Play subscription detection in billing management
- `a05a28f` – Add cross-platform notification settings sync

**Conclusion:** Subscription loading and lockout behavior have been fixed in several commits. Z073 could be resolved or may be a remaining edge case (e.g., timing or Google Play–specific loading).

**Action:** First suggest user log out and log back in. If it persists, add logging for this user’s subscription load path and consider refresh/timing improvements.

---

## Z074: Ending Protocol Clears Data

**Status: POSSIBLY FIXED**

**Relevant commits found:**

- `af30188` – **Fix: Real-time sync data loss** – merge instead of overwrite for protocols, orders, stockpile, etc.; timestamp-based merging
- `a378707` – Fix task completion (streak) being overwritten in real-time listener
- `64bc52c` – Add protocol history to cloud sync
- `20df3b9` – Update protocol history UI

**Conclusion:** The real-time sync fix in `af30188` directly addressed data being overwritten instead of merged. If Z074 was caused by sync overwriting after ending a protocol, this may already be fixed.

**Action:** Verify in current build; if users still report it, investigate protocol history and calendar notes behavior on protocol end.

---

## Z075: Android Notifications Not Delivering

**Status: PARTIALLY FIXED – ONE CODE PATH STILL BROKEN**

**Relevant commits found:**

- `358fc17` – **FIX: Use auth.uid for FCM token save** – Settings.jsx changed from email to uid (in tpprover branch)
- `ba353f9` – Fix Android research reminder notifications and FCM token registration
- `6182f03` – Push Notifications Working on Android/iOS
- `61346ce` – Add PushNotifications listener BEFORE register()
- `892d129` – Save FCM token to Firestore when enabling mobile push
- `3cb8ea7` – Store FCM token in Firestore (pwaNotifications.js)

**Current code state:**

- `SettingsNotifications.jsx`: uses `user.uid || user.email` (UID first) – **fixed**
- `App.jsx`: uses `user.uid || user.email` – **fixed**
- `AndroidPermissionPrompt.jsx`: uses `user.uid || user.email` – **fixed**
- `mobileNotifications.js` line 238: still uses `user.email.toLowerCase()` – **not fixed**
- `pwaNotifications.js`: uses `user.email.toLowerCase()` – **not fixed**

**Conclusion:** The main Settings/App/Android prompt paths use UID. `mobileNotifications.js` and `pwaNotifications.js` still save the FCM token to `users/{email}`, which does not match the UID-based `userData` lookup used by scheduled reminders. If the mobile notification service path runs, notifications can fail.

**Action:**

1. First: suggest user **log out and log back in** to refresh token and user context.
2. If it persists: fix `mobileNotifications.js` and `pwaNotifications.js` to use UID (same pattern as SettingsNotifications).

---

## Revised Implementation Priority


| Priority | Ticket    | Status                       | Action                                      |
| -------- | --------- | ---------------------------- | ------------------------------------------- |
| 1        | Z075      | Partial fix, one path broken | Try logout/login; then fix mobile/pwa UID   |
| 2        | Z071/Z072 | Not fixed                    | Implement ProtocolEditorModal migration     |
| 3        | Z073      | Likely fixed                 | Suggest logout/login; add logging if needed |
| 4        | Z074      | Possibly fixed               | Verify behavior in current build            |


---

## Files to Modify (if code fixes still needed)

1. **[src/components/protocols/ProtocolEditorModal.jsx](src/components/protocols/ProtocolEditorModal.jsx)** – `name` → `protocolName` migration, peptide field preservation (Z071/Z072 edit flow)
2. **[src/services/mobileNotifications.js](src/services/mobileNotifications.js)** – use `user.uid` instead of `user.email` for FCM token save (Z075)
3. **[src/services/pwaNotifications.js](src/services/pwaNotifications.js)** – use `user.uid` instead of `user.email` (if used on Android) (Z075)
4. **[src/pages/Protocols.jsx](src/pages/Protocols.jsx)** – Use `toSave.protocolName` (or `mergedProtocol.protocolName`) in `saveProtocolHistoryEntry` instead of `finalizedProtocol.protocolName` so history entry matches the saved protocol when merge restores the name (minor improvement for start flow)
5. Optional: subscription refresh/timing in AppContext or useSubscriptionAccess for Z073

---

## Summary

- **Your "Unnamed on Start" issue:** Fixed in fabf10c (Jan 27). The merge-with-original and fresh-protocol lookup prevents name loss on start. Restore from history was needed because already-saved bad data does not auto-correct. Optional improvement: use `toSave`/`mergedProtocol` for history entry so it stays in sync.
- **Z071/Z072 (Edit flow):** No prior fix; needs implementation (ProtocolEditorModal migration).
- **Z073:** Several subscription fixes exist; first try logout/login, then add logging if needed.
- **Z074:** Real-time sync merge fix may already resolve; verify in build.
- **Z075:** Most FCM paths use UID; `mobileNotifications.js` and `pwaNotifications.js` do not. Try logout/login first; then fix these two files.

