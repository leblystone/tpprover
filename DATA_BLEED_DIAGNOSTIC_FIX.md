# Data Bleed Between Accounts - Diagnostic & Fixes

**Date:** January 2025  
**Status:** RESOLVED - Enhanced data isolation with validation

## Problem Summary 🔍

Data was bleeding between accounts when testing locally. This could occur when:
1. Switching between test accounts on the same device
2. localStorage data from one account was loaded before account switch detection
3. Components reading directly from localStorage without validating user ownership

## Root Causes Identified 🔎

### 1. **Direct localStorage Reads Without Validation**
Several components were reading directly from localStorage without checking if the data belonged to the current user:
- `Orders.jsx` - Reading `tpprover_task_completion` and `tpprover_calendar_done`
- `Calendar.jsx` - Reading `tpprover_goals`
- `WeekView.jsx` - Reading `tpprover_orders` as fallback

### 2. **Race Condition in Data Loading**
The instant load effect in `AppContext.jsx` loads localStorage data immediately on mount, before Firebase Auth completes. While there's validation, components that read directly bypass this.

### 3. **No User Ownership Validation**
When components read from localStorage directly, they don't validate that the data belongs to the current authenticated user.

## Solutions Implemented ✅

### 1. **Created Data Bleed Diagnostic Tool** (`src/utils/dataBleedDiagnostic.js`)
- `diagnoseDataBleed()` - Checks for potential data bleed issues
- `logDataBleedDiagnostic()` - Logs formatted diagnostic report
- `safeLocalStorageGet(key, expectedUserEmail)` - Validates user ownership before reading
- `validateDataOwnership(userEmail)` - Checks if localStorage data belongs to user

**Usage in Development:**
The diagnostic tool automatically runs in development mode when a user is loaded. Check the console for diagnostic reports.

**Manual Usage:**
```javascript
import { logDataBleedDiagnostic } from './utils/dataBleedDiagnostic';
logDataBleedDiagnostic();
```

### 2. **Fixed Direct localStorage Reads**

**Orders.jsx:**
- Replaced direct `localStorage.getItem()` calls with `safeLocalStorageGet()`
- Validates user ownership using `firebaseUser.email` before reading

**Calendar.jsx:**
- Updated goals loading to use `safeLocalStorageGet()` with user validation
- Added `useFirebase()` hook to access current user email

**WeekView.jsx:**
- Fixed orders fallback read to use `safeLocalStorageGet()`
- Added `useFirebase()` hook for user validation

### 3. **Enhanced Account Switch Detection**
The existing account switch detection in `AppContext.jsx` already:
- Clears all localStorage data on account switch
- Clears React state immediately
- Validates data ownership before instant load

The new `safeLocalStorageGet()` utility adds an extra layer of protection even after data loads.

## How to Test 🔬

### Test Data Bleed Prevention:

1. **Sign in as User A** - Create some data (protocols, orders, etc.)
2. **Sign out completely**
3. **Sign in as User B** - Should see no data from User A
4. **Check browser console** - Diagnostic tool should report no issues
5. **Navigate to Orders/Calendar** - Should not show User A's data

### Manual Diagnostic Check:

1. Open browser console
2. Run: `window.logDataBleedDiagnostic()` (if available) or import and call directly
3. Check for any warnings or critical issues

## Data Isolation Layers 🛡️

The app now has multiple layers of data isolation:

1. **Firebase Security Rules** - Server-side enforcement that users can only access their own data
2. **Account Switch Detection** - Clears localStorage and React state when user changes
3. **Instant Load Validation** - Validates user ownership before loading localStorage data on mount
4. **Safe localStorage Getters** - Components validate ownership before reading localStorage
5. **User ID-Based Cloud Storage** - All cloud data is scoped to `userId` in Firestore

## Files Modified 📝

- `src/utils/dataBleedDiagnostic.js` - NEW: Diagnostic and validation utilities
- `src/pages/Orders.jsx` - Added safe localStorage reads
- `src/pages/Calendar.jsx` - Added safe localStorage reads with user validation
- `src/components/calendar/WeekView.jsx` - Added safe localStorage reads
- `src/App.jsx` - Added automatic diagnostic in development mode

## Prevention for Future Development 🚨

**When reading from localStorage:**
1. ✅ Use `safeLocalStorageGet(key, userEmail)` from `dataBleedDiagnostic.js`
2. ✅ Always validate user ownership before loading user-specific data
3. ✅ Use `firebaseUser.email` from `useFirebase()` hook for validation
4. ✅ Never read user-specific data directly with `localStorage.getItem()`

**User-specific data keys that require validation:**
- `tpprover_protocols`
- `tpprover_recon_items`
- `tpprover_recon_history`
- `tpprover_supplements`
- `tpprover_orders`
- `tpprover_metrics`
- `tpprover_vendors`
- `tpprover_calendar_notes`
- `tpprover_stockpile`
- `tpprover_scheduled_buys`
- `tpprover_task_completion`
- `tpprover_calendar_done`
- `tpprover_goals`

**Shared data keys (no validation needed):**
- `tpprover_theme` - Theme preference
- `tpprover_settings` - App settings
- `tpprover_last_user_email` - Used for validation

## Conclusion ✨

Data bleed issues should now be prevented through:
- ✅ User ownership validation on all localStorage reads
- ✅ Automatic diagnostic reporting in development
- ✅ Enhanced account switch detection
- ✅ Multiple layers of data isolation

If data bleed is still observed:
1. Check browser console for diagnostic reports
2. Verify Firebase Auth user matches localStorage user
3. Check if any new components are reading localStorage directly
4. Verify account switch detection is working (check console logs)




