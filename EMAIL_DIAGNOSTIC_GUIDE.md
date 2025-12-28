# 🔍 Email System Diagnostic Guide

## 🚨 **The Problem**
Only test emails (to `thepepplanner@gmail.com`) are going through. Real user emails aren't being sent after migrating from SendGrid to Resend.

## 📋 **Functions to Check in Firebase Logs**

### **Primary Function (Most Important)**
**`onUserCreated`** - This trigger fires when a new user document is created in Firestore.

**What to look for:**
- `🔥 onUserCreated trigger FIRED!` - Confirms trigger is working
- `👋 New user created: {userId} ({email})` - Confirms user data is received
- `📧 Attempting to send welcome email to: {email}` - Confirms email attempt
- `✅ Welcome email sent successfully` OR `❌ Failed to send welcome email`
- `🔑 API Key being used: re_...` - Shows if API key is accessible
- `⚠️ Resend not configured` - **THIS IS THE PROBLEM** if you see this

### **Other Email Functions to Monitor**
1. **`sendCustomVerificationEmail`** - Email verification
2. **`sendAccountDeletionEmail`** - Account deletion confirmations
3. **`sendInDepthRequestEmail`** - Support/in-depth requests
4. **`sendInviteEmail`** - Invitations
5. **`sendLifetimeAccessEmail`** - Lifetime access grants
6. **`createSupportTicket`** - Support ticket creation
7. **`addTicketMessage`** - Support ticket replies

## 🔧 **Quick Diagnostic Steps**

### **Step 1: Run Diagnostic Function**
Call this from your admin panel or Firebase Console:

```javascript
// In browser console or Firebase Console
const functions = getFunctions();
const diagnose = httpsCallable(functions, 'diagnoseEmailSystem');
const result = await diagnose({ testEmail: 'your-email@gmail.com' });
console.log(result.data);
```

This will check:
- ✅ Is RESEND_API_KEY accessible?
- ✅ Is API key format correct?
- ✅ Can Resend be imported?
- ✅ Can Resend client be initialized?
- ✅ Can we send a test email?
- ✅ Can we access Firestore?

### **Step 2: Check Firebase Secrets**
```bash
# Verify secret exists
firebase functions:secrets:access RESEND_API_KEY

# If it doesn't exist or is wrong, set it:
firebase functions:secrets:set RESEND_API_KEY
# Then paste your Resend API key when prompted
```

### **Step 3: Check Function Logs**
1. Go to Firebase Console → Functions → Logs
2. Filter by: `onUserCreated`
3. Look for the log messages listed above
4. Check for errors like:
   - `⚠️ Resend not configured`
   - `❌ Invalid Resend API key format`
   - `❌ Failed to send email`

### **Step 4: Verify Trigger is Firing**
1. Create a test user account
2. Check Firebase Console → Firestore → `users` collection
3. Verify the user document was created
4. Check Functions logs for `onUserCreated` trigger

## 🐛 **Common Issues & Fixes**

### **Issue 1: RESEND_API_KEY Not Accessible**
**Symptoms:**
- Logs show: `⚠️ Resend not configured`
- `🔑 API Key being used: undefined`

**Fix:**
```bash
firebase functions:secrets:set RESEND_API_KEY
# Enter your Resend API key (starts with "re_")
```

**Then redeploy functions:**
```bash
firebase deploy --only functions
```

### **Issue 2: API Key Format Wrong**
**Symptoms:**
- Logs show: `❌ Invalid Resend API key format`
- API key doesn't start with `re_`

**Fix:**
- Get your API key from Resend dashboard: https://resend.com/api-keys
- Make sure it starts with `re_` and is at least 40 characters
- Set it again: `firebase functions:secrets:set RESEND_API_KEY`

### **Issue 3: Trigger Not Firing**
**Symptoms:**
- No logs for `onUserCreated` when user signs up
- User document exists in Firestore but no emails sent

**Fix:**
- Check if user document is being created in `users` collection
- Verify trigger is deployed: `firebase functions:list | grep onUserCreated`
- Redeploy: `firebase deploy --only functions:onUserCreated`

### **Issue 4: Emails Failing Silently**
**Symptoms:**
- Logs show email attempt but no success/failure
- No entries in emailHistory collection

**Fix:**
- Check if `logToHistory` option is being passed (should be automatic now)
- Check Firestore permissions for `emailHistory` collection
- Look for errors in function logs

## 📊 **What to Check in Resend Dashboard**

1. **Go to:** https://resend.com/emails
2. **Check:**
   - Are ANY emails showing up? (Even test emails)
   - What's the "To" address? (Should be real user emails, not just test)
   - What's the status? (Delivered, Bounced, Failed)
   - When was the last email sent?

3. **If NO emails are showing:**
   - API key might not be set
   - Functions might not be deployed
   - Trigger might not be firing

4. **If only test emails show:**
   - Real user emails are failing before reaching Resend
   - Check function logs for errors
   - Check if `sendEmail` function is being called

## 🎯 **Immediate Action Items**

1. **Run the diagnostic function** (see Step 1 above)
2. **Check Firebase Functions logs** for `onUserCreated`
3. **Verify RESEND_API_KEY is set:** `firebase functions:secrets:access RESEND_API_KEY`
4. **Check emailHistory collection** in Firestore - are entries being created?
5. **Create a test user** and watch the logs in real-time

## 📝 **Log Messages to Look For**

### **Good Signs (Working):**
```
🔥 onUserCreated trigger FIRED!
👋 New user created: abc123 (user@example.com)
📧 Attempting to send welcome email to: user@example.com
🔑 API Key being used: re_abc123...
✅ Email sent successfully to: user@example.com
✅ Email logged to history
```

### **Bad Signs (Not Working):**
```
⚠️ Resend not configured - email not sent
❌ Invalid Resend API key format
❌ Failed to send email: [error message]
🔑 API Key being used: undefined
```

## 🔗 **Related Functions**

All these functions need `RESEND_API_KEY` secret:
- `onUserCreated` (trigger)
- `sendCustomVerificationEmail`
- `sendAccountDeletionEmail`
- `sendInDepthRequestEmail`
- `sendInviteEmail`
- `sendLifetimeAccessEmail`
- `sendCustomAnnouncementEmail`
- `sendTrialExpiredSurveyEmail`
- `createSupportTicket`
- `addTicketMessage`
- `scheduledTrialReminders`
- `scheduledTrialExpiredSurvey`
- `scheduledResearchReminders`

If ANY of these are failing, it's likely the same root cause: RESEND_API_KEY not accessible.

