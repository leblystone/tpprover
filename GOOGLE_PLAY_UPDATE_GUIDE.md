# 📱 Google Play App Update Guide
**Step-by-Step Instructions for Updating Your App**

---

## 🎯 **Current Version**
- **Version Code:** 5
- **Version Name:** 1.0.4

---

## 📋 **Step-by-Step Update Process**

### **Step 1: Update Version Numbers** ⏱️ *2 minutes*

1. Open `android/app/build.gradle`
2. Update the version numbers:
   ```gradle
   versionCode 6        // Increment by 1 (required - Google Play won't accept same or lower)
   versionName "1.0.5"  // Update to your new version (e.g., 1.0.5, 1.1.0, 2.0.0)
   ```

   **Version Naming Guide:**
   - **Patch update** (bug fixes): `1.0.4` → `1.0.5`
   - **Minor update** (new features): `1.0.4` → `1.1.0`
   - **Major update** (big changes): `1.0.4` → `2.0.0`

3. Save the file

---

### **Step 2: Build Your App** ⏱️ *5-10 minutes*

Run the build script to compile your web assets and sync to Android:

```bash
npm run mobile:build
```

**What this does:**
- Builds your React app (`npm run build`)
- Syncs web assets to Android (`npx cap sync`)
- Prepares Android project for building

**Expected output:** "Sync complete" message

---

### **Step 3: Open Android Studio** ⏱️ *1 minute*

```bash
npm run mobile:open:android
```

This opens your Android project in Android Studio.

**Alternative:** You can also manually open Android Studio and navigate to the `android` folder.

---

### **Step 4: Generate Signed App Bundle (AAB)** ⏱️ *10-15 minutes*

**In Android Studio:**

1. **Build** → **Generate Signed Bundle / APK**
2. Select **Android App Bundle** (required for Google Play)
3. Click **Next**

#### **If you already have a keystore:**
- Click **Choose existing...**
- Navigate to your keystore file (`.jks` file)
- Enter your keystore password
- Select your key alias
- Enter your key password
- Click **Next**

#### **If you need to create a new keystore:**
- Click **Create new...**
- **Key store path:** Choose a secure location (e.g., `C:\Users\lebro\Desktop\TPPSpendide\android\thepepplanner-release.jks`)
- **Password:** Create a strong password (⚠️ **SAVE THIS - you can't update your app without it!**)
- **Key:**
  - **Alias:** `thepepplanner` (or your existing alias)
  - **Password:** Create a strong password
  - **Validity:** 25+ years (recommended)
  - **First and Last Name:** Your name or company name
  - **Organizational Unit:** Optional
  - **Organization:** Optional
  - **City:** Optional
  - **State:** Optional
  - **Country Code:** US (or your country)
- Click **OK**
- Click **Next**

4. **Build variant:** Select **release**
5. **Destination folder:** `android/app/release/` (default)
6. Click **Finish**

**Output:** `android/app/release/app-release.aab`

**⚠️ IMPORTANT:** 
- **Backup your keystore file!** Store it in a secure location (cloud backup, USB drive, etc.)
- **Never lose your keystore password!** You cannot update your app on Google Play without it.

---

### **Step 5: Upload to Google Play Console** ⏱️ *15-20 minutes*

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app: **The Pep Planner**
3. In the left sidebar, click **Production** (or **Testing** if you want to test first)

#### **For Testing Track (Recommended First):**
- Click **Testing** → **Internal testing** (or **Closed testing** / **Open testing**)
- Click **Create new release**
- Upload your `app-release.aab` file
- Add **Release notes** (what's new in this version)
- Click **Save**
- Click **Review release**
- Click **Start rollout to Internal testing**

#### **For Production Track:**
- Click **Production**
- Click **Create new release**
- Upload your `app-release.aab` file
- Add **Release notes** (what's new in this version)
- Click **Save**
- Click **Review release**
- Click **Start rollout to Production**

**Release Notes Tips:**
- Keep it concise (3-5 bullet points)
- Focus on user-facing changes
- Be specific (e.g., "Fixed stock history calculation bug" not just "Bug fixes")
- Example:
  ```
  • Fixed stock history calculation bug
  • Improved protocol editor performance
  • Fixed dashboard widget display issues
  • Added new scheduling features
  ```

---

### **Step 6: Wait for Review** ⏱️ *1-2 days*

- **Internal Testing:** Usually approved in ~1 hour
- **Production:** Usually approved in 1-2 days

You'll receive an email when your app is approved and live.

**While waiting:** You can test the app yourself if you uploaded to Internal Testing track.

---

### **Step 7: Update Firestore Version Config** ⏱️ *5 minutes*

**⚠️ IMPORTANT:** Only do this **AFTER** your new version is live on Google Play!

Once your app is approved and available on Google Play:

1. Go to your **Admin Panel** → **Settings** → **App Version**
2. Update **Latest Version** to match your new version (e.g., `1.0.5`)
3. Add **Release Notes** (same as what you put in Google Play Console)
4. Click **Save Configuration**

**Why?** This triggers update prompts for users on older versions. If you update this before the app is live, users will see update prompts but won't be able to update yet!

---

## 🎯 **Quick Reference Checklist**

- [ ] Update `versionCode` in `android/app/build.gradle` (increment by 1)
- [ ] Update `versionName` in `android/app/build.gradle` (e.g., 1.0.5)
- [ ] Run `npm run mobile:build`
- [ ] Open Android Studio (`npm run mobile:open:android`)
- [ ] Generate signed AAB (Build → Generate Signed Bundle / APK)
- [ ] Upload AAB to Google Play Console
- [ ] Add release notes
- [ ] Submit for review
- [ ] Wait for approval (1-2 days)
- [ ] Update Firestore version config in Admin Panel (after app is live)

---

## 🚨 **Common Issues & Solutions**

### **"Version code already used"**
- **Problem:** You tried to upload the same `versionCode` as a previous release
- **Solution:** Increment `versionCode` by 1 in `build.gradle`

### **"Keystore not found"**
- **Problem:** Can't find your signing key
- **Solution:** Use the same keystore file you used for your first release. Check your backup locations.

### **"App bundle validation failed"**
- **Problem:** AAB file is corrupted or invalid
- **Solution:** Rebuild the AAB in Android Studio. Make sure you selected "release" build variant.

### **"Upload failed"**
- **Problem:** Network issue or file too large
- **Solution:** Check your internet connection. AAB files should be under 150MB. If larger, use Android App Bundle's dynamic delivery features.

---

## 💡 **Pro Tips**

1. **Test First:** Always upload to Internal Testing track first to catch any issues before production
2. **Version Strategy:** 
   - Use patch versions (1.0.5) for bug fixes
   - Use minor versions (1.1.0) for new features
   - Use major versions (2.0.0) for big changes
3. **Release Notes:** Write them while the changes are fresh in your mind
4. **Backup Keystore:** Store your keystore in multiple secure locations
5. **Timing:** Update Firestore config only after Google Play approval to avoid confusion

---

## 📞 **Need Help?**

If you run into issues:
1. Check the error message in Google Play Console
2. Review the build logs in Android Studio
3. Verify your keystore file and passwords are correct
4. Make sure `versionCode` is higher than your last release

---

**Last Updated:** January 2025  
**Current Process Version:** 1.0




