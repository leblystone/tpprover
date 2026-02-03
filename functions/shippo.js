const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {logger} = require('firebase-functions');

// Shippo API configuration
const SHIPPO_API_BASE = 'https://api.goshippo.com/v1';

/**
 * Get tracking information from Shippo API
 * This function proxies requests to Shippo to avoid CORS issues and keep API key secure
 */
exports.getTrackingInfo = onCall(
  {
    cors: true, // Firebase Functions v2 handles CORS automatically
    secrets: ['SHIPPO_API_KEY'] // Bind the secret to this function
  },
  async (request) => {
    // Verify user is authenticated
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated to track shipments');
    }

    const { trackingNumber, carrier = 'usps' } = request.data;

    if (!trackingNumber) {
      throw new HttpsError('invalid-argument', 'Tracking number is required');
    }

    logger.info(`📦 Fetching tracking info for: ${trackingNumber} (carrier: ${carrier})`);

    try {
      // Access the secret from environment (Firebase Functions v2 makes secrets available via process.env)
      const shippoApiKey = process.env.SHIPPO_API_KEY?.trim().replace(/\r?\n/g, '');
      
      if (!shippoApiKey) {
        logger.error('❌ Shippo API key not configured');
        logger.error('❌ SHIPPO_API_KEY secret is missing or empty');
        logger.error('❌ Available env keys:', Object.keys(process.env).filter(k => k.includes('SHIPPO')));
        throw new HttpsError('internal', 'Tracking service not configured');
      }
      
      logger.info('✅ Shippo API key found (length: ' + shippoApiKey.length + ')');

      // Make request to Shippo API
      const trackingResponse = await fetch(`${SHIPPO_API_BASE}/tracks/`, {
        method: 'POST',
        headers: {
          'Authorization': `ShippoToken ${shippoApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          carrier: carrier.toLowerCase(),
          tracking_number: trackingNumber
        })
      });

      if (!trackingResponse.ok) {
        const errorText = await trackingResponse.text();
        logger.error(`❌ Shippo API error: ${trackingResponse.status} ${trackingResponse.statusText}`, errorText);
        
        // 401 = key invalid/expired/deleted - give helpful hint
        if (trackingResponse.status === 401) {
          const keyPrefix = shippoApiKey.substring(0, 12);
          logger.error('❌ Shippo 401: Key appears invalid. Verify at https://portal.goshippo.com/api-config/api');
          logger.error('❌ Key starts with:', keyPrefix + '... (expect shippo_live_ or shippo_test_)');
        }
        
        // Return error in a format the client can handle
        return {
          error: 'Failed to fetch tracking information',
          status: trackingResponse.status,
          statusText: trackingResponse.statusText,
          details: errorText
        };
      }

      const trackingData = await trackingResponse.json();
      
      logger.info(`✅ Tracking info retrieved successfully for: ${trackingNumber}`);
      
      // Return the raw Shippo data - client will parse it
      return {
        success: true,
        data: trackingData
      };
      
    } catch (error) {
      logger.error('❌ Error fetching tracking info:', error);
      
      // If it's already an HttpsError, re-throw it
      if (error instanceof HttpsError) {
        throw error;
      }
      
      // Return error in a format the client can handle
      return {
        error: 'Network error while fetching tracking information',
        message: error.message
      };
    }
  }
);





