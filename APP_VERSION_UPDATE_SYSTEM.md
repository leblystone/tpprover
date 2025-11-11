# 📱 App Version Update System

**Complete Guide for Managing Mobile App Updates**

---

## ✅ What Was Built

Your app now has a **smart update prompt system** that:

✨ Checks user's app version against your configuration  
✨ Shows appropriate prompts (recommended, optional, or required)  
✨ Respects user dismissals (waits 5 days before prompting again)  
✨ Directs users to the correct app store  
✨ Works for both Android & iOS  

---

## 🎯 How It Works

### **For Users:**
1. User opens app with outdated version
2. App checks Firestore config: "Am I running an old version?"
3. If yes → Shows update prompt with release notes
4. User can update now or dismiss (unless it's a critical update)
5. If dismissed → Won't see prompt again for 5 days

### **For You (Admin):**
1. Release new version on Google Play / App Store
2. Go to **Admin Panel → Settings → App Version**
3. Update the version number & release notes
4. Save → All users will now see update prompts

---

## 🚀 Initial Setup

### **Step 1: Create Firestore Document** (One-Time Only)

You need to create the initial version config in Firestore:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `tpp-splendide`
3. Click **Firestore Database** in left sidebar
4. Click **Start Collection** (or "Add document" if collections exist)
5. Collection ID: `appConfig`
6. Document ID: `version`
7. Add these fields:

```json
{
  "latestVersion": "1.0.3",
  "minimumVersion": "1.0.0",
  "releaseNotes": "Initial release\nBug fixes and improvements\nNew features added",
  "storeUrls": {
    "android": "https://play.google.com/store/apps/details?id=com.thepepplanner.app",
    "ios": ""
  },
  "updatedAt": "2025-01-11T12:00:00.000Z"
}
```

**Field Breakdown:**
- `latestVersion` - Current version on app stores (users below this see "Update Available")
- `minimumVersion` - Oldest acceptable version (users below this MUST update)
- `releaseNotes` - What's new (separate lines with `\n`)
- `storeUrls.android` - Your Google Play Store URL
- `storeUrls.ios` - Your App Store URL (when ready)
- `updatedAt` - Timestamp of last update

### **Step 2: Test It Out** 

The system will automatically work once the document exists!

**Testing:**
- If you're on version 1.0.3, you won't see any prompt (up to date)
- To test: temporarily change `latestVersion` to "1.0.4" in Firestore
- Reload app → You should see update prompt!
- Change it back to "1.0.3" when done testing

---

## 📝 How to Use (Ongoing)

### **When You Release a New Version:**

1. **Build & upload new version to Google Play:**
   - Update version in `android/app/build.gradle`
   - Build signed AAB
   - Upload to Google Play Console

2. **Wait for approval** (1-2 days)

3. **Once live on Google Play:**
   - Go to **Admin Panel → Settings → App Version**
   - Update `Latest Version` to match new version (e.g., "1.0.4")
   - Add `Release Notes` (what's new in this version)
   - Click **Save Configuration**

4. **Done!** All users on older versions will now see the update prompt

---

## 🎨 Update Urgency Levels

The system automatically determines urgency based on version difference:

### **🔴 Critical (Required Update)**
- **When:** User is below `minimumVersion`
- **Behavior:** Blocking modal, can't dismiss
- **Use For:** Security fixes, breaking changes
- **Example:** User on 1.0.0, minimum is 1.0.2

### **🟡 Recommended (Strongly Encouraged)**
- **When:** User is 1+ minor version behind
- **Behavior:** Dismissible modal, reappears in 5 days
- **Use For:** Major features, important bug fixes
- **Example:** User on 1.0.3, latest is 1.1.0

### **🟢 Optional (Soft Nudge)**
- **When:** User is 1+ patch version behind
- **Behavior:** Dismissible modal, reappears in 5 days
- **Use For:** Minor updates, improvements
- **Example:** User on 1.0.3, latest is 1.0.4

---

## 💡 Best Practices

### **DO:**
✅ Update the config **after** the new version is live on stores  
✅ Write clear, user-friendly release notes  
✅ Use `minimumVersion` sparingly (only for critical updates)  
✅ Test updates with a small group first (Internal Testing track)  
✅ Keep release notes concise (3-5 bullet points max)  

### **DON'T:**
❌ Update config before the new version is on stores (users can't update yet!)  
❌ Mark every update as "required" (users will get frustrated)  
❌ Write generic notes like "Bug fixes" (be specific!)  
❌ Change versions randomly (could confuse users)  

---

## 📊 Admin Panel Features

### **Version Manager Tab:**
- Set latest version
- Set minimum required version
- Write release notes (displayed to users)
- Configure store URLs
- Preview what users will see
- Save instantly to Firestore

### **What Users See:**
- Clean modal with version info
- Bullet-pointed release notes
- "Update Now" button (links to store)
- "Remind Me Later" button (if not required)
- "We'll remind you in 5 days" message

---

## 🔧 Technical Details

### **Files Created:**
- `src/utils/versionChecker.js` - Version checking logic
- `src/components/common/UpdatePromptModal.jsx` - UI modal
- `src/components/admin/VersionManager.jsx` - Admin controls
- Integrated into `src/App.jsx` and `src/pages/Admin.jsx`

### **How Version Checking Works:**
1. App launches → Waits 2 seconds (doesn't interfere with initial load)
2. Fetches `appConfig/version` from Firestore
3. Compares local version (`1.0.3`) with `latestVersion`
4. Checks if recently dismissed (localStorage)
5. If update needed + not dismissed → Shows modal

### **Version Comparison:**
- `1.0.3` vs `1.0.4` = Patch update (optional)
- `1.0.3` vs `1.1.0` = Minor update (recommended)
- `1.0.3` vs `2.0.0` = Major update (critical)

### **Dismissal Tracking:**
- Stored in localStorage: `tpp_update_dismissal`
- Contains: `{ version, timestamp }`
- Expires after 5 days
- Cleared when user updates app

---

## 🎯 Example Release Flow

### **Scenario: You fix a bunch of bugs today**

1. **Update Android version:**
   ```gradle
   // android/app/build.gradle
   versionCode 5
   versionName "1.0.4"
   ```

2. **Build & upload to Google Play** (you just did this!)

3. **Wait for approval** (1-2 days)

4. **Once approved, update Firestore:**
   - Admin Panel → Settings → App Version
   - Latest Version: `1.0.4`
   - Release Notes:
     ```
     Fixed stock history calculation bug
     Improved protocol editor performance
     Fixed dashboard widget display issues
     ```
   - Save

5. **Users on 1.0.3 will now see:**
   - ✨ Update Available modal
   - "Version 1.0.4" badge
   - Your release notes as bullets
   - "Update Now" button → Google Play
   - Can dismiss for 5 days

---

## ❓ FAQ

### **Q: What if I forget to update the Firestore config?**
**A:** No problem! Users just won't see update prompts. They can still update manually from the Play Store.

### **Q: Can users ignore the update?**
**A:** Yes, unless you set it as a required update (below `minimumVersion`). Then they must update.

### **Q: How long until users see the prompt?**
**A:** Immediately on next app launch after you update the config.

### **Q: What if someone dismissed it once?**
**A:** They won't see it again for 5 days. Then it will reappear.

### **Q: Does this work for PWA users?**
**A:** No, this is only for mobile app users (Android/iOS). PWA users get instant updates.

### **Q: Can I force everyone to update?**
**A:** Yes! Set `minimumVersion` to your new version. All users below that will be required to update.

---

## 🎉 You're All Set!

The system is live and ready to use. Just remember:

1. ✅ Create initial Firestore document (one-time setup)
2. ✅ After each Google Play release, update the config in Admin Panel
3. ✅ Users will automatically see update prompts
4. ✅ You control when and how urgently users are prompted

**Questions?** Everything is controlled from the Admin Panel. You can always test by changing the version number temporarily!

---

**Last Updated:** January 11, 2025  
**Current App Version:** 1.0.3  
**Status:** ✅ Deployed and Ready

