---
name: Mac Mini iOS Setup
overview: Complete setup guide for your Mac Mini and iOS app submission to Apple App Store, from initial Mac setup through app store assets and submission.
todos:
  - id: mac-setup
    content: "Complete Mac Mini initial setup: install Xcode, CocoaPods, command line tools, transfer project"
    status: pending
  - id: first-build
    content: "Configure Xcode project: signing, version, capabilities, and run first build on simulator"
    status: pending
  - id: testing
    content: Test all core functionality on iOS simulator, fix any iOS-specific issues
    status: pending
  - id: screenshots
    content: Create App Store screenshots on iPhone 15 Pro Max and iPhone 14 Plus simulators
    status: pending
  - id: app-store-setup
    content: Create app in App Store Connect, fill in metadata, upload build
    status: pending
  - id: testflight
    content: Test via TestFlight before public submission
    status: pending
  - id: submit
    content: Submit app for App Store review
    status: pending
isProject: false
---

# Mac Mini & iOS App Store Setup Plan

## Overview

You have a Capacitor/React app that's already deployed on Android (v1.0.25). Your iOS project exists but needs Mac setup, testing, screenshots, and App Store submission. Since this is your first Mac, we'll cover both macOS basics and iOS-specific setup.

## Phase 1: Mac Mini Initial Setup (First Session - 2-3 hours)

### Essential Mac Setup

**What you'll need:**

- Mac Mini powered on and connected
- Apple ID (same one for Developer account)
- Internet connection
- USB cable if testing on real iPhone

**Critical macOS keyboard differences from Windows:**

- `Cmd` = Windows `Ctrl` (Cmd+C = copy, Cmd+V = paste)
- `Cmd+Space` = Opens Spotlight search (like Windows Start menu)
- `Cmd+Tab` = Switch apps (like Alt+Tab)
- `Cmd+Q` = Quit app (like Alt+F4)
- `Cmd+W` = Close window

**Essential apps to open:**

- **Terminal**: Press Cmd+Space, type "Terminal", press Enter
- **Finder**: Like Windows Explorer (blue face icon in dock)
- **App Store**: For installing Xcode

### Install Development Tools

**1. Install Xcode (REQUIRED - 30-60 min download)**

The iOS_SETUP_GUIDE.md already documents this, but here's the quick version:

```bash
# Open App Store (Cmd+Space → type "App Store")
# Search for "Xcode"
# Click "Get" or "Install" (it's ~10-15 GB)
# After install, open Xcode once to accept license
# Then verify:
xcode-select --install
```

If already installed, the command will say "already installed" - that's good!

**2. Install Command Line Tools**

```bash
xcode-select --install
```

Accept the license agreement.

**3. Install CocoaPods (iOS dependency manager)**

```bash
sudo gem install cocoapods
```

You'll need to enter your Mac password (it won't show as you type - that's normal).

Verify installation:

```bash
pod --version
```

Should show version like `1.15.2` or similar.

**4. Install Node.js & npm (if not already on Mac)**

Check if already installed:

```bash
node --version
npm --version
```

If not installed, download from nodejs.org or use Homebrew:

```bash
# Install Homebrew first (if you want)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Then install Node
brew install node
```

### Transfer Project to Mac

**Option A: Clone from Git (Recommended)**

Since your project is already in Git:

```bash
cd ~/Documents
git clone <your-repo-url> TPPSpendide
cd TPPSpendide
npm install
```

**Option B: Transfer via USB/Cloud**

- Copy entire project folder from Windows to Mac
- Place in `/Users/YourName/Documents/TPPSpendide`
- Run `npm install` after transfer

**Verify project structure:**

```bash
ls -la
# Should see: ios/, android/, src/, package.json, capacitor.config.json
```

## Phase 2: iOS Project Setup & First Build (Session 2 - 1-2 hours)

### Configure Xcode Project

**1. Build and sync Capacitor:**

```bash
cd ~/Documents/TPPSpendide
npm run mobile:build
```

This builds your React app and syncs it to the iOS folder.

**2. Open Xcode:**

```bash
npm run mobile:open:ios
```

This opens `ios/App/App.xcworkspace` in Xcode.

### Critical Xcode Configurations

**In Xcode (left sidebar → click "App" blue icon):**

**Signing & Capabilities tab:**

- ✅ Check "Automatically manage signing"
- **Team**: Select your Apple Developer account
  - If not showing: Xcode menu → Preferences → Accounts → Add Apple ID with `+` button
- **Bundle Identifier**: Should be `com.thepepplanner.app` (already set)

**General tab:**

- **Display Name**: "The Pep Planner" (should already be set)
- **Version**: Change to `1.0.25` (to match Android)
- **Build**: Change to `25`
- **iOS Deployment Target**: Set to `14.0` (minimum iOS version)

