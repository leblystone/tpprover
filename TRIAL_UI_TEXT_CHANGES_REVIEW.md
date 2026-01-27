# All UI Text Changes - 30 Day Trial Update

## 📝 Complete List of User-Facing Text Changes

Here's every piece of UI text that mentions the trial period. Review each one to ensure it sounds correct.

---

## 1. **Login/Signup Page** (`src/pages/Login.jsx`)

### Line 1511 - Signup Subtitle
**Text:**
```
"Try everything free for 30 days"
```
**Context:** Appears below "Create Your Account" heading on signup form

---

## 2. **Welcome Modal** (`src/components/onboarding/WelcomeModal.jsx`)

### Line 46 - Heading
**Text:**
```
"30 Days to Test Drive"
```
**Context:** Main heading in the welcome modal trial section

### Line 49 - Description
**Text:**
```
"Take 30 full days to explore every corner: protocols, calendars, inventory tracking, the works. No inital payment, no strings.
Just see if it works for you."
```
**Context:** Description text explaining the trial period

---

## 3. **Swipeable Intro** (`src/components/onboarding/SwipeableIntro.jsx`)

### Line 39 - Screen Title
**Text:**
```
"30 Days to Explore"
```
**Context:** Title of the 4th intro screen

### Line 40 - Subtitle
**Text:**
```
"No strings attached"
```
**Context:** Subtitle (unchanged)

### Line 41 - Description
**Text:**
```
"Take 30 full days to explore every feature. No initial payment, just see if it works for you."
```
**Context:** Description on the intro screen

---

## 4. **Onboarding Tour** (`src/components/onboarding/Tour.jsx`)

### Line 9 - Welcome Message
**Text:**
```
"The Pep Planner helps organize, track, and ultimately make your research easier! Developed with the pep community in mind; it's the cornerstone tool you need. Take the next 30 days and take a look around! Happy researching! 🧪

Let's take a quick tour of your research management system. We'll visit each main page to show you what it does."
```
**Context:** First message users see in the onboarding tour

---

## 5. **Pricing Page** (`src/pages/Pricing.jsx`)

### Line 77 - FAQ Answer
**Text:**
```
"Yes! Every plan starts with a 30-day research trial. No credit card required to explore the workspace."
```
**Context:** Answer to "Is there a free trial?" question

### Line 139 - Hero Section
**Text:**
```
"Choose the plan that fits your research needs. Every plan includes a 30-day research trial."
```
**Context:** Main hero text on pricing page

### Line 291 - Feature Badge
**Text:**
```
"30-Day Free Trial"
```
**Context:** Badge/heading in the pricing features section

---

## 6. **Terms of Service** (`src/pages/Terms.jsx`)

### Line 225 - Research Trial Section
**Text:**
```
"Research Trial: We offer a 30-day research trial for new users. No credit card is required to start your trial."
```
**Context:** Legal terms section about the trial

---

## 7. **Dashboard - Research Status Widget** (`src/components/dashboard/ResearchStatusWidget.jsx`)

### Line 305 - Feature List Item
**Text:**
```
"30-day research trial access"
```
**Context:** Bullet point in the expired trial widget showing what users had access to

---

## 8. **Dashboard - Conversion Widget** (`src/components/dashboard/ConversionWidget.jsx`)

### Line 246 - Plan Name Display
**Text:**
```
"30-Day Research Trial"
```
**Context:** Plan name shown in the conversion widget for active trial users

---

## 9. **Trial Expired Modal** (`src/components/common/TrialExpiredModal.jsx`)

### Line 16 - Modal Title
**Text:**
```
"Your 30-Day Trial Has Ended"
```
**Context:** Title of the modal that appears when trial expires

---

## 10. **Code References (Not User-Facing, but for reference)**

### Plan Name in Code
**Text:**
```
"30-Day Research Trial"
```
**Locations:**
- `src/pages/Login.jsx` (lines 1173, 1207)
- `src/components/dashboard/ConversionWidget.jsx` (line 215 - array)
- `src/components/admin/ExpiredTrialManager.jsx` (line 42 - array)
- `functions/index.js` (line 323)

---

## 📋 Summary by Location

### User-Facing Text (9 locations):
1. ✅ Login signup subtitle
2. ✅ Welcome modal heading & description
3. ✅ Swipeable intro screen
4. ✅ Onboarding tour message
5. ✅ Pricing page FAQ & hero text
6. ✅ Terms of Service
7. ✅ Dashboard widgets (2 locations)
8. ✅ Trial expired modal title

### Code References (4 locations):
- Plan name strings in code
- Admin panel filters
- Backend functions

---

## 🔍 Things to Check

1. **Consistency**: All say "30 days" or "30-day" consistently
2. **Tone**: Friendly, no-pressure messaging maintained
3. **Clarity**: Users understand it's 30 days, no credit card required
4. **Grammar**: "30-day" (hyphenated) vs "30 days" (two words) - both used correctly

---

## ⚠️ Note

The following files contain email template text that you mentioned you'll update yourself:
- `functions/emailTemplates.js`
- `src/components/admin/EmailTemplateManager.jsx` (line 138)
- `functions/testEmailSystem.js`

These are NOT included in this list since you're handling them separately.

---

**All user-facing text has been updated to reflect the 30-day trial period!** 🎉
