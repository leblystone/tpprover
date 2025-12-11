# Release Notes - Version 1.0.9+

## Summary of Changes Since Version 1.0.9

### 🎨 UI/UX Improvements

- **Protocol Details Modal**: Updated UI and added follow-up functionality for active protocols
- **Calendar Weekly View**: Changed "FU" to "FOLLOW UP" and replaced toast notifications with modal popup for protocol notes
- **Confirmation Modals**: 
  - Moved title to header
  - Removed icon/message
  - Updated to use terracotta delete button
  - Reduced padding and improved button spacing
- **Protocol History UI**: 
  - Matched vendor colors
  - Repositioned chips and duration display
- **Button Text Wrapping**: Fixed wrapping issues and modal footer positioning
- **Order Form UX**: Improved user experience and replaced alert emojis with Lucide icons
- **Pending Vendors Widget**: 
  - Added scrollable container
  - Improved styling
  - Fixed vendor completion sync across pages
- **Stockpile Widget**: 
  - Changed green color to darker sage
  - Updated to show peptide lists instead of overview metrics

### 🐛 Bug Fixes

- **Critical - Annual Subscription**: Fixed annual subscription price ID to prevent monthly charges on annual plans
- **Critical - Scheduled Buy Names**: Fixed data transformation bug where scheduled buy names weren't displaying (item field was being dropped)
- **Critical - Trial Lockout**: Prevented trial lockout for lifetime and all subscription types
- **Pricing Crash Bug**: Added null checks for getPlanPricing to prevent app shutdown
- **Vendor Data Transfer**: Fixed vendor data transfer from stockpile to recon calculator (vendorId now properly transfers)
- **Recon History**: Fixed delete modal and improved history details display
- **Order Tracking**: Fixed status sync issues
- **Dashboard Today's Research**: Fixed to match Calendar view exactly
- **Dashboard Custom Frequency**: Fixed scheduling to match Calendar view
- **Calendar Date Selection**: Fixed timezone conversion issues in protocol wizard
- **Password Reset**: 
  - Fixed %RESET_LINK% placeholder replacement in email templates
  - Updated ResetPassword page to match Login UI
  - Ensured compatibility with custom tokens
- **Firebase Authentication**: Fixed authentication errors and password reset flow
- **Account Creation**: Improved error handling for blocked accounts
- **Recently Deleted**: Fixed restore handling
- **Infinite Loops**: 
  - Eliminated infinite loop in UpcomingBuys component
  - Fixed infinite loops in ReconCalculatorPanel and ConversionWidget
- **Protocol Search**: Fixed search functionality to filter by name only
- **Frame Rate Monitoring**: Removed aggressive monitoring that was causing main thread blocking

### ✨ New Features

- **Edit Functionality**: Added edit functionality for incoming stockpile
- **Recon Calculator**: 
  - Updated dropdowns
  - Added delete functionality
  - Improved history sorting with timestamps
  - Auto-fill cost per calculation in order modal
- **Protocol History**: 
  - Added migration functionality
  - Enhanced history modal
  - Added vertical timeline design
- **Supplement Tracking**: Enhanced with date fields and improved layout
- **Group Buys**: 
  - Fixed to use Firestore serverTimestamp instead of client-side timestamps
  - Preserved all fields including item, name, peptideName, location, participants, price, notes
- **Order Items**: Converted unit toggles to dropdowns and improved cost calculation
- **Research Update Toast**: Added 30-minute cooldown to prevent frequent notifications
- **Admin Tools**: Added tools for checking/deleting blocked accounts and fixed CORS

### 🔧 Technical Improvements

- **ID Generation**: Standardized to use generateId() instead of Date.now() for all user-generated content
- **Email Templates**: 
  - Use custom email templates for password reset instead of Firebase default
  - Disabled SendGrid click tracking for password reset emails
- **Password Requirements**: Simplified password error messages and standardized requirements
- **Trial Period**: Updated from 7 days to 10 days across all templates and messaging
- **Deployment**: Removed SHIPPO_API_KEY secret requirement
- **Mobile Improvements**: 
  - Fixed landing page scrolling
  - Fixed mobile Safari issues (removed iOS banner, disabled text hyphenation)
  - Improved touch handling for scheduled buy buttons
- **Console Output**: 
  - Removed annoying 'hiding closed ticket' console log output
  - Cleaned up debug logging statements

### 📱 Mobile Enhancements

- Improved mobile touch handling with touch-manipulation CSS class
- Prevented blur events on mobile/touch devices
- Better tap highlighting behavior
- Fixed landing page mobile Safari issues

---

**Total Commits Since v1.0.9**: 50+ improvements and fixes



