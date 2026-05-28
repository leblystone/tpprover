/**
 * Centralized unit conversion utilities for The Pep Planner.
 * 
 * See .cursor/rules/railroad.md for the full unit type reference.
 * 
 * Unit types:
 *   vial    – standard injectable peptide vial
 *   kit     – 1 kit = 10 vials (orders store kit count; stockpile stores vials)
 *   bottle  – topical/compound liquid (GHK-Cu, Lipo C) — cannot reconstitute
 *   tablets – oral pills (BPC tablets, 5-amino-1MQ) — cannot reconstitute
 */

/**
 * Get the multiplier for converting a unit to its base count.
 * Kit = 10 (1 kit = 10 vials). All others = 1.
 */
export const getUnitMultiplier = (unit) => {
  return String(unit || 'vial').toLowerCase() === 'kit' ? 10 : 1;
};

/**
 * Get the base unit after conversion.
 * Kit converts to 'vial'. Everything else stays as-is.
 */
export const getBaseUnit = (unit) => {
  return String(unit || 'vial').toLowerCase() === 'kit' ? 'vial' : (unit || 'vial');
};

/**
 * Returns true if this unit type should be converted on save.
 * Only kit converts (to vials × 10).
 */
export const isConvertibleUnit = (unit) => {
  return String(unit || '').toLowerCase() === 'kit';
};

/**
 * Can this unit type be reconstituted (mixed with bacteriostatic water)?
 * Only vials and kits (which become vials) can be reconstituted.
 * Bottles and tablets CANNOT be reconstituted — hide the water droplet.
 */
export const canReconstitute = (unit) => {
  const u = String(unit || 'vial').toLowerCase();
  return u === 'vial' || u === 'kit';
};

/**
 * Get the display label for a unit, properly pluralized.
 * @param {string} unit - The unit type
 * @param {number|string} qty - Quantity (for singular vs plural)
 * @returns {string} Display label (e.g., "vial", "vials", "bottle", "tablets")
 */
export const getUnitLabel = (unit, qty) => {
  const count = Number(qty) || 0;
  const isSingular = count === 1;
  const u = String(unit || 'vial').toLowerCase();

  const labels = {
    vial:    isSingular ? 'vial'    : 'vials',
    kit:     isSingular ? 'kit'     : 'kits',
    bottle:  isSingular ? 'bottle'  : 'bottles',
    tablets: isSingular ? 'tablet'  : 'tablets',
  };

  return labels[u] || (isSingular ? 'unit' : 'units');
};

/**
 * Get appropriate delivery methods for a given unit type.
 * @param {string} unit - The unit type
 * @returns {string[]} Array of delivery method identifiers
 */
export const getDeliveryMethods = (unit) => {
  const u = String(unit || 'vial').toLowerCase();
  if (u === 'tablets') return ['oral'];
  if (u === 'bottle') return ['topical', 'oral'];
  return ['subq', 'im', 'iv', 'nasal'];
};

/**
 * Get the suggested default delivery method for a unit type.
 * @param {string} unit - The unit type
 * @returns {string} Default delivery method
 */
export const getDefaultDeliveryMethod = (unit) => {
  const u = String(unit || 'vial').toLowerCase();
  if (u === 'tablets') return 'oral';
  if (u === 'bottle') return 'topical';
  return 'subq';
};

/**
 * Get all valid price unit options for a given stock unit type.
 * @param {string} unit - The stock unit type
 * @returns {Array<{value: string, label: string}>} Price unit options
 */
export const getPriceUnitOptions = (unit) => {
  const u = String(unit || 'vial').toLowerCase();
  const base = [
    { value: 'mg', label: 'mg' },
    { value: 'g', label: 'g' },
    { value: 'iu', label: 'IU' },
  ];

  if (u === 'tablets') {
    return [{ value: 'tablet', label: 'tablet' }, ...base];
  }
  if (u === 'bottle') {
    return [{ value: 'bottle', label: 'bottle' }, ...base];
  }
  return [{ value: 'vial', label: 'vial' }, ...base];
};

/**
 * Convert quantity and unit for storage.
 * Kits get converted to vials (qty × 10). Everything else stays as-is.
 * @param {number|string} quantity
 * @param {string} unit
 * @returns {{ quantity: number, unit: string }}
 */
export const convertForStorage = (quantity, unit) => {
  const qty = Number(quantity) || 0;
  if (isConvertibleUnit(unit)) {
    return { quantity: qty * getUnitMultiplier(unit), unit: getBaseUnit(unit) };
  }
  return { quantity: qty, unit: unit || 'vial' };
};

function getStockpileVialQtyForOrderItem(orderId, itemId) {
  if (!orderId || !itemId || typeof localStorage === 'undefined') return null;
  try {
    const stockpile = JSON.parse(localStorage.getItem('tpprover_stockpile') || '[]');
    const row = stockpile.find((s) => s?.id === `orderitem-${orderId}-${itemId}`);
    if (!row || String(row.unit || '').toLowerCase() !== 'vial') return null;
    const n = Number(row.quantity);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/**
 * Legacy orders sometimes stored vial count in quantity while unit stayed "kit".
 * Returns kit count for display, pricing, and stockpile math.
 */
export function resolveKitOrderQuantity(storedQuantity, options = {}) {
  const qty = Math.max(1, Number(storedQuantity) || 1);
  const stockpileVialQty = options.stockpileVialQty ?? null;

  if (
    stockpileVialQty != null &&
    stockpileVialQty === qty &&
    qty >= 10 &&
    qty % 10 === 0
  ) {
    return qty / 10;
  }

  if (qty > 10 && qty % 10 === 0) {
    return qty / 10;
  }

  return qty;
}

/**
 * Order-line quantity in the unit the user chose (kits are not expanded to vials).
 * @param {object} item
 * @param {{ orderId?: string, stockpileVialQty?: number }} [context]
 */
export function getOrderItemOrderQuantity(item, context = {}) {
  const unit = String(item?.unit || 'vial').toLowerCase();
  let quantity = Math.max(1, Number(item?.quantity) || 1);

  if (unit === 'kit') {
    const orderId = context.orderId ?? item.orderId ?? null;
    const stockpileVialQty =
      context.stockpileVialQty ??
      getStockpileVialQtyForOrderItem(orderId, item?.id);
    quantity = resolveKitOrderQuantity(quantity, { stockpileVialQty });
  }

  return { quantity, unit };
}

/**
 * Vial-equivalent count for mg / stockpile math (kits × 10).
 */
export function getOrderItemVialCount(item, context) {
  const { quantity, unit } = getOrderItemOrderQuantity(item, context);
  return quantity * getUnitMultiplier(unit);
}

/**
 * Human-readable order line quantity, e.g. "2 kits" or "3 vials".
 */
export function getOrderItemQuantityLabel(item, context) {
  const { quantity, unit } = getOrderItemOrderQuantity(item, context);
  return `${quantity} ${getUnitLabel(unit, quantity)}`;
}
