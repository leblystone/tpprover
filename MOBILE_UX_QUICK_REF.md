# 🚀 Mobile UX Quick Reference Card

## 📱 Import Statements

```jsx
// Bottom Sheets
import BottomSheet from '../components/common/BottomSheet';

// Swipe Gestures
import { useHorizontalSwipe, useSwipeGesture } from '../utils/useSwipeGesture';

// Sticky Headers
import StickyHeader, { useStickyHeaderScroll } from '../components/common/StickyHeader';

// Haptics
import haptics from '../utils/haptics';
// or
import { hapticsLight, hapticsMedium, hapticsSuccess } from '../utils/haptics';

// Responsive Sizing
import { getResponsiveSizeConfig, getSizeConfig } from '../utils/dashboardCustomization';
```

---

## ⚡ Quick Copy-Paste Examples

### Bottom Sheet Modal
```jsx
<BottomSheet 
  open={isOpen} 
  onClose={() => setIsOpen(false)}
  title="Quick Action"
  theme={theme}
>
  <div className="p-4">Content here</div>
</BottomSheet>
```

### Horizontal Swipe
```jsx
const swipe = useHorizontalSwipe({
  onSwipeLeft: goNext,
  onSwipeRight: goPrev
});

<div {...swipe}>Swipeable content</div>
```

### Sticky Header
```jsx
<StickyHeader
  theme={theme}
  title="Page Title"
  subtitle="Subtitle"
  collapseOnScroll={true}
/>
```

### Haptic Feedback
```jsx
<button onClick={async () => {
  await hapticsLight();
  // your action
}}>
  Tap Me
</button>
```

---

## 🎯 Haptic Types Quick Reference

| Function | When to Use |
|----------|-------------|
| `hapticsLight()` | Button taps, toggles |
| `hapticsMedium()` | Menu selections, swipes |
| `hapticsHeavy()` | Delete, important actions |
| `hapticsSuccess()` | Save success, goal achieved |
| `hapticsWarning()` | Warnings, confirmations |
| `hapticsError()` | Validation errors, failures |
| `hapticsSelection()` | Picker scrolling, selections |

---

## 📐 Responsive Breakpoints

| Size | Width | Columns | Widget Behavior |
|------|-------|---------|-----------------|
| **Mobile** | <640px | 1 | Full width |
| **Tablet** | 640-1024px | 2 | Half width |
| **Desktop** | >1024px | 6 | Grid layout |

---

## ✅ What's Already Implemented

- ✅ **Calendar** - Swipe left/right navigation
- ✅ **All Modals** - Haptic feedback on open/close
- ✅ **Dashboard** - Responsive widget resizing

---

## 🎨 Design Patterns

### Use Bottom Sheet For:
- ✅ Forms (easy thumb reach)
- ✅ Quick selections
- ✅ Mobile-first actions

### Use Swipes For:
- ✅ Navigation (Calendar ✓)
- ✅ Image galleries
- ✅ Card dismissal

### Use Sticky Headers For:
- ✅ Pages with long content
- ✅ Lists (Orders, Protocols)
- ✅ Mobile space optimization

---

## 🚀 Try It Now!

**Calendar Swipe Navigation:**
1. Open Calendar on mobile/tablet
2. Swipe left → Next month
3. Swipe right → Previous month
4. Feel the haptic feedback! 📳

---

Need more details? See `MOBILE_UX_ENHANCEMENTS.md`






