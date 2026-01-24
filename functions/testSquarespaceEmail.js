/**
 * Test Squarespace activation email
 * Callable function to test sending Squarespace activation emails
 */

const { onCall } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const emailService = require('./emailService');
const crypto = require('crypto');

exports.testSquarespaceActivationEmail = onCall(
  {
    cors: true,
    secrets: ['RESEND_API_KEY']
  },
  async (request) => {
    const { testEmail, customerName, planKey } = request.data;
    
    if (!testEmail) {
      throw new Error('testEmail is required');
    }
    
    // Generate a test activation token
    const activationToken = crypto.randomBytes(32).toString('hex');
    const finalCustomerName = customerName || 'Test Customer';
    const finalPlanKey = planKey || 'monthly';
    
    logger.info(`🧪 Testing Squarespace activation email to: ${testEmail}`);
    logger.info(`📋 Plan: ${finalPlanKey}, Customer: ${finalCustomerName}`);
    
    try {
      const result = await emailService.sendSquarespaceActivationEmail(
        testEmail,
        finalCustomerName,
        finalPlanKey,
        activationToken
      );
      
      if (result) {
        logger.info(`✅ Squarespace activation email sent successfully to: ${testEmail}`);
        return {
          success: true,
          message: `Squarespace activation email sent successfully to ${testEmail}!`,
          activationToken: activationToken,
          activationLink: `https://thepepplanner.com/activate?token=${activationToken}`
        };
      } else {
        throw new Error('Email service returned false');
      }
    } catch (error) {
      logger.error(`❌ Failed to send Squarespace activation email:`, error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }
);
