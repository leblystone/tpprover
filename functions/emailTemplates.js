// 📧 Email Templates for The Pep Planner
// Using brand sage color palette

// Brand Colors
const COLORS = {
  primary: '#344E41',      // Dark Green
  primaryLight: '#3A5A40', // Medium Green
  secondary: '#A3B18A',    // Light Green
  sage: '#D4D7CD',         // Sage Background
  white: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  border: '#E5E7EB'
};

// Public asset base for images in emails
const ASSET_BASE = process.env.ASSET_BASE_URL || 'https://thepepplanner.app';
const LOGO_URL = `${ASSET_BASE}/tpp_logo.png`;

// Base email wrapper
const emailWrapper = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Pep Planner</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: ${COLORS.sage};
    }
    .email-container {
      max-width: 600px;
      margin: 20px auto;
      background-color: ${COLORS.white};
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryLight} 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .logo-image {
      width: 120px;
      height: auto;
      margin: 0 auto 12px;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
    }
    .logo {
      font-size: 32px;
      font-weight: 700;
      color: ${COLORS.white};
      margin-bottom: 8px;
    }
    .tagline {
      color: ${COLORS.sage};
      font-size: 14px;
      font-weight: 500;
      letter-spacing: 0.5px;
    }
    .content {
      padding: 40px 32px;
      color: ${COLORS.text};
    }
    .button {
      display: inline-block;
      padding: 16px 32px;
      background-color: ${COLORS.primary};
      color: ${COLORS.white} !important;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 600;
      font-size: 16px;
      margin: 24px 0;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .button:hover {
      background-color: ${COLORS.primaryLight};
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }
    .footer {
      background-color: ${COLORS.sage};
      padding: 32px;
      text-align: center;
      color: ${COLORS.textLight};
      font-size: 13px;
    }
    .divider {
      border: none;
      border-top: 2px solid ${COLORS.border};
      margin: 24px 0;
    }
    .highlight-box {
      background-color: #F0FDF4;
      border-left: 4px solid ${COLORS.secondary};
      padding: 16px;
      margin: 20px 0;
      border-radius: 12px;
    }
    .feature-list {
      list-style: none;
      padding: 0;
      margin: 20px 0;
    }
    .feature-list li {
      padding: 12px 0;
      padding-left: 32px;
      position: relative;
    }
    .feature-list li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: ${COLORS.secondary};
      font-weight: bold;
      font-size: 18px;
    }
  </style>
</head>
<body>
  <div style="background-color: ${COLORS.sage}; padding: 20px 0;">
    <div class="email-container">
    <div class="header">
      <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
        <img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" width="120" />
      </a>
        <div class="tagline">Organize Your Research</div>
      </div>
      ${content}
      <div class="footer">
        <p style="margin: 0 0 12px 0; font-weight: 600; color: ${COLORS.text};">The Pep Planner</p>
        <p style="margin: 0 0 16px 0;">Organize Your Research</p>
        <p style="margin: 16px 0 0 0; font-size: 11px; color: ${COLORS.textLight};">
          © 2025 The Pep Planner. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`;

// 🎉 Welcome Email
exports.welcomeEmail = (userName, userEmail) => {
  const content = `
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Welcome to The Pep Planner! 🎉</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Hi there! We're thrilled to have you join our research community.
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        The Pep Planner is your complete research management platform, designed to help you organize protocols, 
        track progress, and optimize your research journey.
      </p>

      <div class="highlight-box">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">🎁 Your Research Trial is Active!</p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: ${COLORS.textLight};">
          Full access to all features. No credit card required.
        </p>
      </div>

      <center>
        <a href="https://thepepplanner.app/app/dashboard" class="button">
          Get Started →
        </a>
      </center>

      <hr class="divider">

      <h2 style="color: ${COLORS.primary}; font-size: 18px; margin: 24px 0 12px 0;">Quick Tips:</h2>
      
      <p style="font-size: 14px; line-height: 1.6; color: ${COLORS.textLight};">
        📱 <strong>Mobile App:</strong> Access from any device – desktop, tablet, or phone<br>
        🎨 <strong>Themes:</strong> Customize your experience with multiple color themes<br>
        📊 <strong>Dashboard:</strong> Personalize your dashboard with draggable widgets<br>
        🔔 <strong>Reminders:</strong> Set up notifications for your research schedule
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Need help getting started? Check out our <a href="https://thepepplanner.app/guide" style="color: ${COLORS.primary};">Quick Start Guide</a> 
        or reach out to our support team.
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Happy researching! 🧪
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

// ===== GIFT ACCESS EMAIL TEMPLATES =====

/**
 * Gift notification email to recipient
 */
exports.giftNotificationEmail = (recipientName, giftGiverName, giftMessage, giftId, subscriptionType) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months', 
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
<img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      <div class="logo">🎁 You've Received a Gift!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Someone Gifted You Research Access!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        ${recipientName ? `Hi ${recipientName},` : 'Hello!'}
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        <strong>${giftGiverName}</strong> has gifted you <strong>${subscriptionText}</strong> of access to The Pep Planner!
      </p>
      
      ${giftMessage ? `
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-style: italic; color: ${COLORS.text};">
          "${giftMessage}"
        </p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: ${COLORS.textLight};">
          - ${giftGiverName}
        </p>
      </div>
      ` : ''}
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">🎁 Your Gift Includes:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li>Full access to all research protocols</li>
          <li>Vendor management and tracking</li>
          <li>Order history and analytics</li>
          <li>Priority support</li>
        </ul>
      </div>
      
      <center>
        <a href="https://thepepplanner.app/redeem-gift?giftId=${giftId}" style="display: inline-block; padding: 16px 32px; background-color: ${COLORS.primary}; color: ${COLORS.white} !important; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 24px 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          🎁 Claim Your Gift
        </a>
      </center>
      
      <p style="font-size: 14px; color: ${COLORS.textLight}; margin-top: 24px;">
        <strong>Important:</strong> This gift expires in 30 days. Claim it soon to start organizing your research!
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

/**
 * Gift purchase confirmation email to giver
 */
exports.giftPurchaseConfirmationEmail = (giftGiverEmail, giftGiverName, recipientEmail, giftMessage, giftId, subscriptionType, pricePaid) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months',
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
<img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      <div class="logo">🎁 Gift Purchase Confirmed!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Your Gift Has Been Sent!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Hi ${giftGiverName},
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Thank you for purchasing a gift subscription! We've sent <strong>${subscriptionText}</strong> of The Pep Planner access to <strong>${recipientEmail}</strong>.
      </p>
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">📧 Gift Details:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li><strong>Recipient:</strong> ${recipientEmail}</li>
          <li><strong>Duration:</strong> ${subscriptionText}</li>
          <li><strong>Amount:</strong> $${pricePaid}</li>
          <li><strong>Gift ID:</strong> ${giftId}</li>
        </ul>
      </div>
      
      ${giftMessage ? `
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">💌 Your Message:</p>
        <p style="margin: 8px 0 0 0; font-style: italic; color: ${COLORS.text};">
          "${giftMessage}"
        </p>
      </div>
      ` : ''}
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        The recipient will receive an email with instructions to claim their gift. They have 30 days to redeem it.
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

/**
 * Gift redeemed confirmation email to recipient
 */
exports.giftRedeemedEmail = (recipientEmail, giftGiverName, subscriptionType, subscriptionEndDate) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months',
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
<img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      <div class="logo">🎉 Gift Successfully Redeemed!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Welcome to The Pep Planner!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Congratulations! You've successfully redeemed the gift from <strong>${giftGiverName}</strong>.
      </p>
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">🎁 Your Access Details:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li><strong>Duration:</strong> ${subscriptionText}</li>
          <li><strong>Access until:</strong> ${subscriptionEndDate.toLocaleDateString()}</li>
          <li><strong>Gift from:</strong> ${giftGiverName}</li>
        </ul>
      </div>
      
      <h2 style="color: ${COLORS.primary}; font-size: 20px; margin: 32px 0 16px 0;">What you can do now:</h2>
      <ul style="list-style: none; padding: 0; margin: 20px 0;">
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Create and manage research protocols
        </li>
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Track vendors and suppliers
        </li>
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Monitor order history and analytics
        </li>
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Access priority support
        </li>
      </ul>
      
      <center>
        <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; padding: 16px 32px; background-color: ${COLORS.primary}; color: ${COLORS.white} !important; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 24px 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          🚀 Start Organizing Your Research
        </a>
      </center>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

