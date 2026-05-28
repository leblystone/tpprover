/**
 * Shared order → stockpile sync.
 * When an order's status changes (e.g. to Delivered), update stockpile so
 * incoming peptides from orders stay in sync. Used by Orders page, Stockpile page,
 * and AppContext global tracking sync.
 */

import { syncOrderDocumentationToStockpile } from './documentationSync';
import { prepareItemForSave } from './userDataSave';
import { getOrderItemOrderQuantity, getOrderItemVialCount, getUnitMultiplier } from './unitConversion';

/**
 * Apply order status changes to stockpile: add items when delivered,
 * update when order details change while delivered, remove when no longer delivered.
 * @param {Object} previousOrder - Order before the update
 * @param {Object} newOrder - Order after the update (e.g. from tracking sync)
 * @param {Function} setStockpile - React setState for stockpile (updater function)
 */
export function applyOrderToStockpile(previousOrder, newOrder, setStockpile) {
  if (!newOrder) return;

  const prevStatus = (previousOrder?.status || '').toLowerCase();
  const newStatus = (newOrder?.status || '').toLowerCase();
  const wasDelivered = prevStatus.includes('delivered');
  const isDelivered = newStatus.includes('delivered');

  const settings = JSON.parse(localStorage.getItem('tpprover_settings') || '{}');
  const includeShipping = settings.orders?.includeShippingInCosts ?? true;

  function buildStockItems(order) {
    const orderCtx = { orderId: order.id };
    return (order.items || []).map((item) => {
      const { quantity: orderQty } = getOrderItemOrderQuantity(item, orderCtx);
      const vialCount = getOrderItemVialCount(item, orderCtx);
      const price = Number(item.price) || 0;
      let costPerVial;
      if (includeShipping) {
        const shippingCost = parseFloat(order.shippingCost) || 0;
        const totalOrderCost = (order.items || []).reduce(
          (sum, orderItem) => {
            const orderItemPrice = parseFloat(orderItem.price) || 0;
            const { quantity: lineQty } = getOrderItemOrderQuantity(orderItem, orderCtx);
            return sum + orderItemPrice * lineQty;
          },
          0
        ) + shippingCost;
        const itemCostShare =
          totalOrderCost > 0
            ? (price * orderQty) / (totalOrderCost - shippingCost)
            : 1;
        const itemShippingShare = shippingCost * itemCostShare;
        const totalItemCost = price * orderQty + itemShippingShare;
        costPerVial =
          vialCount > 1 ? totalItemCost / vialCount : totalItemCost;
      } else {
        const perContainer = getUnitMultiplier(item.unit);
        costPerVial = perContainer > 1 ? price / perContainer : price;
      }
      return prepareItemForSave({
        id: `orderitem-${order.id}-${item.id}`,
        name: item.name || '',
        mg: item.mg || '',
        mgUnit: item.mgUnit || 'mg',
        quantity: vialCount,
        unit: 'vial',
        cost: costPerVial,
        costPerMg: item.costPerMg || '',
        vendor: order.vendor || '',
        vendorId: order.vendorId,
        purchaseDate: order.date,
        notes: `From order #${order.publicOrderNumber ?? order.id}`,
        orderId: order.id,
      }, { isNew: true });
    });
  }

  // Both delivered: replace this order's stockpile items with updated ones
  if (wasDelivered && isDelivered && previousOrder && newOrder) {
    const orderIdPrefix = `orderitem-${newOrder.id}-`;
    setStockpile((prev) =>
      prev.filter((stockItem) => {
        const itemId = stockItem?.id;
        if (!itemId || typeof itemId !== 'string') return true;
        return !itemId.startsWith(orderIdPrefix);
      })
    );
    const updatedStockItems = buildStockItems(newOrder);
    setStockpile((prev) => [...prev, ...updatedStockItems]);
    return;
  }

  // Status changed TO Delivered: add items to stockpile
  if (!wasDelivered && isDelivered) {
    if (!newOrder.items || newOrder.items.length === 0) return;
    const newStockItems = buildStockItems(newOrder);
    const stockItemsWithDocs = syncOrderDocumentationToStockpile(
      newOrder,
      newStockItems
    );
    setStockpile((prev) => [...prev, ...stockItemsWithDocs]);
    return;
  }

  // Status changed FROM Delivered: remove this order's items from stockpile
  if (wasDelivered && !isDelivered && previousOrder) {
    const orderIdPrefix = `orderitem-${previousOrder.id}-`;
    setStockpile((prev) =>
      prev.filter((stockItem) => {
        const itemId = stockItem?.id;
        if (!itemId || typeof itemId !== 'string') return true;
        return !itemId.startsWith(orderIdPrefix);
      })
    );
  }
}
