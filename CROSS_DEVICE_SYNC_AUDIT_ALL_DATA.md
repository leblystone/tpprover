# Cross-Device Sync Audit - All Data Types

## 🎯 Current Status Summary

### ✅ FIXED - Protocols
- Force sync on end/start: ✅
- CSV import with timestamps: ✅
- Sentinel handling (+5s buffer): ✅
- Protocol history migration: ✅

### 🔍 NEEDS AUDIT - Other Data Types

## 📊 Data Types in TPPRover

### 1. **Orders** (`orders`)
**Pages:** Orders.jsx (14 uses of setOrders)
**Current sync:** Auto-save debounce (500ms)
**Critical actions:**
- Create new order
- Update order status (Pending → Shipped → Delivered)
- Delete order
- Track order updates

**Recommendation:** 
- ✅ Order status changes should use force sync
- ✅ Order creation should use force sync
- ⚠️ Tracking updates happen automatically - check if they use force sync

### 2. **Supplements** (`supplements`)
**Pages:** Dashboard.jsx, CustomizableDashboard.jsx
**Current sync:** Auto-save debounce
**Critical actions:**
- Add supplement
- Remove supplement
- Update supplement schedule

**Recommendation:**
- ℹ️ Low priority - supplements change infrequently
- ℹ️ Debounced sync acceptable for now

### 3. **Vendors** (`vendors`)
**Pages:** Vendors.jsx (2 uses)
**Current sync:** Auto-save debounce
**Critical actions:**
- Add vendor
- Edit vendor details
- Delete vendor

**Recommendation:**
- ℹ️ Low priority - vendors change very infrequently
- ℹ️ Debounced sync acceptable

### 4. **Recon Items** (`reconItems` + `reconHistory`)
**Pages:** Recon.jsx (8 uses)
**Current sync:** Auto-save debounce
**Critical actions:**
- Start reconstitution
- Complete reconstitution
- Track vial usage

**Recommendation:**
- ⚠️ **MEDIUM PRIORITY** - Reconstitution is time-sensitive
- ✅ Start/complete actions should use force sync
- ✅ Vial updates should use force sync

### 5. **Stockpile** (`stockpile`)
**Pages:** Stockpile.jsx (3 uses)
**Current sync:** Auto-save debounce
**Critical actions:**
- Add item to stockpile
- Update quantity
- Remove item
- Link to orders

**Recommendation:**
- ℹ️ Low-medium priority
- ℹ️ Quantity updates can be debounced
- ✅ Add/remove should consider force sync

### 6. **Scheduled Buys** (`scheduledBuys`)
**Pages:** Dashboard.jsx, CustomizableDashboard.jsx
**Current sync:** Auto-save debounce
**Critical actions:**
- Schedule future purchase
- Mark as completed
- Delete scheduled buy

**Recommendation:**
- ℹ️ Low priority - future planning feature
- ℹ️ Debounced sync acceptable

### 7. **Metrics** (`metrics`)
**Pages:** Dashboard pages
**Current sync:** Auto-save debounce
**Critical actions:**
- Log daily metrics
- Update metric values

**Recommendation:**
- ℹ️ Low priority
- ℹ️ Debounced sync acceptable

### 8. **Calendar Notes** (`calendarNotes`)
**Current sync:** Auto-save debounce
**Critical actions:**
- Add note to date
- Edit note
- Delete note

**Recommendation:**
- ℹ️ Low priority
- ℹ️ Debounced sync acceptable

### 9. **Task Completion** (`taskCompletion` + `calendarDone`)
**Status:** ✅ FIXED
**Current sync:** Direct localStorage updates with event dispatch
**Works correctly:** Cross-device sync functional

### 10. **Injection History** (`injectionHistory` + `injectionStats`)
**Current sync:** Auto-save debounce
**Critical actions:**
- Log injection
- Track injection sites

**Recommendation:**
- ⚠️ **MEDIUM PRIORITY** - Medical tracking is important
- ✅ Logging injections should use force sync
- ⚠️ **CRITICAL FIX APPLIED:** mergeInjectionStats crash fixed

