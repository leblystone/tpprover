# The Pep Planner - Mobile App Deployment Guide
**Complete Guide for Android & iOS App Store Deployment**

---

## 📱 **Current Status**

### ✅ What's Already Done
- **Capacitor configured** for iOS and Android
- **Platform detection** utilities working (`src/utils/platform.js`)
- **Android project** built and synced
- **iOS project** ready (requires Mac for building)
- **PWA deployment** completely separate and unaffected
- **Payment flow** configured for mobile apps (redirects to PWA)

### 🔄 What You Need to Do

---

## **SECTION 1: Android Deployment** 📱

### **Prerequisites**
- ✅ Google Play Console account ($25 one-time fee) - **You have this!**
- ⬜ Android Studio installed (free)
- ⬜ Firebase Android configuration

### **Step 1: Add Firebase to Android App**

Your Android app needs `google-services.json` from Firebase Console:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your `tpp-splendide` project
3. Click the **Android icon** or "Add app" 
4. Enter package name: `com.thepepplanner.app`
5. Download `google-services.json`
6. Place it at: `android/app/google-services.json`

**Why?** This connects your Android app to Firebase Authentication, Firestore, and Analytics.

### **Step 2: Update Android App Version**

Before each Play Store release, update version in `android/app/build.gradle`:

```gradle
versionCode 1        // Increment for each release (1, 2, 3...)
versionName "1.0.0"  // Semantic version shown to users
```

### **Step 3: Build Android Release**

```bash
# 1. Build your React app and sync to Android
npm run mobile:build

# 2. Open Android Studio
npm run mobile:open:android

# 3. In Android Studio:
#    - Build → Generate Signed Bundle / APK
#    - Choose "Android App Bundle" (required for Play Store)
#    - Create/use signing key (SAVE THIS KEY SECURELY!)
#    - Select "release" build variant
```

### **Step 4: Upload to Google Play Console**

