# Animation/Transition Suggestions for Deleted Items & Cards

## Overview
This document provides animation suggestions for deleted items and cards throughout **The Pep Planner** application. The app already has **Framer Motion** installed, which provides powerful animation capabilities.

---

## 🎯 Recommended Approaches

### **Option 1: Framer Motion (Recommended)**
Best for: Smooth, performant animations with layout transitions

### **Option 2: CSS/Tailwind Animations**
Best for: Simple fade/slide animations without layout shifts

### **Option 3: Hybrid Approach**
Best for: Combining Framer Motion for complex animations with CSS for simple transitions

---

## 🎨 Animation Styles

### **Style 1: Fade & Scale Out (Gentle)**
- Card fades out while slightly scaling down
- Remaining items smoothly slide up
- **Duration**: 300-400ms
- **Best for**: Most deletion scenarios

### **Style 2: Slide Out (Directional)**
- Card slides out to the right/left while fading
- Remaining items collapse smoothly
- **Duration**: 250-350ms
- **Best for**: List views, order cards

### **Style 3: Collapse & Fade (Compact)**
- Card height collapses to 0 while fading
- Other items smoothly reposition
- **Duration**: 300ms
- **Best for**: Dense lists, grid views

### **Style 4: Shrink & Fade (Subtle)**
- Card shrinks horizontally while fading
- Creates a "squeeze" effect
- **Duration**: 250ms
- **Best for**: Sidebar items, compact views

---

## 💻 Implementation Examples

### **Example 1: OrderList with Framer Motion**

```jsx
import { motion, AnimatePresence } from 'framer-motion';

export default function OrderList({ orders = [], theme, onEdit, onAdvance, onDelete, vendors = [], deletingOrderId }) {
  const vendorMap = useMemo(() => vendors.reduce((acc, v) => ({ ...acc, [v.id]: v.name }), {}), [vendors]);
  const [openMenuId, setOpenMenuId] = useState(null);

  if (!orders.length) {
    return <p className="text-sm" style={{ color: theme?.textLight || '#666' }}>No orders.</p>
  }

  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {orders.map((o, index) => {
          const nextStatusAction = getNextStatus(o.status);
          const vendorName = o.vendorId ? vendorMap[o.vendorId] : o.vendor;
          const isDeleting = deletingOrderId === o.id;

          return (
            <motion.div
              key={o.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ 
                opacity: isDeleting ? 0 : 1, 
                y: 0, 
                scale: isDeleting ? 0.9 : 1,
                height: isDeleting ? 0 : 'auto',
                marginBottom: isDeleting ? 0 : undefined
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.8, 
                height: 0,
                marginBottom: 0,
                transition: { duration: 0.3, ease: 'easeInOut' }
              }}
              transition={{ 
                layout: { duration: 0.3, ease: 'easeInOut' },
                opacity: { duration: 0.2 }
              }}
              className="group relative rounded-2xl cursor-pointer overflow-hidden"
              style={{ 
                backgroundColor: theme.cardBackground,
                fontFamily: 'Poppins, sans-serif',
                border: `1px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'}`,
              }}
              onClick={() => !isDeleting && onEdit?.(o)}
            >
              {/* Rest of card content */}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
```

### **Example 2: Stockpile Cards with Stagger Animation**

```jsx
import { motion, AnimatePresence } from 'framer-motion';

export default function StockpileGrid({ items = [], theme, onEdit, onDelete, deletingItemId }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => {
          const isDeleting = deletingItemId === item.id;
          
          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ 
                opacity: isDeleting ? 0 : 1,
                scale: isDeleting ? 0.85 : 1,
                y: 0
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.8,
                x: 100, // Slide out to right
                transition: { duration: 0.25 }
              }}
              transition={{ 
                layout: { duration: 0.3 },
                opacity: { duration: 0.2 },
                delay: index * 0.03 // Stagger effect
              }}
              style={{ originX: 0.5, originY: 0.5 }}
            >
              <StockpileCard 
                item={item} 
                theme={theme} 
                onEdit={onEdit}
                isDeleting={isDeleting}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
```

### **Example 3: CSS-Only Solution (Tailwind)**

Add to `tailwind.config.js`:

```js
keyframes: {
  'fade-out-scale': {
    '0%': { opacity: '1', transform: 'scale(1)' },
    '100%': { opacity: '0', transform: 'scale(0.9)' },
  },
  'slide-out-right': {
    '0%': { opacity: '1', transform: 'translateX(0)' },
    '100%': { opacity: '0', transform: 'translateX(100%)' },
  },
  'collapse': {
    '0%': { opacity: '1', maxHeight: '500px', marginBottom: '1rem' },
    '100%': { opacity: '0', maxHeight: '0', marginBottom: '0' },
  },
},
animation: {
  'fade-out-scale': 'fade-out-scale 0.3s ease-in-out forwards',
  'slide-out-right': 'slide-out-right 0.25s ease-in-out forwards',
  'collapse': 'collapse 0.3s ease-in-out forwards',
},
```

Usage in component:

```jsx
<div 
  className={`transition-all duration-300 ${
    isDeleting ? 'animate-fade-out-scale pointer-events-none' : ''
  }`}
  style={{ 
    opacity: isDeleting ? 0 : 1,
    transform: isDeleting ? 'scale(0.9)' : 'scale(1)'
  }}
>
  {/* Card content */}
