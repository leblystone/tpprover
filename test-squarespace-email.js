/**
 * Test Squarespace activation email
 * Run: node test-squarespace-email.js
 */

import https from 'https';
import crypto from 'crypto';

// Generate a test activation token
const activationToken = crypto.randomBytes(32).toString('hex');
const testEmail = 'theaveragebudget@gmail.com'; // Use the email from the order we just processed
const customerName = 'Test Customer';
const planKey = 'monthly';

// Call the testEmailSystem function with squarespaceActivation template
const functionUrl = 'https://us-central1-tpp-splendide.cloudfunctions.net/testEmailSystem';

const data = JSON.stringify({
  data: {
    testEmail: testEmail,
    templateType: 'squarespaceActivation',
    templateData: {
      subject: 'Create Your Pep Planner Account 🧬',
      heading: 'Welcome to The Pep Planner! 🧬',
      greeting: `Hi ${customerName},`,
      mainMessage: `Thank you for your purchase! Your Monthly subscription is ready to activate.`,
      ctaText: 'Create Your Pep Planner Account',
      ctaLink: `https://thepepplanner.com/activate?token=${activationToken}`,
      highlightTitle: 'Create Your App Account',
      highlightMessage: 'Your billing portal (used for purchasing) is separate from your Pep Planner app account. Click below to create your app account and start using The Pep Planner. This will only take a moment!',
      postCtaNote: 'This activation link expires in 30 days. If you have any questions, contact us at contact@thepepplanner.com'
    }
  }
});

const options = {
  hostname: 'us-central1-tpp-splendide.cloudfunctions.net',
  port: 443,
  path: '/testEmailSystem',
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
console.log('🔗 Activation Token:', activationToken);
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
        console.log('🎉 Email sent successfully!');
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
