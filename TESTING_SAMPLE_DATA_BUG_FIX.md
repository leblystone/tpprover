# Testing Guide: Sample Data Bug Fix

## Overview
This guide helps you test the fix for the bug where sample data would reappear after users removed it, potentially causing data loss.

---

## Test 1: Sample Data Doesn't Reappear After Clearing ✅

### Steps:
1. **Login to an account with sample data**
   - You should see the sample data banner at the top
   - Verify you see sample vendors, orders, protocols, etc.

2. **Remove sample data**
   - Click the "Remove" button on the sample data banner
   - Confirm the removal
   - Verify sample data is gone

3. **Add your own data**
   - Add a real vendor (e.g., "My Test Vendor")
   - Add a real order or protocol
   - Verify your data appears

4. **Logout and login again**
   - Logout completely
   - Clear browser cache (optional - more thorough test)
   - Login again

5. **Expected Result: ✅**
   - ✅ Your real data is still there
   - ✅ Sample data does NOT reappear
   - ✅ Sample data banner does NOT reappear
   - ✅ No data loss

---

## Test 2: Simulate Empty Account After Clearing Sample Data 🔬

This simulates the exact bug condition that was causing the issue.

### Steps:
1. **Login to an account with sample data**

2. **Remove sample data**
   - Click "Remove" on the sample data banner
   - Confirm removal

3. **Open browser console** (F12)

4. **Manually clear Firestore data to simulate empty account**
   ```javascript
   // This simulates what happens when cloud sync returns empty data
   console.log('🧪 TEST: Simulating empty cloud data...');
   
   // Clear cloud data flag manually (simulates empty Firestore)
   localStorage.setItem('tpprover_test_simulate_empty_cloud', 'true');
   ```

5. **Check the flag is set**
   ```javascript
   console.log('Sample data cleared flag:', localStorage.getItem('tpprover_sample_data_cleared'));
   // Should return: "true"
   ```

6. **Refresh the page**

7. **Expected Result: ✅**
   - ✅ App should NOT auto-seed sample data
   - ✅ Console should show: "ℹ️ Account has 0 items but user cleared sample data - respecting user preference, not seeding"
   - ✅ Account stays empty (respecting user's choice)

---

## Test 3: Cloud Flag Sync Test ☁️

Tests that the flag syncs properly between devices/browsers.

### Steps:
1. **Browser A: Remove sample data**
   - Login to your account
   - Remove sample data
   - Logout

2. **Browser B: Login to same account**
   - Use a different browser or incognito window
   - Login to the SAME account

3. **Expected Result: ✅**
   - ✅ Sample data should NOT appear in Browser B
   - ✅ The cleared flag should sync from cloud storage
   - ✅ Console shows: "🔄 Demo data was cleared on another platform - syncing local data"

---

## Test 4: New User Gets Sample Data ✨

Verify that NEW users still get sample data (only cleared users don't).

### Steps:
1. **Create a brand new account**
   - Use a new email address
   - Sign up for the first time

2. **Login for the first time**

3. **Expected Result: ✅**
   - ✅ Sample data SHOULD appear for new users
   - ✅ Sample data banner shows at top
   - ✅ User sees example vendors, orders, protocols

---

## Test 5: Save Button Visibility Test 🔘

Tests that save buttons are visible and working.

### Steps:
1. **Go to Protocols page**
   - Click "Add Protocol" or edit existing protocol
   - Modal should open

2. **Scroll to bottom of modal**
   - Verify "Save Protocol" button is visible
   - If subscription expired, should show "Save Protocol (Upgrade Required)"

3. **Go to Stockpile page**
   - Click "Add Peptide"
   - Modal should open

4. **Scroll to bottom of modal**
   - Verify "Save Changes" button is visible
   - If subscription expired, should show "Save Changes (Upgrade Required)"

5. **Expected Result: ✅**
   - ✅ Save buttons are clearly visible
   - ✅ Buttons have proper labels
   - ✅ Tooltips appear on hover
   - ✅ Disabled state is clear when in read-only mode

---

## Test 6: Read-Only Mode Test 🔒

Tests save button behavior when subscription expired.

### Steps:
1. **Simulate expired subscription** (in browser console):
   ```javascript
   // Temporarily set subscription to expired for testing
   const currentSub = JSON.parse(localStorage.getItem('tpprover_subscription') || '{}');
   currentSub.status = 'past_due';
   currentSub.currentPeriodEnd = new Date(Date.now() - 1000).toISOString(); // Yesterday
   localStorage.setItem('tpprover_subscription', JSON.stringify(currentSub));
   
   // Refresh page
   window.location.reload();
   ```

2. **Try to save data**
   - Open protocol or stockpile modal
   - Fill in some data
   - Click save button

3. **Expected Result: ✅**
   - ✅ Save button should be disabled and grayed out
   - ✅ Button text should show "(Upgrade Required)"
   - ✅ Upgrade modal should appear if you try to save
   - ✅ Data should not be saved

4. **Restore subscription** (in console):
   ```javascript
   // Restore trial subscription
   const currentSub = JSON.parse(localStorage.getItem('tpprover_subscription') || '{}');
   currentSub.status = 'trialing';
   currentSub.currentPeriodEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days
   localStorage.setItem('tpprover_subscription', JSON.stringify(currentSub));
   window.location.reload();
   ```

---

## 🐛 Bug Reproduction (Before Fix)

If you want to see what the bug USED to do (requires reverting the fix):

### Original Bug Behavior:
1. User removes sample data
2. Cloud sync returns empty data (network issue, timing issue, etc.)
3. App sees 0 items and auto-seeds sample data
4. Sample data reappears, user's real data might be lost

### How It's Fixed:
- App now checks `sampleDataCleared` flag before auto-seeding
- Flag syncs bidirectionally between cloud and local storage
- Auto-seed is skipped if user has explicitly cleared sample data

---

## 🔍 Console Logs to Watch For

During testing, watch for these console messages:

### ✅ Good Messages (After Fix):
- `"ℹ️ Account has 0 items but user cleared sample data - respecting user preference, not seeding"`
- `"🔄 Demo data was cleared on another platform - syncing local data"`
- `"🔄 Demo data was cleared locally but not in cloud - syncing to cloud"`
- `"✅ Saved sample data cleared flag to cloud"`

### ❌ Bad Messages (Should NOT appear after clearing):
- `"📭 Account has 0 items - auto-seeding demo data to Firestore..."` (when flag is set)
- `"✅ Demo data auto-seeded for empty account"` (when user already cleared it)

---

## 📊 What to Report

If you find any issues during testing, please report:

1. **Which test failed**
2. **Console logs** (screenshot or copy/paste)
3. **Steps to reproduce**
4. **Expected vs actual behavior**
5. **Browser and device info**

---

## ✨ Success Criteria

All tests pass when:
- ✅ Sample data never reappears after user removes it
- ✅ User data is never lost
- ✅ Flags sync properly between devices
- ✅ New users still get sample data
- ✅ Save buttons are visible and working
- ✅ Read-only mode works correctly

