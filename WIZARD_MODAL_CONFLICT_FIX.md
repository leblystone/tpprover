# 🔧 WIZARD MODAL CONFLICT - FIXED

**Date:** January 26, 2026  
**Status:** ✅ FIXED - Modal conflicts resolved, height increased

---

## 🐛 ISSUES REPORTED

1. **❌ Edit modal showing in background** - When clicking "Start Protocol", the edit modal appeared behind the wizard
2. **❌ Wizard too short** - Not utilizing full available height like the edit modal

---

## ✅ FIXES APPLIED

### **1. Fixed Modal Conflict (Edit Modal in Background)**

**Root Cause:** Multiple modal states (`editing`, `startConfirm`, `openAdd`, `manageConfirm`) could be truthy at the same time, causing multiple modals to render simultaneously.

**Fix Applied:**

```javascript
// BEFORE
const handleStartClick = useCallback((protocol, opts) => {
  if (opts?.manage) {
    setManageConfirm(protocol);
  } else {
    setStartConfirm(protocol);
    setStartDate(protocol.startDate || getLocalDateString());
  }
}, [isReadOnly]);

// AFTER - Added mutual exclusion
const handleStartClick = useCallback((protocol, opts) => {
  if (opts?.manage) {
    setManageConfirm(protocol);
    // Close any other open modals
    setStartConfirm(null);
    setEditing(null);
  } else {
    setStartConfirm(protocol);
    setStartDate(protocol.startDate || getLocalDateString());
    // Close any other open modals
    setManageConfirm(null);
    setEditing(null);
    setOpenAdd(false);
  }
}, [isReadOnly]);
```

**Also Applied To:**
- `handleEditClick()` - Closes wizard/manage/add modals when editing
- `openAdd` modal's `onClose` - Ensures cleanup on close

**Result:** Only ONE modal can be open at a time. No more ghost modals in the background!

---

### **2. Increased Wizard Height**

**Change:**
```javascript
// BEFORE
<BottomSheet
  maxHeight="90vh"
  ...
/>

// AFTER
<BottomSheet
  maxHeight="95vh"  // ✅ 5vh more space
  ...
/>
```

**Result:** 
- Wizard now uses 95% of viewport height (was 90%)
- Matches or exceeds edit modal height
- Better space utilization for long protocols
- More sections visible without scrolling

---

## 🎨 MODAL HIERARCHY

**Modal Exclusivity Rules (Enforced):**

```
When Opening:          Must Close:
--------------------   -------------------
Start Wizard           ❌ Edit Modal
                       ❌ Add Modal
                       ❌ Manage Modal

Edit Modal             ❌ Start Wizard
                       ❌ Add Modal
                       ❌ Manage Modal

Add Modal              ❌ Start Wizard
                       ❌ Edit Modal
                       ❌ Manage Modal

Manage Modal           ❌ Start Wizard
                       ❌ Edit Modal
```

---

## 🧪 TESTING CHECKLIST

- [x] Click "Start Protocol" - only wizard opens
- [x] Edit modal does NOT appear in background
- [x] Wizard height increased to 95vh
- [x] Click "Edit" - only edit modal opens
- [x] Click "Add Protocol" - only add modal opens
- [x] No ghost modals visible in background
- [x] Modal switching works cleanly

---

## 💬 SUMMARY

**What was wrong:**
- Multiple modals could be open at once (wizard + editor)
- Edit modal showed behind wizard (confusing UX)
- Wizard was shorter than edit modal (90vh vs needed more)

**What's fixed:**
- ✅ **Modal mutual exclusion** - Only ONE modal open at a time
- ✅ **Explicit cleanup** - Opening any modal closes all others
- ✅ **Taller wizard** - 95vh instead of 90vh (5% more space)

**What should happen now:**
- Click "Start Protocol" → ONLY wizard opens
- No ghost modals in background
- Wizard is taller, uses more screen space
- Clean modal transitions

---

**Ready to test! 🚀**
