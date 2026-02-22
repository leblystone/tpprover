/**
 * Shipment Tracking Service
 * Integrates with Shippo API for real-time USPS/UPS tracking via Firebase Functions
 */

import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';

// Initialize Firebase Functions
const functions = getFunctions();

// Only warn once when Shippo token isn't configured (avoids console spam)
let hasWarnedTokenNotConfigured = false;

/**
 * Check if error indicates Shippo API key is not configured
 */
function isShippoTokenNotConfigured(resultOrError) {
  if (!resultOrError) return false;
  const details = typeof resultOrError.details === 'string'
    ? resultOrError.details
    : JSON.stringify(resultOrError.details || '');
  const status = resultOrError.status;
  return (
    status === 401 ||
    details.includes('Token does not exist')
  );
}

/**
 * Get tracking information for a shipment
 * Uses Firebase Cloud Function to proxy Shippo API requests (avoids CORS issues)
 * @param {string} trackingNumber - The tracking number
 * @param {string} carrier - The carrier (usps, ups, fedex, etc.)
 * @returns {Promise<Object>} Tracking information
 */
export async function getTrackingInfo(trackingNumber, carrier = 'usps') {
    if (!trackingNumber) {
        return { error: 'No tracking number provided' };
    }

    try {
        // Check if Functions are available
        if (!functions) {
            console.error('🚫 Firebase Functions not initialized');
            return { 
                error: 'Firebase Functions not initialized - tracking service unavailable',
                hasError: true
            };
        }

        // Call Firebase Cloud Function to proxy Shippo API request
        const getTrackingInfoFn = httpsCallable(functions, 'getTrackingInfo');
        
        const result = await getTrackingInfoFn({
            trackingNumber,
            carrier: carrier.toLowerCase()
        });

        // Check if the function returned an error
        if (result.data.error) {
            // Suppress repetitive logs when Shippo API key isn't configured (401 "Token does not exist")
            if (isShippoTokenNotConfigured(result.data)) {
                if (!hasWarnedTokenNotConfigured) {
                    hasWarnedTokenNotConfigured = true;
                    console.warn('⚠️ Tracking: Shippo API key not configured. To enable order tracking: set SHIPPO_API_KEY in Firebase Functions secrets.');
                }
            } else {
                console.error('❌ Tracking API error:', result.data);
            }
            return { 
                error: result.data.error || 'Failed to fetch tracking information',
                hasError: true,
                details: result.data.details || result.data.message,
                status: result.data.status
            };
        }

        // Parse Shippo response into our format
        if (result.data.success && result.data.data) {
            return parseTrackingData(result.data.data);
        } else {
            // Unexpected response format - return error instead of mock data
            console.error('⚠️ Unexpected response format from tracking API:', result.data);
            return { 
                error: 'Unexpected response format from tracking service',
                hasError: true
            };
        }
    } catch (error) {
        console.error('❌ Tracking API error:', error);
        
        // Check if this is a "function not deployed" error
        if (error.code === 'functions/not-found' || error.message?.includes('INTERNAL') || error.message?.includes('not-found')) {
            console.error('🚫 Firebase Functions not deployed - tracking service unavailable');
            return { 
                error: 'Tracking service not available. Please ensure Firebase Functions are deployed.',
                hasError: true,
                code: error.code
            };
        }
        
        // Return the actual error instead of mock data
        return { 
            error: error.message || 'Network error while fetching tracking information',
            hasError: true,
            code: error.code
        };
    }
}

/**
 * Parse Shippo tracking data into our internal format
 * @param {Object} shippoData - Raw Shippo API response
 * @returns {Object} Parsed tracking information
 */
