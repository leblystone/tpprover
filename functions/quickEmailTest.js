// Quick email test with Resend
const { onCall } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');

exports.quickEmailTest = onCall(
  {
    cors: true,
    secrets: ['RESEND_API_KEY']
  },
  async (request) => {
    const { testEmail } = request.data;
    
    if (!testEmail) {
      throw new Error('testEmail parameter is required');
    }

    logger.info(`🧪 Quick email test to: ${testEmail}`);

    try {
      // Use the API key from environment variables
      const { Resend } = require('resend');
      const apiKey = process.env.RESEND_API_KEY;
      
      if (!apiKey) {
        throw new Error('RESEND_API_KEY environment variable is not set');
      }
      
      const resend = new Resend(apiKey);

      const result = await resend.emails.send({
        from: 'The Pep Planner <contact@thepepplanner.com>',
        to: testEmail,
        subject: '🧪 Quick Test Email - The Pep Planner',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #6366f1;">🧪 Email Test Successful!</h1>
            <p>This is a quick test email from The Pep Planner.</p>
            <p>If you're seeing this, the email system is working! 🎉</p>
            <p style="color: #666; font-size: 14px;">Sent at: ${new Date().toISOString()}</p>
          </div>
        `,
        replyTo: 'contact@thepepplanner.com',
        headers: {
          'X-Entity-Ref-ID': `tpp-quick-test-${Date.now()}`,
          // Mark as transactional to avoid Promotions tab
          'X-Priority': '1',
          'X-Mailer': 'The Pep Planner',
          'Auto-Submitted': 'no',
          'X-Auto-Response-Suppress': 'All',
          'X-Transaction-Type': 'transactional',
        },
        tags: [
          { name: 'category', value: 'transactional' },
          { name: 'type', value: 'test' }
        ],
      });

      if (result.data && result.data.id) {
        logger.info(`✅ Quick test email sent successfully to: ${testEmail}`);
        return {
          success: true,
          message: `Quick test email sent successfully to ${testEmail}!`,
          emailId: result.data.id
        };
      } else {
        throw new Error(result.error || 'Failed to send email');
      }
      
    } catch (error) {
      logger.error('❌ Quick email test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
);