/**
 * Gift redeemed notification email to giver
 */
exports.giftRedeemedNotificationEmail = (giftGiverEmail, giftGiverName, recipientEmail, subscriptionType) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months',
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
<img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      <div class="logo">🎉 Your Gift Was Redeemed!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Great News!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Hi ${giftGiverName},
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        <strong>${recipientEmail}</strong> has successfully redeemed your gift of <strong>${subscriptionText}</strong> access to The Pep Planner!
      </p>
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">🎁 Gift Redeemed:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li><strong>Recipient:</strong> ${recipientEmail}</li>
          <li><strong>Duration:</strong> ${subscriptionText}</li>
          <li><strong>Status:</strong> Active and ready to use</li>
        </ul>
      </div>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Thank you for sharing The Pep Planner! Your gift is now helping someone organize their research more effectively.
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

// 🔐 Password Reset
exports.passwordResetEmail = (resetLink, userEmail) => {
  const content = `
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Reset Your Password 🔐</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        We received a request to reset the password for your account (<strong>${userEmail}</strong>).
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Click the button below to create a new password:
      </p>

      <center>
        <a href="${resetLink}" class="button">
          Reset Password
        </a>
      </center>

      <p style="font-size: 14px; color: ${COLORS.textLight}; text-align: center; margin: 16px 0;">
        Or copy and paste this link into your browser:<br>
        <span style="font-size: 12px; word-break: break-all;">${resetLink}</span>
      </p>

      <div class="highlight-box" style="background-color: #FEF2F2; border-left-color: #DC2626;">
        <p style="margin: 0; font-weight: 600; color: #DC2626;">⏱️ This link expires in 1 hour</p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: ${COLORS.textLight};">
          For your security, this password reset link is only valid for 60 minutes.
        </p>
      </div>

      <p style="font-size: 14px; color: ${COLORS.textLight}; margin-top: 24px;">
        If you didn't request a password reset, you can safely ignore this email. 
        Your password won't change unless you click the link above and create a new one.
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

// ===== GIFT ACCESS EMAIL TEMPLATES =====

/**
 * Gift notification email to recipient
 */
exports.giftNotificationEmail = (recipientName, giftGiverName, giftMessage, giftId, subscriptionType) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months', 
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
<img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      <div class="logo">🎁 You've Received a Gift!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Someone Gifted You Research Access!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        ${recipientName ? `Hi ${recipientName},` : 'Hello!'}
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        <strong>${giftGiverName}</strong> has gifted you <strong>${subscriptionText}</strong> of access to The Pep Planner!
      </p>
      
      ${giftMessage ? `
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-style: italic; color: ${COLORS.text};">
          "${giftMessage}"
        </p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: ${COLORS.textLight};">
          - ${giftGiverName}
        </p>
      </div>
      ` : ''}
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">🎁 Your Gift Includes:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li>Full access to all research protocols</li>
          <li>Vendor management and tracking</li>
          <li>Order history and analytics</li>
          <li>Priority support</li>
        </ul>
      </div>
      
      <center>
        <a href="https://thepepplanner.app/redeem-gift?giftId=${giftId}" style="display: inline-block; padding: 16px 32px; background-color: ${COLORS.primary}; color: ${COLORS.white} !important; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 24px 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          🎁 Claim Your Gift
        </a>
      </center>
      
      <p style="font-size: 14px; color: ${COLORS.textLight}; margin-top: 24px;">
        <strong>Important:</strong> This gift expires in 30 days. Claim it soon to start organizing your research!
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

/**
 * Gift purchase confirmation email to giver
 */
exports.giftPurchaseConfirmationEmail = (giftGiverEmail, giftGiverName, recipientEmail, giftMessage, giftId, subscriptionType, pricePaid) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months',
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
<img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      <div class="logo">🎁 Gift Purchase Confirmed!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Your Gift Has Been Sent!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Hi ${giftGiverName},
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Thank you for purchasing a gift subscription! We've sent <strong>${subscriptionText}</strong> of The Pep Planner access to <strong>${recipientEmail}</strong>.
      </p>
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">📧 Gift Details:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li><strong>Recipient:</strong> ${recipientEmail}</li>
          <li><strong>Duration:</strong> ${subscriptionText}</li>
          <li><strong>Amount:</strong> $${pricePaid}</li>
          <li><strong>Gift ID:</strong> ${giftId}</li>
        </ul>
      </div>
      
      ${giftMessage ? `
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">💌 Your Message:</p>
        <p style="margin: 8px 0 0 0; font-style: italic; color: ${COLORS.text};">
          "${giftMessage}"
        </p>
      </div>
      ` : ''}
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        The recipient will receive an email with instructions to claim their gift. They have 30 days to redeem it.
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

/**
 * Gift redeemed confirmation email to recipient
 */
exports.giftRedeemedEmail = (recipientEmail, giftGiverName, subscriptionType, subscriptionEndDate) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months',
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
      <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
        <img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      </a>
      <div class="logo">🎉 Gift Successfully Redeemed!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Welcome to The Pep Planner!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Congratulations! You've successfully redeemed the gift from <strong>${giftGiverName}</strong>.
      </p>
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">🎁 Your Access Details:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li><strong>Duration:</strong> ${subscriptionText}</li>
          <li><strong>Access until:</strong> ${subscriptionEndDate.toLocaleDateString()}</li>
          <li><strong>Gift from:</strong> ${giftGiverName}</li>
        </ul>
      </div>
      
      <h2 style="color: ${COLORS.primary}; font-size: 20px; margin: 32px 0 16px 0;">What you can do now:</h2>
      <ul style="list-style: none; padding: 0; margin: 20px 0;">
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Create and manage research protocols
        </li>
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Track vendors and suppliers
        </li>
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Monitor order history and analytics
        </li>
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Access priority support
        </li>
      </ul>
      
      <center>
        <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; padding: 16px 32px; background-color: ${COLORS.primary}; color: ${COLORS.white} !important; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 24px 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          🚀 Start Organizing Your Research
        </a>
      </center>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

/**
 * Gift redeemed notification email to giver
 */
exports.giftRedeemedNotificationEmail = (giftGiverEmail, giftGiverName, recipientEmail, subscriptionType) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months',
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
      <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
        <img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      </a>
      <div class="logo">🎉 Your Gift Was Redeemed!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Great News!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Hi ${giftGiverName},
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        <strong>${recipientEmail}</strong> has successfully redeemed your gift of <strong>${subscriptionText}</strong> access to The Pep Planner!
      </p>
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">🎁 Gift Redeemed:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li><strong>Recipient:</strong> ${recipientEmail}</li>
          <li><strong>Duration:</strong> ${subscriptionText}</li>
          <li><strong>Status:</strong> Active and ready to use</li>
        </ul>
      </div>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Thank you for sharing The Pep Planner! Your gift is now helping someone organize their research more effectively.
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

// 🔔 Trial Ending Soon
exports.trialEndingEmail = (daysLeft, userEmail, founderState = null) => {
  const baseMonthly = 8.99;
  const baseAnnual = 89.99;
  const baseLifetime = 249.99;

  const discountPercent = founderState?.discountPercent || founderState?.founderDiscountPercent || 0;
  const remainingSpots = founderState?.remaining ?? null;
  const founderActive = founderState && founderState.enabled !== false && (founderState.remaining ?? 0) > 0;

  const founderMonthly = founderActive ? (baseMonthly * (1 - discountPercent / 100)).toFixed(2) : baseMonthly.toFixed(2);
  const founderAnnual = founderActive ? (baseAnnual * (1 - discountPercent / 100)).toFixed(2) : baseAnnual.toFixed(2);
  const founderLifetime = founderActive ? (baseLifetime * (1 - discountPercent / 100)).toFixed(2) : baseLifetime.toFixed(2);

  const planMessage = founderActive
    ? `Founder research plans start at <strong>$${founderMonthly}</strong> (regular $${baseMonthly.toFixed(2)}). ${remainingSpots !== null ? `${remainingSpots} Founder spot${remainingSpots === 1 ? '' : 's'} remain.` : 'Lock in your rate forever.'}`
    : 'Choose from flexible plans starting at $8.99/month';

  const content = `
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Your Trial Ends in ${daysLeft} Days ⏰</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Hi there! We hope you're enjoying The Pep Planner.
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Your 10-day research trial will end in <strong>${daysLeft} day${daysLeft === 1 ? '' : 's'}</strong>. 
        To continue accessing your research data and all features, please choose a subscription plan.
      </p>

      <div class="highlight-box">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">✨ Continue Your Research Journey</p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: ${COLORS.textLight};">
          ${planMessage}
        </p>
        ${founderActive ? `
        <p style="margin: 8px 0 0 0; font-size: 13px; color: ${COLORS.textLight};">
          Founder research rates: $${founderMonthly}/month • $${founderAnnual}/year • $${founderLifetime} lifetime.
        </p>
        ` : ''}
      </div>

      <center>
        <a href="https://thepepplanner.app/app/account" class="button">
          View Plans & Pricing
        </a>
      </center>

      <p style="font-size: 14px; color: ${COLORS.textLight}; margin-top: 24px;">
        After your trial ends, you'll still have read-only access to your data, 
        but you won't be able to add new protocols or make changes until you subscribe.
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

// 💳 Subscription Confirmed
exports.subscriptionConfirmedEmail = (plan, interval, price) => {
  const content = `
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Welcome to ${plan}! 🎉</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Thank you for subscribing to The Pep Planner!
      </p>

      <div class="highlight-box">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">Subscription Details</p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: ${COLORS.text};">
          <strong>Plan:</strong> ${plan}<br>
          <strong>Price:</strong> $${price}/${interval}<br>
          <strong>Status:</strong> Active ✓
        </p>
      </div>

      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        You now have full access to all features. Your subscription will automatically renew, 
        and you can manage your billing at any time from your account settings.
      </p>

      <center>
        <a href="https://thepepplanner.app/app/dashboard" class="button">
          Go to Dashboard
        </a>
      </center>

      <p style="font-size: 14px; color: ${COLORS.textLight}; margin-top: 24px;">
        Need to manage your subscription? Visit your 
        <a href="https://thepepplanner.app/app/account" style="color: ${COLORS.primary};">Account Settings</a> 
        to update payment methods, view invoices, or make changes.
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy researching! 🧪<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

// ===== GIFT ACCESS EMAIL TEMPLATES =====

/**
 * Gift notification email to recipient
 */
exports.giftNotificationEmail = (recipientName, giftGiverName, giftMessage, giftId, subscriptionType) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months', 
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
      <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
        <img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      </a>
      <div class="logo">🎁 You've Received a Gift!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Someone Gifted You Research Access!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        ${recipientName ? `Hi ${recipientName},` : 'Hello!'}
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        <strong>${giftGiverName}</strong> has gifted you <strong>${subscriptionText}</strong> of access to The Pep Planner!
      </p>
      
      ${giftMessage ? `
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-style: italic; color: ${COLORS.text};">
          "${giftMessage}"
        </p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: ${COLORS.textLight};">
          - ${giftGiverName}
        </p>
      </div>
      ` : ''}
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">🎁 Your Gift Includes:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li>Full access to all research protocols</li>
          <li>Vendor management and tracking</li>
          <li>Order history and analytics</li>
          <li>Priority support</li>
        </ul>
      </div>
      
      <center>
        <a href="https://thepepplanner.app/redeem-gift?giftId=${giftId}" style="display: inline-block; padding: 16px 32px; background-color: ${COLORS.primary}; color: ${COLORS.white} !important; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 24px 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          🎁 Claim Your Gift
        </a>
      </center>
      
      <p style="font-size: 14px; color: ${COLORS.textLight}; margin-top: 24px;">
        <strong>Important:</strong> This gift expires in 30 days. Claim it soon to start organizing your research!
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

/**
 * Gift purchase confirmation email to giver
 */
exports.giftPurchaseConfirmationEmail = (giftGiverEmail, giftGiverName, recipientEmail, giftMessage, giftId, subscriptionType, pricePaid) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months',
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
      <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
        <img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      </a>
      <div class="logo">🎁 Gift Purchase Confirmed!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Your Gift Has Been Sent!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Hi ${giftGiverName},
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Thank you for purchasing a gift subscription! We've sent <strong>${subscriptionText}</strong> of The Pep Planner access to <strong>${recipientEmail}</strong>.
      </p>
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">📧 Gift Details:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li><strong>Recipient:</strong> ${recipientEmail}</li>
          <li><strong>Duration:</strong> ${subscriptionText}</li>
          <li><strong>Amount:</strong> $${pricePaid}</li>
          <li><strong>Gift ID:</strong> ${giftId}</li>
        </ul>
      </div>
      
      ${giftMessage ? `
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">💌 Your Message:</p>
        <p style="margin: 8px 0 0 0; font-style: italic; color: ${COLORS.text};">
          "${giftMessage}"
        </p>
      </div>
      ` : ''}
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        The recipient will receive an email with instructions to claim their gift. They have 30 days to redeem it.
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

/**
 * Gift redeemed confirmation email to recipient
 */
exports.giftRedeemedEmail = (recipientEmail, giftGiverName, subscriptionType, subscriptionEndDate) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months',
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
      <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
        <img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      </a>
      <div class="logo">🎉 Gift Successfully Redeemed!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Welcome to The Pep Planner!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Congratulations! You've successfully redeemed the gift from <strong>${giftGiverName}</strong>.
      </p>
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">🎁 Your Access Details:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li><strong>Duration:</strong> ${subscriptionText}</li>
          <li><strong>Access until:</strong> ${subscriptionEndDate.toLocaleDateString()}</li>
          <li><strong>Gift from:</strong> ${giftGiverName}</li>
        </ul>
      </div>
      
      <h2 style="color: ${COLORS.primary}; font-size: 20px; margin: 32px 0 16px 0;">What you can do now:</h2>
      <ul style="list-style: none; padding: 0; margin: 20px 0;">
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Create and manage research protocols
        </li>
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Track vendors and suppliers
        </li>
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Monitor order history and analytics
        </li>
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Access priority support
        </li>
      </ul>
      
      <center>
        <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; padding: 16px 32px; background-color: ${COLORS.primary}; color: ${COLORS.white} !important; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 24px 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          🚀 Start Organizing Your Research
        </a>
      </center>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

/**
 * Gift redeemed notification email to giver
 */
exports.giftRedeemedNotificationEmail = (giftGiverEmail, giftGiverName, recipientEmail, subscriptionType) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months',
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
      <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
        <img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      </a>
      <div class="logo">🎉 Your Gift Was Redeemed!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Great News!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Hi ${giftGiverName},
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        <strong>${recipientEmail}</strong> has successfully redeemed your gift of <strong>${subscriptionText}</strong> access to The Pep Planner!
      </p>
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">🎁 Gift Redeemed:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li><strong>Recipient:</strong> ${recipientEmail}</li>
          <li><strong>Duration:</strong> ${subscriptionText}</li>
          <li><strong>Status:</strong> Active and ready to use</li>
        </ul>
      </div>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Thank you for sharing The Pep Planner! Your gift is now helping someone organize their research more effectively.
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

// 🎁 Lifetime Access Granted Email
exports.lifetimeAccessGrantedEmail = (userEmail, reason) => {
  const content = `
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">🎉 Lifetime Access Granted!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Congratulations! You've been granted <strong>Lifetime Access</strong> to The Pep Planner.
      </p>

      <div class="highlight-box" style="background-color: #FEF3C7; border-left: 4px solid #F59E0B;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">✨ Your Lifetime Access</p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: ${COLORS.text};">
          <strong>Email:</strong> ${userEmail}<br>
          <strong>Reason:</strong> ${reason}<br>
          <strong>Access Level:</strong> Full Platform Access<br>
          <strong>Expires:</strong> Never! 🎊
        </p>
      </div>

      <h2 style="color: ${COLORS.primary}; font-size: 20px; margin: 32px 0 16px 0;">What you get:</h2>
      <ul class="feature-list">
        <li>✓ Unlimited access to all features - forever</li>
        <li>✓ Priority support</li>
        <li>✓ All future updates included</li>
        <li>✓ No recurring payments ever</li>
        <li>✓ Early access to new features</li>
        <li>✓ VIP status in our community</li>
      </ul>

      <center>
        <a href="https://thepepplanner.app/app/dashboard" class="button">
          Access Your Dashboard
        </a>
      </center>

      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Thank you for being part of The Pep Planner family. We're excited to support your research journey! 🧬<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>

      <p style="font-size: 14px; color: ${COLORS.textLight}; margin-top: 24px; padding-top: 24px; border-top: 1px solid ${COLORS.border};">
        Questions about your lifetime access? Reply to this email and we'll be happy to help!
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

// ===== GIFT ACCESS EMAIL TEMPLATES =====

/**
 * Gift notification email to recipient
 */
exports.giftNotificationEmail = (recipientName, giftGiverName, giftMessage, giftId, subscriptionType) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months', 
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
      <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
        <img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      </a>
      <div class="logo">🎁 You've Received a Gift!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Someone Gifted You Research Access!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        ${recipientName ? `Hi ${recipientName},` : 'Hello!'}
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        <strong>${giftGiverName}</strong> has gifted you <strong>${subscriptionText}</strong> of access to The Pep Planner!
      </p>
      
      ${giftMessage ? `
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-style: italic; color: ${COLORS.text};">
          "${giftMessage}"
        </p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: ${COLORS.textLight};">
          - ${giftGiverName}
        </p>
      </div>
      ` : ''}
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">🎁 Your Gift Includes:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li>Full access to all research protocols</li>
          <li>Vendor management and tracking</li>
          <li>Order history and analytics</li>
          <li>Priority support</li>
        </ul>
      </div>
      
      <center>
        <a href="https://thepepplanner.app/redeem-gift?giftId=${giftId}" style="display: inline-block; padding: 16px 32px; background-color: ${COLORS.primary}; color: ${COLORS.white} !important; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 24px 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          🎁 Claim Your Gift
        </a>
      </center>
      
      <p style="font-size: 14px; color: ${COLORS.textLight}; margin-top: 24px;">
        <strong>Important:</strong> This gift expires in 30 days. Claim it soon to start organizing your research!
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

/**
 * Gift purchase confirmation email to giver
 */
exports.giftPurchaseConfirmationEmail = (giftGiverEmail, giftGiverName, recipientEmail, giftMessage, giftId, subscriptionType, pricePaid) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months',
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
      <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
        <img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      </a>
      <div class="logo">🎁 Gift Purchase Confirmed!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Your Gift Has Been Sent!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Hi ${giftGiverName},
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Thank you for purchasing a gift subscription! We've sent <strong>${subscriptionText}</strong> of The Pep Planner access to <strong>${recipientEmail}</strong>.
      </p>
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">📧 Gift Details:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li><strong>Recipient:</strong> ${recipientEmail}</li>
          <li><strong>Duration:</strong> ${subscriptionText}</li>
          <li><strong>Amount:</strong> $${pricePaid}</li>
          <li><strong>Gift ID:</strong> ${giftId}</li>
        </ul>
      </div>
      
      ${giftMessage ? `
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">💌 Your Message:</p>
        <p style="margin: 8px 0 0 0; font-style: italic; color: ${COLORS.text};">
          "${giftMessage}"
        </p>
      </div>
      ` : ''}
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        The recipient will receive an email with instructions to claim their gift. They have 30 days to redeem it.
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

/**
 * Gift redeemed confirmation email to recipient
 */
exports.giftRedeemedEmail = (recipientEmail, giftGiverName, subscriptionType, subscriptionEndDate) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months',
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
      <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
        <img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      </a>
      <div class="logo">🎉 Gift Successfully Redeemed!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Welcome to The Pep Planner!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Congratulations! You've successfully redeemed the gift from <strong>${giftGiverName}</strong>.
      </p>
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">🎁 Your Access Details:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li><strong>Duration:</strong> ${subscriptionText}</li>
          <li><strong>Access until:</strong> ${subscriptionEndDate.toLocaleDateString()}</li>
          <li><strong>Gift from:</strong> ${giftGiverName}</li>
        </ul>
      </div>
      
      <h2 style="color: ${COLORS.primary}; font-size: 20px; margin: 32px 0 16px 0;">What you can do now:</h2>
      <ul style="list-style: none; padding: 0; margin: 20px 0;">
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Create and manage research protocols
        </li>
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Track vendors and suppliers
        </li>
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Monitor order history and analytics
        </li>
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Access priority support
        </li>
      </ul>
      
      <center>
        <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; padding: 16px 32px; background-color: ${COLORS.primary}; color: ${COLORS.white} !important; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 24px 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          🚀 Start Organizing Your Research
        </a>
      </center>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

/**
 * Gift redeemed notification email to giver
 */
exports.giftRedeemedNotificationEmail = (giftGiverEmail, giftGiverName, recipientEmail, subscriptionType) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months',
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
      <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
        <img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      </a>
      <div class="logo">🎉 Your Gift Was Redeemed!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Great News!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Hi ${giftGiverName},
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        <strong>${recipientEmail}</strong> has successfully redeemed your gift of <strong>${subscriptionText}</strong> access to The Pep Planner!
      </p>
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">🎁 Gift Redeemed:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li><strong>Recipient:</strong> ${recipientEmail}</li>
          <li><strong>Duration:</strong> ${subscriptionText}</li>
          <li><strong>Status:</strong> Active and ready to use</li>
        </ul>
      </div>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Thank you for sharing The Pep Planner! Your gift is now helping someone organize their research more effectively.
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

/**
 * Payment Failed Email Template
 */
exports.paymentFailedEmail = (amount, currency, invoiceUrl) => {
  const formattedAmount = amount ? `${currency.toUpperCase()} ${(amount / 100).toFixed(2)}` : 'N/A';
  
  const content = `
    <div class="email-container">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin-bottom: 24px; text-align: center;">
        Payment Failed ⚠️
      </h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        We were unable to process your payment for The Pep Planner subscription.
      </p>

      <div class="highlight-box" style="background-color: #FEE2E2; border-left: 4px solid #EF4444;">
        <p style="margin: 0; font-weight: 600; color: #DC2626;">💳 Payment Details</p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: ${COLORS.text};">
          <strong>Amount:</strong> ${formattedAmount}<br>
          <strong>Status:</strong> Failed<br>
          <strong>Next Action:</strong> Update payment method
        </p>
      </div>

      <h2 style="color: ${COLORS.primary}; font-size: 20px; margin: 32px 0 16px 0;">What happens next:</h2>
      <ul class="feature-list">
        <li>• Your account remains active for now</li>
        <li>• Update your payment method to continue service</li>
        <li>• We'll retry the payment automatically</li>
        <li>• No interruption to your research data</li>
      </ul>

      <center>
        <a href="https://thepepplanner.app/app/account" class="button">
          Update Payment Method
        </a>
      </center>

      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Need help? Our support team is here to assist you.<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

// ===== GIFT ACCESS EMAIL TEMPLATES =====

/**
 * Gift notification email to recipient
 */
exports.giftNotificationEmail = (recipientName, giftGiverName, giftMessage, giftId, subscriptionType) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months', 
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
      <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
        <img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      </a>
      <div class="logo">🎁 You've Received a Gift!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Someone Gifted You Research Access!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        ${recipientName ? `Hi ${recipientName},` : 'Hello!'}
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        <strong>${giftGiverName}</strong> has gifted you <strong>${subscriptionText}</strong> of access to The Pep Planner!
      </p>
      
      ${giftMessage ? `
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-style: italic; color: ${COLORS.text};">
          "${giftMessage}"
        </p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: ${COLORS.textLight};">
          - ${giftGiverName}
        </p>
      </div>
      ` : ''}
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">🎁 Your Gift Includes:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li>Full access to all research protocols</li>
          <li>Vendor management and tracking</li>
          <li>Order history and analytics</li>
          <li>Priority support</li>
        </ul>
      </div>
      
      <center>
        <a href="https://thepepplanner.app/redeem-gift?giftId=${giftId}" style="display: inline-block; padding: 16px 32px; background-color: ${COLORS.primary}; color: ${COLORS.white} !important; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 24px 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          🎁 Claim Your Gift
        </a>
      </center>
      
      <p style="font-size: 14px; color: ${COLORS.textLight}; margin-top: 24px;">
        <strong>Important:</strong> This gift expires in 30 days. Claim it soon to start organizing your research!
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

/**
 * Gift purchase confirmation email to giver
 */
exports.giftPurchaseConfirmationEmail = (giftGiverEmail, giftGiverName, recipientEmail, giftMessage, giftId, subscriptionType, pricePaid) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months',
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
      <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
        <img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      </a>
      <div class="logo">🎁 Gift Purchase Confirmed!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Your Gift Has Been Sent!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Hi ${giftGiverName},
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Thank you for purchasing a gift subscription! We've sent <strong>${subscriptionText}</strong> of The Pep Planner access to <strong>${recipientEmail}</strong>.
      </p>
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">📧 Gift Details:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li><strong>Recipient:</strong> ${recipientEmail}</li>
          <li><strong>Duration:</strong> ${subscriptionText}</li>
          <li><strong>Amount:</strong> $${pricePaid}</li>
          <li><strong>Gift ID:</strong> ${giftId}</li>
        </ul>
      </div>
      
      ${giftMessage ? `
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">💌 Your Message:</p>
        <p style="margin: 8px 0 0 0; font-style: italic; color: ${COLORS.text};">
          "${giftMessage}"
        </p>
      </div>
      ` : ''}
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        The recipient will receive an email with instructions to claim their gift. They have 30 days to redeem it.
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

/**
 * Gift redeemed confirmation email to recipient
 */
exports.giftRedeemedEmail = (recipientEmail, giftGiverName, subscriptionType, subscriptionEndDate) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months',
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
      <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
        <img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      </a>
      <div class="logo">🎉 Gift Successfully Redeemed!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Welcome to The Pep Planner!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Congratulations! You've successfully redeemed the gift from <strong>${giftGiverName}</strong>.
      </p>
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">🎁 Your Access Details:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li><strong>Duration:</strong> ${subscriptionText}</li>
          <li><strong>Access until:</strong> ${subscriptionEndDate.toLocaleDateString()}</li>
          <li><strong>Gift from:</strong> ${giftGiverName}</li>
        </ul>
      </div>
      
      <h2 style="color: ${COLORS.primary}; font-size: 20px; margin: 32px 0 16px 0;">What you can do now:</h2>
      <ul style="list-style: none; padding: 0; margin: 20px 0;">
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Create and manage research protocols
        </li>
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Track vendors and suppliers
        </li>
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Monitor order history and analytics
        </li>
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Access priority support
        </li>
      </ul>
      
      <center>
        <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; padding: 16px 32px; background-color: ${COLORS.primary}; color: ${COLORS.white} !important; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 24px 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          🚀 Start Organizing Your Research
        </a>
      </center>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

/**
 * Gift redeemed notification email to giver
 */
exports.giftRedeemedNotificationEmail = (giftGiverEmail, giftGiverName, recipientEmail, subscriptionType) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months',
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
      <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
        <img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      </a>
      <div class="logo">🎉 Your Gift Was Redeemed!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Great News!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Hi ${giftGiverName},
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        <strong>${recipientEmail}</strong> has successfully redeemed your gift of <strong>${subscriptionText}</strong> access to The Pep Planner!
      </p>
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">🎁 Gift Redeemed:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li><strong>Recipient:</strong> ${recipientEmail}</li>
          <li><strong>Duration:</strong> ${subscriptionText}</li>
          <li><strong>Status:</strong> Active and ready to use</li>
        </ul>
      </div>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Thank you for sharing The Pep Planner! Your gift is now helping someone organize their research more effectively.
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

/**
 * Payment Successful Email Template
 */
exports.paymentSuccessfulEmail = (amount, currency, receiptUrl) => {
  const formattedAmount = amount ? `${currency.toUpperCase()} ${(amount / 100).toFixed(2)}` : 'N/A';
  
  const content = `
    <div class="email-container">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin-bottom: 24px; text-align: center;">
        Payment Confirmed ✅
      </h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Great news! Your payment has been successfully processed.
      </p>

      <div class="highlight-box" style="background-color: #D1FAE5; border-left: 4px solid #10B981;">
        <p style="margin: 0; font-weight: 600; color: #059669;">🎉 Subscription Active</p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: ${COLORS.text};">
          <strong>Amount:</strong> ${formattedAmount}<br>
          <strong>Status:</strong> Paid<br>
          <strong>Access:</strong> All features unlocked
        </p>
      </div>

      <h2 style="color: ${COLORS.primary}; font-size: 20px; margin: 32px 0 16px 0;">Your research data is safe:</h2>
      <ul class="feature-list">
        <li>✓ Full access to all features</li>
        <li>✓ Unlimited protocol creation</li>
        <li>✓ Advanced analytics</li>
        <li>✓ Priority support</li>
      </ul>

      <center>
        <a href="https://thepepplanner.app/app/dashboard" class="button">
          Access Dashboard
        </a>
      </center>

      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Thank you for continuing your research journey with us! 🧬<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

// ===== GIFT ACCESS EMAIL TEMPLATES =====

/**
 * Gift notification email to recipient
 */
exports.giftNotificationEmail = (recipientName, giftGiverName, giftMessage, giftId, subscriptionType) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months', 
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
      <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
        <img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      </a>
      <div class="logo">🎁 You've Received a Gift!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Someone Gifted You Research Access!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        ${recipientName ? `Hi ${recipientName},` : 'Hello!'}
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        <strong>${giftGiverName}</strong> has gifted you <strong>${subscriptionText}</strong> of access to The Pep Planner!
      </p>
      
      ${giftMessage ? `
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-style: italic; color: ${COLORS.text};">
          "${giftMessage}"
        </p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: ${COLORS.textLight};">
          - ${giftGiverName}
        </p>
      </div>
      ` : ''}
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">🎁 Your Gift Includes:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li>Full access to all research protocols</li>
          <li>Vendor management and tracking</li>
          <li>Order history and analytics</li>
          <li>Priority support</li>
        </ul>
      </div>
      
      <center>
        <a href="https://thepepplanner.app/redeem-gift?giftId=${giftId}" style="display: inline-block; padding: 16px 32px; background-color: ${COLORS.primary}; color: ${COLORS.white} !important; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 24px 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          🎁 Claim Your Gift
        </a>
      </center>
      
      <p style="font-size: 14px; color: ${COLORS.textLight}; margin-top: 24px;">
        <strong>Important:</strong> This gift expires in 30 days. Claim it soon to start organizing your research!
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

/**
 * Gift purchase confirmation email to giver
 */
exports.giftPurchaseConfirmationEmail = (giftGiverEmail, giftGiverName, recipientEmail, giftMessage, giftId, subscriptionType, pricePaid) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months',
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
      <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
        <img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      </a>
      <div class="logo">🎁 Gift Purchase Confirmed!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Your Gift Has Been Sent!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Hi ${giftGiverName},
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Thank you for purchasing a gift subscription! We've sent <strong>${subscriptionText}</strong> of The Pep Planner access to <strong>${recipientEmail}</strong>.
      </p>
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">📧 Gift Details:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li><strong>Recipient:</strong> ${recipientEmail}</li>
          <li><strong>Duration:</strong> ${subscriptionText}</li>
          <li><strong>Amount:</strong> $${pricePaid}</li>
          <li><strong>Gift ID:</strong> ${giftId}</li>
        </ul>
      </div>
      
      ${giftMessage ? `
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">💌 Your Message:</p>
        <p style="margin: 8px 0 0 0; font-style: italic; color: ${COLORS.text};">
          "${giftMessage}"
        </p>
      </div>
      ` : ''}
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        The recipient will receive an email with instructions to claim their gift. They have 30 days to redeem it.
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

/**
 * Gift redeemed confirmation email to recipient
 */
exports.giftRedeemedEmail = (recipientEmail, giftGiverName, subscriptionType, subscriptionEndDate) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months',
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
      <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
        <img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      </a>
      <div class="logo">🎉 Gift Successfully Redeemed!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Welcome to The Pep Planner!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Congratulations! You've successfully redeemed the gift from <strong>${giftGiverName}</strong>.
      </p>
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">🎁 Your Access Details:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li><strong>Duration:</strong> ${subscriptionText}</li>
          <li><strong>Access until:</strong> ${subscriptionEndDate.toLocaleDateString()}</li>
          <li><strong>Gift from:</strong> ${giftGiverName}</li>
        </ul>
      </div>
      
      <h2 style="color: ${COLORS.primary}; font-size: 20px; margin: 32px 0 16px 0;">What you can do now:</h2>
      <ul style="list-style: none; padding: 0; margin: 20px 0;">
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Create and manage research protocols
        </li>
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Track vendors and suppliers
        </li>
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Monitor order history and analytics
        </li>
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Access priority support
        </li>
      </ul>
      
      <center>
        <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; padding: 16px 32px; background-color: ${COLORS.primary}; color: ${COLORS.white} !important; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 24px 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          🚀 Start Organizing Your Research
        </a>
      </center>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

/**
 * Gift redeemed notification email to giver
 */
exports.giftRedeemedNotificationEmail = (giftGiverEmail, giftGiverName, recipientEmail, subscriptionType) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months',
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
      <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
        <img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      </a>
      <div class="logo">🎉 Your Gift Was Redeemed!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Great News!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Hi ${giftGiverName},
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        <strong>${recipientEmail}</strong> has successfully redeemed your gift of <strong>${subscriptionText}</strong> access to The Pep Planner!
      </p>
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">🎁 Gift Redeemed:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li><strong>Recipient:</strong> ${recipientEmail}</li>
          <li><strong>Duration:</strong> ${subscriptionText}</li>
          <li><strong>Status:</strong> Active and ready to use</li>
        </ul>
      </div>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Thank you for sharing The Pep Planner! Your gift is now helping someone organize their research more effectively.
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

/**
 * Subscription Cancelled Email Template
 */
exports.subscriptionCancelledEmail = (planName, endDate) => {
  const content = `
    <div class="email-container">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin-bottom: 24px; text-align: center;">
        Subscription Cancelled 📋
      </h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        We're sorry to see you go! Your subscription has been cancelled.
      </p>

      <div class="highlight-box" style="background-color: #FEF3C7; border-left: 4px solid #F59E0B;">
        <p style="margin: 0; font-weight: 600; color: #D97706;">📊 Your Research Data</p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: ${COLORS.text};">
          <strong>Plan:</strong> ${planName || 'Pro Plan'}<br>
          <strong>Access Until:</strong> ${endDate || 'End of billing period'}<br>
          <strong>Data:</strong> Remains accessible until then
        </p>
      </div>

      <h2 style="color: ${COLORS.primary}; font-size: 20px; margin: 32px 0 16px 0;">What happens next:</h2>
      <ul class="feature-list">
        <li>• You'll continue to have access until ${endDate || 'the end of your billing period'}</li>
        <li>• Export your research data if needed</li>
        <li>• Reactivate anytime before access expires</li>
        <li>• Your data will be safely stored for 90 days after expiration</li>
      </ul>

      <center>
        <a href="https://thepepplanner.app/app/account" class="button">
          Reactivate Subscription
        </a>
      </center>

      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        We hope you'll consider rejoining us in the future. Thank you for being part of our research community! 🧬<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

// ===== GIFT ACCESS EMAIL TEMPLATES =====

/**
 * Gift notification email to recipient
 */
exports.giftNotificationEmail = (recipientName, giftGiverName, giftMessage, giftId, subscriptionType) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months', 
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
      <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
        <img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      </a>
      <div class="logo">🎁 You've Received a Gift!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Someone Gifted You Research Access!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        ${recipientName ? `Hi ${recipientName},` : 'Hello!'}
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        <strong>${giftGiverName}</strong> has gifted you <strong>${subscriptionText}</strong> of access to The Pep Planner!
      </p>
      
      ${giftMessage ? `
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-style: italic; color: ${COLORS.text};">
          "${giftMessage}"
        </p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: ${COLORS.textLight};">
          - ${giftGiverName}
        </p>
      </div>
      ` : ''}
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">🎁 Your Gift Includes:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li>Full access to all research protocols</li>
          <li>Vendor management and tracking</li>
          <li>Order history and analytics</li>
          <li>Priority support</li>
        </ul>
      </div>
      
      <center>
        <a href="https://thepepplanner.app/redeem-gift?giftId=${giftId}" style="display: inline-block; padding: 16px 32px; background-color: ${COLORS.primary}; color: ${COLORS.white} !important; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 24px 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          🎁 Claim Your Gift
        </a>
      </center>
      
      <p style="font-size: 14px; color: ${COLORS.textLight}; margin-top: 24px;">
        <strong>Important:</strong> This gift expires in 30 days. Claim it soon to start organizing your research!
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

/**
 * Gift purchase confirmation email to giver
 */
exports.giftPurchaseConfirmationEmail = (giftGiverEmail, giftGiverName, recipientEmail, giftMessage, giftId, subscriptionType, pricePaid) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months',
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
      <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
        <img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      </a>
      <div class="logo">🎁 Gift Purchase Confirmed!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Your Gift Has Been Sent!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Hi ${giftGiverName},
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Thank you for purchasing a gift subscription! We've sent <strong>${subscriptionText}</strong> of The Pep Planner access to <strong>${recipientEmail}</strong>.
      </p>
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">📧 Gift Details:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li><strong>Recipient:</strong> ${recipientEmail}</li>
          <li><strong>Duration:</strong> ${subscriptionText}</li>
          <li><strong>Amount:</strong> $${pricePaid}</li>
          <li><strong>Gift ID:</strong> ${giftId}</li>
        </ul>
      </div>
      
      ${giftMessage ? `
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">💌 Your Message:</p>
        <p style="margin: 8px 0 0 0; font-style: italic; color: ${COLORS.text};">
          "${giftMessage}"
        </p>
      </div>
      ` : ''}
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        The recipient will receive an email with instructions to claim their gift. They have 30 days to redeem it.
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

/**
 * Gift redeemed confirmation email to recipient
 */
exports.giftRedeemedEmail = (recipientEmail, giftGiverName, subscriptionType, subscriptionEndDate) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months',
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
      <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
        <img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      </a>
      <div class="logo">🎉 Gift Successfully Redeemed!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Welcome to The Pep Planner!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Congratulations! You've successfully redeemed the gift from <strong>${giftGiverName}</strong>.
      </p>
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">🎁 Your Access Details:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li><strong>Duration:</strong> ${subscriptionText}</li>
          <li><strong>Access until:</strong> ${subscriptionEndDate.toLocaleDateString()}</li>
          <li><strong>Gift from:</strong> ${giftGiverName}</li>
        </ul>
      </div>
      
      <h2 style="color: ${COLORS.primary}; font-size: 20px; margin: 32px 0 16px 0;">What you can do now:</h2>
      <ul style="list-style: none; padding: 0; margin: 20px 0;">
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Create and manage research protocols
        </li>
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Track vendors and suppliers
        </li>
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Monitor order history and analytics
        </li>
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Access priority support
        </li>
      </ul>
      
      <center>
        <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; padding: 16px 32px; background-color: ${COLORS.primary}; color: ${COLORS.white} !important; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 24px 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          🚀 Start Organizing Your Research
        </a>
      </center>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

/**
 * Gift redeemed notification email to giver
 */
exports.giftRedeemedNotificationEmail = (giftGiverEmail, giftGiverName, recipientEmail, subscriptionType) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months',
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
      <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
        <img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      </a>
      <div class="logo">🎉 Your Gift Was Redeemed!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Great News!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Hi ${giftGiverName},
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        <strong>${recipientEmail}</strong> has successfully redeemed your gift of <strong>${subscriptionText}</strong> access to The Pep Planner!
      </p>
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">🎁 Gift Redeemed:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li><strong>Recipient:</strong> ${recipientEmail}</li>
          <li><strong>Duration:</strong> ${subscriptionText}</li>
          <li><strong>Status:</strong> Active and ready to use</li>
        </ul>
      </div>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Thank you for sharing The Pep Planner! Your gift is now helping someone organize their research more effectively.
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

/**
 * Renewal Reminder Email Template
 */
exports.renewalReminderEmail = (planName) => {
  const content = `
    <div class="email-container">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin-bottom: 24px; text-align: center;">
        Subscription Renewal in 3 Days ⏰
      </h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Your The Pep Planner subscription will automatically renew in 3 days.
      </p>

      <div class="highlight-box" style="background-color: #DBEAFE; border-left: 4px solid #3B82F6;">
        <p style="margin: 0; font-weight: 600; color: #1D4ED8;">💳 Automatic Renewal</p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: ${COLORS.text};">
          <strong>Plan:</strong> ${planName || 'Pro Plan'}<br>
          <strong>Renewal Date:</strong> In 3 days<br>
          <strong>Action Required:</strong> None - automatic renewal
        </p>
      </div>

      <h2 style="color: ${COLORS.primary}; font-size: 20px; margin: 32px 0 16px 0;">No action needed:</h2>
      <ul class="feature-list">
        <li>✓ Your payment method will be charged automatically</li>
        <li>✓ Your subscription will continue seamlessly</li>
        <li>✓ All your research data remains safe</li>
        <li>✓ Update payment method if needed</li>
      </ul>

      <center>
        <a href="https://thepepplanner.app/app/account" class="button">
          Manage Subscription
        </a>
      </center>

      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Thank you for continuing your research journey with us! 🧬<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

// ===== GIFT ACCESS EMAIL TEMPLATES =====

/**
 * Gift notification email to recipient
 */
exports.giftNotificationEmail = (recipientName, giftGiverName, giftMessage, giftId, subscriptionType) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months', 
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
      <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
        <img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      </a>
      <div class="logo">🎁 You've Received a Gift!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Someone Gifted You Research Access!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        ${recipientName ? `Hi ${recipientName},` : 'Hello!'}
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        <strong>${giftGiverName}</strong> has gifted you <strong>${subscriptionText}</strong> of access to The Pep Planner!
      </p>
      
      ${giftMessage ? `
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-style: italic; color: ${COLORS.text};">
          "${giftMessage}"
        </p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: ${COLORS.textLight};">
          - ${giftGiverName}
        </p>
      </div>
      ` : ''}
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">🎁 Your Gift Includes:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li>Full access to all research protocols</li>
          <li>Vendor management and tracking</li>
          <li>Order history and analytics</li>
          <li>Priority support</li>
        </ul>
      </div>
      
      <center>
        <a href="https://thepepplanner.app/redeem-gift?giftId=${giftId}" style="display: inline-block; padding: 16px 32px; background-color: ${COLORS.primary}; color: ${COLORS.white} !important; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 24px 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          🎁 Claim Your Gift
        </a>
      </center>
      
      <p style="font-size: 14px; color: ${COLORS.textLight}; margin-top: 24px;">
        <strong>Important:</strong> This gift expires in 30 days. Claim it soon to start organizing your research!
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

/**
 * Gift purchase confirmation email to giver
 */
exports.giftPurchaseConfirmationEmail = (giftGiverEmail, giftGiverName, recipientEmail, giftMessage, giftId, subscriptionType, pricePaid) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months',
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
      <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
        <img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      </a>
      <div class="logo">🎁 Gift Purchase Confirmed!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Your Gift Has Been Sent!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Hi ${giftGiverName},
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Thank you for purchasing a gift subscription! We've sent <strong>${subscriptionText}</strong> of The Pep Planner access to <strong>${recipientEmail}</strong>.
      </p>
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">📧 Gift Details:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li><strong>Recipient:</strong> ${recipientEmail}</li>
          <li><strong>Duration:</strong> ${subscriptionText}</li>
          <li><strong>Amount:</strong> $${pricePaid}</li>
          <li><strong>Gift ID:</strong> ${giftId}</li>
        </ul>
      </div>
      
      ${giftMessage ? `
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">💌 Your Message:</p>
        <p style="margin: 8px 0 0 0; font-style: italic; color: ${COLORS.text};">
          "${giftMessage}"
        </p>
      </div>
      ` : ''}
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        The recipient will receive an email with instructions to claim their gift. They have 30 days to redeem it.
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

/**
 * Gift redeemed confirmation email to recipient
 */
exports.giftRedeemedEmail = (recipientEmail, giftGiverName, subscriptionType, subscriptionEndDate) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months',
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
      <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
        <img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      </a>
      <div class="logo">🎉 Gift Successfully Redeemed!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Welcome to The Pep Planner!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Congratulations! You've successfully redeemed the gift from <strong>${giftGiverName}</strong>.
      </p>
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">🎁 Your Access Details:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li><strong>Duration:</strong> ${subscriptionText}</li>
          <li><strong>Access until:</strong> ${subscriptionEndDate.toLocaleDateString()}</li>
          <li><strong>Gift from:</strong> ${giftGiverName}</li>
        </ul>
      </div>
      
      <h2 style="color: ${COLORS.primary}; font-size: 20px; margin: 32px 0 16px 0;">What you can do now:</h2>
      <ul style="list-style: none; padding: 0; margin: 20px 0;">
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Create and manage research protocols
        </li>
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Track vendors and suppliers
        </li>
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Monitor order history and analytics
        </li>
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Access priority support
        </li>
      </ul>
      
      <center>
        <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; padding: 16px 32px; background-color: ${COLORS.primary}; color: ${COLORS.white} !important; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 24px 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          🚀 Start Organizing Your Research
        </a>
      </center>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

/**
 * Gift redeemed notification email to giver
 */
exports.giftRedeemedNotificationEmail = (giftGiverEmail, giftGiverName, recipientEmail, subscriptionType) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months',
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
      <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
        <img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      </a>
      <div class="logo">🎉 Your Gift Was Redeemed!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Great News!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Hi ${giftGiverName},
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        <strong>${recipientEmail}</strong> has successfully redeemed your gift of <strong>${subscriptionText}</strong> access to The Pep Planner!
      </p>
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">🎁 Gift Redeemed:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li><strong>Recipient:</strong> ${recipientEmail}</li>
          <li><strong>Duration:</strong> ${subscriptionText}</li>
          <li><strong>Status:</strong> Active and ready to use</li>
        </ul>
      </div>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Thank you for sharing The Pep Planner! Your gift is now helping someone organize their research more effectively.
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

/**
 * Weekly Research Reminder Email Template
 */
exports.weeklyResearchReminderEmail = (firstName) => {
  const content = `
    <div class="email-container">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin-bottom: 24px; text-align: center;">
        Weekly Research Check-in 🧬
      </h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Hi ${firstName || 'Researcher'}! Time for your weekly research check-in.
      </p>

      <div class="highlight-box" style="background-color: #F3E8FF; border-left: 4px solid #8B5CF6;">
        <p style="margin: 0; font-weight: 600; color: #7C3AED;">📊 This Week's Focus</p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: ${COLORS.text};">
          Review your protocols, update your progress, and plan ahead for optimal research outcomes.
        </p>
      </div>

      <h2 style="color: ${COLORS.primary}; font-size: 20px; margin: 32px 0 16px 0;">Quick weekly tasks:</h2>
      <ul class="feature-list">
        <li>📋 Review and update your active protocols</li>
        <li>📈 Check your progress metrics</li>
        <li>📦 Review upcoming orders and inventory</li>
        <li>📝 Document any new findings or observations</li>
        <li>🎯 Set goals for the upcoming week</li>
      </ul>

      <center>
        <a href="https://thepepplanner.app/app/dashboard" class="button">
          View Dashboard
        </a>
      </center>

      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Consistency is key to successful research. Keep up the great work! 🚀<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>

      <p style="font-size: 14px; color: ${COLORS.textLight}; margin-top: 24px; padding-top: 24px; border-top: 1px solid ${COLORS.border};">
        Don't want weekly reminders? <a href="https://thepepplanner.app/app/settings" style="color: ${COLORS.primary};">Update your preferences</a>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

// ===== GIFT ACCESS EMAIL TEMPLATES =====

/**
 * Gift notification email to recipient
 */
exports.giftNotificationEmail = (recipientName, giftGiverName, giftMessage, giftId, subscriptionType) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months', 
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
      <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
        <img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      </a>
      <div class="logo">🎁 You've Received a Gift!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Someone Gifted You Research Access!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        ${recipientName ? `Hi ${recipientName},` : 'Hello!'}
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        <strong>${giftGiverName}</strong> has gifted you <strong>${subscriptionText}</strong> of access to The Pep Planner!
      </p>
      
      ${giftMessage ? `
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-style: italic; color: ${COLORS.text};">
          "${giftMessage}"
        </p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: ${COLORS.textLight};">
          - ${giftGiverName}
        </p>
      </div>
      ` : ''}
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">🎁 Your Gift Includes:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li>Full access to all research protocols</li>
          <li>Vendor management and tracking</li>
          <li>Order history and analytics</li>
          <li>Priority support</li>
        </ul>
      </div>
      
      <center>
        <a href="https://thepepplanner.app/redeem-gift?giftId=${giftId}" style="display: inline-block; padding: 16px 32px; background-color: ${COLORS.primary}; color: ${COLORS.white} !important; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 24px 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          🎁 Claim Your Gift
        </a>
      </center>
      
      <p style="font-size: 14px; color: ${COLORS.textLight}; margin-top: 24px;">
        <strong>Important:</strong> This gift expires in 30 days. Claim it soon to start organizing your research!
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

/**
 * Gift purchase confirmation email to giver
 */
exports.giftPurchaseConfirmationEmail = (giftGiverEmail, giftGiverName, recipientEmail, giftMessage, giftId, subscriptionType, pricePaid) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months',
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
      <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
        <img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      </a>
      <div class="logo">🎁 Gift Purchase Confirmed!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Your Gift Has Been Sent!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Hi ${giftGiverName},
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Thank you for purchasing a gift subscription! We've sent <strong>${subscriptionText}</strong> of The Pep Planner access to <strong>${recipientEmail}</strong>.
      </p>
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">📧 Gift Details:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li><strong>Recipient:</strong> ${recipientEmail}</li>
          <li><strong>Duration:</strong> ${subscriptionText}</li>
          <li><strong>Amount:</strong> $${pricePaid}</li>
          <li><strong>Gift ID:</strong> ${giftId}</li>
        </ul>
      </div>
      
      ${giftMessage ? `
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">💌 Your Message:</p>
        <p style="margin: 8px 0 0 0; font-style: italic; color: ${COLORS.text};">
          "${giftMessage}"
        </p>
      </div>
      ` : ''}
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        The recipient will receive an email with instructions to claim their gift. They have 30 days to redeem it.
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

/**
 * Gift redeemed confirmation email to recipient
 */
exports.giftRedeemedEmail = (recipientEmail, giftGiverName, subscriptionType, subscriptionEndDate) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months',
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
      <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
        <img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      </a>
      <div class="logo">🎉 Gift Successfully Redeemed!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Welcome to The Pep Planner!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Congratulations! You've successfully redeemed the gift from <strong>${giftGiverName}</strong>.
      </p>
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">🎁 Your Access Details:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li><strong>Duration:</strong> ${subscriptionText}</li>
          <li><strong>Access until:</strong> ${subscriptionEndDate.toLocaleDateString()}</li>
          <li><strong>Gift from:</strong> ${giftGiverName}</li>
        </ul>
      </div>
      
      <h2 style="color: ${COLORS.primary}; font-size: 20px; margin: 32px 0 16px 0;">What you can do now:</h2>
      <ul style="list-style: none; padding: 0; margin: 20px 0;">
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Create and manage research protocols
        </li>
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Track vendors and suppliers
        </li>
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Monitor order history and analytics
        </li>
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Access priority support
        </li>
      </ul>
      
      <center>
        <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; padding: 16px 32px; background-color: ${COLORS.primary}; color: ${COLORS.white} !important; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 24px 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          🚀 Start Organizing Your Research
        </a>
      </center>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

/**
 * Gift redeemed notification email to giver
 */
exports.giftRedeemedNotificationEmail = (giftGiverEmail, giftGiverName, recipientEmail, subscriptionType) => {
  const subscriptionText = {
    monthly: '1 month',
    quarterly: '3 months',
    annual: '1 year'
  }[subscriptionType] || subscriptionType;

  const content = `
    <div class="header">
      <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
        <img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      </a>
      <div class="logo">🎉 Your Gift Was Redeemed!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Great News!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Hi ${giftGiverName},
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        <strong>${recipientEmail}</strong> has successfully redeemed your gift of <strong>${subscriptionText}</strong> access to The Pep Planner!
      </p>
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">🎁 Gift Redeemed:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${COLORS.text};">
          <li><strong>Recipient:</strong> ${recipientEmail}</li>
          <li><strong>Duration:</strong> ${subscriptionText}</li>
          <li><strong>Status:</strong> Active and ready to use</li>
        </ul>
      </div>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Thank you for sharing The Pep Planner! Your gift is now helping someone organize their research more effectively.
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Happy Researching! ✌🏻,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

/**
 * Gift Subscription Expiring Soon Email Template
 */
exports.giftExpiringSoonEmail = (recipientEmail, planName, daysLeft, giftGiverName) => {
  const content = `
    <div class="header">
      <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
        <img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      </a>
      <div class="logo">Organize Your Research</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">🎁 Your Gifted Research Time Is Ending Soon</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Hi ${recipientEmail.split('@')[0]},
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Your gifted <strong>${planName || 'The Pep Planner'}</strong> subscription from ${giftGiverName ? giftGiverName : 'a friend'} is ending in <strong>${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}</strong>.
      </p>
      
      <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: #92400E;">⏰ Time Remaining:</p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: ${COLORS.text};">
          <strong>Expires:</strong> In ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}<br>
          <strong>Plan:</strong> ${planName || 'Pro Plan'}<br>
          <strong>Status:</strong> Active until expiration
        </p>
      </div>
      
      <h2 style="color: ${COLORS.primary}; font-size: 20px; margin: 32px 0 16px 0;">Continue Your Research Journey!</h2>
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Don't let your research organization stop! Extend your access with one of our flexible plans:
      </p>
      <ul class="feature-list" style="margin: 16px 0; padding-left: 20px; color: ${COLORS.text};">
        <li>✓ Continue organizing your research seamlessly</li>
        <li>✓ Keep all your data and research notes</li>
        <li>✓ Choose from monthly, quarterly, or annual plans</li>
        <li>✓ Flexible pricing to fit your research needs</li>
      </ul>

      <center>
        <a href="https://thepepplanner.app/app/account" style="display: inline-block; padding: 16px 32px; background-color: ${COLORS.primary}; color: ${COLORS.white} !important; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 24px 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          🚀 Extend Your Research Plan
        </a>
      </center>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Thank you for using The Pep Planner! We hope you've found it helpful for organizing your research.<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

