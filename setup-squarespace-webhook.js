/**
 * Setup Squarespace Webhook Subscriptions
 * 
 * This script uses the Squarespace Commerce API to create webhook subscriptions
 * that will notify your Firebase Function when orders/subscriptions are created/updated.
 * 
 * Usage:
 * 1. Get your Squarespace API key from Developer Tools → Developer API Keys
 * 2. Run: node setup-squarespace-webhook.js YOUR_API_KEY
 */

import https from 'https';

const SQUARESPACE_API_KEY = process.argv[2];
const WEBHOOK_URL = 'https://us-central1-tpp-splendide.cloudfunctions.net/squarespaceWebhook';

if (!SQUARESPACE_API_KEY) {
  console.error('❌ Error: Please provide your Squarespace API key');
  console.log('\nUsage: node setup-squarespace-webhook.js YOUR_API_KEY');
  console.log('\nTo get your API key:');
  console.log('1. Go to Squarespace Dashboard');
console.log('2. Settings → Developer Tools → Developer API Keys');
console.log('3. Click "Create Key"');
console.log('4. Name it "The Pep Planner Webhook"');
console.log('5. Grant these permissions: Orders, Products, Transactions, Profiles');
console.log('6. Copy the API key and use it here');
  process.exit(1);
}

const topics = [
  'order.create',
  'order.update',
  'subscription.create',
  'subscription.update',
  'subscription.cancel',
  'subscription.expire'
];

async function createWebhookSubscription(topic) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      endpointUrl: WEBHOOK_URL,
      topics: [topic]
    });

    const options = {
      hostname: 'api.squarespace.com',
      port: 443,
      path: '/1.0/webhook_subscriptions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SQUARESPACE_API_KEY}`,
        'User-Agent': 'ThePepPlanner/1.0',
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✅ Created webhook subscription for: ${topic}`);
          resolve(JSON.parse(body));
        } else {
          console.error(`❌ Failed to create webhook for ${topic}:`, res.statusCode, body);
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error(`❌ Error creating webhook for ${topic}:`, error);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function setupWebhooks() {
  console.log('🚀 Setting up Squarespace webhooks...\n');
  console.log(`Webhook URL: ${WEBHOOK_URL}\n`);

  for (const topic of topics) {
    try {
      await createWebhookSubscription(topic);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      // Continue with other topics even if one fails
      console.error(`   (Continuing with remaining topics...)`);
    }
  }

  console.log('\n✅ Webhook setup complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Make a test purchase on your Squarespace site');
  console.log('2. Check Firebase logs: firebase functions:log --only squarespaceWebhook');
  console.log('3. Verify the webhook receives order data');
}

setupWebhooks().catch(console.error);

