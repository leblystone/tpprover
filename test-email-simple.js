/**
 * Quick email test
 * Run: node test-email-simple.js
 */

import https from 'https';

const testEmail = 'theaveragebudget@gmail.com';

const data = JSON.stringify({
  data: {
    testEmail: testEmail
  }
});

const options = {
  hostname: 'us-central1-tpp-splendide.cloudfunctions.net',
  port: 443,
  path: '/quickEmailTest',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('🧪 Testing quick email...');
console.log('📧 To:', testEmail);
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
        console.log('🎉 Quick test email sent successfully!');
        console.log('📧 Check inbox at:', testEmail);
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
