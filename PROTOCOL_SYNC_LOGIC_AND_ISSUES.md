# Protocol Sync Logic & Remaining Issues

## 🎯 How Protocol Sync Currently Works

### The Flow
1. **User edits protocol** → Triggers update function in Protocols.jsx
2. **Update function** → Calls `updateProtocol()` or `updateProtocolWithForceSync()` from AppContext
3. **AppContext** → Calls `prepareItemForSave()` to add fresh `serverTimestamp()` sentinel
4. **Save to Firestore** → Goes through `saveAppData()` in cloudStorage.js
5. **Merge logic** → `mergeWithTimestamps()` compares local vs server timestamps
6. **Firestore listener** → Other browsers receive update via real-time subscription
7. **Apply update** → Listener merges remote data and updates React state

### Key Components

#### `prepareItemForSave()` (src/utils/userDataSave.js)
- Ensures every item has `id` and `updatedAt`
- **ALWAYS** applies fresh `serverTimestamp()` on save (unless `preserveTimestamp: true`)
- Returns object with sentinel that Firestore replaces with actual server time

#### `mergeWithTimestamps()` (src/services/cloudStorage.js)
- Compares `updatedAt` timestamps between local and server
- **Newer timestamp always wins**
- Uses `getTimestamp()` helper to handle:
  - Firestore Timestamp objects (`.toMillis()`)
  - serverTimestamp() sentinels (treated as `Date.now()`)
  - ISO strings/Dates (via `new Date().getTime()`)
  - Invalid/missing timestamps (returns `0`)

#### AppContext Listener (src/context/AppContext.jsx)
- Real-time subscription to Firestore user document
- **3-second skip window** to prevent "echo" of own writes
- Calls `mergeWithTimestamps()` before applying remote updates
- Dispatches events for UI components to react

---

## ✅ Recent Fixes (Feb 2026)

### 1. ~~prepareItemForSave timestamp bug~~
**Status:** ✅ FIXED  
**Issue:** Existing items weren't getting fresh timestamps on edit  
**Fix:** Changed logic to ALWAYS apply `serverTimestamp()` unless explicitly preserving

### 2. ~~serverTimestamp() sentinel handling~~
**Status:** ✅ FIXED  
**Issue:** `getTimestamp()` returned `NaN` for sentinel objects, breaking merge logic  
**Fix:** Detect sentinels (objects without `.toMillis`) and treat as `Date.now()`

### 3. ~~Task completion cross-device sync~~
**Status:** ✅ FIXED  
**Issue:** UI didn't update when cloud sync received task toggles  
**Fix:** Added cloud-sync event handler to regenerate all tasks

---

## 🚨 Remaining Sync Issues in Protocols.jsx

### Issue #1: Direct `updateProtocol()` calls without force sync
**Location:** Multiple places in Protocols.jsx  
**Problem:** Regular `updateProtocol()` uses debounced auto-save, not immediate force sync

**Examples:**
```javascript
// Line 607 - Manual protocol end
const updatedProtocol = { ...protocolToEnd, active: false, endDate: today, endType: 'manual' };
updateProtocol(updatedProtocol); // ❌ Uses debounced save

// Line 716 - Auto-end completed protocols
updateProtocol({ ...p, active: false, endDate: endDateString, endType: 'completed' }); // ❌ Debounced

// Line 890 - Migration fixes
updateProtocol({ ...p, endDate: newEndDate }); // ❌ Debounced

// Line 2441 - Protocol edit in manage modal
updateProtocol(finalProtocol); // ❌ Debounced

// Line 2607 - Save from manage modal "Save" button
updateProtocol(manageConfirm); // ❌ Debounced
```

**Why it's a problem:**
- Debounced saves wait 500ms before syncing
- If user switches tabs/browsers quickly, changes might not propagate
- Protocol status changes (end, start) should sync immediately

**Fix needed:**
Use `updateProtocolWithForceSync()` for:
- Protocol start/end actions
- Active status changes
- Critical saves from modal "Save" buttons

### Issue #2: Protocol history entries not synced to cloud
**Location:** Throughout Protocols.jsx and protocolHistory.js utils  
**Problem:** History entries stored in `localStorage` only, never uploaded to Firestore

