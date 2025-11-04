# 🖼️ Firebase Storage Logo Setup for Emails

## ✅ Your Logo is Already Uploaded!

Your logo is at: `gs://tpp-splendide.firebasestorage.app/tpp_logo.png`

The download URL is: 
```
https://firebasestorage.googleapis.com/v0/b/tpp-splendide.firebasestorage.app/o/tpp_logo.png?alt=media
```

## Step 1: Test the URL First

Open this URL in your browser to make sure it loads:
```
https://firebasestorage.googleapis.com/v0/b/tpp-splendide.firebasestorage.app/o/tpp_logo.png?alt=media
```

If the logo appears, proceed to Step 2. If you see an error, make sure the file is **publicly accessible** in Firebase Storage rules.

## Step 2: Set as Firebase Functions Environment Variable

### Option A: Using Firebase CLI (Recommended)

Run this command in your terminal (replace `YOUR_URL` with the URL you copied):

```bash
firebase functions:secrets:set LOGO_URL --data-file=-
```

Then paste your URL and press Enter twice (or Ctrl+D on Windows).

**OR** if that doesn't work, use:

```bash
firebase functions:config:set logo.url="YOUR_FIREBASE_STORAGE_URL"
```

### Option B: Using Firebase Console

1. Go to Firebase Console → **Functions**
2. Click on any function (like `testEmailSystem`)
3. Go to **Configuration** → **Environment variables**
4. Click **Add variable**
5. **Key:** `LOGO_URL`
6. **Value:** Paste your Firebase Storage download URL
7. Click **Save**

## Step 3: Deploy Functions

After setting the environment variable:

```bash
firebase deploy --only functions
```

## Step 4: Test

1. Send a test email from the admin panel
2. Check Gmail - the logo should now appear! ✅

## 🔍 Quick Check: Verify Your URL

Before setting it, test the URL:
1. Open the Firebase Storage URL in a browser
2. The logo image should load directly
3. If it asks for permission or shows an error, make sure the file is **publicly accessible**

## 📝 Making the File Public (if needed)

If the file isn't public:
1. In Firebase Storage, click on your file
2. Go to **Rules** tab
3. Make sure you have a rule like:
   ```
   match /{allPaths=**} {
     allow read: if true;
   }
   ```
4. Or set specific rules for your logo file

---

**After completing these steps, your logo will appear in all emails!** 🎉

