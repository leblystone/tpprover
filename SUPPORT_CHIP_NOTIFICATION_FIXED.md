# ✅ SUPPORT CHIP NOTIFICATION - FIXED!

**Date:** January 24, 2026  
**Issue:** Support response chip didn't shake/highlight when Ghosty replied

---

## 🔴 **What Was Wrong:**

The "Support Response" chip only checked `lastAdminMessageAt` to see if there were new replies.

**Result:** When Ghosty posted a response, `lastMessageAt` was updated but the chip didn't animate because the code only looked at `lastAdminMessageAt`.

---

## ✅ **What I Fixed:**

### **File:** `src/components/layout/Topbar.jsx` (line 225-261)

**Old Logic:**
```javascript
// Only checked lastAdminMessageAt
if (visibleTicket.lastAdminMessageAt) {
  const hasUnread = lastAdminTime > lastReadTime;
  setHasUnreadResponse(hasUnread);
}
```

**New Logic:**
```javascript
// Check BOTH lastAdminMessageAt AND lastMessageAt (includes Ghosty)
const lastAdminTime = /* convert lastAdminMessageAt */;
const lastMessageTime = /* convert lastMessageAt */;

// Use the most recent time between admin and any message
let mostRecentResponseTime = lastReadTime;

if (lastAdminTime && lastAdminTime > mostRecentResponseTime) {
  mostRecentResponseTime = lastAdminTime;
}

if (lastMessageTime && lastMessageTime > mostRecentResponseTime) {
  mostRecentResponseTime = lastMessageTime;
}

const hasUnread = mostRecentResponseTime > lastReadTime;
setHasUnreadResponse(hasUnread);
```

---

## 🎨 **What Users See:**

### **When Admin or Ghosty Replies:**

**Support Response Chip:**
- ✅ Background changes to bright orange (`#B8704C`)
- ✅ `animate-sway` class adds shaking animation
- ✅ Box shadow appears (glow effect)
- ✅ Stands out visually

**After User Opens It:**
- ✅ Animation stops
- ✅ Color becomes semi-transparent (`#B8704C80`)
- ✅ Shadow disappears

---

## 🔧 **Technical Details:**

**Timestamp Checked:**
- `lastAdminMessageAt` - Updated when admin posts manually
- `lastMessageAt` - Updated when anyone posts (admin OR Ghosty)

**Comparison:**
- Compares against `localStorage` `ticket_${ticketId}_lastRead`
- If message time > last read time → animate!

**Animation Class:**
- `animate-sway` - CSS keyframe animation (gentle shake)

---

## ✅ **Works For:**

✅ Admin manual replies  
✅ Ghosty approved responses  
✅ Any new message in the ticket

---

**Support chip now shakes for both admin AND Ghosty replies!** 🎉
