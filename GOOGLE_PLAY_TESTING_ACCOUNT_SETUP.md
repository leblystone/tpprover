# 🧪 Google Play Testing Account Setup Guide

## **What Google Play Wants**
When you submit your app, Google Play reviewers need to **test your app functionality**. They ask for a testing account so they can:
- ✅ Test the login process
- ✅ Access premium features without paying
- ✅ Verify the app works as described
- ✅ Test core functionality (protocols, calendar, etc.)

## **Setting Up Your Testing Account**

### **Option 1: Create a Dedicated Test Account (Recommended)**

Create a special testing email that you'll share with Google Play reviewers:

**Steps:**
1. Create a new email: `googleplay.test@gmail.com` (or similar)
2. Sign up for your app using this email
3. Grant this account full access (see below)

### **Option 2: Use an Existing Email**

If you already have a test account, use that one and grant it full access.

---

## **How to Grant Full Access to Test Account**

### **Method A: Via Admin Panel (Easiest)**

1. Log into your app's admin panel (`/admin` password: `j&jm9102`)
2. Go to **"Lifetime Access"** tab (🏆 Award icon)
3. Click **"Grant Lifetime Access"**
4. Enter the test email address
5. Select reason: "Testing account for Google Play reviewers"
6. Click **"Grant"**

✅ Now the test account has full premium access!

### **Method B: Via Firebase Console (Manual)**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your `tpp-splendide` project
3. Go to **Firestore Database**
4. Create/update document in `lifetimeAccess` collection:
   ```javascript
   Document ID: test-user-uid (or auto-generate)
   Fields:
   - email: "googleplay.test@gmail.com"
   - userId: "firebase-uid-here"
   - reason: "Google Play testing account"
   - grantedBy: "admin"
   - grantedAt: [timestamp]
   - status: "active"
   ```

### **Method C: Update Firebase Rules (Quick Test)**

Temporarily allow any email to sign up without invite code:

```javascript
// In firebase-rules.rules, update invite codes section:
match /inviteCodes/{codeId} {
  allow read: if true;
  allow create, update, delete: if true; // Already set!
}
```

Then sign up the test account normally.

---

## **What to Tell Google Play**

When Google Play asks for a testing account, provide:

**Email:** `googleplay.test@gmail.com` (your test account email)
**Password:** `YourSecureTestPassword123!` (create a strong password)
**Additional Notes:**
> "This is a dedicated testing account with full access to all premium features. 
> The app uses Firebase Authentication. After signing in, all features including 
> protocols, calendar scheduling, and inventory management will be available."

---

## **Important Security Notes** 🔒

### **DO:**
✅ Use a **dedicated test email** (not your personal email)
✅ Use a **strong password** for the test account
✅ Grant **only the test account** full access
✅ **Document** the test credentials securely

### **DON'T:**
❌ Don't use your personal admin email as test account
❌ Don't share your main admin password
❌ Don't forget to revoke access after approval
❌ Don't use a password you use elsewhere

---

## **After Your App Is Approved** ✅

Once Google Play approves your app:

### **Option 1: Keep Test Account Active**
- Keep it for future updates/reviews
- Useful if you need to submit updates

### **Option 2: Revoke Access (Recommended)**
1. Go to Admin Panel → Lifetime Access
2. Find the test account
3. Click **"Revoke"** or **"Delete"**
4. The account will still exist but won't have premium access

### **Option 3: Delete Test Account Entirely**
1. Firebase Console → Authentication
2. Find test account
3. Delete user

---

## **Quick Setup Checklist** ✅

- [ ] Create test email address
- [ ] Sign up test account in your app
- [ ] Grant lifetime/full access via Admin Panel
- [ ] Test login with test account
- [ ] Verify all features work for test account
- [ ] Document credentials securely
- [ ] Provide info to Google Play reviewers

---

## **Template for Google Play Submission**

Copy this when they ask for testing credentials:

```
Testing Account Details:
────────────────────────
Email: googleplay.test@gmail.com
Password: [Your Password Here]

Additional Instructions:
This account has been pre-configured with full access to all 
premium features. After signing in with these credentials, 
you'll be able to test all functionality including:
- Protocol management and tracking
- Calendar scheduling
- Inventory and supplement tracking
- Goal setting and analytics

The app uses Firebase Authentication for secure login.
```

---

## **Need Help?**

If you run into issues setting up the test account:
1. Check Admin Panel is accessible (`/admin`)
2. Verify Firebase Console access
3. Test login with the test account
4. Check Firebase rules allow signups

Questions? Let me know! 🚀



