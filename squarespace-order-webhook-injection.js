/**
 * Squarespace Order Confirmation Page Code Injection
 * 
 * Add this code to: Settings → Website → Code Injection → Order Confirmation Page
 * 
 * This code will automatically send order data to your Firebase Function
 * when a customer completes a purchase on Squarespace.
 */

<script>
(function() {
  // Your webhook URL
  const WEBHOOK_URL = 'https://us-central1-tpp-splendide.cloudfunctions.net/squarespaceWebhook';
  
  // Wait for order data to be available
  function sendOrderToWebhook() {
    try {
      // Try to get order data from Squarespace's global object
      let orderData = null;
      
      // Method 1: Check for Squarespace.orderData (if available)
      if (typeof window.Squarespace !== 'undefined' && window.Squarespace.orderData) {
        orderData = window.Squarespace.orderData;
      }
      
      // Method 2: Extract from page elements (fallback)
      if (!orderData) {
        const orderElements = document.querySelectorAll('[data-order-id], [data-order-number]');
        const emailElement = document.querySelector('[data-customer-email], .order-email, input[type="email"]');
        const lineItems = Array.from(document.querySelectorAll('.order-item, [data-product-sku]'));
        
        if (orderElements.length > 0 || emailElement) {
          const orderId = orderElements[0]?.getAttribute('data-order-id') || 
                         orderElements[0]?.getAttribute('data-order-number') ||
                         document.querySelector('.order-number')?.textContent?.trim() ||
                         'unknown';
          
          const customerEmail = emailElement?.value || 
                               emailElement?.textContent?.trim() ||
                               document.querySelector('[data-email]')?.textContent?.trim();
          
          const items = lineItems.map(item => {
            const sku = item.getAttribute('data-product-sku') || 
                       item.querySelector('[data-sku]')?.textContent?.trim() ||
                       item.querySelector('.product-sku')?.textContent?.trim() || '';
            const name = item.querySelector('.product-title, .order-item-title')?.textContent?.trim() || '';
            
            return { sku: sku, name: name, quantity: 1 };
          }).filter(item => item.sku && item.sku.startsWith('app-'));
          
          if (customerEmail && items.length > 0) {
            orderData = {
              id: orderId,
              customerEmail: customerEmail,
              lineItems: items,
              totalAmount: document.querySelector('.order-total, [data-total]')?.textContent?.replace(/[^0-9.]/g, '') || '0',
              currency: 'USD',
              createdAt: new Date().toISOString()
            };
          }
        }
      }
      
      // Method 3: Try to extract from URL parameters or localStorage
      if (!orderData) {
        const urlParams = new URLSearchParams(window.location.search);
        const orderId = urlParams.get('order') || urlParams.get('orderId');
        const storedOrder = localStorage.getItem('squarespace_order_data');
        
        if (orderId || storedOrder) {
          try {
            const parsed = storedOrder ? JSON.parse(storedOrder) : {};
            if (parsed.customerEmail && parsed.lineItems) {
              orderData = parsed;
            }
          } catch (e) {
            console.warn('Could not parse stored order data');
          }
        }
      }
      
      // Send to webhook if we have order data
      if (orderData && orderData.customerEmail) {
        const webhookPayload = {
          type: 'order.created',
          order: {
            id: orderData.id || orderData.orderNumber || 'unknown',
            customerEmail: orderData.customerEmail,
            customerName: orderData.customerName || orderData.name || '',
            lineItems: orderData.lineItems || [],
            totalAmount: orderData.totalAmount || orderData.total || '0',
            currency: orderData.currency || 'USD',
            createdAt: orderData.createdAt || new Date().toISOString()
          }
        };
        
        // Send to webhook
        fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(webhookPayload)
        })
        .then(response => {
          if (response.ok) {
            console.log('✅ Order data sent to webhook successfully');
            // Clear any stored order data
            localStorage.removeItem('squarespace_order_data');
          } else {
            console.error('❌ Webhook returned error:', response.status);
            // Store order data to retry later if needed
            localStorage.setItem('squarespace_order_data', JSON.stringify(orderData));
          }
        })
        .catch(error => {
          console.error('❌ Failed to send order data to webhook:', error);
          // Store order data to retry later
          localStorage.setItem('squarespace_order_data', JSON.stringify(orderData));
        });
      } else {
        console.warn('⚠️ Could not extract order data from page');
        // Retry after a delay
        setTimeout(sendOrderToWebhook, 2000);
      }
    } catch (error) {
      console.error('❌ Error in webhook script:', error);
    }
  }
  
  // Run when page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(sendOrderToWebhook, 1000);
    });
  } else {
    setTimeout(sendOrderToWebhook, 1000);
  }
  
  // Also try after a longer delay in case data loads asynchronously
  setTimeout(sendOrderToWebhook, 3000);
})();
</script>

