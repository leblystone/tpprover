// 📧 Email Service for The Pep Planner
// Sends transactional emails via SendGrid

const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
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
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    
    logger.info('🔑 API Key being used:', sendgridApiKey ? `${sendgridApiKey.substring(0, 10)}...` : 'undefined');
    
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

    const result = await sgMail.send(msg);
    logger.info('✅ Email sent successfully to:', to, 'Status:', result[0]?.statusCode);
    return true;
    
  } catch (error) {
    logger.error('❌ Failed to send email:', error);
    logger.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.body
    });
    return false;
  }
}

/**
 * Send welcome email to new user
 */
exports.sendWelcomeEmail = async (userEmail, userName = null) => {
  // Try to load custom template from Firestore, fallback to hardcoded
  try {
    const customTemplate = await loadEmailTemplate('welcome');
    if (customTemplate) {
      const subject = customTemplate.subject || 'Welcome to The Pep Planner! 🎉';
      const html = generateEmailHTML(customTemplate, { userName, userEmail });
      return sendEmail(userEmail, subject, html);
    }
  } catch (error) {
    logger.warn('Failed to load custom welcome template, using default:', error);
  }
  
  // Fallback to hardcoded template
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
 * Send custom verification email with Firebase token
 */
exports.sendCustomVerificationEmail = async (userEmail, verificationToken) => {
  const verificationLink = `https://thepepplanner.app/verify-email?token=${verificationToken}`;
  
  // Try to load custom template from Firestore, fallback to hardcoded
  try {
    const customTemplate = await loadEmailTemplate('verification');
    if (customTemplate) {
      const subject = customTemplate.subject || 'Verify your email for The Pep Planner';
      const html = generateEmailHTML(customTemplate, { verificationLink });
      return sendEmail(userEmail, subject, html);
    }
  } catch (error) {
    logger.warn('Failed to load custom verification template, using default:', error);
  }
  
  // Fallback to hardcoded template
  const subject = 'Verify your email for The Pep Planner';
  const html = emailTemplates.verificationEmail(verificationLink);
  return sendEmail(userEmail, subject, html);
};

/**
 * Load email template from Firestore
 */
async function loadEmailTemplate(templateType) {
  try {
    const templateRef = admin.firestore().collection('emailTemplates').doc(templateType);
    const templateDoc = await templateRef.get();
    
    if (templateDoc.exists) {
      return templateDoc.data();
    }
    return null;
  } catch (error) {
    logger.error('Failed to load email template:', error);
    return null;
  }
}

/**
 * Generate email HTML from admin template
 */
function generateEmailHTML(template, variables = {}) {
  const colors = template.colors || {
    primary: '#344E41',
    primaryLight: '#3A5A40',
    secondary: '#A3B18A',
    sage: '#D4D7CD',
    white: '#FFFFFF',
    text: '#1F2937',
    textLight: '#6B7280'
  };

  // Replace variables in template
  let html = template.html || generateDefaultHTML(template, colors);
  
  // Replace variables like %VERIFICATION_LINK%
  Object.entries(variables).forEach(([key, value]) => {
    html = html.replace(new RegExp(`%${key.toUpperCase()}%`, 'g'), value);
  });

  return html;
}

/**
 * Generate default HTML from template data
 */
function generateDefaultHTML(template, colors) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: ${colors.sage};">
  <div style="background-color: ${colors.sage}; padding: 20px 0;">
    <div style="max-width: 600px; margin: 20px auto; background-color: ${colors.white}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <div style="background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryLight} 100%); padding: 40px 20px; text-align: center;">
        <img src="https://thepepplanner.app/tpp-logo.png" alt="The Pep Planner" style="width: 120px; height: auto; margin: 0 auto 12px; filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));" />
        <div style="color: ${colors.sage}; font-size: 14px; font-weight: 500; letter-spacing: 0.5px;">Organize Your Research</div>
      </div>
      <div style="padding: 40px 32px; color: ${colors.text};">
        <h1 style="color: ${colors.primary}; font-size: 28px; margin: 0 0 16px 0;">${template.heading || 'Email'}</h1>
        
        <p style="font-size: 16px; line-height: 1.6; color: ${colors.text};">
          ${template.greeting || ''}
        </p>
        
        ${template.mainMessage ? `<p style="font-size: 16px; line-height: 1.6; color: ${colors.text};">${template.mainMessage}</p>` : ''}

        ${template.highlightTitle ? `
        <div style="background-color: #F0FDF4; border-left: 4px solid ${colors.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
          <p style="margin: 0; font-weight: 600; color: ${colors.primary};">${template.highlightTitle}</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: ${colors.textLight};">
            ${template.highlightMessage || ''}
          </p>
        </div>
        ` : ''}

        ${template.features && template.features.length > 0 ? `
        <h2 style="color: ${colors.primary}; font-size: 20px; margin: 32px 0 16px 0;">What you can do:</h2>
        <ul style="list-style: none; padding: 0; margin: 20px 0;">
          ${template.features.map(f => `
          <li style="padding: 12px 0; padding-left: 32px; position: relative;">
            <span style="position: absolute; left: 0; color: ${colors.secondary}; font-weight: bold; font-size: 18px;">✓</span>
            ${f}
          </li>
          `).join('')}
        </ul>
        ` : ''}

        ${template.ctaText ? `
        <center>
          <a href="${template.ctaLink || '#'}" style="display: inline-block; padding: 16px 32px; background-color: ${colors.primary}; color: ${colors.white} !important; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 24px 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
            ${template.ctaText}
          </a>
        </center>
        ` : ''}

        <p style="font-size: 16px; line-height: 1.6; color: ${colors.text}; margin-top: 24px;">
          Best,<br>
          <strong style="color: ${colors.primary};">The Pep Planner Team</strong>
        </p>
      </div>
      <div style="background-color: ${colors.sage}; padding: 32px; text-align: center; color: ${colors.textLight}; font-size: 13px;">
        <p style="margin: 0 0 12px 0; font-weight: 600; color: ${colors.text};">The Pep Planner</p>
        <p style="margin: 0 0 16px 0;">Your research management platform</p>
        <p style="margin: 0;">
          <a href="https://thepepplanner.app" style="color: ${colors.primary}; text-decoration: none;">Visit Website</a> • 
          <a href="https://thepepplanner.app/app/dashboard" style="color: ${colors.primary}; text-decoration: none;">Dashboard</a>
        </p>
        <p style="margin: 16px 0 0 0; font-size: 11px; color: ${colors.textLight};">
          © 2025 The Pep Planner. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

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

