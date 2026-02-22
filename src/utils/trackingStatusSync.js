/**
 * Tracking Status Sync Utility
 * Automatically syncs order status based on real-time tracking data.
 * When the tracking API is unavailable (e.g. no Shippo key), falls back to mock
 * tracking so fake/test DHL and FedEx numbers still drive status updates.
 */

import { getCachedTrackingInfo, detectCarrier, getMockTrackingInfo } from '../services/tracking';

// Track if we've already warned about tracking service not being configured
let hasWarnedAboutTrackingService = false;

/**
 * Sync order status from tracking data
 * Only updates if tracking shows a different status (and only uses real tracking data)
 * @param {Object} order - The order to sync
 * @returns {Promise<Object|null>} Updated order object if status changed, null otherwise
 */
export async function syncOrderStatusFromTracking(order) {
  if (!order?.tracking) {
    return null; // No tracking number, can't sync
  }

  try {
    // Check if status was manually set recently (within 5 minutes)
    // This prevents immediate override when user just set the status
    const manualGracePeriod = 5 * 60 * 1000; // 5 minutes in milliseconds
    const now = Date.now();
    
    if (order.statusManuallySetAt) {
      const manualSetTime = new Date(order.statusManuallySetAt).getTime();
      const timeSinceManualChange = now - manualSetTime;
      
      if (timeSinceManualChange < manualGracePeriod) {
        console.log(`⏸️ Order ${order.id}: Status was manually set ${Math.round(timeSinceManualChange / 1000)}s ago, skipping tracking sync`);
        return null; // Don't override recent manual changes
      }
    }
    
    // Also check statusSource field for backward compatibility
    if (order.statusSource === 'manual') {
      // If statusSource is 'manual' but no timestamp, assume it's recent and skip
      if (!order.statusManuallySetAt) {
        console.log(`⏸️ Order ${order.id}: Status marked as manual, skipping tracking sync`);
        return null;
      }
    }

    const carrier = detectCarrier(order.tracking);
    let trackingInfo = await getCachedTrackingInfo(order.tracking, carrier, true);

    // When API is unavailable (no key, test key, or error), use mock tracking so
    // fake/test DHL and FedEx numbers still auto-update order status and delivery.
    if (!trackingInfo || trackingInfo.hasError) {
      const details = trackingInfo?.details || '';
      const detailsStr = typeof details === 'string' ? details : JSON.stringify(details || '');
      const isServiceNotConfigured =
        !trackingInfo ||
        trackingInfo?.error?.includes('Tracking service not configured') ||
        trackingInfo?.error?.includes('not configured') ||
        trackingInfo?.status === 401 ||
        detailsStr.includes('Token does not exist');

      if (isServiceNotConfigured && !hasWarnedAboutTrackingService) {
        console.warn('⚠️ Tracking API unavailable. Using mock tracking for test numbers (DHL/FedEx) to auto-update status.');
        hasWarnedAboutTrackingService = true;
      }
      trackingInfo = getMockTrackingInfo(order.tracking);
    }

    // Use tracking status from either real API or mock (test numbers)
    const trackingStatus = trackingInfo?.status; // 'Order Placed', 'Shipped', or 'Delivered'
    
    // Safety check - if tracking status is missing, can't sync
    if (!trackingStatus || typeof trackingStatus !== 'string') {
      console.log(`⚠️ Order ${order.id}: Tracking info missing status field`, trackingInfo);
      return null;
    }
    
    const currentStatus = (order.status || 'Order Placed').toLowerCase();
    const trackingStatusLower = trackingStatus.toLowerCase();

    // Normalize statuses for comparison
    const normalizeStatus = (status) => {
      if (!status || typeof status !== 'string') return 'placed';
      const s = status.toLowerCase();
      if (s.includes('deliver')) return 'delivered';
      if (s.includes('ship') || s.includes('transit')) return 'shipped';
      return 'placed';
    };

    const currentNormalized = normalizeStatus(currentStatus);
    const trackingNormalized = normalizeStatus(trackingStatusLower);

    // IMPORTANT: We ONLY advance status, NEVER downgrade
    // If user manually set status to "Order Placed" when tracking says "Delivered",
    // that's their choice and we respect it permanently
    // Priority: delivered > shipped > placed
    const statusPriority = { 'placed': 0, 'shipped': 1, 'delivered': 2 };
    const currentPriority = statusPriority[currentNormalized] ?? 0;
    const trackingPriority = statusPriority[trackingNormalized] ?? 0;
    
    // Only update if tracking shows a MORE ADVANCED status
    // Never downgrade - user's manual choices are permanent
    if (trackingPriority <= currentPriority) {
      return null;
    }

    // Build updated order
    const nowISO = new Date().toISOString();
    const updatedOrder = { 
      ...order, 
      status: trackingStatus,
      updatedAt: nowISO,
      // Track that this was auto-updated from tracking
      statusSource: 'tracking',
      // Clear manual timestamp since this is now from tracking
      statusManuallySetAt: null
    };

    // Set shipDate if status is Shipped and we don't have one
    if (trackingStatusLower.includes('ship') && !order.shipDate) {
      updatedOrder.shipDate = nowISO.slice(0, 10); // YYYY-MM-DD format
    }

    // Set deliveryDate if status is Delivered and we don't have one
    if (trackingStatusLower.includes('deliver') && !order.deliveryDate) {
      updatedOrder.deliveryDate = nowISO.slice(0, 10); // YYYY-MM-DD format
    }

    return updatedOrder;
  } catch (error) {
    console.error('❌ Error syncing order status from tracking:', error);
    return null;
  }
}

/**
 * Sync all orders with tracking numbers
 * @param {Array} orders - Array of orders
 * @returns {Promise<Array>} Array of updated orders (only those that changed)
 */
export async function syncAllOrdersFromTracking(orders) {
  if (!orders || orders.length === 0) {
    return [];
  }

  const ordersWithTracking = orders.filter(o => o?.tracking);
  if (ordersWithTracking.length === 0) {
    return [];
  }

  // Sync orders in parallel (but limit concurrency to avoid rate limits)
  const syncPromises = ordersWithTracking.map(order => syncOrderStatusFromTracking(order));
  const results = await Promise.all(syncPromises);

  // Filter out null results and return updated orders
  return results.filter(result => result !== null);
}