### 11. **User Notes & Goals** (`userNotes`, `userGoals`)
**Current sync:** Auto-save debounce
**Critical actions:**
- Create note
- Edit note
- Delete note

**Recommendation:**
- ℹ️ Low priority
- ℹ️ Debounced sync acceptable

### 12. **Water Tracker** (`waterTracker`)
**Current sync:** Auto-save debounce
**Critical actions:**
- Log water intake

**Recommendation:**
- ℹ️ Low priority
- ℹ️ Debounced sync acceptable

### 13. **Wishlist** (`wishlist`)
**Current sync:** Auto-save debounce
**Critical actions:**
- Add item
- Remove item

**Recommendation:**
- ℹ️ Low priority
- ℹ️ Debounced sync acceptable

---

## 🎯 Priority Action Items

### 🔥 CRITICAL (Do Next)
1. **Orders - Status Changes**
   - File: `src/pages/Orders.jsx`
   - Find: Order status update functions
   - Fix: Use force sync for status changes (Pending → Shipped → Delivered)

2. **Recon - Start/Complete Actions**
   - File: `src/pages/Recon.jsx`
   - Find: Start reconstitution, complete reconstitution
   - Fix: Use force sync for these critical state changes

### ⚠️ MEDIUM (Do After Critical)
3. **Injection History - Log Actions**
   - File: Find where injections are logged
   - Fix: Use force sync for new injection logs

4. **Stockpile - Add/Remove**
   - File: `src/pages/Stockpile.jsx`
   - Find: Add to stockpile, remove from stockpile
   - Fix: Use force sync for inventory changes

### ℹ️ LOW (Future Enhancement)
5. Everything else can stay with debounced sync

---

## 📋 Testing Checklist (Updated)

After implementing fixes, test across 2 browsers:

**Protocols:**
- [x] End protocol → Syncs
- [x] Start protocol → Syncs
- [x] Edit protocol → Syncs
- [x] CSV import → Syncs

**Orders:**
- [ ] Create order → Syncs immediately
- [ ] Update status → Syncs immediately
- [ ] Track order update → Syncs

**Recon:**
- [ ] Start recon → Syncs immediately
- [ ] Complete recon → Syncs immediately
- [ ] Update vial → Syncs

**Injection:**
- [ ] Log injection → Syncs immediately

**Stockpile:**
- [ ] Add item → Syncs immediately
- [ ] Remove item → Syncs immediately

---

## 🔧 Implementation Pattern

For each critical action, follow this pattern:

### 1. Find the update function
```javascript
// BEFORE (debounced)
const handleStatusChange = (order, newStatus) => {
  const updated = { ...order, status: newStatus };
  setOrders(prev => prev.map(o => o.id === order.id ? updated : o));
  // Auto-save kicks in after 500ms
};
```

### 2. Add force sync version
```javascript
// AFTER (force sync)
const handleStatusChange = async (order, newStatus) => {
  const updated = prepareItemForSave({ ...order, status: newStatus });
  setOrders(prev => prev.map(o => o.id === order.id ? updated : o));
  
  // Force immediate sync
  if (firebaseUser) {
    const allOrders = orders.map(o => o.id === order.id ? updated : o);
    await saveAppData(firebaseUser.uid, { 
      ...currentAppData, 
      orders: allOrders 
    }, { skipMerge: false });
  }
};
```

### 3. OR use AppContext helper
If AppContext exposes an `updateOrderWithForceSync` helper:
```javascript
const handleStatusChange = (order, newStatus) => {
  const updated = { ...order, status: newStatus };
  updateOrderWithForceSync(updated); // One line!
};
```

---

## 🎓 Decision Framework

**Use Force Sync when:**
- ✅ State change is user-initiated (button click)
- ✅ State change is time-sensitive (order status)
- ✅ State change is medically relevant (injection log)
- ✅ State change affects other systems (recon → stockpile)
- ✅ User expects immediate cross-device sync

**Use Debounced Sync when:**
- ℹ️ User is typing (form input)
- ℹ️ State changes frequently (metric updates)
- ℹ️ State is not time-critical (wishlist)
- ℹ️ Delay is acceptable (water tracker)

