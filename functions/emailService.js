// 📧 Email Service for The Pep Planner
// Sends transactional emails via SendGrid

const { logger } = require('firebase-functions');
const emailTemplates = require('./emailTemplates');

// SendGrid API key will be stored in Firebase environment config
// Run: firebase functions:config:set sendgrid.api_key="YOUR_SENDGRID_API_KEY"

/**
 * Send email using SendGrid
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - Email HTML content
 * @returns {Promise<boolean>}
 */
async function sendEmail(to, subject, html) {
  try {
    // Check if SendGrid is configured
    const functions = require('firebase-functions');
    const sendgridApiKey = functions.config().sendgrid?.api_key;
    
    if (!sendgridApiKey) {
      logger.warn('⚠️ SendGrid not configured - email not sent');
      logger.info('📧 Would have sent email to:', to, 'Subject:', subject);
      return false;
    }

    // Dynamic import of SendGrid (only load if configured)
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(sendgridApiKey);

    const msg = {
      to,
      from: {
        email: 'contact@thepepplanner.com', // This must be verified in SendGrid
        name: 'The Pep Planner'
      },
      subject,
      html,
    };

    await sgMail.send(msg);
    logger.info('✅ Email sent successfully to:', to);
    return true;
    
  } catch (error) {
    logger.error('❌ Failed to send email:', error);
    return false;
  }
}

/**
 * Send welcome email to new user
 */
exports.sendWelcomeEmail = async (userEmail, userName = null) => {
  const subject = 'Welcome to The Pep Planner! 🎉';
  const html = emailTemplates.welcomeEmail(userName, userEmail);
  return sendEmail(userEmail, subject, html);
};

/**
 * Send email verification
 */
exports.sendVerificationEmail = async (userEmail, verificationLink) => {
  const subject = 'Verify your email for The Pep Planner';
  const html = emailTemplates.verificationEmail(verificationLink);
  return sendEmail(userEmail, subject, html);
};

/**
 * Send password reset email
 */
exports.sendPasswordResetEmail = async (userEmail, resetLink) => {
  const subject = 'Reset your password for The Pep Planner';
  const html = emailTemplates.passwordResetEmail(resetLink, userEmail);
  return sendEmail(userEmail, subject, html);
};

/**
 * Send trial ending soon reminder
 */
exports.sendTrialEndingEmail = async (userEmail, daysLeft) => {
  const subject = `Your trial ends in ${daysLeft} days - The Pep Planner`;
  const html = emailTemplates.trialEndingEmail(daysLeft, userEmail);
  return sendEmail(userEmail, subject, html);
};

/**
 * Send subscription confirmation
 */
exports.sendSubscriptionConfirmationEmail = async (userEmail, plan, interval, price) => {
  const subject = 'Subscription Confirmed - The Pep Planner';
  const html = emailTemplates.subscriptionConfirmedEmail(plan, interval, price);
  return sendEmail(userEmail, subject, html);
};

/**
 * Send lifetime access granted email
 */
exports.sendLifetimeAccessGrantedEmail = async (userEmail, reason = 'Beta tester') => {
  const subject = '🎉 Lifetime Access Granted - The Pep Planner';
  const html = emailTemplates.lifetimeAccessGrantedEmail(userEmail, reason);
  return sendEmail(userEmail, subject, html);
};

