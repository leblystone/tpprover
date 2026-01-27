# iOS Setup Guide for Windows Users 🍎

**You have a Mac Mini - You're ready to start!**

This guide assumes you're coming from Windows and aren't super comfortable with macOS yet. No worries - we'll take it slow!

---

## Part 1: Mac Basics You'll Need

### Essential Mac Shortcuts (for Windows users)
- **Cmd** = Windows Ctrl key (Cmd+C = copy, Cmd+V = paste)
- **Cmd+Space** = Opens Spotlight (like Windows search)
- **Cmd+Tab** = Switch apps (like Alt+Tab)
- **Cmd+Q** = Quit app (like Alt+F4)
- **Cmd+W** = Close window

### Opening Terminal on Mac
1. Press **Cmd+Space**
2. Type "Terminal"
3. Press Enter

### Finding Files on Mac
- Your "Documents" folder is at: `/Users/YourName/Documents`
- To copy a file path: Right-click file → Hold **Option** → Click "Copy [filename] as Pathname"

---

## Part 2: One-Time Setup (Do This Once)

### Step 1: Install Xcode (Required)
1. Open **App Store** on your Mac
2. Search for **"Xcode"**
3. Click **Install** (it's large ~10-15GB, takes 30-60 minutes)
4. After install, open Xcode once to accept license agreements
5. Close Xcode

**Verify installation:**
```bash
xcode-select --install
```
If it says "already installed," you're good!

### Step 2: Install CocoaPods (Required)
CocoaPods manages iOS dependencies (like npm for iOS).

Open Terminal and run:
```bash
sudo gem install cocoapods
```
- Type your Mac password when prompted (it won't show as you type - that's normal)
- Takes 2-5 minutes

**Verify installation:**
```bash
pod --version
```
Should show something like `1.15.2` or similar.

### Step 3: Apple Developer Account
1. Go to https://developer.apple.com
2. Sign in with your Apple ID (or create one)
3. Enroll in **Apple Developer Program** ($99/year)
   - Required for publishing to App Store
   - Takes 24-48 hours for approval
   - You can still build and test while waiting!

---

## Part 3: Get Your Project on Your Mac

### Option A: Clone from Git (Recommended)
Since your project is already in Git:

```bash
cd ~/Documents
git clone https://github.com/yourusername/TPPSpendide.git
cd TPPSpendide
```

### Option B: Transfer Files
- Use USB drive, AirDrop, or cloud storage
- Copy entire `TPPSpendide` folder to your Mac

### Step 4: Install Dependencies
In Terminal, navigate to your project:

```bash
cd ~/Documents/TPPSpendide  # or wherever you put it
npm install
```

---

## Part 4: Build for iOS (First Time)

### Step 1: Sync Capacitor
```bash
npm run mobile:build
```
This builds your React app and syncs it to iOS.

### Step 2: Open Xcode
```bash
npm run mobile:open:ios
```
This opens Xcode with your iOS project.

---

## Part 5: Configure Xcode (Critical!)

When Xcode opens, you'll see a lot. Here's what to do:

### 1. Select Your Project
- In the left sidebar, click **"App"** (the blue icon at top)
- You'll see settings in the main area

### 2. Set Signing & Capabilities
- Click **"Signing & Capabilities"** tab at top
- **Automatically manage signing:** ✅ Check this
- **Team:** Select your Apple Developer account
  - If you don't see your account: Xcode → Preferences → Accounts → Add your Apple ID
- **Bundle Identifier:** Should be `com.thepepplanner.app` (already set)

### 3. Update Version Numbers
- **Version:** Change to `1.0.21` (to match Android)
- **Build:** Change to `21`

### 4. Set Deployment Target
- **iOS Deployment Target:** Set to `14.0` or higher
  - This is the minimum iOS version users need

### 5. Configure Capabilities
Click the **"+ Capability"** button and add:
- ✅ **Push Notifications**
- ✅ **Background Modes** → Check "Remote notifications"
- ✅ **Sign in with Apple** (if you use it)

---

## Part 6: First Build & Test

### Build on Simulator (Easiest First Test)

1. At the top of Xcode, click the device dropdown (next to "App")
2. Select any **iPhone simulator** (e.g., "iPhone 15 Pro")
3. Click the **▶️ Play button** (or press Cmd+R)
4. Wait for build (2-5 minutes first time)
5. Simulator should launch with your app!

### Build on Real iPhone (Recommended)

1. **Connect iPhone to Mac** with USB cable
2. **Unlock iPhone**
3. On iPhone, tap **"Trust This Computer"** when prompted
4. In Xcode, select your iPhone from device dropdown
5. Click **▶️ Play button**
6. **First time only:** 
   - iPhone will show "Untrusted Developer" error
   - Go to iPhone Settings → General → VPN & Device Management
   - Tap your developer account → Trust
7. App should launch!

---

## Part 7: Common Issues & Fixes

### ❌ "Failed to verify bitcode"
**Fix:** In Xcode → Build Settings → Search "bitcode" → Set to "No"

### ❌ "Provisioning profile doesn't include signing certificate"
**Fix:** 
1. Xcode → Preferences → Accounts
2. Select your Apple ID → Download Manual Profiles
3. Try building again

### ❌ "Module 'App' not found"
**Fix:** 
```bash
cd ios/App
pod install
```
Then rebuild in Xcode.

### ❌ CocoaPods errors
**Fix:**
```bash
cd ios/App
pod deintegrate
pod install
```

### ❌ Build succeeds but app crashes immediately
**Fix:** Check Xcode console (bottom panel) for error messages. Common causes:
- Missing `GoogleService-Info.plist`
- Wrong Firebase config
- Plugin not installed

---

## Part 8: Testing Checklist

After your first successful build, test these features:

### Core Functionality
- [ ] Login/Authentication
- [ ] Sign up
- [ ] Navigation between pages
- [ ] Data loading from Firebase
- [ ] Adding/editing data

### iOS-Specific Issues to Watch
- [ ] **Status bar** - Does it show correctly? (notch devices)
- [ ] **Safe areas** - Content not cut off by notch/home indicator?
- [ ] **Keyboard** - Does it push content up properly?
- [ ] **Back swipe** - Can you swipe from left edge to go back?
- [ ] **Orientation** - Lock to portrait or test landscape?
- [ ] **Push notifications** - Do they work? (need to test)
- [ ] **Dark mode** - Does app look good in dark mode?

### Plugin Testing
- [ ] Camera (if used)
- [ ] File system
- [ ] Share functionality
- [ ] Local notifications
- [ ] Status bar styling

---

## Part 9: Debugging on iOS

### View Console Logs
In Xcode, open **Debug Console** (bottom panel). You'll see:
- `console.log()` output from your React app
- Native iOS errors
- Capacitor bridge messages

### Use Safari Web Inspector (Amazing!)
1. On Mac: Safari → Preferences → Advanced → ✅ Show Develop menu
2. Run app on **real device** or **simulator**
3. Safari → Develop → [Your Device] → [Your App]
4. Full Chrome DevTools-like inspector for your app! 🎉

### Common Debug Commands
```bash
# View iOS logs in terminal
npx cap run ios --livereload

# This enables hot reload - saves tons of time!
```

---

## Part 10: Preparing for App Store

### Required Assets

#### App Icons (All Required Sizes)
You'll need these sizes in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`:
- 1024x1024 (App Store)
- 180x180 (iPhone)
- 120x120 (iPhone)
- 167x167 (iPad Pro)
- 152x152 (iPad)
- 76x76 (iPad)
- 40x40, 58x58, 60x60, 80x80, 87x87, 120x120 (various)

**Tip:** Use a tool like https://appicon.co to generate all sizes from one 1024x1024 PNG

#### Screenshots (Required for App Store)
- iPhone 6.7" (iPhone 15 Pro Max): 1290 x 2796
- iPhone 6.5" (iPhone 11 Pro Max): 1242 x 2688
- iPad Pro 12.9" (optional): 2048 x 2732

Take 3-5 screenshots showing key features.

### Privacy Manifest (iOS 17+)
Apple now requires a privacy manifest. Create:

**File:** `ios/App/App/PrivacyInfo.xcprivacy`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSPrivacyTracking</key>
    <false/>
    <key>NSPrivacyCollectedDataTypes</key>
    <array/>
    <key>NSPrivacyAccessedAPITypes</key>
    <array/>
</dict>
</plist>
```

Adjust based on what data you actually collect.

---

## Part 11: App Store Submission

### Using App Store Connect

1. Go to https://appstoreconnect.apple.com
2. Click **"My Apps"** → **"+"** → **"New App"**
3. Fill in:
   - Platform: iOS
   - Name: The Pep Planner
   - Primary Language: English
   - Bundle ID: com.thepepplanner.app
   - SKU: Can be anything (e.g., TPP-001)

### Archive & Upload (From Xcode)

1. In Xcode, set device to **"Any iOS Device (arm64)"**
2. Product → Archive (takes 5-10 minutes)
3. When done, Organizer window opens
4. Click **"Distribute App"**
5. Select **"App Store Connect"**
6. Follow wizard (it's straightforward)
7. Upload completes in 10-30 minutes

### TestFlight (Beta Testing - Recommended First!)

1. After upload, go to App Store Connect
2. Click your app → TestFlight tab
3. Add yourself as tester
4. You'll get email with TestFlight link
5. Test on real device before public release!

### Submit for Review

1. App Store Connect → Your App → **"+"** next to iOS App
2. Fill in metadata:
   - Description
   - Keywords
   - Screenshots
   - Support URL
   - Privacy Policy URL
3. Click **"Submit for Review"**
4. Review takes 1-3 days typically

---

## Part 12: Keeping iOS & Android in Sync

### Before Each Release:

```bash
# 1. Update version in package.json
npm version patch  # or minor, or major

# 2. Build and sync both platforms
npm run mobile:build

# 3. Update Android version
# Edit android/app/build.gradle
versionCode 22
versionName "1.0.22"

# 4. Update iOS version
# In Xcode: General → Version: 1.0.22, Build: 22

# 5. Build both
npx cap sync
```

### Automated Version Script (Bonus)
Create `scripts/update-mobile-versions.js`:

```javascript
const fs = require('fs');
const packageJson = require('../package.json');

const version = packageJson.version;
const versionCode = parseInt(version.split('.').join(''));

// Update Android
const gradlePath = './android/app/build.gradle';
let gradle = fs.readFileSync(gradlePath, 'utf8');
gradle = gradle.replace(/versionCode \d+/, `versionCode ${versionCode}`);
gradle = gradle.replace(/versionName ".*"/, `versionName "${version}"`);
fs.writeFileSync(gradlePath, gradle);

console.log(`✅ Updated Android to v${version} (${versionCode})`);
console.log('⚠️  Remember to update iOS version in Xcode manually');
```

Run with: `node scripts/update-mobile-versions.js`

---

## Mac Tips for Windows Users

### File Management
- **Finder** = Windows Explorer
- **Applications folder** = Program Files
- **Cmd+Delete** = Delete file (moves to Trash)

### Installing Software
- Use **App Store** for Apple apps
- Use **Homebrew** for developer tools:
  ```bash
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  ```

### Useful Mac Apps for Development
- **iTerm2** - Better terminal (https://iterm2.com)
- **Rectangle** - Window management (free, https://rectangleapp.com)
- **VS Code** - Works great on Mac too!

### Transferring Files Between Mac & Windows
- **Cloud:** Git, Google Drive, Dropbox
- **Network:** Share folders over WiFi
- **USB:** Format as exFAT for both OS compatibility
- **AirDrop:** If you have iPhone, super easy

---

## Quick Reference Commands

### Essential iOS Commands
```bash
# Sync web code to iOS
npx cap sync ios

# Build and run on device/simulator
npx cap run ios

# Open Xcode
npx cap open ios

# Build with live reload (awesome for development!)
npx cap run ios --livereload --host=YOUR_LOCAL_IP
```

### When Things Break
```bash
# Clean everything and start fresh
cd ios/App
pod deintegrate
pod install
cd ../..
npx cap sync ios

# If still broken, clean Xcode cache
rm -rf ~/Library/Developer/Xcode/DerivedData
```

---

## Your First Session Checklist

Here's what to do in your first Mac session:

### Session 1: Setup (2-3 hours)
- [ ] Install Xcode
- [ ] Install CocoaPods
- [ ] Sign up for Apple Developer Program
- [ ] Clone/transfer project to Mac
- [ ] Run `npm install`
- [ ] Run `npm run mobile:build`

### Session 2: First Build (1-2 hours)
- [ ] Open Xcode with `npm run mobile:open:ios`
- [ ] Configure signing (add your Apple ID)
- [ ] Update version to 1.0.21
- [ ] Build on simulator
- [ ] Fix any build errors

### Session 3: Test on Device (2-3 hours)
- [ ] Build on real iPhone
- [ ] Test all major features
- [ ] Check for iOS-specific issues
- [ ] Test push notifications
- [ ] Document any bugs

### Session 4: Polish (varies)
- [ ] Fix iOS-specific bugs
- [ ] Add all app icon sizes
- [ ] Test dark mode
- [ ] Test on multiple device sizes
- [ ] Take screenshots

### Session 5: Submit (2-3 hours)
- [ ] Create app in App Store Connect
- [ ] Archive and upload
- [ ] Test via TestFlight
- [ ] Fill in metadata
- [ ] Submit for review

---

## Expected Issues (and Solutions)

### "I'm getting a signing error"
→ Normal! You need to add your Apple ID in Xcode → Preferences → Accounts

### "Pod install failed"
→ Run: `sudo gem install cocoapods -n /usr/local/bin`

### "My app crashes on launch"
→ Check if `GoogleService-Info.plist` is in `ios/App/App/` folder

### "Push notifications don't work"
→ Need to configure APNs in Firebase and Apple Developer Portal (separate guide needed)

### "App builds but features don't work"
→ Check Safari Web Inspector - probably a JavaScript error

### "I can't find where to change [X] in Xcode"
→ Ask me! Xcode has a learning curve, but you'll get it quickly

---

## When to Ask for Help

**Ask immediately if:**
- Build fails with cryptic error
- App installs but crashes on launch
- Stuck on signing/provisioning
- Need to configure push notifications

**Try to figure out yourself:**
- UI tweaks (use Safari inspector)
- Xcode navigation (practice makes perfect)
- Finding files in Finder

---

## Estimated Timeline

### Optimistic (if everything works)
- **Day 1:** Setup complete, first simulator build ✅
- **Day 2:** Device build, basic testing ✅
- **Day 3-4:** Fix iOS-specific issues
- **Day 5:** TestFlight submission
- **Week 2:** App Store approval

### Realistic (with hiccups)
- **Week 1:** Setup, first builds, learning Xcode
- **Week 2:** Testing, fixing bugs, polish
- **Week 3:** TestFlight testing, screenshots
- **Week 4:** App Store submission & approval

---

## You've Got This! 🚀

Remember:
- **Mac feels weird at first** - Give it a few days, you'll adapt
- **Xcode is overwhelming** - You only need to know 10% of it
- **iOS has quirks** - But Capacitor handles most of them
- **Your Android experience transfers** - 80% of knowledge applies
- **I'm here to help** - Don't struggle alone, just ask!

**Next step:** Install Xcode on your Mac and let me know when it's done! 🎯