</div>
```

### **Example 4: Recon Items with Slide Animation**

```jsx
import { motion, AnimatePresence } from 'framer-motion';

export default function ReconItemList({ items = [], theme, onDelete, deletingItemId }) {
  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {items.map((item) => {
          const isDeleting = deletingItemId === item.id;
          
          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ 
                opacity: isDeleting ? 0 : 1,
                x: isDeleting ? 50 : 0,
                height: isDeleting ? 0 : 'auto',
                marginBottom: isDeleting ? 0 : undefined
              }}
              exit={{ 
                opacity: 0,
                x: 100,
                height: 0,
                transition: { duration: 0.25, ease: 'easeIn' }
              }}
              transition={{ 
                layout: { duration: 0.3 },
                opacity: { duration: 0.15 }
              }}
              className="overflow-hidden"
            >
              {/* Item content */}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
```

---

## 🔧 Integration Steps

### **Step 1: Update Component to Track Deletion State**

```jsx
// In Orders.jsx, Recon.jsx, etc.
const [deletingItemId, setDeletingItemId] = useState(null);

const handleDelete = async (id) => {
  setDeletingItemId(id); // Set before deletion
  
  // ... existing deletion logic ...
  
  // Clear after animation completes
  setTimeout(() => {
    setDeletingItemId(null);
  }, 350); // Match animation duration
};
```

### **Step 2: Wrap List Container with AnimatePresence**

```jsx
import { AnimatePresence } from 'framer-motion';

<div className="space-y-4">
  <AnimatePresence mode="popLayout">
    {items.map(item => (
      // Card component
    ))}
  </AnimatePresence>
</div>
```

### **Step 3: Convert Card to motion.div**

```jsx
import { motion } from 'framer-motion';

// Change from:
<div key={item.id} className="...">

// To:
<motion.div 
  key={item.id}
  layout
  initial={{ opacity: 0, y: -10 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, scale: 0.9 }}
  transition={{ duration: 0.3 }}
  className="..."
>
```

---

## 🎛️ Animation Variants (Framer Motion)

### **Variant 1: Gentle Fade**

```jsx
const cardVariants = {
  initial: { opacity: 0, y: -10, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { 
    opacity: 0, 
    scale: 0.9, 
    height: 0,
    transition: { duration: 0.3 }
  }
};

<motion.div
  variants={cardVariants}
  initial="initial"
  animate="animate"
  exit="exit"
  layout
>
```

### **Variant 2: Slide Out**

```jsx
const slideVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { 
    opacity: 0, 
    x: 100,
    transition: { duration: 0.25, ease: 'easeIn' }
  }
};
```

### **Variant 3: Collapse**

```jsx
const collapseVariants = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' },
  exit: { 
    opacity: 0, 
    height: 0,
    marginBottom: 0,
    transition: { duration: 0.3 }
  }
};
```

---

## 📱 Performance Considerations

1. **Use `layout` prop** for smooth repositioning of remaining items
2. **Use `AnimatePresence` with `mode="popLayout"`** to prevent layout jumps
3. **Keep animation durations** between 200-400ms for snappy feel
4. **Use `will-change` CSS property** for better performance (Framer Motion handles this)
5. **Avoid animating too many properties** simultaneously on low-end devices

---

## 🎨 Recommended Settings by Use Case

| Use Case | Animation Style | Duration | Easing |
|----------|----------------|----------|--------|
| Order Cards | Fade & Scale Out | 300ms | easeInOut |
| Stockpile Grid | Slide Out Right | 250ms | easeIn |
| Recon Items | Collapse & Fade | 300ms | easeInOut |
| Wishlist Items | Shrink & Fade | 250ms | easeIn |
| Protocol Cards | Fade & Scale | 350ms | easeOut |

---

## 🚀 Quick Start

1. **Choose your style** from the examples above
2. **Import Framer Motion** in your component
3. **Add `deletingItemId` state** to track which item is being deleted
4. **Wrap list with `AnimatePresence`**
5. **Convert cards to `motion.div`** with appropriate props
6. **Test and adjust** timing/easing to match your app's feel

---

## 💡 Pro Tips

- **Stagger animations** for multiple deletions: Add `delay: index * 0.05` to transition
- **Add haptic feedback** on mobile when deletion starts
- **Show loading state** during deletion animation
- **Consider undo functionality** - pause animation if user wants to undo
- **Match animation style** to your app's overall design language

---

## 🔄 Undo Functionality Integration

If you want to support undo during animation:

```jsx
const [deletingItemId, setDeletingItemId] = useState(null);
const [undoItem, setUndoItem] = useState(null);

const handleDelete = async (id) => {
  const item = items.find(i => i.id === id);
  setDeletingItemId(id);
  setUndoItem(item); // Store for potential undo
  
  // Wait for animation, then actually delete
  setTimeout(async () => {
    if (deletingItemId === id) { // Not undone
      await performDeletion(id);
      setUndoItem(null);
    }
  }, 300);
};

const handleUndo = () => {
  setDeletingItemId(null);
  // Restore item
  setUndoItem(null);
};
```

---

## 📝 Notes

- All examples use **Framer Motion v12** (already in your dependencies)
- Animations are designed to be **non-blocking** and **performant**
- Consider **reduced motion** preferences: Use `prefers-reduced-motion` media query
- Test on **mobile devices** to ensure smooth performance




