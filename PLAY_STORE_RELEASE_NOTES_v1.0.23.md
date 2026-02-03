# 📱 Play Store Release Notes - v1.0.23

## 📝 SHORT VERSION (for Play Store Console - 500 char limit)

**What's New:**
• Fixed protocol start revert - protocols stay active when navigating away
• Fixed dose input - numbers now enter correctly when editing protocol dosage
• Fixed protocol edit - peptide name, dosage, frequency no longer disappear
• Android notifications improvements - FCM token sync fix
• Improved sync stability with timestamp-based conflict resolution

---

## 🎯 MEDIUM VERSION (if more space available)

### What's New in v1.0.23

**Critical Bug Fixes:**
• Fixed protocol start reverting - protocols no longer disappear after navigating away
• Fixed dose field input - numbers insert at cursor correctly on mobile
• Fixed protocol edit erasing data - peptide details preserved when editing active protocols
• Fixed Android push notifications - FCM token now syncs correctly

**Improvements:**
• Extended sync protection window for protocol changes
• Better data persistence when starting protocols
• Improved cross-device sync reliability

---

## 📱 VERY SHORT (for in-app changelog)

v1.0.23 🐛 Bug fixes

✅ Protocol start no longer reverts
✅ Dose input works correctly when editing
✅ Protocol edit preserves all data
✅ Android notifications fix
✅ Sync stability improvements

---

## 🚀 Deployment Checklist

- [x] Version bumped to 1.0.23 in package.json
- [x] Android versionCode 23, versionName 1.0.23
- [ ] Build completed successfully
- [ ] Android sync completed
- [ ] Generate signed AAB in Android Studio
- [ ] Upload to Play Store Console
- [ ] Paste release notes (short version)
- [ ] Set rollout percentage
- [ ] Monitor crash reports
- [ ] Update Firestore config in Admin Panel → App Version Manager
