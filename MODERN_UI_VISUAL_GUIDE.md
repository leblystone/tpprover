# 🎨 Modern UI Redesign - Visual Guide

## Quick Visual Reference

This guide shows the visual changes made to the bottom navigation and groups UI.

---

## 📱 Bottom Navigation

### Mobile View (< 1024px)

#### **Before:**
```
┌───────────────────────────────────────────┐
│                                           │
│         Basic flat navigation bar         │
│                                           │
└───────────────────────────────────────────┘
┌─────────┬─────────┬──────────┬───────────┬──────┐
│ 🏠      │ 📅      │ 🔬       │ 📦        │ ⋯    │
│ Home    │Calendar │Research  │ Inventory │ More │
└─────────┴─────────┴──────────┴───────────┴──────┘
```

#### **After:**
```
┌───────────────────────────────────────────┐
│                                           │
│    Glassmorphic navigation with blur     │
│    Active states with gradient pills     │
│    Ripple effects on tap                 │
│                                           │
└───────────────────────────────────────────┘
┌─────────┬─────────┬──────────┬───────────┬──────┐
│ 🏠      │ 📅      │ 🔬★      │ 📦        │ ⋯    │
│ Home    │Calendar │Research  │ Inventory │ More │
│         │         │  ●       │           │      │
└─────────┴─────────┴──────────┴───────────┴──────┘
         Gradient pill background on active
```

### Expanded Menu

#### **Before:**
```
┌─────────────────────────────────┐
│  🔬 Research                    │
├─────────────────────────────────┤
│  🧪 Protocols                   │
│  🧮 Reconstitute                │
│  [Cancel]                       │
└─────────────────────────────────┘
```

#### **After:**
```
┌─────────────────────────────────┐
│         ━━━━━━━                 │  ← Handle bar
├─────────────────────────────────┤
│  ┌───────────┐  ┌───────────┐  │
│  │    🧪     │  │    🧮     │  │  ← Floating action
│  │ Protocols │  │   Recon   │  │     button style
│  └───────────┘  └───────────┘  │
└─────────────────────────────────┘
    Glassmorphic with blur
    Bounce animation on open
    Staggered pop-in for items
```

---

## 📦 Stockpile Groups Cards

### Card Layout

#### **Before:**
```
┌─────────────────────────────────┐
│ Peptide Name          10mg      │
│                                 │
│ ┌─────────────────────────────┐│
│ │ 5mg                  2 vials ││
│ │ • Vendor A                   ││
│ │ • Vendor B                   ││
│ └─────────────────────────────┘│
│                                 │
│              [Manage]           │
└─────────────────────────────────┘
```

#### **After:**
```
╔═════════════════════════════════╗
║ Peptide Name          [10mg]→  ║  ← Gradient badge
║                                 ║     Chevron indicator
║ ╭─────────────────────────────╮ ║
║ │ 🧪 5mg            [2 vials] │ ║  ← Enhanced variant
║ │                             │ ║     section
║ │ 📦 Vendor A      [🛒][💧]  │ ║  ← Action buttons
║ │ 📦 Vendor B      [🛒][💧]  │ ║
║ ╰─────────────────────────────╯ ║
║                                 ║
║ ────────────────────────────── ║
║ 2 variants                      ║
╚═════════════════════════════════╝
   Glassmorphic card
   Gradient overlay on hover
   Smooth scale transform
   Enhanced shadows
```

### Visual Enhancements

#### **Card Styling:**
- **Border Radius:** 2xl (1rem) → More modern rounded corners
- **Shadows:** Multi-layer shadows with inset highlights
- **Gradients:** Subtle gradient backgrounds
- **Hover Effect:** Scale(1.02) with gradient overlay
- **Active Effect:** Scale(0.98) for touch feedback

#### **Badge Design:**
- **Shape:** Rounded-full with shadow
- **Color:** Primary color with white text
- **Shadow:** Colored shadow matching badge
- **Icon:** Integrated icon for unknown groups

