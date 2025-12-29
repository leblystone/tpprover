# Feature Announcement Modal - Usage Guide

## ✨ Overview
A minimalist, modern announcement modal designed for clarity and ease of use. This component skips the "heavy" cards and large headers in favor of a clean, typography-focused layout.

## ✨ Features
- **Minimalist Aesthetic**: Flat design with generous whitespace and subtle icons.
- **One-time display**: Tracks seen state via `localStorage`.
- **User-Friendly Tone**: Simple language that avoids excessive technical or thematic jargon.
- **Responsive & Lightweight**: Designed to feel snappy and native.

---

## 🚀 Usage

The modal is pre-integrated into `App.jsx`. It appears automatically 3 seconds after launch for new updates.

### Testing Commands
Run these in your browser console:
- `window.testFeatureAnnouncement()` - Preview the current design.
- `window.resetFeatureAnnouncement()` - Reset the state to see it automatically again on refresh.

---

## 📝 Customization

### 1. Change the Update ID
Update `src/App.jsx` when you want to show a new announcement:
```javascript
const CURRENT_ANNOUNCEMENT_ID = 'redesign-2024'; // Increment this for new updates
```

### 2. Update Content
Edit `src/components/common/FeatureAnnouncementModal.jsx`:

- **Title**: `<h2 className="text-2xl font-semibold ...">`
- **Subtitle**: `<p className="text-sm opacity-60 ...">`
- **Features**: A simple flex list. Each feature has an icon and two lines of text.

### 3. Styling
The modal uses the application `theme` object for colors. The main button uses `theme.primary` with a subtle shadow for a modern "lift" effect.

---

## 💡 Best Practices
- **Keep it short**: Modern users scan, they don't read. 2-3 sentences per feature max.
- **Clear Icons**: Use Lucide icons that clearly represent the feature (e.g., `Layout` for UI, `Zap` for Speed).
- **Whitespace**: Don't crowd the list. The current 4-item limit is ideal for the `max-w-md` size.
