# 📱 Mobile App Assets Checklist

**App Icons, Splash Screens, and Store Graphics for Android & iOS**

---

## 🎯 **What You Need**

### **Quick Summary**
- ✅ App icons: You have them! (`icon-192x192.png`, `icon-512x512.png`)
- ✅ Splash screen: Configured with your brand color `#E8EAE3`
- ⬜ Store screenshots: Need to capture these
- ⬜ Store graphics: Need to create these

---

## 📱 **Current App Icons** ✅

Your app already has icons configured:
- `public/icon-192x192.png` - Android icon
- `public/icon-512x512.png` - Android & iOS icon
- `public/icon-maskable.png` - Adaptive icon (Android)
- `public/apple-touch-icon.png` - iOS icon

**These are automatically synced to mobile apps when you run:**
```bash
npm run mobile:build
```

### **Verify Your Icons Look Good**

**Android:**
```bash
npm run mobile:open:android
```
Check the app icon in Android Studio's device manager.

**iOS:**
```bash
npm run mobile:open:ios
```
Check the app icon in iOS Simulator.

---

## 🎨 **Splash Screen** ✅

Your splash screen is already configured in `capacitor.config.json`:

```json
"SplashScreen": {
  "launchShowDuration": 2000,
  "backgroundColor": "#E8EAE3",  // Your brand color (sage green)
  "showSpinner": false
}
```

**Android splash images are already created:**
- `android/app/src/main/res/drawable/splash.png`
- Multiple sizes for different screen densities

**iOS splash screen:** Uses your background color automatically.

---

## 📸 **Store Screenshots** ⬜ *Need These!*

### **How to Capture Screenshots**

#### **Android Screenshots**

1. **Run app in Android Studio:**
   ```bash
   npm run mobile:android
   ```

2. **Navigate to key screens:**
   - Dashboard/Home
   - Calendar view
   - Protocol list
   - Supplement tracking
   - Any standout features

3. **Capture screenshots:**
   - Use Android Studio's camera button (sidebar)
   - Or: Device → Screenshot
   - Saves to your Downloads folder

4. **Required sizes:**
   - Phone: 1080 x 1920 px (minimum 2 screenshots, max 8)
   - Optional: Tablet sizes if targeting tablets

#### **iOS Screenshots**

1. **Run app in iOS Simulator:**
   ```bash
   npm run mobile:ios
   ```