#### **Action Buttons:**
- **Style:** Rounded-lg with hover effects
- **Size:** 1.5rem padding for touch targets
- **Hover:** Scale(1.1) with background change
- **Active:** Scale(0.95) for feedback

---

## 🎨 Color & Theming

### Light Mode

#### Bottom Navigation:
```
Background: linear-gradient(180deg, 
  rgba(255, 255, 255, 0.85) 0%, 
  rgba(255, 255, 255, 0.95) 100%)
Border: rgba(0, 0, 0, 0.08)
Shadow: 0 -4px 24px rgba(0, 0, 0, 0.08)
Active Pill: {primary}10 background
```

#### Cards:
```
Background: linear-gradient(135deg, 
  {cardBackground} 0%, 
  #ffffff 100%)
Border: rgba(0, 0, 0, 0.04)
Shadow: 0 2px 16px rgba(0, 0, 0, 0.06)
Hover Overlay: {primary}15
```

### Dark Mode

#### Bottom Navigation:
```
Background: linear-gradient(180deg, 
  rgba(17, 24, 39, 0.85) 0%, 
  rgba(17, 24, 39, 0.95) 100%)
Border: rgba(255, 255, 255, 0.08)
Shadow: 0 -4px 24px rgba(0, 0, 0, 0.4)
Active Pill: {primary}15 background
```

#### Cards:
```
Background: linear-gradient(135deg, 
  {cardBackground} 0%, 
  {cardBackground}ee 100%)
Border: rgba(255, 255, 255, 0.08)
Shadow: 0 4px 24px rgba(0, 0, 0, 0.4)
Hover Overlay: {primary}15
```

---

## 📐 Spacing & Layout

### Bottom Navigation

```
Height: 64px (4rem)
Safe Area: env(safe-area-inset-bottom)
Icon Size: 24px
Icon Stroke: 2.2 (normal), 2.8 (active)
Font Size: 12px (0.75rem)
Font Weight: 500 (normal), 700 (active)
```

### Expanded Menu

```
Padding: 12px (0.75rem)
Gap: 8px (0.5rem)
Item Padding: 20px vertical, 12px horizontal
Icon Container: 56px (3.5rem)
Icon Size: 26px
Border Radius: 24px (1.5rem)
```

### Cards

```
Padding: 20px (1.25rem)
Gap: 24px (1.5rem) between cards
Border Radius: 16px (1rem)
Variant Section Padding: 12px (0.75rem)
Variant Section Radius: 12px (0.75rem)
Badge Padding: 12px horizontal, 6px vertical
Badge Radius: Full (9999px)
```

---

## ✨ Animation Timings

### Bottom Navigation

```javascript
// Menu slide-up
duration: 350ms
easing: cubic-bezier(0.34, 1.56, 0.64, 1)  // Bounce effect

// Menu items pop-in
duration: 200ms + (index * 75ms)  // Staggered
easing: cubic-bezier(0.34, 1.56, 0.64, 1)

// Ripple effect
duration: 600ms
easing: ease-out

// Active state transitions
duration: 300ms
easing: ease-out
```

### Cards

```javascript
// Hover scale
duration: 300ms
transform: scale(1.02)
easing: ease-out

// Active scale
duration: 200ms
transform: scale(0.98)
easing: ease-out

// Gradient overlay fade
duration: 500ms
easing: ease-out
```

---

## 🎯 Touch Targets

### Minimum Sizes (Accessibility)

```
Bottom Nav Items: 64px × 64px ✅
Menu Items: 80px × 80px ✅
Action Buttons: 40px × 40px ✅
Cards: Full width, 120px+ height ✅
```

---

## 🌈 Gradient Formulas

### Card Backgrounds

**Light Mode:**
```css
background: linear-gradient(135deg, 
  var(--card-background) 0%, 
  #ffffff 100%
);
```

