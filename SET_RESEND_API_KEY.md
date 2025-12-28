# 🔑 Set Resend API Key - Quick Fix

## 🚨 **The Problem**
You still have SendGrid API key configured, but the code is looking for `RESEND_API_KEY`. That's why only test emails work (they might be using a different path) but real user emails don't.

## ✅ **The Fix (2 Steps)**

### **Step 1: Get Your Resend API Key**

1. Go to: https://resend.com/api-keys
2. If you don't have one, create it:
   - Click "Create API Key"
   - Name it: `The Pep Planner Production`
   - Copy the key (starts with `re_`)

### **Step 2: Set It in Firebase**

Open your terminal and run:

```bash
firebase functions:secrets:set RESEND_API_KEY
```

When prompted, paste your Resend API key (the one that starts with `re_`).

**Example:**
```
? Enter a value for RESEND_API_KEY: re_abc123xyz...
```

### **Step 3: Redeploy Functions**

After setting the secret, redeploy:

```bash
firebase deploy --only functions
```

This will take 2-3 minutes.

## 🧪 **Verify It's Set**

Check if the secret is set:

```bash
firebase functions:secrets:access RESEND_API_KEY
```

You should see your API key (it will show the full key).

## ✅ **Test It**

1. **Wait 2-3 minutes** for deployment to complete
2. **Create a test user account** with a new email
3. **Check Resend dashboard** - you should see the welcome email
4. **Check Email History** in admin panel - should show the email

## 🎯 **Why This Fixes Everything**

- ✅ `onUserCreated` trigger will have access to API key
- ✅ All email functions will work
- ✅ Welcome emails will send
- ✅ Verification emails will send
- ✅ Support tickets will send emails
- ✅ All scheduled emails will work

## ⚠️ **Important Notes**

- **Firebase Functions v2 uses secrets, NOT .env files**
- The `.env` file in your project root is for local development only
- For deployed functions, you MUST use `firebase functions:secrets:set`
- Each function that needs the key must list it in `secrets: ['RESEND_API_KEY']`

## 🔍 **After Setting, Check Logs**

Once you set the key and redeploy, check Google Cloud logs again. You should see:

```
🔑 API Key being used: re_abc123...
✅ Email sent successfully to: user@example.com
```

Instead of:

```
⚠️ Resend not configured - email not sent
🔑 API Key being used: undefined
```

