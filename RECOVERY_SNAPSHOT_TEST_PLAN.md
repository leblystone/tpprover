# Recovery Snapshot Test Plan

## Test Scenarios

### ✅ Scenario 1: Recovery Snapshot Creation
**Setup:** Cloud is empty, localStorage has data
**Expected:**
1. Snapshot created BEFORE sync attempt
2. Snapshot contains: `{ data, timestamp, userId, reason }`
3. Snapshot saved to `tpprover_recovery_snapshot`

**Verification:**
```javascript
const snapshot = localStorage.getItem('tpprover_recovery_snapshot');
// Should exist and have all fields
```

---

### ✅ Scenario 2: Sync Success + Verification
**Setup:** Snapshot exists, sync succeeds
**Expected:**
1. Sync attempts to save to cloud
2. After 3 seconds, verifies data is in cloud
3. If verified: marks snapshot with `syncedToCloud: true` and `syncedAt: timestamp`
4. Sets 48h cleanup timer

**Verification:**
```javascript
const snapshot = JSON.parse(localStorage.getItem('tpprover_recovery_snapshot'));
// Should have: syncedToCloud: true, syncedAt: "2024-..."
```

---

### ✅ Scenario 3: Sync Fails
**Setup:** Snapshot exists, sync fails
**Expected:**
1. Snapshot remains unchanged (no `syncedToCloud` field)
2. Snapshot kept indefinitely
3. No cleanup timer set

**Verification:**
```javascript
const snapshot = JSON.parse(localStorage.getItem('tpprover_recovery_snapshot'));
// Should NOT have: syncedToCloud field
// Should still exist
```

---

### ✅ Scenario 4: Sync Succeeds but Verification Fails
**Setup:** Sync returns success but cloud data not found
**Expected:**
1. Snapshot NOT marked as synced
2. Snapshot kept indefinitely
3. No cleanup timer set

**Verification:**
```javascript
const snapshot = JSON.parse(localStorage.getItem('tpprover_recovery_snapshot'));
// Should NOT have: syncedToCloud field
```

---

### ✅ Scenario 5: Retry Success + Verification
**Setup:** Initial sync failed, retry succeeds
**Expected:**
1. Retry attempts sync
2. After 3 seconds, verifies data is in cloud
3. If verified: marks snapshot with `syncedToCloud: true` and `syncedAt: timestamp`

**Verification:**
```javascript
const snapshot = JSON.parse(localStorage.getItem('tpprover_recovery_snapshot'));
// Should have: syncedToCloud: true, syncedAt: "2024-..."
```

---

### ✅ Scenario 6: Cleanup on App Load (48h+ old, verified)
**Setup:** Snapshot is 49 hours old, marked as synced, cloud has data
**Expected:**
1. On app load, checks snapshot age
2. Verifies cloud still has data
3. Deletes snapshot

**Verification:**
```javascript
const snapshot = localStorage.getItem('tpprover_recovery_snapshot');
// Should be null (deleted)
```

---

### ✅ Scenario 7: Cleanup on App Load (48h+ old, but cloud empty)
**Setup:** Snapshot is 49 hours old, marked as synced, but cloud is empty
**Expected:**
1. On app load, checks snapshot age
2. Verifies cloud - finds no data
3. Keeps snapshot (doesn't delete)

**Verification:**
```javascript
const snapshot = localStorage.getItem('tpprover_recovery_snapshot');
// Should still exist
```

---

### ✅ Scenario 8: User Doesn't Login for 30 Days
**Setup:** Snapshot exists, user doesn't log in for 30 days
**Expected:**
1. Snapshot still exists when user logs in
2. If not synced: kept indefinitely
3. If synced but <48h: kept
4. If synced and >48h: checked on next login

**Verification:**
```javascript
const snapshot = localStorage.getItem('tpprover_recovery_snapshot');
// Should still exist (unless synced + verified + >48h + cloud confirmed)
```

---

## Code Flow Verification

### Path 1: Recovery → Sync Success → Verified
```
1. Cloud empty, localStorage has data
2. Create snapshot (line 528)
3. Attempt sync (line 540)
4. Sync succeeds (line 541)
5. Wait 3s, verify cloud (line 547)
6. Cloud has data → Mark snapshot as synced (line 563-565)
7. Set 48h cleanup timer (line 570-580)
```

### Path 2: Recovery → Sync Fails
```
1. Cloud empty, localStorage has data
2. Create snapshot (line 528)
3. Attempt sync (line 540)
4. Sync fails (line 541 = false)
5. Snapshot kept unchanged (line 595)
```

### Path 3: Auto-sync → Success → Verified
```
1. User makes change, auto-sync triggers (line 1014)
2. Sync succeeds (line 1014)
3. Wait 3s, verify cloud (line 1023)
4. Cloud has data → Mark snapshot as synced (line 1036-1038)
```

### Path 4: Auto-sync → Fails → Retry → Success → Verified
```
1. User makes change, auto-sync triggers (line 1014)
2. Sync fails (line 1049)
3. Retry after 3s (line 1033)
4. Retry succeeds (line 1033)
5. Wait 3s, verify cloud (line 1038)
6. Cloud has data → Mark snapshot as synced (line 1082-1084)
```

---

## Test Checklist

- [ ] Snapshot created before sync
- [ ] Snapshot contains all required fields
- [ ] Snapshot marked as synced only after verification
- [ ] Snapshot kept if sync fails
- [ ] Snapshot kept if verification fails
- [ ] Retry also verifies before marking as synced
- [ ] Cleanup only happens if: synced + verified + >48h + cloud confirmed
- [ ] Snapshot persists across app restarts
- [ ] Snapshot persists if user doesn't login for extended period

