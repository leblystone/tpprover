# 📸 SCREENSHOT/IMAGE SUPPORT MISSING

**Issue:** Users can upload screenshots when creating support tickets, but they're not visible to admins.

---

## 🔍 **Current Status:**

### ✅ **Backend (Working)**
Images ARE being saved:
- **Initial ticket**: `imageUrls`, `imageStoragePaths` stored in first message
- **Location**: `supportTickets/{ticketId}/messages/{messageId}`
- **Fields**: `imageUrls` (download URLs), `imageStoragePaths` (storage paths)

### ❌ **Frontend (Missing)**
Images NOT being displayed in admin panel:
- **AdminFeedback.jsx** line 581: Only shows `msg.message` or `msg.text`
- **SupportChatModal.jsx**: User chat doesn't support adding images to replies (only initial ticket)
- **No image rendering component**

---

## 🛠️ **What Needs to Be Fixed:**

### **1. Admin Panel - Display Images in Ticket Chat**
**File:** `src/pages/admin/AdminFeedback.jsx`  
**Line:** ~581

**Current Code:**
```jsx
<div className="text-sm whitespace-pre-wrap">{msg.message || msg.text}</div>
```

**Need to Add:**
```jsx
<div className="text-sm whitespace-pre-wrap">{msg.message || msg.text}</div>

{/* Display images if present */}
{msg.imageUrls && msg.imageUrls.length > 0 && (
  <div className="mt-2 flex flex-wrap gap-2">
    {msg.imageUrls.map((url, idx) => (
      <a
        key={idx}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <img
          src={url}
          alt={`Screenshot ${idx + 1}`}
          className="max-w-xs rounded-lg border"
          style={{ maxHeight: '300px', objectFit: 'contain' }}
        />
      </a>
    ))}
  </div>
)}
```

### **2. User Chat Modal - Display Images**
**File:** `src/components/common/SupportChatModal.jsx`  
**Line:** ~230 (in the message rendering section)

**Same fix as above** - add image display after message text

### **3. Ghost Worker Dashboard - Display Images**
**File:** `src/components/admin/GhostWorkerConversationModal.jsx`

**Need to check if this component exists and add image support**

---

## 📸 **Image Display Best Practices:**

```jsx
{/* Image Display Component (reusable) */}
{msg.imageUrls && msg.imageUrls.length > 0 && (
  <div className="mt-2 space-y-2">
    {msg.imageUrls.map((url, idx) => (
      <div key={idx} className="relative">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block hover:opacity-90 transition-opacity"
        >
          <img
            src={url}
            alt={`Screenshot ${idx + 1}`}
            className="rounded-lg border max-w-full"
            style={{
              maxHeight: '400px',
              objectFit: 'contain',
              borderColor: theme.border
            }}
            loading="lazy"
          />
        </a>
        <p className="text-xs mt-1" style={{ color: theme.textLight }}>
          📸 Screenshot {idx + 1} • Click to view full size
        </p>
      </div>
    ))}
  </div>
)}
```

---

## 🎯 **Implementation Steps:**

1. **Update `AdminFeedback.jsx`**
   - Add image display in `TicketChatView` component
   - Show images for both user and admin messages
   
2. **Update `SupportChatModal.jsx`**
   - Add image display in user's ticket view
   - Allow users to see their uploaded screenshots
   
3. **Update `GhostWorkerConversationModal.jsx`** (if exists)
   - Show images in Ghosty's ticket view
   
4. **Optional: Add image upload to replies**
   - Allow users/admins to add images to follow-up messages
   - Currently only available on initial ticket creation

---

## 🚀 **Priority:**

**HIGH** - Users can upload screenshots but admins can't see them, which defeats the purpose of the feature.

**Impact:**
- Bug reports with screenshots → admin can't see the bug
- User questions with examples → admin can't see the example
- Recon calculator issues → admin can't see the calculations

---

## ✅ **Quick Win:**

Just add the image rendering code to lines:
- `AdminFeedback.jsx:581` ← **MOST IMPORTANT**
- `SupportChatModal.jsx:~230`
- `GhostWorkerConversationModal.jsx` (if needed)

**Est. Time:** 10-15 minutes per file

---

**Want me to implement this fix now?** 🛠️
