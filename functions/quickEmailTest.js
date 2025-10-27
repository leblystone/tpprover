// Quick email test with hardcoded API key
const { onCall } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');

exports.quickEmailTest = onCall(
  {
    cors: true
  },
  async (request) => {
    const { testEmail } = request.data;
    
    if (!testEmail) {
      throw new Error('testEmail parameter is required');
    }

    logger.info(`🧪 Quick email test to: ${testEmail}`);

    try {
      // Use the API key directly (temporary for testing)
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey('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');

      const msg = {
        to: testEmail,
        from: 'contact@thepepplanner.com',
        subject: '🧪 Quick Test Email - The Pep Planner',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #6366f1;">🧪 Email Test Successful!</h1>
            <p>This is a quick test email from The Pep Planner.</p>
            <p>If you're seeing this, the email system is working! 🎉</p>
            <p style="color: #666; font-size: 14px;">Sent at: ${new Date().toISOString()}</p>
          </div>
        `
      };

      await sgMail.send(msg);
      
      logger.info(`✅ Quick test email sent successfully to: ${testEmail}`);
      
      return {
        success: true,
        message: `Quick test email sent successfully to ${testEmail}!`
      };
      
    } catch (error) {
      logger.error('❌ Quick email test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
);