1. Go to [Google Play Console](https://play.google.com/console)
2. Create new app → Enter details
3. Complete all required sections:
   - **App content** (privacy policy, age rating)
   - **Store listing** (title, description, screenshots)
   - **Pricing & distribution** (free/paid, countries)
4. Upload AAB file to **Production** or **Testing** track
5. Submit for review (usually 1-2 days)

### **Testing Before Production**

Use **Internal Testing** track first:
- Faster approval (~1 hour)
- Test with up to 100 testers
- Fix bugs before public release

---

## **SECTION 2: iOS Deployment** 🍎

### **Prerequisites**
- ⬜ Mac computer (required for iOS builds)
- ⬜ Apple Developer Program enrollment ($99/year) - **You're working on this!**
- ⬜ Xcode installed (free from Mac App Store)
- ⬜ Firebase iOS configuration

**Good News:** You can develop and test iOS locally **before** enrolling in Apple Developer Program!

### **Step 1: Add Firebase to iOS App**

Your iOS app needs `GoogleService-Info.plist` from Firebase Console:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your `tpp-splendide` project
3. Click the **iOS icon** or "Add app"
4. Enter bundle ID: `com.thepepplanner.app`
5. Download `GoogleService-Info.plist`
6. Place it at: `ios/App/App/GoogleService-Info.plist`

### **Step 2: Local iOS Testing (No Enrollment Needed!)**

```bash
# 1. Build and sync (on Mac)
npm run mobile:build

# 2. Open Xcode
npm run mobile:open:ios

# 3. In Xcode:
#    - Select iPhone simulator or connected device
#    - Click "Play" button to run
#    - Test your app locally
```

**You can do this NOW without Apple Developer enrollment!**

### **Step 3: Update iOS App Version**

Before each App Store release, update in Xcode:
1. Select "App" target
2. General tab → Identity section
3. Update **Version** (1.0.0) and **Build** (1)

### **Step 4: App Store Submission (After Enrollment)**

```bash
# 1. Open Xcode
npm run mobile:open:ios

# 2. In Xcode:
#    - Select "Any iOS Device" as target
#    - Product → Archive
#    - Window → Organizer → Distribute App
#    - Follow prompts to upload to App Store Connect
```

### **Step 5: App Store Connect**

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Create new app
3. Complete all sections:
   - **App Information** (name, category, privacy policy)
   - **Pricing & Availability**
   - **App Store listing** (screenshots, description, keywords)
4. Submit for review (1-7 days)

---

## **SECTION 3: Testing Strategy** 🧪

### **Development Testing**

```bash
# PWA (always test first)
npm run dev

# Android (after PWA works)
npm run mobile:android

# iOS (on Mac, after PWA works)
npm run mobile:ios
```

### **What to Test on Mobile Apps**

1. **Authentication** - Login/logout works
2. **Database** - Firestore reads/writes work
3. **Navigation** - All pages accessible
4. **Payments** - Opens external browser correctly
5. **Notifications** - (if you add push notifications)
6. **Platform detection** - Features work correctly per platform

### **Common Issues**

| Issue | Solution |
|-------|----------|
| "Module not found" | Run `npm run mobile:build` to sync |
| Firebase not working | Add `google-services.json` (Android) or `GoogleService-Info.plist` (iOS) |
| App won't open | Check `capacitor.config.json` and rebuild |
| White screen | Check browser console in device inspector |

---

## **SECTION 4: Platform-Specific Features** 🎨

### **Using Platform Detection**

Your `src/utils/platform.js` provides utilities:

```javascript
import { isNative, isIOS, isAndroid, isWeb } from '../utils/platform';

// Hide PWA-specific features in native apps
if (!isNative()) {
  // Show "Install App" button
}

// iOS-specific styling
if (isIOS()) {
  // Add extra padding for notch
}

// Android-specific behavior
if (isAndroid()) {
  // Handle Android back button
}
```

### **Current Mobile Adaptations**

✅ **Already implemented:**
- Payment flow redirects to PWA (avoids 30% app store fees)
- Platform detection utilities
- Billing management opens in external browser

🎯 **Consider adding later:**
- Native splash screens (already configured)
- Push notifications (Firebase Cloud Messaging)
- Biometric authentication (Face ID, fingerprint)
- Native sharing (share to other apps)
- App shortcuts (quick actions from home screen)

---

## **SECTION 5: Deployment Workflow** 🚀

### **Regular Updates**

```bash
# 1. Update PWA (instant, no review)
npm run deploy:hosting

# 2. Update mobile apps (when significant changes)
npm run mobile:build
# Then upload through Android Studio / Xcode

# 3. Submit to app stores
# - Android: 1-2 days review
# - iOS: 1-7 days review
```

### **When to Update Mobile Apps**

**Update PWA only:**
- Bug fixes
- Content changes
- UI tweaks
- Minor features

**Update mobile apps too:**
- Major new features
- Branding changes
- Platform-specific improvements
- Every 1-2 months (keeps stores happy)

---

## **SECTION 6: Quick Reference** 📚

### **Essential Commands**

```bash
# Development
npm run dev                    # Test PWA locally
npm run mobile:build           # Build & sync to mobile

# Open native IDEs
npm run mobile:open:android    # Android Studio
npm run mobile:open:ios        # Xcode (Mac only)

# Run on devices
npm run mobile:android         # Run Android app
npm run mobile:ios             # Run iOS app (Mac only)

# Deploy PWA
npm run deploy:hosting         # Firebase hosting
```

### **Important Files**

| File | Purpose |
|------|---------|
| `capacitor.config.json` | Mobile app configuration |
| `android/app/build.gradle` | Android version & settings |
| `ios/App/App.xcodeproj` | iOS project settings |
| `src/utils/platform.js` | Platform detection utilities |
| `android/app/google-services.json` | Firebase Android config (add this!) |
| `ios/App/App/GoogleService-Info.plist` | Firebase iOS config (add this!) |

### **App Store URLs**

Update these in `src/utils/platform.js` after publishing:

```javascript
// Android (after Play Store approval)
https://play.google.com/store/apps/details?id=com.thepepplanner.app

// iOS (after App Store approval)
https://apps.apple.com/app/the-pep-planner/YOUR_APP_ID
```

---

## **SECTION 7: Questions Answered** ✅

### **"Will this mess up my PWA?"**
**No!** The PWA and mobile apps are completely separate builds:
- PWA: `dist/` → Firebase Hosting
- Android: `android/` → Google Play Store
- iOS: `ios/` → Apple App Store

Changes to mobile builds **do not affect** your PWA.

### **"Can I do iOS without Apple Developer enrollment?"**
**Yes for development!** You can:
- Build iOS apps locally
- Test on simulator
- Test on your own device

You only need enrollment ($99/year) to:
- Publish to App Store
- Share with TestFlight testers

### **"Do I need to update all three platforms together?"**
**No!** You can update independently:
- PWA updates are instant
- Mobile apps update when you submit new versions
- Users can use any platform(s) they prefer

### **"How do payments work in mobile apps?"**
Mobile apps redirect to your PWA for payments (already implemented). This:
- ✅ Avoids 30% app store fees
- ✅ Uses your existing Stripe integration
- ✅ Works seamlessly for users

---

## **Next Steps - Start Here!** 🎯

1. **Add Firebase Android config** (15 minutes)
   - Download `google-services.json`
   - Place in `android/app/`
   - Test: `npm run mobile:android`

2. **Test Android app locally** (1 hour)
   - Install Android Studio
   - Run app on emulator
   - Verify login, data sync, navigation

3. **Prepare Play Store listing** (2-3 hours)
   - Create app in Google Play Console
   - Write description (can help with this!)
   - Create screenshots (Android Studio can capture these)
   - Submit for review

4. **While waiting for Android approval...**
   - Continue iOS enrollment process
   - Add Firebase iOS config when ready
   - Test iOS app locally (if you have a Mac)
   - Prepare App Store listing

---

## **Resources**

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Studio Setup](https://capacitorjs.com/docs/android)
- [Xcode Setup](https://capacitorjs.com/docs/ios)
- [Google Play Console](https://play.google.com/console)
- [App Store Connect](https://appstoreconnect.apple.com/)

---

**🎉 You're Ready to Go Multi-Platform!**

Your app is properly configured. The setup won't conflict with your PWA. You can proceed with Android now and add iOS when enrollment is complete.

Questions? Check this guide or ask for help with specific steps!



