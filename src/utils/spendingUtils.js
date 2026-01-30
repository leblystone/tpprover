/**
 * Shared spending logic for SpendingWidget and SpendingDetailModal.
 * Builds a unified list of "spend lines" from orders and stockpile (with dedup).
 */

/**
 * @typedef {Object} SpendLine
 * @property {string} vendor
 * @property {string} peptide
 * @property {string|null} date - ISO date string or null
 * @property {number} amount
 * @property {'order'|'stockpile'} source
 * @property {string} [orderId] - for order lines
 * @property {string} [label] - e.g. "Shipping" for shipping-only lines
 */

/**
 * Build unified spend lines from orders and stockpile.
 * Matches SpendingWidget cost rules: order.items vs legacy order.cost, includeShipping from settings, stockpile dedup by orderId.
 *
 * @param {Array} orders - tpprover_orders
 * @param {Array} stockpile - tpprover_stockpile
 * @param {{ orders?: { includeShippingInCosts?: boolean } }} [settings] - tpprover_settings
 * @returns {SpendLine[]}
 */
export function buildSpendLines(orders, stockpile, settings = {}) {
  const includeShipping = settings?.orders?.includeShippingInCosts ?? true;
  const ordersWithCosts = new Set();
  const lines = [];

  // Process orders
  (orders || []).forEach((order) => {
    let itemsCost = 0;
    if (order.items && order.items.length > 0) {
      itemsCost = order.items.reduce((sum, item) => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity, 10) || 1;
        return sum + price * quantity;
      }, 0);
    } else if (order.cost) {
      itemsCost = parseFloat(String(order.cost).replace(/[^0-9.]/g, '')) || 0;
    }

    const shippingCost = includeShipping ? (parseFloat(order.shippingCost) || 0) : 0;
    const totalCost = itemsCost + shippingCost;
    const orderDate = order.date ? new Date(order.date) : null;
    const dateStr = orderDate ? orderDate.toISOString().slice(0, 10) : null;
    const vendor = order.vendor || 'Unknown';

    if (totalCost <= 0) return;

    ordersWithCosts.add(order.id);

    if (order.items && order.items.length > 0) {
      // New structure: one line per item; allocate shipping proportionally
      const itemTotal = itemsCost || 1;
      order.items.forEach((item) => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity, 10) || 1;
        const itemCost = price * quantity;
        const proportion = itemTotal > 0 ? itemCost / itemTotal : 0;
        const allocatedShipping = shippingCost * proportion;
        const amount = itemCost + allocatedShipping;
        lines.push({
          vendor,
          peptide: item.name || 'Unknown',
          date: dateStr,
          amount,
          source: 'order',
          orderId: order.id,
        });
      });
    } else {
      // Legacy: single line per order
      lines.push({
        vendor,
        peptide: order.peptide || 'Unknown',
        date: dateStr,
        amount: totalCost,
        source: 'order',
        orderId: order.id,
      });
    }
  });

  // Process stockpile: only lines not already represented by an order with cost
  (stockpile || []).forEach((stockItem) => {
    const orderId = stockItem.orderId;
    const costPerVial = parseFloat(stockItem.cost) || 0;
    const quantity = parseFloat(stockItem.quantity) || 0;
    const stockItemTotal = costPerVial * quantity;
    if (stockItemTotal <= 0) return;

    const linkedOrderHasCost = orderId && ordersWithCosts.has(orderId);
    if (linkedOrderHasCost) return;

    const purchaseDate = stockItem.purchaseDate ? new Date(stockItem.purchaseDate) : null;
    const dateStr = purchaseDate ? purchaseDate.toISOString().slice(0, 10) : null;
    lines.push({
      vendor: stockItem.vendor || 'Unknown',
      peptide: stockItem.name || 'Unknown',
      date: dateStr,
      amount: stockItemTotal,
      source: 'stockpile',
    });
  });

  return lines;
}

/**
 * Filter spend lines by vendor, peptide, and date range.
 *
 * @param {SpendLine[]} lines
 * @param {{ vendor?: string, peptide?: string, dateRange?: string }} filters - dateRange: 'last30'|'last90'|'lastMonth'|'all'
 * @returns {SpendLine[]}
 */
export function filterSpendLines(lines, filters = {}) {
  let result = lines;

  if (filters.vendor && filters.vendor !== '') {
    result = result.filter((l) => (l.vendor || '').toLowerCase() === (filters.vendor || '').toLowerCase());
  }
  if (filters.peptide && filters.peptide !== '') {
    result = result.filter((l) => (l.peptide || '').toLowerCase() === (filters.peptide || '').toLowerCase());
  }
  if (filters.dateRange && filters.dateRange !== 'all') {
    const now = new Date();
    let cutoff = null;
    if (filters.dateRange === 'last30') {
      cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 30);
    } else if (filters.dateRange === 'last90') {
      cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 90);
    } else if (filters.dateRange === 'lastMonth') {
      cutoff = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      result = result.filter((l) => {
        if (!l.date) return false;
        const d = new Date(l.date);
        return d >= cutoff && d <= lastMonthEnd;
      });
      return result;
    }
    if (cutoff) {
      result = result.filter((l) => {
        if (!l.date) return false;
        return new Date(l.date) >= cutoff;
      });
    }
  }

  return result;
}

/**
 * Get unique vendors and peptides from spend lines (for filter dropdowns).
 *
 * @param {SpendLine[]} lines
 * @returns {{ vendors: string[], peptides: string[] }}
 */
export function getUniqueVendorsAndPeptides(lines) {
  const vendors = [...new Set(lines.map((l) => l.vendor || 'Unknown').filter(Boolean))].sort();
  const peptides = [...new Set(lines.map((l) => l.peptide || 'Unknown').filter(Boolean))].sort();
  return { vendors, peptides };
}
