# 📋 How to Check Email Logs - Simple Guide

## 🎯 **What You're Seeing vs. What You Need**

**What you're seeing:** HTTP request logs (like "Callable request verification passed")
**What you need:** Trigger logs (like "🔥 onUserCreated trigger FIRED!")

The logs you're seeing are from `onCall` functions (manual calls), not from the `onUserCreated` trigger (automatic).

---

## ✅ **EASIEST WAY: Use the Diagnostic Function**

Instead of reading logs, use this:

### **Step 1: Open Your App's Admin Panel**
1. Go to your app
2. Navigate to Admin → Communications (or wherever you have admin functions)
3. Look for a "Diagnose Email System" button (if I add it) OR use browser console

### **Step 2: Run Diagnostic in Browser Console**
Open browser console (F12) and paste:

```javascript
const functions = getFunctions();
const diagnose = httpsCallable(functions, 'diagnoseEmailSystem');
diagnose({ testEmail: 'your-email@gmail.com' }).then(result => {
  console.log('📊 DIAGNOSTIC RESULTS:', result.data);
  console.log('✅ Status:', result.data.diagnostics.overallStatus);
  console.log('❌ Errors:', result.data.diagnostics.errors);
  console.log('💡 Recommendations:', result.data.diagnostics.recommendations);
});
```

This will tell you EXACTLY what's wrong!

---

## 🔍 **How to Find the RIGHT Logs in Google Cloud**

### **Method 1: Search for Specific Messages**

In the Google Cloud Logs Explorer:

1. **Clear the current query**
2. **Paste this in the search bar:**
```
resource.type="cloud_function"
resource.labels.function_name="onUserCreated"
jsonPayload.message=~"onUserCreated trigger FIRED"
```

3. **OR search for email-related messages:**
```
resource.type="cloud_function"
jsonPayload.message=~"Welcome email|verification email|API Key being used"
```

### **Method 2: Filter by Log Level**

1. In the left sidebar, expand **"Severity"**
2. Look for **"Error"** or **"Warning"** entries
3. These will show you if emails are failing

### **Method 3: Check Recent Activity**

1. **Change the time range** to "Last 1 hour" or "Last 24 hours"
2. **Look for any logs with:**
   - `🔥 onUserCreated trigger FIRED!`
   - `📧 Attempting to send welcome email`
   - `⚠️ Resend not configured`
   - `❌ Failed to send`

---

## 🚨 **What the Logs Mean**

### **If you see NO logs for `onUserCreated`:**
- The trigger isn't firing
- User document might not be created
- Function might not be deployed

### **If you see `⚠️ Resend not configured`:**
- **FIX:** `firebase functions:secrets:set RESEND_API_KEY`
- Then redeploy: `firebase deploy --only functions:onUserCreated`

### **If you see `❌ Failed to send welcome email`:**
- Check the error message that follows
- Usually means API key issue or Resend API error

---

## 🧪 **Quick Test: Create a Test User**

1. **Sign up with a NEW email** (not one you've used before)
2. **Immediately check Google Cloud Logs** (within 30 seconds)
3. **Search for:** `onUserCreated trigger FIRED`
4. **If you see it:** Trigger is working, check for email errors
5. **If you DON'T see it:** Trigger isn't firing (deployment issue)

---

## 📊 **Check Firestore Directly**

1. Go to **Firebase Console → Firestore**
2. Open the **`users`** collection
3. **Check if your test user document exists**
4. If it exists but no emails sent → trigger fired but email failed
5. If it doesn't exist → user document not being created (different issue)

---

## 🎯 **Most Likely Issue**

Based on your symptoms (only test emails work), the problem is:

**`RESEND_API_KEY` secret is not accessible in trigger functions**

**Fix:**
```bash
# 1. Set the secret
firebase functions:secrets:set RESEND_API_KEY
# Paste your Resend API key (starts with "re_")

# 2. Redeploy ALL functions
firebase deploy --only functions

# 3. Wait 2-3 minutes for deployment

# 4. Create a test user and check logs again
```

---

## 💡 **Pro Tip: Use the Diagnostic Function**

The diagnostic function I created will:
- ✅ Check if API key is accessible
- ✅ Test if Resend can send emails
- ✅ Show you exactly what's wrong
- ✅ Give you specific fix recommendations

**Much easier than reading logs!**

