# Quick Guide: Upload to Internal Testing

## ✅ Version Updated
- **versionCode:** 11 (was 10)
- **versionName:** 1.0.11 (was 1.0.10)

## 📋 Next Steps

### 1. Build the App
```bash
npm run mobile:build
```

This will:
- Build your React app
- Sync to Android
- Prepare for building

### 2. Open Android Studio
```bash
npm run mobile:open:android
```

Or manually open Android Studio and navigate to the `android` folder.

### 3. Generate Signed App Bundle (AAB)

**In Android Studio:**

1. **Build** → **Generate Signed Bundle / APK**
2. Select **Android App Bundle** (required for Google Play)
3. Click **Next**

#### Use Your Existing Keystore:
- Click **Choose existing...**
- Navigate to: `android/thepepplanner-release.jks` (or wherever your keystore is)
- Enter your keystore password
- Select your key alias
- Enter your key password
- Click **Next**

4. Select **release** build variant
5. Click **Finish**
6. Wait for build to complete
7. AAB file location: `android/app/build/outputs/bundle/release/app-release.aab`

### 4. Upload to Internal Testing (NOT Production!)

**In Google Play Console:**

1. Go to **Test and release** → **Internal testing**
2. Click **Create new release** (or **Edit release** if one exists)
3. Upload the AAB file (`app-release.aab`)
4. **Release name:** `1.0.11 - Billing Support`
5. **Release notes:** 
   ```
   • Added Google Play Billing support
   • Internal testing only
   ```
6. Click **Save** (NOT "Review release" - that's for production!)
7. **DO NOT** click "Start rollout to Internal testing" yet - just save it

### 5. Wait for Processing

- Google Play will process the AAB (usually 5-15 minutes)
- You'll see status change from "Processing" to "Ready to publish"
- **You don't need to publish it** - just having it uploaded is enough

### 6. Create Subscriptions

Once the AAB is processed:

1. Go to **Monetize with Play** → **Products** → **Subscriptions**
2. The "Upload a new APK" message should be gone
3. Click **Create subscription**
4. Create your three products:
   - Monthly: `com.thepepplanner.app.monthly`
   - Annual: `com.thepepplanner.app.annual`
   - Lifetime: `com.thepepplanner.app.lifetime` (in One-time products)

## ⚠️ Important Notes

- **Internal Testing** is safe - it won't affect your production app
- Users on production (1.0.10) will continue using the old version
- Only testers added to Internal Testing will get 1.0.11
- You can test subscriptions without affecting real users

## 🎯 What This Achieves

- ✅ Google Play will detect billing library in the uploaded version
- ✅ You can create subscription products
- ✅ You can test subscriptions safely
- ✅ Production app remains unchanged

---

**After subscriptions are created, you can decide when to roll out to production!**







