/**
 * Test Squarespace activation email
 * Run: node test-squarespace-activation-email.js
 */

import https from 'https';

const testEmail = 'theaveragebudget@gmail.com';
const customerName = 'Test Customer';
const planKey = 'monthly';

const data = JSON.stringify({
  data: {
    testEmail: testEmail,
    customerName: customerName,
    planKey: planKey
  }
});

const options = {
  hostname: 'us-central1-tpp-splendide.cloudfunctions.net',
  port: 443,
  path: '/testSquarespaceActivationEmail',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('🧪 Testing Squarespace activation email...');
console.log('📧 To:', testEmail);
console.log('👤 Customer:', customerName);
console.log('📋 Plan:', planKey);
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
      
      if (result.result && result.result.success) {
        console.log('');
        console.log('🎉 Squarespace activation email sent successfully!');
        console.log('📧 Check inbox at:', testEmail);
        console.log('🔗 Activation Link:', result.result.activationLink);
        console.log('🔑 Activation Token:', result.result.activationToken);
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
