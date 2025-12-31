# 🧪 Quick Test Guide - Swipeable Intro

## 🚀 **Fastest Way to Test**

### **Option 1: Browser Console (Easiest)**

1. Open `http://localhost:5174/login`
2. Press **F12** (open console)
3. Run:
   ```javascript
   localStorage.removeItem('tpp_has_seen_intro')
   location.reload()
   ```
4. **Should see:** Intro if installed PWA, skip if browser

---

### **Option 2: Test URL (Quick)**

Just visit:
```
http://localhost:5174/login?testIntro=true
```

✅ **Forces intro to show** regardless of platform

---

### **Option 3: Install PWA (Real Experience)**

1. Visit `http://localhost:5174/`
2. **Chrome:** Click install icon in address bar ⬇️
3. **Open installed app** from desktop/home screen
4. **Should see:** Intro automatically!

---

## 📊 **What Should Happen**

| Scenario | Landing Page? | Intro? | Login? |
|----------|--------------|--------|--------|
| Browser (not installed) | ✅ YES | ❌ NO | ✅ YES |
| Installed PWA | ❌ NO | ✅ YES | ✅ YES |
| Native App | ❌ NO | ✅ YES | ✅ YES |

---

## 🎨 **What You'll See**

**Intro has 4 screens with sophisticated design:**
1. 🧪 Welcome - Deep black with sage accents
2. 📅 Protocols - Sage green with cream accents
3. 📦 Track Everything - Cream background with dark text
4. ✨ Free Trial - Charcoal with sage accents

**Features:**
- Swipe left/right with diagonal wave transitions
- Animated gradient blending (like the food app!)
- Smart text colors (adapts to background)
- Progress dots that match theme
- Skip button
- Accent-colored Next button
- Elegant black/sage/cream palette (like gift card)

---

## 🔍 **Debug Console Output**

**If intro shows:**
```
🎬 Showing swipeable intro
   Platform: Installed PWA (or Native App)
```

**If intro skips:**
```
⏭️ Skipping intro
   Reason: Browser user (not installed)
```

---

## ✅ **Quick Checklist**

- [ ] Browser: Shows landing page, no intro
- [ ] Browser → Login: No intro
- [ ] Installed PWA: Shows intro first time
- [ ] Installed PWA: Skips intro second time
- [ ] Test URL works: `?testIntro=true`
- [ ] Can swipe through all 4 screens
- [ ] Skip button works
- [ ] Next button works
- [ ] Colors animate during swipes

---

**Ready to test!** 🚀

Dev server: `http://localhost:5174`

