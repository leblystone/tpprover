# Feature Announcement Modal - Usage Guide

## 🔬 Overview
The Feature Announcement Modal is a sophisticated, professional popup designed to communicate major platform updates and redesigns to your researchers.

## ✨ Features
- **Professional Aesthetic**: Clean, modern design matching the "research principal".
- **One-time display**: Users only see it once per announcement.
- **Persistent tracking**: Uses localStorage to remember seen state.
- **Easy testing**: Built-in test commands.
- **Thematic Integration**: Uses Lucide icons and theme-based gradients.

---

## 🚀 Quick Start

### The modal is already integrated and ready to go!

It will automatically show **3 seconds after app launch** if the researcher hasn't seen the current update yet.

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

### 2. Customize the Content
Edit `src/components/common/FeatureAnnouncementModal.jsx`:

**Change the Primary Header:**
```jsx
<h2 className="text-4xl font-extrabold mb-3 tracking-tight">
  Platform Redesign {/* Change this */}
</h2>
```

**Update the Subtitle:**
```jsx
<p className="text-lg opacity-90 font-medium max-w-sm">
  Significant enhancements to your research environment are now live. {/* Change this */}
</p>
```

**Modify System Improvements:**
The modal uses a structured grid. Edit them in the "Feature Grid" section:
```jsx
{/* Feature 1 */}
<h4 className="font-bold text-sm">
  Unified Interface {/* Feature title */}
</h4>
<p className="text-xs leading-relaxed">
  Streamlined navigation... {/* Feature description */}
</p>
```

### 3. Adjust Icons
Import different icons from `lucide-react` at the top. We recommend technical icons like `Database`, `Shield`, `Zap`, `Monitor`, etc.

---

## 🎨 Design Customization

### Hero Gradient
Update the hero section gradient to match your desired mood:
```jsx
background: `linear-gradient(135deg, ${theme?.primaryDark} 0%, ${theme?.primary} 100%)`,
```

### Action Button
The main button uses a strong gradient and a chevron icon:
```jsx
style={{
  background: `linear-gradient(135deg, ${theme?.primary} 0%, ${theme?.primaryDark} 100%)`
}}
```

---

## 🔄 Updating for a New Announcement

When you have a **NEW** major feature to show:

1. **Change the Announcement ID** in `App.jsx`:
   ```javascript
   const CURRENT_ANNOUNCEMENT_ID = 'v2-protocol-engine';
   ```

2. **Update content** in `FeatureAnnouncementModal.jsx`.
3. **Deploy** - Researchers will see the new update once!