**Examples:**
```javascript
// Line 610 - Updates history but only in localStorage
const activeHistoryEntry = findActiveProtocolHistoryEntry(protocolToEnd.id);
if (activeHistoryEntry) {
  updateProtocolHistoryEntry(activeHistoryEntry.id, { ...activeHistoryEntry, endDate: today });
}

// All history functions use localStorage:
// - saveProtocolHistoryEntry()
// - updateProtocolHistoryEntry()
// - getProtocolHistory()
// - addNoteToProtocolHistory()
// etc.
```

**Why it's a problem:**
- History entries are NOT synced across devices
- User loses all history when switching devices
- No backup if localStorage is cleared

**Fix needed:**
1. Add `protocolHistory` to Firestore document structure
2. Update `protocolHistory.js` utilities to read/write from AppContext (which syncs to cloud)
3. Migrate existing localStorage history to Firestore

### Issue #3: Protocol draft not using proper sync
**Location:** Line 2443-2449  
**Problem:** Uses direct localStorage write instead of going through sync system

```javascript
// Line 2443 - Saves draft to localStorage
try {
  localStorage.setItem('tpprover_protocol_draft', JSON.stringify(finalProtocol));
} catch (e) {
  console.warn('Failed to save protocol draft:', e);
}
```

**Why it's a problem:**
- Draft changes don't trigger timestamp updates
- Other components relying on draft might see stale data
- No cross-device sync for drafts

**Fix needed:**
Either:
- Option A: Remove draft concept, rely on real-time protocol state
- Option B: Add draft to Firestore sync system with timestamps

### Issue #4: Bulk protocol updates use `setProtocols()`
**Location:** Line 1054 (CSV import)  
**Problem:** Directly manipulates state without going through sync system

```javascript
// Line 1054 - CSV import
setProtocols(prev => [...rows, ...prev]) // ❌ Bypasses sync system
```

**Why it's a problem:**
- No timestamps added to imported protocols
- No immediate cloud sync
- Relies on auto-save debounce to eventually sync

**Fix needed:**
- Call `prepareItemForSave()` on each imported protocol
- Trigger immediate sync after import with `skipMerge: false`

---

## 🔧 Recommended Fixes (Priority Order)

### HIGH PRIORITY
1. **Replace debounced `updateProtocol()` with `updateProtocolWithForceSync()` for:**
   - `endProtocol()` function (line 604-625)
   - Auto-end protocols useEffect (line 716)
   - Manage modal "Save" button (line 2607)
   - Edit modal save (line 2441)

### MEDIUM PRIORITY
2. **Sync protocol history to Firestore:**
   - Add to cloud document structure
   - Update protocolHistory.js to use AppContext
   - Create migration script for existing localStorage data

### LOW PRIORITY
3. **Fix CSV import sync:**
   - Add `prepareItemForSave()` to imported rows
   - Trigger immediate sync post-import

4. **Remove or sync protocol draft:**
   - Evaluate if draft is still needed
   - If yes, add to sync system

---

## 📊 Testing Checklist

After implementing fixes, test these scenarios across 2 browsers:

- [ ] End protocol in Browser A → Browser B shows ended
- [ ] Start protocol in Browser A → Browser B shows started
- [ ] Edit protocol in Browser A → Browser B shows changes
- [ ] Edit from manage modal → Changes sync immediately
- [ ] Import CSV in Browser A → Browser B gets imports
- [ ] Add history note in Browser A → Browser B shows note
- [ ] Protocol auto-ends → Both browsers update

---

## 🎓 Key Learnings

### When to use `updateProtocol()` vs `updateProtocolWithForceSync()`

**Use `updateProtocol()` for:**
- Frequent auto-saves (e.g., form auto-save as user types)
- Non-critical updates where 500ms delay is acceptable
- Updates that benefit from debouncing to reduce write costs

**Use `updateProtocolWithForceSync()` for:**
- User-initiated "Save" button clicks
- Status changes (start, end, activate, deactivate)
- Any update where immediate cross-device sync is critical
- Final saves before closing modals

### The serverTimestamp() Sentinel Pattern
- `serverTimestamp()` returns a **marker object**, not a timestamp
- Firestore replaces it with actual server time on write
- Before write, it exists as `{ _methodName: 'serverTimestamp' }`
- Always handle sentinels in comparison logic (treat as "newest")

### Merge Logic Philosophy
- **Newer timestamp always wins** (no exceptions)
- **Sentinel = newest** (pending save beats everything)
- **Missing timestamp = oldest** (returns 0 in comparisons)
- **TIE = use local** (benefit of doubt to current device)