function parseTrackingData(shippoData) {
    if (!shippoData || shippoData.error) {
        return { error: shippoData?.error || 'Invalid tracking data' };
    }

    const status = shippoData.tracking_status?.status || 'UNKNOWN';
    const statusDetail = shippoData.tracking_status?.status_details || '';
    const scanLocation = shippoData.tracking_status?.location || {};
    // For DELIVERED, show delivery address (city/state); otherwise show last scan location
    const addressTo = shippoData.address_to || {};
    const location = status === 'DELIVERED' && (addressTo.city || addressTo.state)
        ? { city: addressTo.city, state: addressTo.state, zip: addressTo.zip, country: addressTo.country }
        : scanLocation;
    
    // Map Shippo statuses to our internal statuses
    const statusMapping = {
        'UNKNOWN': 'Order Placed',
        'PRE_TRANSIT': 'Order Placed', 
        'TRANSIT': 'Shipped',
        'DELIVERED': 'Delivered',
        'RETURNED': 'Returned',
        'FAILURE': 'Delivery Failed'
    };

    const mappedStatus = statusMapping[status] || 'Order Placed';
    
    // Calculate progress (0-2 for our 3-step system)
    let progress = 0;
    if (status === 'TRANSIT') progress = 1;
    else if (status === 'DELIVERED') progress = 2;

    // Normalize carrier name from API response
    const rawCarrier = shippoData.carrier || '';
    let normalizedCarrier = rawCarrier.toLowerCase();
    // Handle various carrier name formats from Shippo API
    if (normalizedCarrier.includes('usps') || normalizedCarrier.includes('united_states_postal') || normalizedCarrier === 'usps') {
        normalizedCarrier = 'usps';
    } else if (normalizedCarrier.includes('ups') || normalizedCarrier.includes('united_parcel') || normalizedCarrier === 'ups') {
        normalizedCarrier = 'ups';
    } else if (normalizedCarrier.includes('fedex') || normalizedCarrier.includes('federal_express') || normalizedCarrier === 'fedex') {
        normalizedCarrier = 'fedex';
    } else if (normalizedCarrier.includes('dhl') || normalizedCarrier === 'dhl') {
        normalizedCarrier = 'dhl';
    }
    
    return {
        trackingNumber: shippoData.tracking_number,
        carrier: normalizedCarrier || shippoData.carrier,
        status: mappedStatus,
        originalStatus: status,
        statusDetail,
        progress,
        location: {
            city: location.city,
            state: location.state,
            zip: location.zip,
            country: location.country
        },
        estimatedDelivery: shippoData.eta,
        lastUpdate: shippoData.tracking_status?.status_date,
        trackingHistory: shippoData.tracking_history || [],
        isDelivered: status === 'DELIVERED',
        isInTransit: status === 'TRANSIT',
        hasError: false
    };
}

/**
 * Mock tracking data for development/testing
 * @param {string} trackingNumber 
 * @returns {Object} Mock tracking information
 */
export function getMockTrackingInfo(trackingNumber) {
    // Generate realistic mock data based on tracking number
    const mockStatuses = ['Order Placed', 'Shipped', 'Delivered'];
    const hash = trackingNumber.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const statusIndex = Math.min(hash % 3, 2);
    
    // Detect carrier from tracking number for mock data
    const detectedCarrier = detectCarrier(trackingNumber);
    
    const mockData = {
        trackingNumber,
        carrier: detectedCarrier, // Use detected carrier instead of hardcoded 'usps'
        status: mockStatuses[statusIndex],
        originalStatus: ['PRE_TRANSIT', 'TRANSIT', 'DELIVERED'][statusIndex],
        statusDetail: [
            'Package information received',
            'Package in transit to destination',
            'Package delivered to recipient'
        ][statusIndex],
        progress: statusIndex,
        location: null,
        estimatedDelivery: new Date(Date.now() + (3 - statusIndex) * 86400000).toISOString(),
        lastUpdate: new Date().toISOString(),
        trackingHistory: [
            {
                status: 'Package information received',
                date: new Date(Date.now() - 86400000).toISOString(),
                location: 'Origin Facility'
            }
        ],
        isDelivered: statusIndex === 2,
        isInTransit: statusIndex === 1,
        hasError: false,
        isMockData: true
    };

    return mockData;
}

