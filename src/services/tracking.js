/**
 * Shipment Tracking Service
 * Integrates with Shippo API for real-time USPS/UPS tracking
 */

// Shippo API configuration
const SHIPPO_API_BASE = 'https://api.goshippo.com/v1';
const SHIPPO_API_KEY = import.meta.env.VITE_SHIPPO_API_KEY || import.meta.env.VITE_SHIPPO_TOKEN || import.meta.env.SHIPPO_API_KEY;

/**
 * Get tracking information for a shipment
 * @param {string} trackingNumber - The tracking number
 * @param {string} carrier - The carrier (usps, ups, fedex, etc.)
 * @returns {Promise<Object>} Tracking information
 */
export async function getTrackingInfo(trackingNumber, carrier = 'usps') {
    if (!trackingNumber) {
        return { error: 'No tracking number provided' };
    }

    try {
        // First, create a tracking object if it doesn't exist
        const trackingResponse = await fetch(`${SHIPPO_API_BASE}/tracks/`, {
            method: 'POST',
            headers: {
                'Authorization': `ShippoToken ${SHIPPO_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                carrier: carrier.toLowerCase(),
                tracking_number: trackingNumber
            })
        });

        if (!trackingResponse.ok) {
            console.error('Shippo API error:', trackingResponse.status, trackingResponse.statusText);
            return { error: 'Failed to fetch tracking information' };
        }

        const trackingData = await trackingResponse.json();
        
        // Parse Shippo response into our format
        return parseTrackingData(trackingData);
    } catch (error) {
        console.error('Tracking API error:', error);
        return { error: 'Network error while fetching tracking information' };
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
    const location = shippoData.tracking_status?.location || {};
    
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

    return {
        trackingNumber: shippoData.tracking_number,
        carrier: shippoData.carrier,
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
    
    const mockData = {
        trackingNumber,
        carrier: 'usps',
        status: mockStatuses[statusIndex],
        originalStatus: ['PRE_TRANSIT', 'TRANSIT', 'DELIVERED'][statusIndex],
        statusDetail: [
            'Package information received',
            'Package in transit to destination',
            'Package delivered to recipient'
        ][statusIndex],
        progress: statusIndex,
        location: {
            city: 'Distribution Center',
            state: 'CA',
            zip: '90210',
            country: 'US'
        },
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
    
    // UPS tracking numbers
    if (/^1Z[0-9A-Z]{16}$/.test(cleaned)) return 'ups';
    
    // FedEx tracking numbers
    if (/^[0-9]{12}$/.test(cleaned) || /^[0-9]{14}$/.test(cleaned)) return 'fedex';
    
    // USPS tracking numbers (various formats)
    if (/^(94|93|92|91|82|81|80|23|13)[0-9]{20}$/.test(cleaned)) return 'usps';
    if (/^[A-Z]{2}[0-9]{9}[A-Z]{2}$/.test(cleaned)) return 'usps';
    
    // Default to USPS
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