**Capabilities to Add:**

Click "+ Capability" button:

- ✅ Push Notifications
- ✅ Background Modes → Check "Remote notifications"
- ✅ Sign in with Apple (if you use it)

### First Build - iOS Simulator

**1. Select simulator:**

- Top of Xcode window: Click device dropdown next to "App"
- Select any iPhone simulator (e.g., "iPhone 15 Pro")

**2. Build and run:**

- Click ▶️ Play button (or press Cmd+R)
- Wait 2-5 minutes for first build
- Simulator should launch with your app

**3. Debug if build fails:**

Common issues:

- **CocoaPods error**: Run `cd ios/App && pod install`
- **Signing error**: Add Apple ID in Xcode → Preferences → Accounts
- **Missing GoogleService-Info.plist**: Already exists at `[ios/App/App/GoogleService-Info.plist](ios/App/App/GoogleService-Info.plist)`

### Test Core Functionality

Once app launches in simulator, test:

- Login/Authentication works
- Sign up flow works
- Navigation between screens
- Data loads from Firebase
- Create/edit protocols
- Calculator functions work
- Orders, vendors, stockpile features
- Status bar displays correctly
- Keyboard doesn't cover input fields

**Use Safari Web Inspector for debugging:**

1. Safari menu → Preferences → Advanced → ✅ "Show Develop menu"
2. With simulator running: Safari → Develop → Simulator → [Your App]
3. Full DevTools-like inspector! Check console for errors.

## Phase 3: iOS-Specific Testing & Fixes (Session 3 - 2-3 hours)

### Platform-Specific Issues to Watch

**iOS is pickier than Android about:**

- **Safe areas**: Content must respect notch/home indicator on newer iPhones
- **Status bar**: Should use light/dark content based on theme
- **Keyboard behavior**: Should push content up, not cover it
- **Back gestures**: Swipe from left edge should work
- **Dark mode**: Test in both light and dark mode
- **Touch targets**: Buttons should be at least 44x44 points

### Test on Multiple Simulators

Test on:

