/**
 * Squarespace Order Polling Service
 * Polls Squarespace API for new orders and processes them
 * Runs on a schedule to check for new subscription orders
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const https = require('https');
const squarespaceWebhooks = require('./squarespaceWebhooks');

// Squarespace API Configuration
const SQUARESPACE_API_KEY = process.env.SQUARESPACE_API_KEY || '';
// Site ID can be extracted from site URL or set explicitly
// Format: https://your-site-id.squarespace.com or just 'your-site-id'
const SQUARESPACE_SITE_ID = process.env.SQUARESPACE_SITE_ID || 'magenta-strawberry-ecr7';

/**
 * Fetch orders from Squarespace API
 */
async function fetchSquarespaceOrders(apiKey, siteId, modifiedAfter = null, modifiedBefore = null) {
  return new Promise((resolve, reject) => {
    // Clean API key - remove any whitespace, newlines, or invalid characters
    const cleanApiKey = apiKey.trim().replace(/\r?\n/g, '').replace(/\s+/g, '');
    
    // Build URL with query parameters
    let path = `/1.0/commerce/orders?limit=50`;
    // Squarespace API requires BOTH modifiedAfter and modifiedBefore if either is specified
    if (modifiedAfter || modifiedBefore) {
      // If only one is provided, set the other to now (for modifiedBefore) or a reasonable past date (for modifiedAfter)
      const now = new Date().toISOString();
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const after = modifiedAfter || oneHourAgo;
      const before = modifiedBefore || now;
      
      path += `&modifiedAfter=${after}`;
      path += `&modifiedBefore=${before}`;
    }

    const options = {
      hostname: 'api.squarespace.com',
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cleanApiKey}`,
        'User-Agent': 'ThePepPlanner/1.0',
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const data = JSON.parse(body);
            resolve(data);
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

/**
 * Get order details from Squarespace API
 */
async function fetchOrderDetails(apiKey, orderId) {
  return new Promise((resolve, reject) => {
    // Clean API key - remove any whitespace, newlines, or invalid characters
    const cleanApiKey = apiKey.trim().replace(/\r?\n/g, '').replace(/\s+/g, '');
    
    const options = {
      hostname: 'api.squarespace.com',
      port: 443,
      path: `/1.0/commerce/orders/${orderId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cleanApiKey}`,
        'User-Agent': 'ThePepPlanner/1.0',
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const data = JSON.parse(body);
            resolve(data);
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

/**
 * Check if order has already been processed
 */
async function isOrderProcessed(orderId) {
  try {
    const processedOrdersRef = admin.firestore().collection('squarespaceProcessedOrders');
    const doc = await processedOrdersRef.doc(orderId).get();
    return doc.exists;
  } catch (error) {
    logger.error('Error checking if order processed:', error);
    return false;
  }
}

/**
 * Mark order as processed
 */
async function markOrderAsProcessed(orderId, orderData) {
  try {
    const processedOrdersRef = admin.firestore().collection('squarespaceProcessedOrders');
    await processedOrdersRef.doc(orderId).set({
      orderId: orderId,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      orderData: orderData,
      status: 'processed'
    });
  } catch (error) {
    logger.error('Error marking order as processed:', error);
  }
}

/**
 * Process a Squarespace order
 */
async function processOrder(orderData) {
  try {
    logger.info(`Processing Squarespace order: ${orderData.id}`);

    // Format order data to match webhook format
    const webhookPayload = {
      type: 'order.created',
      order: {
        id: orderData.id || orderData.orderNumber,
        customerEmail: orderData.customer?.email || orderData.billingAddress?.email,
        customerName: orderData.customer?.fullName || 
                     `${orderData.billingAddress?.firstName || ''} ${orderData.billingAddress?.lastName || ''}`.trim(),
        lineItems: (orderData.lineItems || []).map(item => ({
          sku: item.sku || item.productId,
          name: item.productName || item.name,
          quantity: item.quantity || 1
        })),
        totalAmount: orderData.totals?.total || orderData.total || '0',
        currency: orderData.totals?.currency || 'USD',
        createdAt: orderData.createdOn || orderData.createdDate || new Date().toISOString()
      }
    };

    // Check if order contains subscription products
    // Match: app-monthly, app-annual, app-lifetime OR monthly-access, annual-access, lifetime-access
    const subscriptionSKUs = ['app-monthly', 'app-annual', 'app-lifetime', 'monthly-access', 'annual-access', 'lifetime-access'];
    const hasSubscriptionProducts = webhookPayload.order.lineItems.some(
      item => item.sku && subscriptionSKUs.includes(item.sku.toLowerCase())
    );

    if (!hasSubscriptionProducts) {
      logger.info(`⚠️ Order ${orderData.id} does not contain subscription products, skipping`);
      logger.info(`   Line items SKUs: ${(webhookPayload.order.lineItems || []).map(item => item.sku || 'N/A').join(', ')}`);
      logger.info(`   Expected SKUs: ${subscriptionSKUs.join(', ')}`);
      return;
    }
    
    logger.info(`✅ Order ${orderData.id} contains subscription products, processing...`);

    // Process using the existing webhook handler logic
    await squarespaceWebhooks.processOrderWebhook(webhookPayload);

    // Mark as processed
    await markOrderAsProcessed(orderData.id, orderData);

    logger.info(`Successfully processed order: ${orderData.id}`);
  } catch (error) {
    logger.error(`Error processing order ${orderData.id}:`, error);
    throw error;
  }
}

/**
 * Scheduled function to poll Squarespace for new orders
 * Runs every 1 minute for faster order processing
 */
exports.pollSquarespaceOrders = onSchedule(
  {
    schedule: 'every 1 minutes',
    timeZone: 'America/New_York',
    secrets: ['SQUARESPACE_API_KEY', 'RESEND_API_KEY']
  },
  async (event) => {
    logger.info('🔍 Starting Squarespace order polling...');

    // Get API key from secrets (Firebase Functions v2)
    // Note: When using secrets, access via process.env after deployment
    let apiKey = process.env.SQUARESPACE_API_KEY;
    
    if (!apiKey) {
      logger.error('❌ SQUARESPACE_API_KEY not set. Set it in Firebase Console: Functions → Config → Environment Variables');
      return;
    }
    
    // Clean API key - remove any whitespace, newlines, or invalid characters
    apiKey = apiKey.trim().replace(/\r?\n/g, '').replace(/\s+/g, '');

    try {
      const db = admin.firestore();
      
      // Get last poll time from Firestore
      const configRef = db.collection('squarespaceConfig').doc('polling');
      const configDoc = await configRef.get();
      const lastPollTime = configDoc.exists ? configDoc.data().lastPollTime : null;

      // Calculate modifiedAfter timestamp (24 hours ago if no previous poll to catch older orders)
      let modifiedAfter = null;
      if (lastPollTime) {
        modifiedAfter = lastPollTime;
      } else {
        // First run: check last 24 hours to catch any orders placed recently
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        modifiedAfter = oneDayAgo.toISOString();
        logger.info(`⚠️ First poll run - checking orders from last 24 hours to catch any missed orders`);
      }

      // Calculate modifiedBefore (now) for the API requirement
      const now = new Date().toISOString();
      const modifiedBefore = now;
      
      logger.info(`Fetching orders modified after: ${modifiedAfter}, before: ${modifiedBefore}`);

      // Fetch orders from Squarespace (API requires both modifiedAfter and modifiedBefore)
      const ordersResponse = await fetchSquarespaceOrders(apiKey, SQUARESPACE_SITE_ID, modifiedAfter, modifiedBefore);
      const orders = ordersResponse.result || [];

      logger.info(`Found ${orders.length} orders to check`);

      let processedCount = 0;

      // Process each order
      for (const order of orders) {
        try {
          // Check if already processed
          if (await isOrderProcessed(order.id)) {
            logger.info(`Order ${order.id} already processed, skipping`);
            continue;
          }

          // Fetch full order details
          const orderDetails = await fetchOrderDetails(apiKey, order.id);
          
          // Process the order
          await processOrder(orderDetails);
          processedCount++;

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          logger.error(`Error processing order ${order.id}:`, error);
          // Continue with next order
        }
      }

      // Update last poll time
      await configRef.set({
        lastPollTime: now,
        lastPollRun: admin.firestore.FieldValue.serverTimestamp(),
        ordersFound: orders.length,
        ordersProcessed: processedCount
      }, { merge: true });

      logger.info(`✅ Polling complete: ${processedCount} new orders processed`);
    } catch (error) {
      logger.error('❌ Error in Squarespace polling:', error);
    }
  }
);

