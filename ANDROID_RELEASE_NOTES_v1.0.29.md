# Android Release Notes - v1.0.29

## For Google Play Store Submission

### Short Description (500 characters max)
Bug fixes, performance improvements, and UI polish. Enhanced data sync reliability, improved calendar and dashboard widgets, refined stockpile management, and optimized protocol workflows. Better notification system and overall app stability.

---

### Full Release Notes (4000 characters max)

**What's New in v1.0.29:**

🎨 **UI & Design Improvements**
- Enhanced dashboard with glassmorphism effects and improved widget separators
- Polished calendar interface with better day and week views
- Refined stockpile management flow with cleaner empty states
- Updated task display and better list styling throughout the app
- Improved dropdown filters and modal designs
- Compact save buttons in recon calculator and protocol wizard

📊 **Dashboard Enhancements**
- Reworked dashboard widgets for better information display
- Improved Goals, Tasks, and Notes widgets
- Better spacing and visual hierarchy
- Enhanced widget customization options

📅 **Calendar Updates**
- Completely reworked calendar views for better usability
- Improved day and week view layouts
- Better task display and scheduling interface
- Enhanced date picker with glassmorphism design
- AM/PM differentiation for research tasks

💊 **Protocol Management**
- New end protocol assessment feature
- Improved vial linking with accurate price per vial display
- Enhanced protocol modal with better reminder dropdowns
- Titration and hold phase UI improvements
- Better protocol follow-up tracking

📦 **Stockpile Improvements**
- Fixed overlap bugs in stockpile display
- Enhanced add/edit modal with improved dropdowns
- Better cost display in edit mode
- Compact unit displays
- Improved crimp cap color input
- Better empty state messaging

🧮 **Recon Calculator**
- More compact interface
- Subtle disclaimer text
- Improved unit conversion utilities
- Better calculation accuracy

🔔 **Notifications**
- Fixed FCM token registration issues
- Added notification diagnostics panel
- Improved push notification reliability
- Better notification permissions handling

☁️ **Data Sync & Safety**
- Enhanced cloud sync reliability with 30-second protection window
- Full logout sync implementation
- Offline retry mechanisms
- Pre-destructive snapshots for data safety
- Improved stockpile history sync to cloud
- Better data validation throughout app

🐛 **Bug Fixes**
- Fixed stockpile overlap display issues
- Resolved Add Note button visibility in dark mode (terracotta theme)
- Fixed protocol vial price calculations
- Improved toast message formatting (removed emoji conflicts)
- Better dropdown portal positioning in modals
- Fixed local storage migration issues
- Resolved various edge case crashes

⚡ **Performance**
- Optimized cloud function calls
- Improved app startup time
- Better memory management
- Reduced unnecessary re-renders
- Enhanced caching mechanisms

🛠️ **Under the Hood**
- Updated Firebase integration
- Improved error handling and logging
- Better timezone auto-update
- Enhanced payment compliance checks
- Refined data validation logic
- Optimized export functionality

---

### Bug Fixes Only (Alternative Short Version - for "Bug fixes and performance improvements" update)

This update includes important bug fixes and performance improvements:
- Fixed data sync issues
- Improved notification delivery
- Enhanced UI responsiveness
- Resolved stockpile display bugs
- Better offline functionality
- General stability improvements

---

### Version History Reference

**Previous Version:** 1.0.25
**Current Version:** 1.0.29
**Version Code:** 29

---

## Notes for Internal Use

**Major Themes:**
1. iOS App Store preparation (parity features)
2. Data safety and sync reliability
3. UI polish and glassmorphism design
4. Calendar and dashboard rework
5. Notification system improvements

**Testing Focus:**
- Data sync under various network conditions
- Stockpile add/edit workflows
- Protocol creation and management
- Push notifications
- Calendar views on different screen sizes
- Dark mode (especially terracotta theme)

**Known Issues (if any):**
None blocking release.

---

## Recommended Play Store Listing

**What's New** (max 500 chars for Play Store):
```
Bug fixes, UI improvements, and enhanced reliability. Updated dashboard and calendar, better data sync, improved notifications, refined stockpile management, and protocol workflow optimizations. General performance and stability improvements.
```

**Alternative Concise Version** (if character limit tight):
```
Bug fixes and performance improvements. Enhanced UI, better data sync, improved notifications, and general stability updates.
```
