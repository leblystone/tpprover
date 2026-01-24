# 🎨 Bottom Navigation Visual Guide

## How It Looks Now

### **Mobile View (< 1024px)**

```
┌───────────────────────────────────────────┐
│  🔔  The Pep Planner            👤  ⚙️   │  ← Topbar
├───────────────────────────────────────────┤
│                                           │
│  ┏━━━━━━━━━━━┓ ┌─────────────┐          │  ← Level 2: Section Tabs
│  ┃ Protocols ┃ │Reconstitute │          │     (BOLD, LARGE)
│  ┗━━━━━━━━━━━┛ └─────────────┘          │
├───────────────────────────────────────────┤
│  ┌─────────┬─────────┬──────────┐       │  ← Level 3: Page Tabs
│  │Protocols│ History │ Reminders│       │     (subtle, small)
│  └─────────┴─────────┴──────────┘       │
│                                           │
│  📋 Protocol A                           │
│  📋 Protocol B                           │
│  📋 Protocol C                           │
│                                           │
│                                           │
│                                           │
│                                           │
└───────────────────────────────────────────┘
┌─────────┬─────────┬──────────┬───────────┬──────┐  ← Level 1: Bottom Nav
│ 🏠      │ 📅      │ 🔬       │ 📦        │ ⋯    │     (Always visible)
│ Home    │Calendar │Research  │ Inventory │ More │
│         │         │   ●      │           │      │  ← Active indicator
└─────────┴─────────┴──────────┴───────────┴──────┘
```

---

### **Desktop View (≥ 1024px)**

```
┌──┬────────────────────────────────────────────┐
│🏠│  🔔  The Pep Planner            👤  ⚙️   │  ← Topbar
│  │                                            │
│📅├────────────────────────────────────────────┤
│  │                                            │
│🔬│  ┌─────────┬─────────┬──────────┐        │  ← Level 3: Page Tabs
│  │  │Protocols│ History │ Reminders│        │     (same as before)
│📦│  └─────────┴─────────┴──────────┘        │
│  │                                            │
│⚙️│  📋 Protocol A                            │
│  │  📋 Protocol B                            │
│💼│  📋 Protocol C                            │
│  │                                            │
└──┴────────────────────────────────────────────┘
 ↑
Sidebar (unchanged)
No bottom nav on desktop
```

---

## Navigation Flow Examples

### **Example 1: User wants to check Stockpile**

**Steps:**
1. Tap **Inventory** (📦) in bottom nav
2. Lands on Stockpile (default)
3. See section tabs: `[Stockpile] [Orders] [Vendors]`
4. See page tabs: `[On Hand] [Other tabs...]`

**Taps:** 1 tap total

---

### **Example 2: User wants to add a Protocol**

**Steps:**
1. Tap **Research** (🔬) in bottom nav
2. Lands on Protocols (default)
3. See section tabs: `[Protocols] [Reconstitute]`
4. See page tabs: `[Protocols] [History] [Reminders]`
5. Tap + button to add protocol

**Taps:** 2 taps total

---

### **Example 3: User wants to switch from Protocols to Recon**

**Current Location:** Research → Protocols

**Steps:**
1. Tap **Reconstitute** in section tabs (Level 2)
2. Instantly switches to Recon page
3. Bottom nav stays on Research (🔬)

**Taps:** 1 tap total

---

### **Example 4: User wants to check Orders, then Vendors**

**Steps:**
1. Tap **Inventory** (📦) in bottom nav
2. Tap **Orders** in section tabs
3. View orders
4. Tap **Vendors** in section tabs
5. View vendors

**Taps:** 3 taps total (1 for section, 2 for pages)

---

## Visual Differences Between Tab Levels

### **Level 2: Section Tabs**
```css
font-weight: 700;        /* Bold */
font-size: 1rem;         /* 16px */
padding: 0.625rem 1.25rem; /* Larger padding */
background: Primary color when active
color: White on primary when active
```

**Looks like:** Big bold buttons, prominent

---

### **Level 3: Page Tabs**
```css
font-weight: 500;        /* Medium */
font-size: 0.875rem;     /* 14px */
padding: 0.375rem 0.75rem; /* Smaller padding */
background: Light background or underline when active
color: Primary color when active
```

**Looks like:** Subtle filter options, less prominent

---

## Colors & Theming

All navigation elements automatically use your theme colors:

- **Active state:** `theme.primary`
- **Inactive state:** `theme.textLight`
- **Background:** `theme.cardBackground`
- **Borders:** `theme.border`

Works with **all themes** (Sage, Dark Mode, etc.)

---

## Safe Areas (iOS)

Bottom navigation automatically handles:
- iPhone home indicator
- Notch areas
- Safe area insets

**No extra padding needed!**

---

## Backward Compatibility

### Old Links Still Work:
- `/app/protocols` → Auto-redirects to `/app/research/protocols`
- `/app/orders` → Auto-redirects to `/app/inventory/orders`
- etc.

### Desktop:
- Sidebar unchanged
- Hamburger menu still works
- No visual changes on desktop

---

## Testing Instructions

### **On Mobile/Tablet:**
1. Open app on phone or resize browser < 1024px
2. Check bottom navigation appears at bottom
3. Tap each bottom nav item:
   - Home → Dashboard
   - Calendar → Calendar
   - Research → Protocols page with section tabs
   - Inventory → Stockpile page with section tabs
   - More → Menu screen
4. Within Research section:
   - Tap "Reconstitute" section tab
   - Should switch to Recon page
   - Bottom nav stays on Research
5. Check existing page tabs still work (Protocols | History | Reminders)

### **On Desktop:**
1. Open app in full screen (≥ 1024px)
2. Bottom nav should be hidden
3. Sidebar should work as before
4. All functionality unchanged

---

## Quick Reference

| Navigation Level | Purpose | Style | Location |
|-----------------|---------|-------|----------|
| **Level 1** | Primary sections | Large icons + labels | Bottom (mobile) |
| **Level 2** | Page navigation within section | Bold, prominent tabs | Top of page |
| **Level 3** | Content filtering | Subtle, small tabs | Within page |

---

**Ready to test!** 🚀

Your dev server is running at: http://localhost:5174/







