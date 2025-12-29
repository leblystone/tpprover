# Feature Announcement Modal - Usage Guide

## 🎉 Overview
The Feature Announcement Modal is a beautiful, one-time popup perfect for announcing major updates, redesigns, and new features to your users.

## ✨ Features
- **One-time display**: Users only see it once per announcement
- **Persistent tracking**: Uses localStorage to remember who's seen it
- **Easy testing**: Built-in test commands
- **Beautiful design**: Modern gradient design with animations
- **Customizable**: Easy to update content for each announcement

---

## 🚀 Quick Start

### The modal is already integrated and ready to go!

It will automatically show **3 seconds after app launch** if the user hasn't seen it yet.

---

## 🧪 Testing

### Test the Modal
Open your browser console and run:
```javascript
window.testFeatureAnnouncement()
```

### Reset the Modal (to see it again)
```javascript
window.resetFeatureAnnouncement()
```
Then refresh the page.

---

## 📝 Customizing the Announcement

### 1. Update the Announcement ID
When you have a **new** announcement, change the ID in `src/App.jsx`:

```javascript
// Around line 140
const CURRENT_ANNOUNCEMENT_ID = 'redesign-2024'; // Change this for new announcements
```

**Example IDs:**
- `'redesign-2024'`
- `'new-features-jan-2025'`
- `'holiday-update-2024'`
- `'v2-launch'`

### 2. Customize the Content
Edit `src/components/common/FeatureAnnouncementModal.jsx`:

**Change the Title:**
```jsx
<h2 className="text-3xl font-bold mb-3">
  Fresh New Look! {/* Change this */}
</h2>
```

**Update the Subtitle:**
```jsx
<p className="text-lg opacity-95">
  <em>The Pep Planner</em> just got a major redesign {/* Change this */}
</p>
```

**Modify Features:**
The modal has 4 feature sections. Edit them in the "What's New Section":
```jsx
{/* Feature 1 */}
<h4 className="font-semibold text-sm mb-1">
  Modern UI Design {/* Feature title */}
</h4>
<p className="text-sm">
  Cleaner interface with improved navigation... {/* Feature description */}
</p>
```

**Change Icons:**
Import different icons from `lucide-react` at the top:
```jsx
import { Sparkles, Rocket, Palette, Zap, X, PartyPopper } from 'lucide-react';
```

### 3. Adjust Timing
In `src/App.jsx`, change when it appears:
```javascript
setTimeout(() => {
  setShowFeatureAnnouncement(true);
}, 3000); // Change 3000 to desired milliseconds (3000 = 3 seconds)
```

---

## 🎨 Design Customization

### Change Gradient Colors
In `FeatureAnnouncementModal.jsx`, update the hero section gradient:
```jsx
style={{
  background: 'linear-gradient(135deg, #7F9E95 0%, #5F7F76 50%, #3d5a52 100%)',
  // Try: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%)' for a fun look
}}
```

### Change Button Style
Update the action button gradient:
```jsx
style={{
  background: 'linear-gradient(135deg, #7F9E95 0%, #5F7F76 100%)'
  // Customize colors here
}}
```

---

## 📊 How It Works

1. **On App Launch**: Checks if user has seen the current announcement
2. **First Time**: Shows modal after 3-second delay
3. **User Clicks**: Modal closes and records in localStorage
4. **Next Visit**: User won't see it again (unless you change the announcement ID)

---

## 🔄 Updating for a New Announcement

When you have a **NEW** announcement to show:

1. **Change the Announcement ID** in `App.jsx`:
   ```javascript
   const CURRENT_ANNOUNCEMENT_ID = 'your-new-id-here';
   ```

2. **Update the content** in `FeatureAnnouncementModal.jsx`:
   - Title
   - Subtitle
   - Features list
   - Icons (if desired)

3. **Deploy** - All users will see the new announcement once!

---

## 🛠️ Advanced Options

### Manual Trigger
Show the modal programmatically:
```javascript
setShowFeatureAnnouncement(true);
```

### Check if User Has Seen It
```javascript
import { shouldShowAnnouncement } from './components/common/FeatureAnnouncementModal';

if (shouldShowAnnouncement('redesign-2024')) {
  console.log('User has not seen this announcement');
}
```

### Multiple Announcements
You can have different announcements for different scenarios by using different IDs:
```javascript
// Main redesign
<FeatureAnnouncementModal announcementId="redesign-2024" ... />

// New feature
<FeatureAnnouncementModal announcementId="new-feature-xyz" ... />
```

---

## 💡 Tips

- **Keep it brief**: Users appreciate concise announcements
- **Use emojis**: They make announcements friendly and eye-catching
- **Test thoroughly**: Always test with `window.testFeatureAnnouncement()`
- **Change ID strategically**: Only change when you have something important to announce
- **Maintain research terminology**: Remember to use "research" language per your app's theme

---

## 🐛 Troubleshooting

**Modal not showing?**
1. Check console for errors
2. Make sure announcement ID is set
3. Reset with `window.resetFeatureAnnouncement()` and refresh
4. Check localStorage: `localStorage.getItem('tpp_seen_announcements')`

**Want to clear all announcement history?**
```javascript
localStorage.removeItem('tpp_seen_announcements');
location.reload();
```

---

## 📞 Questions?

The modal integrates seamlessly with your existing Modal component and uses your app's theme system. It's production-ready and tested!

Enjoy announcing your amazing updates! 🎉