- iPhone 15 Pro (6.1") - Latest
- iPhone SE (4.7") - Smallest modern iPhone
- iPad (if you support tablets)

### Known iOS Quirks for Capacitor Apps

Check `[capacitor.config.json](capacitor.config.json)` - already configured:

```json
{
  "plugins": {
    "StatusBar": {
      "style": "DARK",
      "backgroundColor": "#ffffff",
      "overlaysWebView": false
    }
  }
}
```

### Fix Any iOS-Specific Bugs

Document any issues you find and we'll address them before submission.

## Phase 4: App Store Assets & Screenshots (Session 4 - 1-2 hours)

### Assets You Already Have

✅ **App Icon**: Exists at `[ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png](ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png)`

- 1024x1024 PNG
- Should be good for App Store

✅ **Splash Screen**: Exists at `ios/App/App/Assets.xcassets/Splash.imageset/`

✅ **Firebase Config**: `[ios/App/App/GoogleService-Info.plist](ios/App/App/GoogleService-Info.plist)` already in place

### Screenshots You Need to Create

**Required sizes for App Store:**

- **iPhone 6.7"** (iPhone 15 Pro Max): 1290 x 2796 pixels
- **iPhone 6.5"** (iPhone 14 Plus): 1242 x 2688 pixels

**Minimum**: 1 screenshot per size
**Maximum**: 10 screenshots per size
**Recommended**: 5-7 key features

### How to Take Screenshots Using iOS Simulator

**Step-by-step process:**

1. **Set up your app with good data:**
  - Make sure you're logged in
  - Have sample protocols, orders, vendors
  - Use consistent theme (Sage recommended per your store-assets guide)
2. **Open simulator with correct device:**

```bash
# In Xcode, select device dropdown
# Choose "iPhone 15 Pro Max" (6.7" display)
npm run mobile:build && npx cap run ios
```

1. **Navigate to screen you want to capture**
2. **Take screenshot:**
  - Simulator menu → Device → Trigger Screenshot (or Cmd+S)
  - Screenshots save to Desktop
  - OR: Cmd+Shift+P in DevTools → "Capture full size screenshot"
3. **Repeat for all key screens:**
  - Dashboard (hero shot)
  - Protocols management
  - Recon calculator
  - Order tracking
  - Stockpile inventory
  - Vendor management
  - Calendar/scheduling
4. **Repeat entire process with iPhone 14 Plus simulator** (6.5" display)

**Screenshot best practices:**

- Use light mode for consistency
- Show real data, not empty states
- Make text readable
- Consistent theme across all screenshots
- First screenshot is most important (shows in search)

### Optional: Add Device Frames

Use online tools to make screenshots look more professional:

- [https://screenshots.pro](https://screenshots.pro)
- [https://mockuphone.com](https://mockuphone.com)

Upload your raw screenshots, add iPhone frame, download.

### Store Listing Copy

You have `[store-assets/store-listing-copy.md](store-assets/store-listing-copy.md)` ready to use. Review and adapt as needed.

**Key sections:**

- App name: "The Pep Planner"
- Subtitle: (100 char max - concise value prop)
- Description: What the app does, key features
- Keywords: For search optimization
- Support URL: Your website
- Privacy Policy URL: Required

## Phase 5: Privacy & Compliance (30 minutes)

### Privacy Manifest (iOS 17+ Requirement)

Apple requires a privacy manifest file. Check if you have:

`ios/App/App/PrivacyInfo.xcprivacy`

If not, create it (or we'll create it based on what data you collect).

### App Store Privacy Details

You'll need to declare in App Store Connect:

- What data you collect (email, usage data, etc.)
- How you use it
- Whether it's linked to user identity
- Whether it's used for tracking

**Data The Pep Planner likely collects:**

- Email address (for authentication)
- Name (optional)
- User-generated content (protocols, orders, etc.)
- Usage data (analytics)
- Device identifiers (for push notifications)

### Required URLs

Make sure you have:

- **Support URL**: `https://thepepplanner.app/support` or similar
- **Privacy Policy**: `https://thepepplanner.app/privacy` (REQUIRED)
- **Terms of Service**: `https://thepepplanner.app/terms` (recommended)

## Phase 6: Archive & Upload to App Store (Session 5 - 1-2 hours)

### Prepare for Production Build

**1. Update version in Xcode:**

- Version: `1.0.25` (or next version after Android)
- Build: `25`

**2. Set device target to "Any iOS Device (arm64)"**

- In Xcode device dropdown
- Must select this for archiving (can't use simulator)

### Create Archive

**In Xcode:**

1. Product menu → Archive
2. Wait 5-10 minutes for build
3. Organizer window opens automatically when done
4. Your archive appears in list

### Distribute to App Store Connect

**In Organizer window:**

1. Select your archive
2. Click "Distribute App" button
3. Select "App Store Connect"
4. Click "Next" through wizard:
  - Upload
  - Include bitcode: No (deprecated)
  - Manage version: Automatically manage
  - Signing: Automatically manage
5. Click "Upload"
6. Wait 10-30 minutes for processing

### Create App in App Store Connect

**Go to:** [https://appstoreconnect.apple.com](https://appstoreconnect.apple.com)

**First time only:**

1. Click "My Apps" → "+" icon → "New App"
2. Platform: iOS
3. Name: "The Pep Planner"
4. Primary Language: English (US)
5. Bundle ID: Select `com.thepepplanner.app`
6. SKU: Any unique ID (e.g., `TPP-001`)
7. User Access: Full Access
8. Click "Create"

### Fill in App Store Listing

**App Information:**

- Name: "The Pep Planner"
- Subtitle: (30 char max)
- Privacy Policy URL: (required)
- Category: Primary = Health & Fitness or Productivity

**Pricing & Availability:**

- Price: Free (or set price)
- Availability: All countries (or select specific)

**App Privacy:**

- Fill in privacy questionnaire based on data collection
- Be honest - Apple reviews carefully

**Prepare for Submission:**

1. Click "+ Version" or select "1.0" (first release)
2. **Screenshots**: Upload for required device sizes
3. **Description**: Paste from store-listing-copy.md
4. **Keywords**: Comma-separated (max 100 chars)
5. **Support URL**: Your support page
6. **Marketing URL**: (optional)
7. **Version**: 1.0.25
8. **Copyright**: © 2026 Your Name/Company
9. **Rating**: Complete content rating questionnaire
10. **App Review Information**:
  - Contact info (for reviewer)
    - Demo account credentials (if login required)
    - Notes for reviewer

**Build:**

- Under "Build" section, click "+" and select the uploaded build
- May take 30-60 min after upload before it appears

### Submit for Review

1. Click "Add for Review" (top right)
2. Review all information
3. Click "Submit for Review"

**Review timeline:**

- Typically 1-3 days
- Can be faster (24 hours) or slower (5+ days)
- You'll get email updates on status

## Phase 7: TestFlight (Highly Recommended First!)

### Why TestFlight?

Before submitting to public App Store, test via TestFlight:

- Catch bugs in production build
- Test on real devices
- Share with beta testers
- No review process (much faster)

### Set Up TestFlight

**In App Store Connect:**

1. Click your app → TestFlight tab
2. Under "Internal Testing":
  - Add yourself as tester
  - Add any other team members
3. Under "External Testing" (optional):
  - Create test group
  - Add external testers via email
  - First external build requires quick review (~24 hours)

**On your iPhone:**

1. Install TestFlight app from App Store
2. Check email for invite
3. Accept invite
4. Install beta app
5. Test thoroughly!

### What to Test

- Everything you tested in simulator
- Push notifications (real device only)
- Real network conditions
- Different iOS versions (if possible)
- Edge cases and error handling

## Expected Issues & Solutions

### "Provisioning profile doesn't match"

→ Xcode → Preferences → Accounts → Download Manual Profiles

### "Failed to verify bitcode"

→ Build Settings → Search "bitcode" → Set to "No"

### "Module 'App' not found"

→ `cd ios/App && pod install`

### CocoaPods errors

```bash
cd ios/App
pod deintegrate
pod install
```

### App crashes on launch

→ Check Xcode debug console for errors
→ Check Safari Web Inspector console
→ Common cause: Firebase config issues

### Push notifications don't work in simulator

→ Normal! Push notifications only work on real devices

### App builds but features broken

→ Use Safari Web Inspector to check JavaScript errors
→ Verify Firebase connection
→ Check network requests

## Timeline Estimate

### Optimistic (everything works smoothly):

- **Day 1**: Mac setup, Xcode install, first build ✅
- **Day 2**: Testing, fixes, screenshots
- **Day 3**: Upload to TestFlight
- **Day 4-5**: TestFlight testing
- **Week 2**: App Store submission & approval

### Realistic (with typical hiccups):

- **Week 1 Session 1**: Mac setup, Xcode install
- **Week 1 Session 2**: First build, fix issues
- **Week 1 Session 3**: Testing, iOS-specific fixes
- **Week 2**: Screenshots, TestFlight, polish
- **Week 3**: App Store submission
- **Week 4**: Review & approval (+ any rejections/resubmissions)

## Key Files Reference

**Existing documentation:**

- `[IOS_SETUP_GUIDE.md](IOS_SETUP_GUIDE.md)` - Comprehensive iOS guide (Windows user friendly)
- `[IOS_SUBMISSION_CHECKLIST.md](IOS_SUBMISSION_CHECKLIST.md)` - Detailed submission steps
- `[store-assets/START_HERE.md](store-assets/START_HERE.md)` - Screenshot creation guide
- `[store-assets/SCREENSHOT_CHECKLIST.md](store-assets/SCREENSHOT_CHECKLIST.md)` - Detailed screenshot guide

**iOS project files:**

- `[capacitor.config.json](capacitor.config.json)` - Capacitor configuration
- `[ios/App/Podfile](ios/App/Podfile)` - iOS dependencies
- `[ios/App/App/Info.plist](ios/App/App/Info.plist)` - App configuration
- `[ios/App/App/GoogleService-Info.plist](ios/App/App/GoogleService-Info.plist)` - Firebase config ✅
- `[package.json](package.json)` - Current version: 1.0.25

**App info:**

- **App Name**: The Pep Planner
- **Bundle ID**: com.thepepplanner.app
- **Current Version**: 1.0.25 (Android) → Use 1.0.25 or 1.0.26 for iOS
- **Firebase Project**: tpp-splendide

## Mac Tips for Windows Users

**File paths:**

- Windows: `C:\Users\lebro\Desktop\TPPSpendide`
- Mac: `/Users/yourname/Documents/TPPSpendide`

**Terminal basics:**

- `ls` = list files (like `dir`)
- `cd` = change directory (same)
- `pwd` = show current path (like `cd` with no args)
- `~` = your home directory shortcut

**Installing software:**

- **App Store**: For Xcode, TestFlight
- **Homebrew**: Package manager (like winget)
- **Direct downloads**: nodejs.org, etc.

**Useful Mac apps for development:**

- **iTerm2**: Better terminal (optional)
- **Rectangle**: Window management (free)
- **VS Code**: Works great on Mac (optional, can stick with Cursor)

**Transferring files Mac ↔ Windows:**

- Git (best for code)
- Cloud storage (Google Drive, Dropbox)
- Network shares over WiFi
- USB drive (format as exFAT)

## Next Steps

1. **Power on Mac Mini**, sign in with Apple ID
2. **Check if Xcode installed**: Open App Store, search "Xcode", see if it says "Open" or "Get"
3. **Let me know status** and we'll proceed step by step
4. **Don't rush** - First Mac setup has a learning curve, but you'll adapt quickly!

## Support

As you go through this:

- **Ask immediately** if build fails with cryptic errors
- **Ask immediately** if stuck on signing/provisioning
- **Try to figure out** UI tweaks, finding files in Finder
- **Reference** the existing guides - they're comprehensive!

You've got this! The hardest part is the initial unfamiliarity with macOS. Once past that, iOS development is actually quite smooth with Capacitor.