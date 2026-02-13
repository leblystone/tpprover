# 🔍 Password Reset Template Diagnostic

## The Issue

Password reset is showing the fallback template instead of your custom admin panel template.

---

## ✅ What to Check RIGHT NOW

### **Step 1: Check if Template Exists in Firestore**

1. Go to **Firebase Console** → **Firestore Database**
2. Look for collection: `emailTemplates`
3. Look for document: `passwordReset`

**Does the document exist?**

### If YES (document exists):
- Click on the `passwordReset` document
- Check if it has these fields:
  - `subject`
  - `heading`
  - `greeting`
  - `mainMessage`
  - `ctaText`
  - `ctaLink` (should be `%RESET_LINK%`)
  - `colors` (object with primary, secondary, etc.)

**Screenshot what you see and show me!**

### If NO (document doesn't exist):
**The template isn't saved to Firestore!**

Go to **Admin Panel** → **Email Templates** → **Password Reset** → Click **"Save Templates"**

---

## ⚠️ Common Issue: Template Not Saving

If you edited the template but didn't click the **"Save Templates"** button at the top of the admin panel, it only saved to your browser's localStorage, NOT to Firestore!

The backend (Firebase Functions) loads templates from **Firestore**, not localStorage.

---

## 🛠️ How to Fix

1. **Go to Admin Panel** (`/admin`)
2. **Click "Email Templates"** tab
3. **Select "Password Reset"** from the list
4. **Make sure all fields are filled:**
   - Subject
   - Heading
   - Greeting
   - Main Message
   - CTA Text: "Reset Password"
   - CTA Link: `%RESET_LINK%` (MUST include the % symbols!)
5. **Click the big green "Save Templates" button** at the top
6. **Wait for success message**
7. **Test password reset again**

---

## 📊 What Should Happen

After saving:
1. Firestore should have `emailTemplates/passwordReset` document ✅
2. Test email should show YOUR custom template ✅
3. Logs should show: `✅ passwordReset template loaded successfully!` ✅

---

## 🔍 Check the Logs After Testing

After you test password reset, check Firebase Functions logs:

```bash
firebase functions:log --only sendCustomPasswordResetEmail
```

Look for these log messages:
- `🔍 Attempting to load passwordReset template from Firestore...`
- Either:
  - `✅ passwordReset template loaded successfully!` (GOOD!)
  - `⚠️ passwordReset template returned null from Firestore` (BAD - not saved!)

---

## 💡 The Real Issue

The password reset function IS loading templates correctly now (I fixed the code). The problem is:

**Your template isn't in Firestore!**

You need to:
1. Edit it in admin panel
2. **Actually click "Save Templates"** (don't just preview)
3. Test again

---

Let me know what you see in Firestore! 🔍