2. **Select different simulators:**
   - iPhone 15 Pro Max (6.7")
   - iPhone 15 Pro (6.1")
   - iPad Pro 12.9"

3. **Capture screenshots:**
   - Device → Trigger Screenshot (or Cmd+S)
   - Saves to Desktop

4. **Required sizes:**
   - iPhone 6.7": 1290 x 2796 px (required)
   - iPhone 6.5": 1284 x 2778 px (required)
   - iPad Pro 12.9": 2048 x 2732 px (required)

### **Screenshot Best Practices**

**Good screens to show:**
1. **Dashboard** - Show main interface
2. **Calendar** - Demonstrate scheduling
3. **Protocol Editor** - Show customization
4. **Stockpile** - Display tracking features
5. **Analytics** - Highlight insights (if applicable)

**Tips:**
- Use light mode (better for screenshots)
- Fill with realistic demo data (not empty screens)
- Show key features that differentiate your app
- Keep it clean and professional

---

## 🎨 **Store Graphics** ⬜ *Need These!*

### **Android - Feature Graphic**

**Required:** 1024 x 500 px PNG or JPG

**What it is:** Banner image shown at top of Play Store listing

**Content ideas:**
- App name "The Pep Planner"
- Tagline: "Optimize Your Health Journey"
- Clean design with your brand colors
- App icon integrated into design

**Tools to create:**
- Canva (free templates)
- Figma (free)
- Adobe Express (free tier)
- Photoshop/Illustrator (if you have them)

### **Android - App Icon (Play Store)**

**Required:** 512 x 512 px PNG (32-bit)

You can use your existing `icon-512x512.png` - just verify it looks good!

### **iOS - App Preview Video** (Optional but recommended)

**Specs:** 15-30 seconds, portrait orientation

**What to show:**
- Quick app walkthrough
- Key features in action
- Smooth, professional capture

---

## 📝 **Store Listing Copy**

### **App Name** (Both Stores)
```
The Pep Planner
```

### **Short Description** (Google Play - 80 chars)
```
Smart supplement tracking and personalized health optimization protocols
```

### **Tagline** (App Store - 30 chars)
```
Optimize Your Health Journey
```

### **Full Description**

See `MOBILE_QUICK_START.md` for a complete description template.

### **Keywords** (App Store - 100 chars)
```
health,supplements,biohacking,wellness,tracking,planner,fitness,optimization,protocol,vitamins
```

---

## ✅ **Pre-Launch Checklist**

### **Assets Ready**
- [ ] App icons verified (all sizes)
- [ ] Splash screen looks good
- [ ] Android screenshots captured (2-8 images)
- [ ] iOS screenshots captured (all required sizes)
- [ ] Feature graphic created (Android, 1024x500)
- [ ] App icon for Play Store (512x512)

### **Store Information**
- [ ] App name decided
- [ ] Short description written
- [ ] Full description written
- [ ] Keywords researched (iOS)
- [ ] Category selected (Health & Fitness)
- [ ] Privacy policy URL ready
- [ ] Support email/URL ready

### **Legal & Compliance**
- [ ] Privacy policy published
- [ ] Terms of service available
- [ ] Content rating questionnaire completed (Android)
- [ ] Age rating selected (iOS)
- [ ] Target audience defined

### **Technical**
- [ ] `google-services.json` added (Android)
- [ ] `GoogleService-Info.plist` added (iOS)
- [ ] App tested on multiple devices
- [ ] All features working
- [ ] No crashes or critical bugs

---

## 🚀 **Asset Generation Commands**

### **Sync Latest Build to Mobile**
```bash
# This copies your web assets (icons, etc.) to mobile projects
npm run mobile:build
```

### **Verify Icons in Native IDEs**
```bash
# Android
npm run mobile:open:android

# iOS (Mac only)
npm run mobile:open:ios
```

---

## 🎨 **Design Resources**

### **Free Tools**
- **Canva**: Feature graphics, promotional images
- **Figma**: UI mockups, store graphics
- **GIMP**: Free Photoshop alternative
- **Inkscape**: Vector graphics editor

### **Icon Tools**
- **App Icon Generator**: https://appicon.co/
- **MakeAppIcon**: https://makeappicon.com/

### **Screenshot Tools**
- **Screely**: Add device frames to screenshots
- **Mockuphone**: Realistic device mockups
- **Previewed**: Professional app screenshots

---

## 📱 **Quick Reference - Required Sizes**

### **Android Play Store**
| Asset | Size | Required |
|-------|------|----------|
| App Icon | 512x512 px | ✅ Required |
| Feature Graphic | 1024x500 px | ✅ Required |
| Phone Screenshots | 1080x1920+ px | ✅ 2-8 images |
| Tablet Screenshots | varies | Optional |

### **iOS App Store**
| Asset | Size | Required |
|-------|------|----------|
| App Icon | 1024x1024 px | ✅ Required |
| iPhone 6.7" | 1290x2796 px | ✅ Required |
| iPhone 6.5" | 1284x2778 px | ✅ Required |
| iPad Pro 12.9" | 2048x2732 px | ✅ Required |
| App Preview Video | 15-30 sec | Optional |

---

## 🎯 **Next Steps**

1. **Verify current icons:**
   ```bash
   npm run mobile:build
   npm run mobile:android  # Check Android icon
   ```

2. **Capture screenshots:**
   - Run app in simulators/emulators
   - Navigate to best screens
   - Capture 2-8 great screenshots per platform

3. **Create feature graphic (Android):**
   - Use Canva or similar tool
   - 1024 x 500 px
   - Include app name and tagline

4. **Prepare store listings:**
   - Write descriptions
   - Add keywords (iOS)
   - Get privacy policy URL ready

5. **Ready to submit!** 🚀

---

## 💡 **Pro Tips**

- **Test on real devices** before submitting if possible
- **Show real data** in screenshots (use demo data)
- **Highlight unique features** that set you apart
- **Professional screenshots** make a huge difference in downloads
- **Update regularly** - stores favor active apps
- **Respond to reviews** - builds trust with users
- **A/B test descriptions** after launch to improve conversion

---

**Need help with specific assets? Ask and I can help create or optimize them!** 🎨



