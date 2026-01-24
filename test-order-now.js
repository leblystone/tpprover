/**
 * Test Squarespace order processing
 * Run: node test-order-now.js
 */

import https from 'https';

const orderId = '6965d3c8c4bf0860f73d9e3e';
const functionUrl = 'https://us-central1-tpp-splendide.cloudfunctions.net/manualProcessSquarespaceOrder';

const data = JSON.stringify({
  data: {
    orderId: orderId
  }
});

const options = {
  hostname: 'us-central1-tpp-splendide.cloudfunctions.net',
  port: 443,
  path: '/manualProcessSquarespaceOrder',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('🧪 Testing Squarespace order processing...');
console.log('📦 Order ID:', orderId);
console.log('🔗 Function URL:', functionUrl);
console.log('');

const req = https.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('📊 Response Status:', res.statusCode);
    console.log('');
    
    try {
      const result = JSON.parse(responseData);
      console.log('✅ Response:', JSON.stringify(result, null, 2));
      
      if (result.result) {
        console.log('');
        console.log('🎉 Success!');
        console.log('📧 Email sent to:', result.result.email || 'N/A');
        console.log('📋 Plan:', result.result.planKey || 'N/A');
      }
    } catch (e) {
      console.log('📄 Raw Response:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

req.write(data);
req.end();
