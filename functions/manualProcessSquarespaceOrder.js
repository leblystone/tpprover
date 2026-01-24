/**
 * Manual Squarespace Order Processing
 * Callable function to manually process a specific Squarespace order by order ID
 * Useful for backfilling orders that were missed by polling
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const squarespaceWebhooks = require('./squarespaceWebhooks');

// Get API key from environment
const SQUARESPACE_API_KEY = process.env.SQUARESPACE_API_KEY || '';

/**
 * Manually process a specific Squarespace order by order ID
 */
exports.manualProcessSquarespaceOrder = onCall(
  {
    cors: true,
    secrets: ['SQUARESPACE_API_KEY', 'RESEND_API_KEY']
  },
  async (request) => {
    const { orderId } = request.data;
    
    if (!orderId) {
      throw new HttpsError('invalid-argument', 'Order ID is required');
    }
    
    logger.info(`🔧 Manually processing Squarespace order: ${orderId}`);
    
    try {
      // Get API key
      let apiKey = process.env.SQUARESPACE_API_KEY;
      if (!apiKey) {
        throw new HttpsError('failed-precondition', 'SQUARESPACE_API_KEY not configured');
      }
      
      // Clean API key
      apiKey = apiKey.trim().replace(/\r?\n/g, '').replace(/\s+/g, '');
      
      // Fetch order details from Squarespace API
      // We need to access the fetchOrderDetails function, but it's not exported
      // So we'll use the processOrder function from squarespacePolling
      // Actually, let's create a simple fetch function here
      const orderDetails = await fetchOrderDetails(apiKey, orderId);
      
      // Log full order structure for debugging
      logger.info(`📦 Full order details:`, JSON.stringify(orderDetails, null, 2));
      
      // Try multiple possible email field locations
      const email = orderDetails.customer?.email || 
                    orderDetails.billingAddress?.email ||
                    orderDetails.customerEmail ||
                    orderDetails.email ||
                    (orderDetails.billingAddress && (
                      orderDetails.billingAddress.email ||
                      orderDetails.billingAddress.emailAddress
                    ));
      
      if (!email) {
        logger.error(`❌ No email found in order. Available fields:`, Object.keys(orderDetails));
        if (orderDetails.customer) logger.error(`   customer fields:`, Object.keys(orderDetails.customer));
        if (orderDetails.billingAddress) logger.error(`   billingAddress fields:`, Object.keys(orderDetails.billingAddress));
        throw new HttpsError('invalid-argument', `Order does not have a customer email. Order ID: ${orderId}`);
      }
      
      logger.info(`✅ Found email: ${email}`);
      
      // Get plan from line items
      const lineItems = orderDetails.lineItems || [];
      let planKey = null;
      
      for (const item of lineItems) {
        const sku = (item.sku || item.productId || '').toLowerCase();
        if (sku === 'app-monthly' || sku === 'monthly-access') {
          planKey = 'monthly';
          break;
        } else if (sku === 'app-annual' || sku === 'annual-access') {
          planKey = 'annual';
          break;
        } else if (sku === 'app-lifetime' || sku === 'lifetime-access') {
          planKey = 'lifetime';
          break;
        }
      }
      
      if (!planKey) {
        throw new HttpsError('invalid-argument', `Order does not contain a recognized subscription product. SKUs found: ${lineItems.map(item => item.sku || 'N/A').join(', ')}`);
      }
      
      logger.info(`✅ Found subscription plan: ${planKey} for order ${orderId}`);
      
      // Format order data as webhook payload (same format as polling function uses)
      const webhookPayload = {
        type: 'order.created',
        order: {
          id: orderDetails.id || orderId,
          customerEmail: email,
          customerName: orderDetails.customer?.fullName || 
                       `${orderDetails.billingAddress?.firstName || ''} ${orderDetails.billingAddress?.lastName || ''}`.trim(),
          lineItems: lineItems.map(item => ({
            sku: item.sku || item.productId,
            name: item.productName || item.name,
            quantity: item.quantity || 1
          })),
          totalAmount: orderDetails.totals?.total || orderDetails.total || '0',
          currency: orderDetails.totals?.currency || 'USD',
          createdAt: orderDetails.createdOn || orderDetails.createdDate || new Date().toISOString()
        }
      };
      
      // Process using processOrderWebhook (exported from squarespaceWebhooks)
      await squarespaceWebhooks.processOrderWebhook(webhookPayload);
      
      return {
        success: true,
        message: `Order ${orderId} processed successfully`,
        planKey,
        email
      };
      
    } catch (error) {
      logger.error(`❌ Failed to manually process order ${orderId}:`, error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', `Failed to process order: ${error.message}`);
    }
  }
);

/**
 * Fetch order details from Squarespace API
 */
async function fetchOrderDetails(apiKey, orderId) {
  const https = require('https');
  
  return new Promise((resolve, reject) => {
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