**Dark Mode:**
```css
background: linear-gradient(135deg, 
  var(--card-background) 0%, 
  var(--card-background)ee 100%
);
```

### Hover Overlays

```css
background: radial-gradient(
  circle at top right, 
  var(--primary)15 0%, 
  transparent 70%
);
```

### Active Pills

```css
background: var(--primary)10;
box-shadow: inset 0 0 0 1px var(--primary)30;
```

---

## 📊 Visual Hierarchy

### Level 1: Primary Actions
- **Bottom Nav Items** - Largest, most prominent
- **Card Headers** - Bold, large text
- **Primary Badges** - Colored, shadowed

### Level 2: Secondary Actions
- **Menu Items** - Medium size, clear icons
- **Variant Sections** - Grouped, bordered
- **Action Buttons** - Icon-based, hover effects

### Level 3: Tertiary Info
- **Item Details** - Small text, light color
- **Metadata** - Subtle, gray text
- **Borders** - Very light, barely visible

---

## 🎨 Design Tokens

### Colors
```javascript
primary: theme.primary
background: theme.background
cardBackground: theme.cardBackground
text: theme.text
textLight: theme.textLight
textOnPrimary: theme.textOnPrimary
border: theme.border
```

### Shadows
```javascript
// Light mode
sm: '0 2px 8px rgba(0, 0, 0, 0.04)'
md: '0 4px 16px rgba(0, 0, 0, 0.06)'
lg: '0 8px 32px rgba(0, 0, 0, 0.08)'

// Dark mode
sm: '0 2px 8px rgba(0, 0, 0, 0.3)'
md: '0 4px 16px rgba(0, 0, 0, 0.4)'
lg: '0 8px 32px rgba(0, 0, 0, 0.5)'
```

### Border Radius
```javascript
sm: '0.5rem'   // 8px
md: '0.75rem'  // 12px
lg: '1rem'     // 16px
xl: '1.25rem'  // 20px
2xl: '1.5rem'  // 24px
3xl: '1.75rem' // 28px
full: '9999px' // Circle
```

---

## 🔍 Comparison Matrix

| Feature | Before | After |
|---------|--------|-------|
| **Bottom Nav Background** | Flat color | Glassmorphic gradient |
| **Bottom Nav Blur** | None | 8px backdrop blur |
| **Menu Animation** | Simple fade | Bounce + stagger |
| **Active States** | Color change only | Pill + scale + shadow |
| **Touch Feedback** | None | Ripple effect |
| **Card Shadows** | Single layer | Multi-layer with inset |
| **Card Corners** | 8px | 16px |
| **Hover Effects** | Opacity | Scale + gradient overlay |
| **Badge Style** | Basic | Gradient + shadow |
| **Action Buttons** | Simple | Hover scale + background |

---

## 📱 Responsive Grid

### Breakpoints

```
Mobile:   < 768px   → 1 column
Tablet:   768-1024  → 2 columns
Desktop:  ≥ 1024px  → 3 columns
```

### Gap Sizes

```
Mobile:   gap-4 (1rem)
Tablet:   gap-5 (1.25rem)
Desktop:  gap-6 (1.5rem)
```

---

## ✅ Accessibility Features

### Visual
- ✅ High contrast ratios (WCAG AA)
- ✅ Clear focus indicators
- ✅ Large touch targets (48px+)
- ✅ Color not sole indicator

### Interactive
- ✅ Keyboard navigation
- ✅ Screen reader labels
- ✅ Touch-optimized
- ✅ Hover states

### Motion
- ✅ Smooth animations (300-350ms)
- ✅ Reduced motion support (future)
- ✅ No flashing content
- ✅ Predictable interactions

---

**Visual Guide Complete! 🎨**

Test the new UI at: **http://localhost:5174/**

Resize your browser to see responsive behavior, or test on actual mobile devices for the best experience!



