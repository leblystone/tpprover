/**
 * Documentation Sync Utility
 * Handles syncing documentation from Orders to Stockpile automatically
 */

/**
 * Sync documentation from an order to its corresponding stockpile items
 * Called when an order status changes to "Delivered"
 * @param {Object} order - The order object with documentation
 * @param {Array} stockpileItems - Array of stockpile items created from this order
 */
export function syncOrderDocumentationToStockpile(order, stockpileItems) {
  if (!order.attachments || order.attachments.length === 0) {
    return stockpileItems; // No documentation to sync
  }

  // Add "synced" documentation to each stockpile item
  const syncedItems = stockpileItems.map(item => {
    // Only sync if this item came from the order
    if (item.orderId !== order.id) {
      return item;
    }

    // Filter documentation relevant to this specific peptide
    const relevantDocs = order.attachments.filter(doc => {
      // If doc title contains peptide name, it's relevant
      const titleLower = doc.title.toLowerCase();
      const peptideName = item.name.toLowerCase();
      
      // Check if documentation is specifically for this peptide or general order docs
      return titleLower.includes(peptideName) || 
             titleLower.includes('coa') || 
             titleLower.includes('certificate') ||
             titleLower.includes('order') ||
             titleLower.includes('batch') ||
             doc.notes?.toLowerCase().includes(peptideName);
    });

    // If no specific docs found, include all order documentation
    const docsToSync = relevantDocs.length > 0 ? relevantDocs : order.attachments;

    // Convert order documentation to stockpile format
    const syncedDocs = docsToSync.map(doc => ({
      ...doc,
      id: `synced-${doc.id}-${item.id}`, // New ID to avoid conflicts
      source: 'synced',
      syncedFrom: 'order',
      orderId: order.id,
      syncDate: new Date().toISOString()
    }));

    return {
      ...item,
      documentation: [...(item.documentation || []), ...syncedDocs]
    };
  });

  return syncedItems;
}

/**
 * Get documentation that should be displayed in stockpile
 * Separates synced (from orders) and manual (added to stockpile) documentation
 * @param {Array} documentation - All documentation for a stockpile item
 */
export function categorizeStockpileDocumentation(documentation = []) {
  const synced = documentation.filter(doc => doc.source === 'synced');
  const manual = documentation.filter(doc => doc.source !== 'synced');

  return { synced, manual };
}

/**
 * Create a summary of what documentation will be synced
 * Used for showing user preview before syncing
 * @param {Object} order - Order with documentation
 * @param {Array} stockpileItems - Items that will receive the documentation
 */
export function getDocumentationSyncPreview(order, stockpileItems) {
  if (!order.attachments || order.attachments.length === 0) {
    return null;
  }

  const preview = {
    orderDocumentationCount: order.attachments.length,
    affectedStockpileItems: stockpileItems.length,
    documentationTypes: {
      images: order.attachments.filter(doc => doc.type === 'image').length,
      links: order.attachments.filter(doc => doc.type === 'link').length
    },
    totalSyncedDocuments: order.attachments.length * stockpileItems.length
  };

  return preview;
}

/**
 * Remove synced documentation when an order is deleted or status changes away from delivered
 * @param {string} orderId - ID of the order being removed/changed
 * @param {Array} stockpileItems - Current stockpile items
 */
export function removeSyncedDocumentation(orderId, stockpileItems) {
  return stockpileItems.map(item => {
    if (!item.documentation) return item;

    // Remove any documentation that was synced from this order
    const filteredDocs = item.documentation.filter(doc => 
      !(doc.source === 'synced' && doc.orderId === orderId)
    );

    return {
      ...item,
      documentation: filteredDocs.length > 0 ? filteredDocs : undefined
    };
  });
}

/**
 * Update synced documentation when order documentation changes
 * @param {Object} updatedOrder - Order with updated documentation
 * @param {Array} stockpileItems - Current stockpile items
 */
export function updateSyncedDocumentation(updatedOrder, stockpileItems) {
  // First remove old synced docs from this order
  const withoutOldSync = removeSyncedDocumentation(updatedOrder.id, stockpileItems);
  
  // Then add updated synced docs if order is still delivered
  if (updatedOrder.status?.toLowerCase().includes('delivered')) {
    const itemsFromThisOrder = withoutOldSync.filter(item => item.orderId === updatedOrder.id);
    return syncOrderDocumentationToStockpile(updatedOrder, itemsFromThisOrder);
  }
  
  return withoutOldSync;
}

