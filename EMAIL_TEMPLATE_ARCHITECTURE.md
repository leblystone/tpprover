# Email Template Architecture 📧

## Overview
The email system has two HTML generators that need to stay in sync for the best editing experience.

---

## Two HTML Generators

### 1. **Admin Panel Preview** (Frontend)
**File:** `src/components/admin/EmailTemplateManager.jsx`  
**Function:** `generateHTMLFromTemplate()` (line ~796-935)

**Purpose:**
- Generates the preview you see in the admin panel
- Client-side JavaScript (React)
- Shows you what the email will look like before saving

**Features:**
- Full template with modern Poppins design
- Features section (one card with bullets)
- Compact gradient CTA button
- Matches landing page styling

### 2. **Backend Fallback** (Firebase Functions)
**File:** `functions/emailService.js`  
**Function:** `generateDefaultHTML()` (line ~872-950)

**Purpose:**
- Basic fallback template when no Firestore template exists
- Server-side code (Node.js)
- Simple, minimal design

**Note:** This is rarely used because most emails use Firestore templates!

---

## How It Works

```
User edits in Admin Panel
  ↓
Admin Panel Preview (generateHTMLFromTemplate)
  ↓
User hits "Save" → Data saved to Firestore
  ↓
When email is sent → Backend loads from Firestore
  ↓
Backend uses generateEmailHTML() which reads Firestore data
  ↓
Email sent with Firestore template
```

---

## Current Design (As of Jan 2026)

### CTA Button
- **Padding:** 14px 32px (compact)
- **Font:** 15px, semi-bold (600)
- **Border:** 2px solid white (20% opacity)
- **Border Radius:** 12px
- **Gradient:** primary → primaryLight
- **Shadow:** Multi-layer (4px 16px + 2px 6px)
- **Position:** Right after mainMessage, before features

### Features Section
- **Layout:** ONE card with bullet list (not separate cards)
- **Background:** White card on sage background
- **Bullets:** Green checkmarks (✓)
- **Padding:** 32px inside card
- **Font:** 15px titles, 13px descriptions

---

## ⚠️ Known Friction Point

**Issue:** When making design changes, you need to update BOTH:
1. Admin panel preview (`EmailTemplateManager.jsx`)
2. Backend fallback (`emailService.js`)

**Why:** They're in different environments (React vs Node) and can't share code easily.

**Current Solution:** Update both files manually to keep them in sync.

**Future Improvement Ideas:**
1. Create a shared template spec (JSON) that both consume
2. Move all template generation to backend API
3. Generate HTML from a single source of truth
4. Use a template engine like Handlebars

---

## Making Template Design Changes

### Checklist:
- [ ] Update `generateHTMLFromTemplate()` in `EmailTemplateManager.jsx`
- [ ] Update `generateDefaultHTML()` in `emailService.js` (if applicable)
- [ ] Test in admin panel preview
- [ ] Send test email
- [ ] Verify in actual email client

### Common Changes:
- **Button styling** - Update both functions
- **Colors** - Usually just in admin panel (Firestore stores colors)
- **Layout** - Update both functions
- **Features display** - Admin panel only (backend doesn't use features)

---

## Recent Changes

### Jan 24, 2026 - Welcome Email Redesign
- ✅ Moved CTA button to appear after mainMessage
- ✅ Redesigned button with gradient + shadow + border
- ✅ Made button compact (14px 32px padding)
- ✅ Changed features from separate cards to ONE card with bullets
- ✅ Updated both admin preview and backend fallback

---

## Files to Know

| File | Purpose | Language |
|------|---------|----------|
| `src/components/admin/EmailTemplateManager.jsx` | Admin panel editor & preview | React/JSX |
| `functions/emailService.js` | Email sending & generation | Node.js |
| `functions/emailTemplates.js` | V2 hardcoded templates | Node.js |
| Firestore `emailTemplates` collection | User-edited templates | Database |

---

## Questions?

If you're making template changes and something doesn't match, check:
1. Did you update BOTH generators?
2. Did you save in admin panel?
3. Did you deploy functions?
4. Are you testing the right template (Firestore vs fallback)?
