import { generateId } from './string';

/**
 * Build a partial order payload for OrderDetailsModal (new order) from a wishlist row.
 */
export function buildOrderPrefillFromWishlistItem(item) {
  if (!item) return null;
  const name = (item.name || item.item || '').trim();
  return {
    /** Isolates order draft autosave from generic `order_form_new` so prefills are not overwritten. */
    prefillSourceId: item.id != null ? `wishlist-${String(item.id)}` : `wishlist-${Date.now()}`,
    vendor: (item.vendor || item.supplier || '').trim(),
    notes: (item.notes || item.description || '').trim(),
    items: [
      {
        id: generateId(),
        name,
        quantity: 1,
        unit: 'vial',
        price: item.price != null && item.price !== '' ? String(item.price) : '',
        mg: item.mgAmount != null && item.mgAmount !== '' ? String(item.mgAmount) : '',
        mgUnit: (item.mgUnit || 'mg').toLowerCase(),
      },
    ],
  };
}

/**
 * Shape consumed by AddToStockpileBottomSheet `wishlistPrefill` (new entry, not editItem).
 */
export function buildStockpilePrefillFromWishlistItem(item) {
  if (!item) return null;
  return {
    name: (item.name || item.item || '').trim(),
    vendor: (item.vendor || item.supplier || '').trim(),
    cost: item.price != null && item.price !== '' ? String(item.price) : '',
    mg: item.mgAmount != null && item.mgAmount !== '' ? String(item.mgAmount) : '',
    mgUnit: (item.mgUnit || 'mg').toLowerCase(),
    quantity: '1',
    unit: 'vial',
  };
}
