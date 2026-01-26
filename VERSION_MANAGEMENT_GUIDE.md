# 📱 App Version Management - Simplified Guide

## 🎯 What Changed?

**Before:** Manual updates in 3+ places, easy to make mistakes
**After:** Update ONE file (`package.json`), everything else auto-syncs! ✨

---

## 🚀 How to Release a New Version (New Workflow)

### Step 1: Update Version (ONE PLACE!)

Edit `package.json`:
```json
{
  "version": "1.0.21"  // <- Update this
}
```

That's it! Everything else auto-syncs from here.

### Step 2: Build & Validate

```bash
npm run build
```

This automatically validates that all versions match before building. If something is wrong, it will tell you!

### Step 3: Deploy

```bash
npm run deploy:hosting
```

### Step 4: Update Firestore Config (Admin Panel)

Go to **Admin Panel → Settings → App Version Manager** and:

1. Click the **"Use v1.0.21"** button (auto-fills from package.json!)
2. Add release notes
3. Optionally set minimum version if forcing updates
4. Click **Save Configuration**

Done! 🎉

---

## 🆕 New Features

### ✅ Auto-Version Sync
- `src/utils/appVersion.js` - New file that reads from package.json automatically
- No more manual updates in code!

### ✅ Validation Script
- Runs automatically before every build (`npm run prebuild`)
- Checks that Android/iOS versions match package.json
- Prevents accidental version mismatches

### ✅ Improved Admin UI
- Shows current deployed version at the top
- "Use v1.0.X" quick-fill button
- Clear visual feedback

### ✅ Deployment Helper
```bash
npm run update-version-config --release-notes "Bug fixes" --minimum "1.0.18"
```
Helps you remember what to update in Firestore!

---

## 📋 Quick Reference

### Where Versions Live Now:

| Location | How Updated | Auto-Synced? |
|----------|-------------|--------------|
| `package.json` | **Manually (YOU)** | Source of truth ⭐ |
| `src/utils/appVersion.js` | Auto-imports | ✅ Yes |
| `src/utils/versionChecker.js` | Auto-imports | ✅ Yes |
| `android/app/build.gradle` | **Manually** | ⚠️ No (validated) |
| `ios/App/App/config.json` | **Manually** | ⚠️ No (validated) |
| Admin Panel (Firestore) | **Manually via UI** | ❌ No |

### Scripts You Can Run:

```bash
# Validate all versions match
npm run validate-version

# Helper reminder for Firestore update
npm run update-version-config --release-notes "Your notes here"

# Build (auto-validates first)
npm run build
```

---

## 🐛 What Was Fixed

### Bug 1: Version Mismatch
**Before:** `package.json` said 1.0.20, but code said 1.0.18
**After:** Auto-synced from package.json, impossible to mismatch!

### Bug 2: Triple Manual Entry
**Before:** Update package.json, then versionChecker.js, then Admin Panel
**After:** Update package.json, code auto-syncs, Admin Panel has quick-fill button!

### Bug 3: No Validation
**Before:** Could deploy with mismatched versions
**After:** Build fails if versions don't match!

---

## 💡 Pro Tips

1. **When releasing a new version:**
   - Bump version in `package.json`
   - Run `npm run build` (auto-validates)
   - Deploy
   - Update Admin Panel (use quick-fill button!)

2. **Android/iOS versions:**
   - Update these when doing native app releases
   - Validation script will catch mismatches

3. **Testing updates:**
   - Use `window.testUpdatePrompt('recommended')` in browser console
   - Types: 'optional', 'recommended', 'critical'

4. **Version format:**
   - Always use semantic versioning: `X.Y.Z`
   - Major.Minor.Patch (e.g., 1.0.20)

---

## 🎉 Summary

**You now only update the version in ONE place!**

Everything else either:
- ✅ Auto-syncs from package.json
- ✅ Gets validated before building
- ✅ Has helper tools to remind you

**No more manual version tracking headaches!** 🎊
