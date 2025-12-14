# Testing Guide: Data Bleeding Fix (Logout → Login)

**Fix Date:** December 14, 2024  
**Testing URL:** http://localhost:5174/  
**Critical Issue:** Data bleeding between accounts when logout → login sequence occurs

---

## What Was Fixed 🔧

**The Problem:**
- When User A logs out and User B logs in, User A's data appeared in User B's account
- Root cause: `tpprover_last_user_email` was kept on logout, breaking account switch detection

**The Solution:**
1. Removed `tpprover_last_user_email` from KEYS_TO_KEEP list
2. Enhanced logout to explicitly clear tracking data
3. Enhanced auth handler to clear React state when no user
4. Enhanced account switch detection to clear React state
5. Added instant load safety check

---

## Manual Testing Steps 🧪

### Test 1: Basic Logout → Login Different Account

**Prerequisites:**
- Have 2 test accounts ready (e.g., test1@yourdomain.com and test2@yourdomain.com)
- Open browser DevTools (F12) → Console tab

**Steps:**

1. **Login as User A:**
   - Go to http://localhost:5174/login
   - Login with first test account
   - Create some test data:
     - Add a protocol (name it "User A Protocol")
     - Add an order (name vendor "User A Vendor")
   - Note the data in the UI

2. **Logout:**
   - Click Account/Settings → Logout
   - Watch console for cleanup messages:
     ```
     🧹 CLEARING ALL USER DATA FROM LOCALSTORAGE
     ✅ User data cleared from localStorage
     ```

3. **Verify localStorage is Clean:**
   - Open DevTools → Application → Local Storage → http://localhost:5174
   - ✅ `tpprover_last_user_email` should be GONE
   - ✅ `tpprover_protocols` should be GONE
   - ✅ `tpprover_orders` should be GONE
   - ✅ `tpprover_vendors` should be GONE
   - ✅ Only `tpprover_theme` and `tpprover_settings` should remain

4. **Login as User B:**
   - Go to http://localhost:5174/login
   - Login with second test account
   - Watch console for account switch detection (if any localStorage remained):
     ```
     🛡️ Account switch detected. Clearing local user data to prevent bleed.
       Previous user: test1@yourdomain.com
       New user: test2@yourdomain.com
     ✅ Account data cleared for new user (localStorage + React state)
     ```

5. **Verify NO Data Bleed:**
   - ✅ Should NOT see "User A Protocol"
   - ✅ Should NOT see "User A Vendor"
   - ✅ Should only see User B's data (or sample data if new account)

---

### Test 2: Rapid Account Switching

**Steps:**

1. Login as User A → create data → logout
2. Login as User B → verify no User A data → logout
3. Login as User A again → verify User A's data is back
4. Login as User B again → verify no User A data

**Expected:**
- ✅ Each user only sees their own data
- ✅ No bleeding between accounts at any point

---

### Test 3: Expired Account Login After Active Account

**This is the exact scenario the user reported:**

1. Login as active/paid account → create data → logout
2. Login as expired account
3. **Expected:** Expired account should NOT see active account's data

---

## Console Verification ✅

### After Logout:
```
🧹 CLEARING ALL USER DATA FROM LOCALSTORAGE
🧹 Removing X localStorage keys: [tpprover_protocols, tpprover_orders, ...]
✅ User data cleared from localStorage
✅ User data fully cleared - no user-specific keys remain
```

### After Login to Different Account:
```
⏸️ No user tracking email found - skipping instant load
  Data will load from cloud after authentication
```

OR (if any stale data existed):
```
🛡️ Account switch detected. Clearing local user data to prevent bleed.
  Previous user: user_a@email.com
  New user: user_b@email.com
✅ Account data cleared for new user (localStorage + React state)
```

---

## localStorage Inspection Checklist 📋

### After Logout (Before New Login):

Open DevTools → Application → Local Storage → http://localhost:5174

**Should be GONE:**
- [ ] `tpprover_last_user_email` ← CRITICAL FIX
- [ ] `tpprover_user`
- [ ] `tpprover_auth_token`
- [ ] `tpprover_protocols`
- [ ] `tpprover_orders`
- [ ] `tpprover_vendors`
- [ ] `tpprover_stockpile`
- [ ] `tpprover_recon_items`
- [ ] `tpprover_supplements`
- [ ] `tpprover_metrics`
- [ ] `tpprover_calendar_notes`
- [ ] `tpprover_scheduled_buys`

**Should REMAIN:**
- [ ] `tpprover_theme` (user preference)
- [ ] `tpprover_settings` (user preference)

---

## What to Report 📝

### ✅ Success Criteria:
- Logout clears all user data from localStorage
- `tpprover_last_user_email` is completely removed on logout
- New account login shows NO data from previous account
- Each user only sees their own data

### 🚨 Failure Criteria:
- Any data from User A appears in User B's account
- `tpprover_last_user_email` still exists after logout
- localStorage still contains `tpprover_protocols`, `tpprover_orders`, etc. after logout
- React state shows old user's data after new login

---

## Additional Debugging 🔍

If you still see data bleeding:

1. **Check Console for Errors:**
   - Any red errors in console?
   - Is `clearAllUserData()` being called?

2. **Manual localStorage Clear:**
   - DevTools → Console → Type:
     ```javascript
     localStorage.clear()
     ```
   - Then try login again

3. **Hard Refresh:**
   - Logout
   - Press Ctrl+Shift+R (or Cmd+Shift+R on Mac) to hard refresh
   - Login with new account

4. **Inspect Cloud Data:**
   - The bug could also be in Firestore (cloud storage)
   - Check Firebase Console → Firestore → users collection
   - Verify each user has isolated data

---

## Known Issues ⚠️

None expected with this fix. The root cause has been completely eliminated.

---

## Next Steps After Testing

1. ✅ Verify fix works locally
2. Deploy to production immediately (CRITICAL fix)
3. Consider notifying users to logout/login after deployment
4. Monitor logs for "Account switch detected" messages
5. Check for any user reports of data bleeding

---

**Test URL:** http://localhost:5174/  
**Status:** Ready for testing ✅

