# Admin Panel Permission Fix

## Problem
Getting "Missing or insufficient permissions" errors when granting lifetime access because you're logged into Firebase with a non-admin email.

## Solution

### Quick Fix (Immediate Use):
1. **Log out of The Pep Planner** completely
2. **Log back in with**: `lebrockmaldonado@gmail.com`
3. **Navigate to**: `/admin` and enter the password
4. **Now grant lifetime access** - it will work!

### What's Happening:
- The admin panel checks for password: `j&jm9102` ✅
- BUT Firestore security rules check if you're logged in as: `lebrockmaldonado@gmail.com`
- If you're logged in as any other email (even `contact@thepepplanner.com`), Firestore blocks writes

### Cloud Functions Errors (500 INTERNAL):
The following functions are also failing:
- `getGiftAnalytics` 
- `getStripeSubscriptions`

These need to be redeployed or checked for errors in Cloud Functions console.

## To Grant Lifetime Access:
1. Make sure you're logged in as `lebrockmaldonado@gmail.com`
2. Go to Admin Panel → Lifetime Access tab
3. Enter the email you want to grant access to
4. Click "Grant Lifetime Access"

## Alternative: Update Security Rules
If you want to use a different admin email, update line 9 in `firebase-rules.rules`:
```
function isAdmin() {
  return request.auth != null && 
         request.auth.token.email == 'your-new-admin-email@gmail.com';
}
```

Then redeploy Firestore rules: `firebase deploy --only firestore:rules`