/**
 * Detect carrier from tracking number format
 * @param {string} trackingNumber 
 * @returns {string} Detected carrier
 */
export function detectCarrier(trackingNumber) {
    if (!trackingNumber) return 'usps';
    
    const cleaned = trackingNumber.replace(/\s/g, '').toUpperCase();
    
    // UPS tracking numbers - starts with 1Z followed by 16 alphanumeric characters
    if (/^1Z[0-9A-Z]{16}$/.test(cleaned)) return 'ups';
    
    // UPS tracking numbers - 18 digits starting with T
    if (/^T[0-9]{18}$/.test(cleaned)) return 'ups';
    
    // FedEx tracking numbers - 12 digits
    if (/^[0-9]{12}$/.test(cleaned)) {
        // FedEx Express (12 digits) vs USPS (can also be 12 digits but different patterns)
        // FedEx typically starts with specific patterns, but we'll check length first
        return 'fedex';
    }
    
    // FedEx tracking numbers - 14 digits
    if (/^[0-9]{14}$/.test(cleaned)) return 'fedex';
    
    // FedEx tracking numbers - 15 digits
    if (/^[0-9]{15}$/.test(cleaned)) return 'fedex';
    
    // FedEx tracking numbers - alphanumeric format (e.g., 123456789012 or 1234567890123)
    if (/^[0-9]{10,15}$/.test(cleaned) && cleaned.length >= 10 && cleaned.length <= 15) {
        // Could be FedEx, but need more context - check if it's a common FedEx pattern
        if (/^[0-9]{12,15}$/.test(cleaned)) return 'fedex';
    }
    
    // USPS tracking numbers - 20 digits starting with specific prefixes
    if (/^(94|93|92|91|82|81|80|23|13|20|21|22|24|25|26|27|28|29|30|31|32|33|34|35|36|37|38|39|40|41|42|43|44|45|46|47|48|49|50|51|52|53|54|55|56|57|58|59|60|61|62|63|64|65|66|67|68|69|70|71|72|73|74|75|76|77|78|79)[0-9]{18}$/.test(cleaned)) return 'usps';
    
    // USPS tracking numbers - alphanumeric format (e.g., EA123456789US)
    if (/^[A-Z]{2}[0-9]{9}[A-Z]{2}$/.test(cleaned)) return 'usps';
    
    // USPS tracking numbers - 22 digits (domestic)
    if (/^[0-9]{22}$/.test(cleaned)) return 'usps';
    
    // DHL tracking numbers - 10 digits
    if (/^[0-9]{10}$/.test(cleaned)) return 'dhl';
    
    // DHL tracking numbers - alphanumeric (e.g., 1234567890 or JJD0123456789)
    if (/^[A-Z]{3}[0-9]{10}$/.test(cleaned)) return 'dhl';
    
    // Default to USPS (most common)
    return 'usps';
}

/**
 * Get cached tracking info or fetch fresh data
 * @param {string} trackingNumber 
 * @param {string} carrier 
 * @param {boolean} useCache 
 * @returns {Promise<Object>}
 */
export async function getCachedTrackingInfo(trackingNumber, carrier, useCache = true) {
    const cacheKey = `tracking_${trackingNumber}`;
    
    if (useCache) {
        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const data = JSON.parse(cached);
                const cacheAge = Date.now() - data.timestamp;
                
                // Use cache if less than 30 minutes old
                if (cacheAge < 30 * 60 * 1000) {
                    return data.trackingInfo;
                }
            }
        } catch (error) {
            console.warn('Cache read error:', error);
        }
    }
    
    // Fetch fresh data
    const trackingInfo = await getTrackingInfo(trackingNumber, carrier);
    
    // Cache the result
    try {
        localStorage.setItem(cacheKey, JSON.stringify({
            timestamp: Date.now(),
            trackingInfo
        }));
    } catch (error) {
        console.warn('Cache write error:', error);
    }
    
    return trackingInfo;
}
