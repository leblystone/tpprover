// 🧪 Safe Webhook Email Testing
// This simulates Stripe webhook events WITHOUT touching Stripe

const { onCall } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const emailService = require('./emailService');

/**
 * Test webhook email flow by simulating Stripe events
 * This is 100% safe - no Stripe API calls, just tests the email system
 */
exports.testWebhookEmails = onCall(
  {
    cors: true,
    secrets: ['SENDGRID_API_KEY']
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('Authentication required');
    }

    const { testEmail = 'thepepplanner@gmail.com' } = request.data;
    
    logger.info(`🧪 Testing webhook email simulation for: ${testEmail}`);

    try {
      const results = [];

      // Simulate: Payment Successful Event
      logger.info('📧 Simulating payment_intent.succeeded event...');
      const paymentResult = await emailService.sendPaymentSuccessfulEmail(
        testEmail, 
        2999, // $29.99
        'USD', 
        'https://thepepplanner.app/receipt'
      );
      results.push({ 
        event: 'payment_intent.succeeded', 
        email: 'Payment Successful',
        success: paymentResult 
      });

      // Simulate: Subscription Created Event
      logger.info('📧 Simulating customer.subscription.created event...');
      const subscriptionResult = await emailService.sendSubscriptionConfirmedEmail(
        testEmail, 
        'Pro Annual Plan'
      );
      results.push({ 
        event: 'customer.subscription.created', 
        email: 'Subscription Confirmed',
        success: subscriptionResult 
      });

      // Simulate: Welcome Email (new user)
      logger.info('📧 Simulating welcome email...');
      const welcomeResult = await emailService.sendWelcomeEmail(testEmail, 'Test User');
      results.push({ 
        event: 'user.created', 
        email: 'Welcome Email',
        success: welcomeResult 
      });

      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;

      logger.info(`✅ Webhook simulation completed: ${successCount}/${totalCount} emails sent successfully`);

      return {
        success: successCount > 0,
        message: `Webhook email simulation: ${successCount}/${totalCount} emails sent successfully`,
        results: results,
        testEmail: testEmail,
        note: 'This simulates what would happen when Stripe sends real webhook events'
      };
      
    } catch (error) {
      logger.error('❌ Webhook simulation failed:', error);
      throw new Error(`Webhook simulation failed: ${error.message}`);
    }
  }
);







