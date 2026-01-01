# Animation Usage Example

This document shows how to implement animations in your existing components using the `AnimatedCard` component.

## Example: Updating OrderList Component

### Before (Current Implementation)

```jsx
// src/components/orders/OrderList.jsx
export default function OrderList({ orders = [], theme, onEdit, onAdvance, onDelete, vendors = [] }) {
  return (
    <div className="space-y-4">
      {orders.map(o => (
        <div 
          key={o.id} 
          className="group relative rounded-2xl cursor-pointer..."
          onClick={() => onEdit?.(o)}
        >
          {/* Card content */}
        </div>
      ))}
    </div>
  );
}
```

### After (With Animations)

```jsx
// src/components/orders/OrderList.jsx
import { AnimatedList } from '../common/AnimatedCard';
import AnimatedCard from '../common/AnimatedCard';

export default function OrderList({ 
  orders = [], 
  theme, 
  onEdit, 
  onAdvance, 
  onDelete, 
  vendors = [],
  deletingOrderId // Add this prop from parent
}) {
  const vendorMap = useMemo(() => vendors.reduce((acc, v) => ({ ...acc, [v.id]: v.name }), {}), [vendors]);
  const [openMenuId, setOpenMenuId] = useState(null);

  if (!orders.length) {
    return <p className="text-sm" style={{ color: theme?.textLight || '#666' }}>No orders.</p>
  }

  return (
    <AnimatedList className="space-y-4">
      {orders.map((o, index) => {
        const nextStatusAction = getNextStatus(o.status);
        const vendorName = o.vendorId ? vendorMap[o.vendorId] : o.vendor;
        const isDeleting = deletingOrderId === o.id;

        return (
          <AnimatedCard
            key={o.id}
            id={o.id}
            isDeleting={isDeleting}
            animationStyle="fade-scale"
            animationDuration={300}
            enableStagger={false}
            className="group relative rounded-2xl cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:shadow-xl p-4 overflow-hidden"
            style={{ 
              backgroundColor: theme.cardBackground,
              fontFamily: 'Poppins, sans-serif',
              border: `1px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'}`,
            }}
            onClick={() => !isDeleting && onEdit?.(o)}
          >
            {/* All your existing card content here */}
            <div className="flex items-start justify-between mb-3 gap-3">
              {/* ... rest of card content ... */}
            </div>
          </AnimatedCard>
        );
      })}
    </AnimatedList>
  );
}
```

### Update Parent Component (Orders.jsx)

```jsx
// src/pages/Orders.jsx
const [deletingOrderId, setDeletingOrderId] = useState(null);

const handleDeleteOrder = async (id, retryCount = 0) => {
  // Set deleting state BEFORE removing from array
  setDeletingOrderId(id);
  
  // ... existing deletion logic ...
  
  // Clear deleting state after animation completes
  setTimeout(() => {
    setDeletingOrderId(null);
  }, 350);
};

// In render:
<OrderList 
  orders={orders}
  theme={theme}
  onEdit={handleEditOrder}
  onDelete={handleDeleteOrder}
  deletingOrderId={deletingOrderId} // Pass this prop
  vendors={vendors}
/>
```

---

## Example: Stockpile Grid

```jsx
// src/pages/Stockpile.jsx
import { AnimatedList } from '../components/common/AnimatedCard';
import AnimatedCard from '../components/common/AnimatedCard';

// In your render:
const [deletingItemId, setDeletingItemId] = useState(null);

const handleDeleteItem = async (id) => {
  setDeletingItemId(id);
  // ... deletion logic ...
  setTimeout(() => setDeletingItemId(null), 300);
};

// In your grid:
<AnimatedList className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {filteredItems.map((item, index) => (
    <AnimatedCard
      key={item.id}
      id={item.id}
      isDeleting={deletingItemId === item.id}
      animationStyle="slide-out"
      animationDuration={250}
      enableStagger={true}
      staggerIndex={index}
      layoutAnimation={true}
    >
      <StockpileCard 
        item={item} 
        theme={theme} 
        onEdit={handleEdit}
      />
    </AnimatedCard>
  ))}
</AnimatedList>
```

---

## Example: Recon Items List

```jsx
// src/pages/Recon.jsx
import { AnimatedList } from '../components/common/AnimatedCard';
import AnimatedCard from '../components/common/AnimatedCard';

const [deletingItemId, setDeletingItemId] = useState(null);

const handleDelete = async (id) => {
  setDeletingItemId(id);
  
  // ... existing deletion logic ...
  
  setTimeout(() => {
    setDeletingItemId(null);
  }, 300);
};

// In render:
<AnimatedList className="space-y-3">
  {reconItems.map((item, index) => (
    <AnimatedCard
      key={item.id}
      id={item.id}
      isDeleting={deletingItemId === item.id}
      animationStyle="collapse"
      animationDuration={300}
      className="overflow-hidden"
    >
      {/* Your recon item content */}
    </AnimatedCard>
  ))}
</AnimatedList>
```

---

## Quick Reference

### Animation Styles Available:
- `'fade-scale'` - Fades out while scaling down (gentle, recommended)
- `'slide-out'` - Slides out to the right while fading
- `'collapse'` - Collapses height to 0 while fading
- `'shrink'` - Shrinks horizontally while fading

### Props:
- `id` - Required: Unique identifier
- `isDeleting` - Required: Boolean indicating if item is being deleted
- `animationStyle` - Optional: One of the styles above (default: 'fade-scale')
- `animationDuration` - Optional: Duration in ms (default: 300)
- `enableStagger` - Optional: Enable stagger effect (default: false)
- `staggerIndex` - Optional: Index for stagger calculation
- `layoutAnimation` - Optional: Enable layout animations (default: true)
- `className` - Optional: Additional CSS classes
- `style` - Optional: Inline styles
- `onClick` - Optional: Click handler

---

## Tips

1. **Always set `isDeleting` BEFORE removing from array** - This ensures the animation plays
2. **Use `AnimatedList` wrapper** - Handles `AnimatePresence` automatically
3. **Match animation duration** - Clear the `deletingItemId` state after animation completes
4. **Test on mobile** - Ensure animations are smooth on lower-end devices
5. **Consider user preferences** - Respect `prefers-reduced-motion` if needed

