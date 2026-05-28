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

// 📊 Trial Expired Survey
exports.trialExpiredSurveyEmail = (userName, userEmail, surveyLink = null) => {
  const surveyUrl = surveyLink || 'https://docs.google.com/forms/d/e/1FAIpQLSfWCDthbS9tBOY-L-XhF4hzYcC6Dd3eXr9cDFANc7-uVJx-eg/viewform?usp=header';
  
  const content = `
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">We'd Love Your Feedback! 📊</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Hey there!
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Your trial period has ended, and we'd love to hear about your experience with The Pep Planner. 
        Your feedback helps us improve the platform for researchers like you.
      </p>

      <div class="highlight-box">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">📗As a thank you; 14 day trial extension!</p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: ${COLORS.textLight};">
          Complete this quick survey (less than 2 minutes) and we'll extend your trial by 14 days so you can continue your research!
        </p>
      </div>

      <center>
        <a href="${surveyUrl}" class="button">
          Take Survey
        </a>
      </center>

      <h2 style="color: ${COLORS.primary}; font-size: 20px; margin: 32px 0 16px 0;">What we'd like to know:</h2>
      <ul style="list-style: none; padding: 0; margin: 20px 0;">
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          What features did you find most useful?
        </li>
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          What could we improve?
        </li>
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          What features would you like to see?
        </li>
        <li style="padding: 12px 0; padding-left: 32px; position: relative;">
          <span style="position: absolute; left: 0; color: ${COLORS.secondary}; font-weight: bold; font-size: 18px;">✓</span>
          Get 14 days of free access upon completion
        </li>
      </ul>

      <p style="font-size: 14px; color: ${COLORS.textLight}; margin-top: 24px;">
        Thank you for trying The Pep Planner! If you'd like to continue your research journey, 
        <a href="https://thepepplanner.app/app/account" style="color: ${COLORS.primary};">check out our subscription plans</a>.
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
        and you can manage your billing at any time from your Account.
      </p>

      <center>
        <a href="https://thepepplanner.app/app/dashboard" class="button">
          Go to Dashboard
        </a>
      </center>

      <p style="font-size: 14px; color: ${COLORS.textLight}; margin-top: 24px;">
        Need to manage your subscription? Visit your 
        <a href="https://thepepplanner.app/app/account" style="color: ${COLORS.primary};">Account</a> 
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
 * Shows a personalised analytics digest (this week vs last week) with a single CTA.
 */
exports.weeklyResearchReminderEmail = (firstName, summary = {}) => {
  const {
    thisWeekTotal  = 0,
    lastWeekTotal  = 0,
    thisWeekDays   = 0,
    delta          = 0,
    activeProtocols = [],
    lowStockCount  = 0,
    lowStockItems  = [],
    hasData        = false
  } = summary;

  const deltaLabel = (() => {
    if (lastWeekTotal === 0 && thisWeekTotal > 0) return `<span style="color:#16A34A; font-weight:600;">New activity this week! 🎉</span>`;
    if (delta > 0)  return `<span style="color:#16A34A; font-weight:600;">↑ ${delta} more than last week</span>`;
    if (delta < 0)  return `<span style="color:#DC2626; font-weight:600;">↓ ${Math.abs(delta)} fewer than last week</span>`;
    if (lastWeekTotal > 0) return `<span style="color:#6B7280;">Same as last week</span>`;
    return `<span style="color:#6B7280;">No logged doses yet this week</span>`;
  })();

  const protocolsLine = activeProtocols.length
    ? activeProtocols.join(', ')
    : 'No active protocols';

  const lowStockLine = lowStockCount > 0
    ? `<div class="highlight-box" style="background-color:#FEF3C7; border-left:4px solid #F59E0B; margin-top:16px;">
        <p style="margin:0; font-weight:600; color:#D97706;">⚠️ Low Stockpile Alert</p>
        <p style="margin:6px 0 0 0; font-size:14px; color:${COLORS.text};">${lowStockItems.join(', ')}${lowStockCount > lowStockItems.length ? ` +${lowStockCount - lowStockItems.length} more` : ''} running low</p>
      </div>`
    : '';

  const statsBlock = hasData
    ? `<div class="highlight-box" style="background-color:#F3E8FF; border-left:4px solid #8B5CF6;">
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="padding:8px 16px 8px 0; vertical-align:top; width:50%;">
              <p style="margin:0; font-size:13px; color:${COLORS.textLight}; text-transform:uppercase; letter-spacing:0.05em;">Doses Logged</p>
              <p style="margin:4px 0 2px 0; font-size:28px; font-weight:700; color:#7C3AED;">${thisWeekTotal}</p>
              <p style="margin:0; font-size:13px;">${deltaLabel}</p>
            </td>
            <td style="padding:8px 0 8px 16px; vertical-align:top; border-left:1px solid #DDD6FE;">
              <p style="margin:0; font-size:13px; color:${COLORS.textLight}; text-transform:uppercase; letter-spacing:0.05em;">Active Days</p>
              <p style="margin:4px 0 2px 0; font-size:28px; font-weight:700; color:#7C3AED;">${thisWeekDays}<span style="font-size:16px; font-weight:400; color:${COLORS.textLight};"> / 7</span></p>
              <p style="margin:0; font-size:13px; color:${COLORS.textLight};">days with logged activity</p>
            </td>
          </tr>
        </table>
      </div>
      <p style="font-size:14px; color:${COLORS.textLight}; margin:12px 0 0 0;">
        <strong style="color:${COLORS.text};">Active protocols:</strong> ${protocolsLine}
      </p>
      ${lowStockLine}`
    : `<div class="highlight-box" style="background-color:#F3F4F6; border-left:4px solid #9CA3AF;">
        <p style="margin:0; font-size:15px; color:${COLORS.text};">No logged activity yet this week — your progress report will show up here once you start logging.</p>
      </div>`;

  const content = `
    <div class="email-container">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin-bottom: 8px; text-align: center;">
        Your Weekly Summary 📊
      </h1>
      <p style="text-align:center; font-size:16px; color:${COLORS.textLight}; margin:0 0 24px 0;">
        Hi ${firstName || 'Researcher'} — here's how your research went this week.
      </p>

      ${statsBlock}

      <center style="margin-top:32px;">
        <a href="https://thepepplanner.app/app/analytics" class="button">
          View Full Analytics →
        </a>
      </center>

      <p style="font-size:16px; line-height:1.6; color:${COLORS.text}; margin-top:32px;">
        Keep it up! ✌️<br>
        <strong style="color:${COLORS.primary};">The Pep Planner Team</strong>
      </p>

      <p style="font-size:14px; color:${COLORS.textLight}; margin-top:24px; padding-top:24px; border-top:1px solid ${COLORS.border};">
        Don't want weekly summaries? <a href="https://thepepplanner.app/app/settings" style="color:${COLORS.primary};">Update your preferences</a>
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

/**
 * Trial Extension Email
 * Sent when admin manually extends a user's trial period
 */
exports.trialExtensionEmail = (userName, userEmail, daysAdded, newEndDate, adminNote) => {
  // Format the end date nicely
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch (e) {
      return dateString;
    }
  };

  const formattedEndDate = formatDate(newEndDate);
  const displayName = userName || userEmail.split('@')[0];

  const content = `
    <div class="header">
      <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
        <img src="${LOGO_URL}" alt="The Pep Planner" class="logo-image" />
      </a>
      <div class="logo">🎉 Great News!</div>
    </div>
    
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Your Research Trial Has Been Extended!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Hi ${displayName},
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        We've extended your research trial access to The Pep Planner! You now have <strong>${daysAdded} additional ${daysAdded === 1 ? 'day' : 'days'}</strong> to explore all the features.
      </p>
      
      <div style="background-color: #F0FDF4; border-left: 4px solid ${COLORS.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">⏰ Updated Trial Period:</p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: ${COLORS.text};">
          <strong>Additional Days:</strong> ${daysAdded} ${daysAdded === 1 ? 'day' : 'days'}<br>
          <strong>New End Date:</strong> ${formattedEndDate}<br>
          <strong>Status:</strong> Active
        </p>
      </div>
      
      ${adminNote ? `
      <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: #1E40AF;">💬 Note from our team:</p>
        <p style="margin: 8px 0 0 0; font-style: italic; color: ${COLORS.text};">
          "${adminNote}"
        </p>
      </div>
      ` : ''}
      
      <h2 style="color: ${COLORS.primary}; font-size: 20px; margin: 32px 0 16px 0;">Make the Most of Your Extended Trial</h2>
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        During your extended trial, you have full access to:
      </p>
      <ul class="feature-list" style="margin: 16px 0; padding-left: 20px; color: ${COLORS.text};">
        <li>✓ Unlimited research protocol tracking</li>
        <li>✓ Vendor management and comparison</li>
        <li>✓ Order history and analytics</li>
        <li>✓ Lab access tracking and planning</li>
        <li>✓ Comprehensive research notes</li>
      </ul>

      <center>
        <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; padding: 16px 32px; background-color: ${COLORS.primary}; color: ${COLORS.white} !important; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 24px 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          🔬 Continue Your Research
        </a>
      </center>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        We're excited to have you continue using The Pep Planner for your research needs!<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
      
      <hr style="border: none; border-top: 1px solid ${COLORS.border}; margin: 32px 0;">
      
      <p style="font-size: 14px; color: ${COLORS.textLight}; margin: 0;">
        Questions? Just reply to this email or reach out to us at support@thepepplanner.app
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

/**
 * Email change security notification template
 */
exports.emailChangeNotificationEmail = (oldEmail, newEmail, timestamp) => {
  const formattedDate = new Date(timestamp).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  const content = `
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">🔒 Email Address Changed</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Hi there,
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        This is a security notification to inform you that the email address associated with your The Pep Planner account has been changed.
      </p>
      
      <div class="highlight-box" style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: #92400E;">⚠️ Security Alert</p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: ${COLORS.text};">
          <strong>Old Email:</strong> ${oldEmail}<br>
          <strong>New Email:</strong> ${newEmail}<br>
          <strong>Changed On:</strong> ${formattedDate}
        </p>
      </div>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        <strong>If you made this change:</strong> No action is needed. You can safely ignore this email. Your new email address will need to be verified before it becomes active.
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        <strong style="color: #DC2626;">If you did NOT make this change:</strong> Your account may have been compromised. Please take immediate action:
      </p>
      
      <ul class="feature-list" style="margin: 16px 0; padding-left: 20px; color: ${COLORS.text};">
        <li>Change your password immediately</li>
        <li>Review your account settings</li>
        <li>Contact support if you need assistance</li>
      </ul>

      <center>
        <a href="https://thepepplanner.app/app/account/profile" class="button" style="display: inline-block; padding: 16px 32px; background-color: ${COLORS.primary}; color: ${COLORS.white} !important; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 24px 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          🔐 Secure Your Account
        </a>
      </center>
      
      <p style="font-size: 14px; color: ${COLORS.textLight}; margin-top: 24px;">
        For your security, we recommend enabling two-factor authentication if you haven't already.
      </p>
      
      <hr class="divider" style="border: none; border-top: 1px solid ${COLORS.border}; margin: 32px 0;">
      
      <p style="font-size: 14px; color: ${COLORS.textLight}; margin: 0;">
        Questions or concerns? Contact us at support@thepepplanner.app<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Security Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

/**
 * Email change verification notification template (sent to new email)
 */
exports.emailChangeVerificationEmail = (newEmail, oldEmail) => {
  const content = `
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">📧 Verify Your New Email Address</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Hi there,
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        You've requested to change your The Pep Planner account email from <strong>${oldEmail}</strong> to <strong>${newEmail}</strong>.
      </p>
      
      <div class="highlight-box" style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 16px; margin: 20px 0; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: #1E40AF;">📬 Check Your Inbox</p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: ${COLORS.text};">
          You should receive a verification email from Firebase shortly. Please check your inbox (and spam folder) for an email with the subject "Verify your email for The Pep Planner".
        </p>
      </div>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        <strong>To complete the email change:</strong>
      </p>
      
      <ul class="feature-list" style="margin: 16px 0; padding-left: 20px; color: ${COLORS.text};">
        <li>Check your inbox for the verification email</li>
        <li>Click the verification link in that email</li>
        <li>Your email address will be updated once verified</li>
      </ul>

      <p style="font-size: 14px; color: ${COLORS.textLight}; margin-top: 24px;">
        If you didn't request this email change, please contact support immediately at support@thepepplanner.app
      </p>
      
      <hr class="divider" style="border: none; border-top: 1px solid ${COLORS.border}; margin: 32px 0;">
      
      <p style="font-size: 14px; color: ${COLORS.textLight}; margin: 0;">
        Questions? Contact us at support@thepepplanner.app<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

// ========================================
// 🎨 MODERN EMAIL TEMPLATES V2
// Using app theme colors (Sage) with Poppins font
// More personal, relaxed tone - less corporate
// ========================================

const MODERN_COLORS = {
  primary: '#7F9E95',        // Sage primary
  primaryDark: '#5F7F76',    // Darker sage
  primaryLight: '#A0B9B3',   // Lighter sage
  secondary: '#EFF2EE',      // Light background
  accent: '#DDE6DE',         // Accent color
  white: '#FFFFFF',
  text: '#2F3B3A',          // Dark text
  textLight: '#6B7D7A',     // Light text
  success: '#5FAF8B',
  warning: '#F2C879',
  error: '#E58A7A',
  info: '#7CB8B2',
  successBg: '#DFF0E9',
  warningBg: '#FDF6E4',
  errorBg: '#FCE8E5',
};

const ASSET_BASE_V2 = process.env.ASSET_BASE_URL || 'https://thepepplanner.app';
const LOGO_URL_V2 = `${ASSET_BASE_V2}/tpp_logo.png`;

// Modern email wrapper with Poppins font
const modernEmailWrapper = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <title>The Pep Planner</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: ${MODERN_COLORS.secondary};">
  <!-- Full-width background wrapper -->
  <div style="background-color: ${MODERN_COLORS.secondary}; padding: 40px 20px;">
    <!-- Main container -->
    <div style="max-width: 600px; margin: 0 auto; background-color: ${MODERN_COLORS.white}; border-radius: 20px; overflow: hidden; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);">
      
      <!-- Header with logo -->
      <div style="background: linear-gradient(135deg, ${MODERN_COLORS.primary} 0%, ${MODERN_COLORS.primaryDark} 100%); padding: 48px 32px; text-align: center;">
        <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
          <img src="${LOGO_URL_V2}" alt="The Pep Planner" style="width: 140px; height: auto; margin-bottom: 16px; filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));" onerror="this.style.display='none';" />
        </a>
        <div style="color: ${MODERN_COLORS.white}; font-size: 15px; font-weight: 500; letter-spacing: 1px; opacity: 0.95;">Your Research Companion</div>
      </div>
      
      <!-- Content -->
      ${content}
      
      <!-- Footer -->
      <div style="background-color: ${MODERN_COLORS.secondary}; padding: 40px 32px; text-align: center;">
        <div style="margin-bottom: 20px;">
          <img src="${LOGO_URL_V2}" alt="The Pep Planner" style="width: 60px; height: auto; opacity: 0.7;" onerror="this.style.display='none';" />
        </div>
        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: ${MODERN_COLORS.text};">The Pep Planner</p>
        <p style="margin: 0 0 20px 0; font-size: 13px; color: ${MODERN_COLORS.textLight};">Organize Your Research</p>
        
        <div style="margin: 24px 0; padding-top: 24px; border-top: 1px solid ${MODERN_COLORS.accent};">
          <p style="margin: 0 0 12px 0; font-size: 12px; color: ${MODERN_COLORS.textLight};">
            <a href="https://thepepplanner.app" style="color: ${MODERN_COLORS.primary}; text-decoration: none; margin: 0 8px;">Home</a> •
            <a href="https://thepepplanner.app/app/dashboard" style="color: ${MODERN_COLORS.primary}; text-decoration: none; margin: 0 8px;">Dashboard</a> •
            <a href="https://thepepplanner.app/support" style="color: ${MODERN_COLORS.primary}; text-decoration: none; margin: 0 8px;">Support</a>
          </p>
          <p style="margin: 16px 0 0 0; font-size: 11px; color: ${MODERN_COLORS.textLight};">
            © ${new Date().getFullYear()} The Pep Planner. All rights reserved.
          </p>
        </div>
      </div>
      
    </div>
  </div>
</body>
</html>
`;

// Helper components
const modernButton = (text, url, color = MODERN_COLORS.primary) => `
  <center style="margin: 32px 0;">
    <a href="${url}" style="display: inline-block; padding: 18px 40px; background-color: ${color}; color: ${MODERN_COLORS.white} !important; text-decoration: none; border-radius: 14px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(127, 158, 149, 0.25); transition: all 0.3s;">
      ${text}
    </a>
  </center>
`;

const modernCard = (content, bgColor = MODERN_COLORS.successBg, borderColor = MODERN_COLORS.success) => `
  <div style="background-color: ${bgColor}; border-left: 4px solid ${borderColor}; padding: 20px; margin: 24px 0; border-radius: 14px;">
    ${content}
  </div>
`;

const modernDivider = () => `
  <hr style="border: none; border-top: 1px solid ${MODERN_COLORS.accent}; margin: 32px 0;" />
`;

// ========================================
// 🎉 V2: Welcome Email
// ========================================
exports.welcomeEmailV2 = (userName, userEmail) => {
  const content = `
    <div style="padding: 48px 32px; color: ${MODERN_COLORS.text};">
      <h1 style="color: ${MODERN_COLORS.primary}; font-size: 32px; font-weight: 700; margin: 0 0 12px 0; line-height: 1.2;">
        Hey${userName ? ` ${userName}` : ''}! 👋
      </h1>
      
      <p style="font-size: 18px; line-height: 1.6; color: ${MODERN_COLORS.textLight}; margin: 0 0 32px 0;">
        Welcome to The Pep Planner!
      </p>
      
      <p style="font-size: 16px; line-height: 1.7; color: ${MODERN_COLORS.text}; margin: 0 0 20px 0;">
        We're genuinely excited to have you here. Whether you're tracking protocols, managing your research stockpile, 
        or just trying to stay organized — you're in the right place.
      </p>

      <p style="font-size: 17px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 0 0 32px 0; font-weight: 600;">
        The Pep Planner is your all-in-one research tool, designed by a fellow researcher!
      </p>

      <center style="margin: 32px 0;">
        <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: separate; border-spacing: 0;">
          <tr>
            <td align="center" style="border-radius: 16px; background: linear-gradient(135deg, ${MODERN_COLORS.primary} 0%, ${MODERN_COLORS.primaryDark} 100%); box-shadow: 0 6px 20px rgba(127, 158, 149, 0.35), 0 2px 8px rgba(0, 0, 0, 0.1);">
              <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; padding: 20px 48px; color: #FFFFFF; text-decoration: none; font-weight: 700; font-size: 17px; letter-spacing: 0.5px; border: 3px solid rgba(255, 255, 255, 0.2); border-radius: 16px;">
                🚀 Start Exploring Now
              </a>
            </td>
          </tr>
        </table>
      </center>

      ${modernCard(`
        <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: ${MODERN_COLORS.text};">
          🎁 Your trial is live!
        </p>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${MODERN_COLORS.textLight};">
          Full access to everything. No credit card needed. Just dive in and explore.
        </p>
      `, MODERN_COLORS.successBg, MODERN_COLORS.success)}

      ${modernDivider()}

      <h2 style="color: ${MODERN_COLORS.primary}; font-size: 20px; font-weight: 600; margin: 0 0 20px 0;">
        Quick tips to get started:
      </h2>
      
      <div style="margin: 24px 0;">
        <div style="margin-bottom: 16px;">
          <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: ${MODERN_COLORS.text};">📱 Works everywhere</p>
          <p style="margin: 0; font-size: 14px; color: ${MODERN_COLORS.textLight};">Desktop, tablet, phone — your data syncs across all devices</p>
        </div>
        
        <div style="margin-bottom: 16px;">
          <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: ${MODERN_COLORS.text};">🎨 Make it yours</p>
          <p style="margin: 0; font-size: 14px; color: ${MODERN_COLORS.textLight};">Choose from multiple themes and customize your dashboard layout</p>
        </div>
        
        <div style="margin-bottom: 16px;">
          <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: ${MODERN_COLORS.text};">📊 Stay organized</p>
          <p style="margin: 0; font-size: 14px; color: ${MODERN_COLORS.textLight};">Track protocols, manage stockpile, plan orders, and calculate dosages</p>
        </div>
        
        <div>
          <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: ${MODERN_COLORS.text};">🔔 Never miss a dose</p>
          <p style="margin: 0; font-size: 14px; color: ${MODERN_COLORS.textLight};">Set up reminders for your research schedule</p>
        </div>
      </div>

      ${modernDivider()}

      <p style="font-size: 15px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 0 0 16px 0;">
        Need help? Just reply to this email or check out our 
        <a href="https://thepepplanner.app/guide" style="color: ${MODERN_COLORS.primary}; text-decoration: none; font-weight: 600;">Quick Start Guide</a>.
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 32px 0 0 0;">
        Happy researching! ✌️<br>
        <span style="color: ${MODERN_COLORS.primary}; font-weight: 600;">– The Pep Planner Team</span>
      </p>
    </div>
  `;
  
  return modernEmailWrapper(content);
};

// ========================================
// ⏰ V2: Trial Ending Email
// ========================================
exports.trialEndingEmailV2 = (daysLeft, userEmail, founderState = null) => {
  const isLastDay = daysLeft <= 1;
  const urgencyColor = isLastDay ? MODERN_COLORS.error : MODERN_COLORS.warning;
  const urgencyBg = isLastDay ? MODERN_COLORS.errorBg : MODERN_COLORS.warningBg;
  
  const content = `
    <div style="padding: 48px 32px; color: ${MODERN_COLORS.text};">
      <h1 style="color: ${urgencyColor}; font-size: 32px; font-weight: 700; margin: 0 0 12px 0; line-height: 1.2;">
        ${isLastDay ? '⏰ Last day!' : `⏳ ${daysLeft} days left`}
      </h1>
      
      <p style="font-size: 18px; line-height: 1.6; color: ${MODERN_COLORS.textLight}; margin: 0 0 32px 0;">
        Your trial is ending soon
      </p>
      
      <p style="font-size: 16px; line-height: 1.7; color: ${MODERN_COLORS.text}; margin: 0 0 20px 0;">
        Hey there! Just a friendly heads up — your trial ${isLastDay ? 'ends today' : `ends in ${daysLeft} days`}.
      </p>

      ${modernCard(`
        <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: ${MODERN_COLORS.text};">
          ${isLastDay ? '🚨 Your trial ends today' : '⏰ Time is running out'}
        </p>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${MODERN_COLORS.textLight};">
          After your trial ends, you'll lose access to your data. Don't let all your hard work disappear!
        </p>
      `, urgencyBg, urgencyColor)}

      <p style="font-size: 16px; line-height: 1.7; color: ${MODERN_COLORS.text}; margin: 24px 0;">
        We'd love to keep you around. Subscribe now to keep all your protocols, orders, and research data safe.
      </p>

      ${modernButton('Subscribe Now →', 'https://thepepplanner.app/app/account/subscription', MODERN_COLORS.primary)}

      ${modernDivider()}

      <h2 style="color: ${MODERN_COLORS.primary}; font-size: 20px; font-weight: 600; margin: 0 0 20px 0;">
        What you'll keep with a subscription:
      </h2>
      
      <div style="margin: 24px 0;">
        <div style="margin-bottom: 12px;">
          <p style="margin: 0; font-size: 15px; color: ${MODERN_COLORS.text};">✅ All your protocols & research data</p>
        </div>
        <div style="margin-bottom: 12px;">
          <p style="margin: 0; font-size: 15px; color: ${MODERN_COLORS.text};">✅ Stockpile tracking & order management</p>
        </div>
        <div style="margin-bottom: 12px;">
          <p style="margin: 0; font-size: 15px; color: ${MODERN_COLORS.text};">✅ Dose calculators & research journal</p>
        </div>
        <div>
          <p style="margin: 0; font-size: 15px; color: ${MODERN_COLORS.text};">✅ Unlimited access across all devices</p>
        </div>
      </div>

      ${modernDivider()}

      <p style="font-size: 15px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 0;">
        Questions? Just reply to this email. We're here to help!
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 32px 0 0 0;">
        Thanks for trying us out! ✌️<br>
        <span style="color: ${MODERN_COLORS.primary}; font-weight: 600;">– The Pep Planner Team</span>
      </p>
    </div>
  `;
  
  return modernEmailWrapper(content);
};

// ========================================
// ✅ V2: Subscription Confirmed Email
// ========================================
exports.subscriptionConfirmedEmailV2 = (plan, interval, price) => {
  const content = `
    <div style="padding: 48px 32px; color: ${MODERN_COLORS.text};">
      <h1 style="color: ${MODERN_COLORS.success}; font-size: 32px; font-weight: 700; margin: 0 0 12px 0; line-height: 1.2;">
        You're all set! 🎉
      </h1>
      
      <p style="font-size: 18px; line-height: 1.6; color: ${MODERN_COLORS.textLight}; margin: 0 0 32px 0;">
        Welcome to The Pep Planner ${interval === 'year' ? 'annual' : 'monthly'} plan
      </p>
      
      <p style="font-size: 16px; line-height: 1.7; color: ${MODERN_COLORS.text}; margin: 0 0 20px 0;">
        Thanks for subscribing! Your support means the world to us, and we're committed to making The Pep Planner 
        the best research companion you've ever used.
      </p>

      ${modernCard(`
        <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: ${MODERN_COLORS.text};">
          📋 Your subscription details:
        </p>
        <p style="margin: 0 0 6px 0; font-size: 14px; color: ${MODERN_COLORS.textLight};">
          <strong>Plan:</strong> ${plan || 'The Pep Planner'}
        </p>
        <p style="margin: 0 0 6px 0; font-size: 14px; color: ${MODERN_COLORS.textLight};">
          <strong>Billing:</strong> ${interval === 'year' ? 'Annual' : 'Monthly'}
        </p>
        ${price ? `<p style="margin: 0; font-size: 14px; color: ${MODERN_COLORS.textLight};">
          <strong>Price:</strong> $${price}/${interval === 'year' ? 'year' : 'month'}
        </p>` : ''}
      `, MODERN_COLORS.successBg, MODERN_COLORS.success)}

      ${modernButton('Go to Dashboard →', 'https://thepepplanner.app/app/dashboard')}

      ${modernDivider()}

      <h2 style="color: ${MODERN_COLORS.primary}; font-size: 20px; font-weight: 600; margin: 0 0 20px 0;">
        Here's what you get:
      </h2>
      
      <div style="margin: 24px 0;">
        <div style="margin-bottom: 12px;">
          <p style="margin: 0; font-size: 15px; color: ${MODERN_COLORS.text};">✨ Unlimited protocols & research tracking</p>
        </div>
        <div style="margin-bottom: 12px;">
          <p style="margin: 0; font-size: 15px; color: ${MODERN_COLORS.text};">📦 Complete stockpile management</p>
        </div>
        <div style="margin-bottom: 12px;">
          <p style="margin: 0; font-size: 15px; color: ${MODERN_COLORS.text};">🧮 Dose calculators & reconstitution tools</p>
        </div>
        <div style="margin-bottom: 12px;">
          <p style="margin: 0; font-size: 15px; color: ${MODERN_COLORS.text};">📱 Sync across all your devices</p>
        </div>
        <div>
          <p style="margin: 0; font-size: 15px; color: ${MODERN_COLORS.text};">💚 Priority email support</p>
        </div>
      </div>

      ${modernDivider()}

      <p style="font-size: 15px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 0 0 16px 0;">
        Need help with anything? We're just an email away. Reply here or reach us at support@thepepplanner.app
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 32px 0 0 0;">
        Happy researching! ✌️<br>
        <span style="color: ${MODERN_COLORS.primary}; font-weight: 600;">– The Pep Planner Team</span>
      </p>
    </div>
  `;
  
  return modernEmailWrapper(content);
};

// ========================================
// ❌ V2: Payment Failed Email
// ========================================
exports.paymentFailedEmailV2 = (amount, currency, invoiceUrl) => {
  const content = `
    <div style="padding: 48px 32px; color: ${MODERN_COLORS.text};">
      <h1 style="color: ${MODERN_COLORS.error}; font-size: 32px; font-weight: 700; margin: 0 0 12px 0; line-height: 1.2;">
        Payment issue 😕
      </h1>
      
      <p style="font-size: 18px; line-height: 1.6; color: ${MODERN_COLORS.textLight}; margin: 0 0 32px 0;">
        We couldn't process your payment
      </p>
      
      <p style="font-size: 16px; line-height: 1.7; color: ${MODERN_COLORS.text}; margin: 0 0 20px 0;">
        Hey there — we tried to process your payment but ran into an issue. This happens sometimes, usually due to 
        expired cards or insufficient funds.
      </p>

      ${modernCard(`
        <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: ${MODERN_COLORS.text};">
          💳 Payment details:
        </p>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${MODERN_COLORS.textLight};">
          Amount: <strong>${currency ? currency.toUpperCase() : '$'} ${amount}</strong>
        </p>
      `, MODERN_COLORS.errorBg, MODERN_COLORS.error)}

      <p style="font-size: 16px; line-height: 1.7; color: ${MODERN_COLORS.text}; margin: 24px 0;">
        No worries — you can update your payment method and we'll try again. Your data is safe and we'll keep your 
        account active for a few more days while you sort this out.
      </p>

      ${modernButton('Update Payment Method →', invoiceUrl || 'https://thepepplanner.app/app/account/subscription', MODERN_COLORS.error)}

      ${modernDivider()}

      <h2 style="color: ${MODERN_COLORS.primary}; font-size: 20px; font-weight: 600; margin: 0 0 20px 0;">
        Common reasons & fixes:
      </h2>
      
      <div style="margin: 24px 0;">
        <div style="margin-bottom: 12px;">
          <p style="margin: 0; font-size: 15px; color: ${MODERN_COLORS.text};">🔄 Expired card — Update with a new one</p>
        </div>
        <div style="margin-bottom: 12px;">
          <p style="margin: 0; font-size: 15px; color: ${MODERN_COLORS.text};">💰 Insufficient funds — Try a different card</p>
        </div>
        <div>
          <p style="margin: 0; font-size: 15px; color: ${MODERN_COLORS.text};">🏦 Bank declined — Contact your bank</p>
        </div>
      </div>

      ${modernDivider()}

      <p style="font-size: 15px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 0 0 16px 0;">
        Need help? Just reply to this email and we'll sort it out together.
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 32px 0 0 0;">
        Thanks for your patience! ✌️<br>
        <span style="color: ${MODERN_COLORS.primary}; font-weight: 600;">– The Pep Planner Team</span>
      </p>
    </div>
  `;
  
  return modernEmailWrapper(content);
};

// ========================================
// 🔑 V2: Password Reset Email
// ========================================
exports.passwordResetEmailV2 = (resetLink, userEmail) => {
  const content = `
    <div style="padding: 48px 32px; color: ${MODERN_COLORS.text};">
      <h1 style="color: ${MODERN_COLORS.primary}; font-size: 32px; font-weight: 700; margin: 0 0 12px 0; line-height: 1.2;">
        Reset your password 🔐
      </h1>
      
      <p style="font-size: 18px; line-height: 1.6; color: ${MODERN_COLORS.textLight}; margin: 0 0 32px 0;">
        We got your request
      </p>
      
      <p style="font-size: 16px; line-height: 1.7; color: ${MODERN_COLORS.text}; margin: 0 0 20px 0;">
        Hey! Someone (hopefully you) requested a password reset for your account.
      </p>

      ${modernCard(`
        <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: ${MODERN_COLORS.text};">
          🔒 Quick security check
        </p>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${MODERN_COLORS.textLight};">
          If you didn't request this, you can safely ignore this email. Your password won't change unless you click the button below.
        </p>
      `, MODERN_COLORS.infoBg, MODERN_COLORS.info)}

      ${modernButton('Reset My Password →', resetLink)}

      <p style="font-size: 14px; line-height: 1.6; color: ${MODERN_COLORS.textLight}; margin: 24px 0; text-align: center;">
        This link expires in 1 hour for security reasons.
      </p>

      ${modernDivider()}

      <p style="font-size: 15px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 0 0 16px 0;">
        Having trouble? Copy and paste this link into your browser:
      </p>
      
      <p style="font-size: 13px; word-break: break-all; color: ${MODERN_COLORS.primary}; background-color: ${MODERN_COLORS.secondary}; padding: 12px; border-radius: 8px;">
        ${resetLink}
      </p>

      ${modernDivider()}

      <p style="font-size: 15px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 0;">
        Questions? Just reply to this email.
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 32px 0 0 0;">
        Stay secure! ✌️<br>
        <span style="color: ${MODERN_COLORS.primary}; font-weight: 600;">– The Pep Planner Team</span>
      </p>
    </div>
  `;
  
  return modernEmailWrapper(content);
};

// ========================================
// 📝 V2: Trial Expired Survey Email
// ========================================
exports.trialExpiredSurveyEmailV2 = (userName, userEmail, surveyLink = null) => {
  const content = `
    <div style="padding: 48px 32px; color: ${MODERN_COLORS.text};">
      <h1 style="color: ${MODERN_COLORS.primary}; font-size: 32px; font-weight: 700; margin: 0 0 12px 0; line-height: 1.2;">
        We'd love your feedback 💭
      </h1>
      
      <p style="font-size: 18px; line-height: 1.6; color: ${MODERN_COLORS.textLight}; margin: 0 0 32px 0;">
        Help us improve The Pep Planner
      </p>
      
      <p style="font-size: 16px; line-height: 1.7; color: ${MODERN_COLORS.text}; margin: 0 0 20px 0;">
        Hey${userName ? ` ${userName}` : ''}! Your trial has ended, and we noticed you didn't subscribe. 
        No hard feelings — we just want to understand why so we can make The Pep Planner better.
      </p>

      ${modernCard(`
        <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: ${MODERN_COLORS.text};">
          ⏱️ Takes 2 minutes
        </p>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${MODERN_COLORS.textLight};">
          Your honest feedback helps us build a better product for everyone.
        </p>
      `, MODERN_COLORS.infoBg, MODERN_COLORS.info)}

      ${modernButton('Share Your Thoughts →', surveyLink || 'https://thepepplanner.app/feedback')}

      ${modernDivider()}

      <h2 style="color: ${MODERN_COLORS.primary}; font-size: 20px; font-weight: 600; margin: 0 0 20px 0;">
        Quick questions we'd love answered:
      </h2>
      
      <div style="margin: 24px 0;">
        <div style="margin-bottom: 12px;">
          <p style="margin: 0; font-size: 15px; color: ${MODERN_COLORS.text};">• What did you like most?</p>
        </div>
        <div style="margin-bottom: 12px;">
          <p style="margin: 0; font-size: 15px; color: ${MODERN_COLORS.text};">• What features were missing?</p>
        </div>
        <div>
          <p style="margin: 0; font-size: 15px; color: ${MODERN_COLORS.text};">• What kept you from subscribing?</p>
        </div>
      </div>

      ${modernDivider()}

      <p style="font-size: 15px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 0 0 16px 0;">
        Changed your mind? You can still subscribe and get all your data back.
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 32px 0 0 0;">
        Thanks for trying us out! ✌️<br>
        <span style="color: ${MODERN_COLORS.primary}; font-weight: 600;">– The Pep Planner Team</span>
      </p>
    </div>
  `;
  
  return modernEmailWrapper(content);
};

// ========================================
// 🎁 V2: Lifetime Access Granted Email
// ========================================
exports.lifetimeAccessGrantedEmailV2 = (userEmail, reason) => {
  const content = `
    <div style="padding: 48px 32px; color: ${MODERN_COLORS.text};">
      <h1 style="color: ${MODERN_COLORS.success}; font-size: 32px; font-weight: 700; margin: 0 0 12px 0; line-height: 1.2;">
        Lifetime access granted! 🎉
      </h1>
      
      <p style="font-size: 18px; line-height: 1.6; color: ${MODERN_COLORS.textLight}; margin: 0 0 32px 0;">
        You're in for life
      </p>
      
      <p style="font-size: 16px; line-height: 1.7; color: ${MODERN_COLORS.text}; margin: 0 0 20px 0;">
        Great news! You've been granted lifetime access to The Pep Planner. 🎊
      </p>

      ${modernCard(`
        <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: ${MODERN_COLORS.text};">
          🌟 Why you got this:
        </p>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${MODERN_COLORS.textLight};">
          ${reason || 'You\'re special to us!'}
        </p>
      `, MODERN_COLORS.successBg, MODERN_COLORS.success)}

      <p style="font-size: 16px; line-height: 1.7; color: ${MODERN_COLORS.text}; margin: 24px 0;">
        This means unlimited access to all features, forever. No expiration dates, no recurring charges, 
        no strings attached. Just pure, uninterrupted research tracking bliss.
      </p>

      ${modernButton('Go to Dashboard →', 'https://thepepplanner.app/app/dashboard')}

      ${modernDivider()}

      <h2 style="color: ${MODERN_COLORS.primary}; font-size: 20px; font-weight: 600; margin: 0 0 20px 0;">
        What you get forever:
      </h2>
      
      <div style="margin: 24px 0;">
        <div style="margin-bottom: 12px;">
          <p style="margin: 0; font-size: 15px; color: ${MODERN_COLORS.text};">♾️ Unlimited protocols & research tracking</p>
        </div>
        <div style="margin-bottom: 12px;">
          <p style="margin: 0; font-size: 15px; color: ${MODERN_COLORS.text};">📦 Complete stockpile management</p>
        </div>
        <div style="margin-bottom: 12px;">
          <p style="margin: 0; font-size: 15px; color: ${MODERN_COLORS.text};">🧮 All calculators & tools</p>
        </div>
        <div style="margin-bottom: 12px;">
          <p style="margin: 0; font-size: 15px; color: ${MODERN_COLORS.text};">📱 Sync across all devices</p>
        </div>
        <div>
          <p style="margin: 0; font-size: 15px; color: ${MODERN_COLORS.text};">✨ All future features & updates</p>
        </div>
      </div>

      ${modernDivider()}

      <p style="font-size: 15px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 0 0 16px 0;">
        Thank you for being part of The Pep Planner community. We truly appreciate you!
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 32px 0 0 0;">
        Happy researching! ✌️<br>
        <span style="color: ${MODERN_COLORS.primary}; font-weight: 600;">– The Pep Planner Team</span>
      </p>
    </div>
  `;
  
  return modernEmailWrapper(content);
};

// ========================================
// 💰 V2: Payment Successful Email
// ========================================
exports.paymentSuccessfulEmailV2 = (amount, currency, receiptUrl) => {
  const content = `
    <div style="padding: 48px 32px; color: ${MODERN_COLORS.text};">
      <h1 style="color: ${MODERN_COLORS.success}; font-size: 32px; font-weight: 700; margin: 0 0 12px 0; line-height: 1.2;">
        Payment received! ✅
      </h1>
      
      <p style="font-size: 18px; line-height: 1.6; color: ${MODERN_COLORS.textLight}; margin: 0 0 32px 0;">
        Thanks for your payment
      </p>
      
      <p style="font-size: 16px; line-height: 1.7; color: ${MODERN_COLORS.text}; margin: 0 0 20px 0;">
        Hey! Just confirming we received your payment. You're all set and your subscription is active.
      </p>

      ${modernCard(`
        <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: ${MODERN_COLORS.text};">
          💳 Payment details:
        </p>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${MODERN_COLORS.textLight};">
          Amount: <strong>${currency ? currency.toUpperCase() : '$'} ${amount}</strong>
        </p>
      `, MODERN_COLORS.successBg, MODERN_COLORS.success)}

      ${modernButton('View Receipt →', receiptUrl || 'https://thepepplanner.app/app/account/subscription')}

      ${modernDivider()}

      <p style="font-size: 15px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 0 0 16px 0;">
        Your receipt is ready and you can download it anytime from your account settings. 
        Need help with anything? Just reply to this email!
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 32px 0 0 0;">
        Thanks for your support! ✌️<br>
        <span style="color: ${MODERN_COLORS.primary}; font-weight: 600;">– The Pep Planner Team</span>
      </p>
    </div>
  `;
  
  return modernEmailWrapper(content);
};

// ========================================
// 🚫 V2: Subscription Cancelled Email
// ========================================
exports.subscriptionCancelledEmailV2 = (planName, endDate) => {
  const content = `
    <div style="padding: 48px 32px; color: ${MODERN_COLORS.text};">
      <h1 style="color: ${MODERN_COLORS.text}; font-size: 32px; font-weight: 700; margin: 0 0 12px 0; line-height: 1.2;">
        Subscription cancelled 😢
      </h1>
      
      <p style="font-size: 18px; line-height: 1.6; color: ${MODERN_COLORS.textLight}; margin: 0 0 32px 0;">
        Sorry to see you go
      </p>
      
      <p style="font-size: 16px; line-height: 1.7; color: ${MODERN_COLORS.text}; margin: 0 0 20px 0;">
        Hey! We've processed your cancellation request. We're sad to see you go, but we get it — sometimes things change.
      </p>

      ${modernCard(`
        <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: ${MODERN_COLORS.text};">
          📋 What happens next:
        </p>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${MODERN_COLORS.textLight};">
          You'll keep access until ${endDate || 'your billing cycle ends'}. After that, your data will be safely stored for 30 days if you change your mind.
        </p>
      `, MODERN_COLORS.warningBg, MODERN_COLORS.warning)}

      ${modernDivider()}

      <h2 style="color: ${MODERN_COLORS.primary}; font-size: 20px; font-weight: 600; margin: 0 0 20px 0;">
        Before you go, we'd love to know:
      </h2>
      
      <div style="margin: 24px 0;">
        <div style="margin-bottom: 12px;">
          <p style="margin: 0; font-size: 15px; color: ${MODERN_COLORS.text};">• Was there something we could have done better?</p>
        </div>
        <div style="margin-bottom: 12px;">
          <p style="margin: 0; font-size: 15px; color: ${MODERN_COLORS.text};">• Any features you wish we had?</p>
        </div>
        <div>
          <p style="margin: 0; font-size: 15px; color: ${MODERN_COLORS.text};">• What made you decide to cancel?</p>
        </div>
      </div>

      ${modernButton('Share Your Feedback →', 'https://thepepplanner.app/feedback')}

      ${modernDivider()}

      <p style="font-size: 15px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 0 0 16px 0;">
        Changed your mind? You can reactivate anytime before ${endDate || 'your billing cycle ends'} and pick up right where you left off.
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 32px 0 0 0;">
        Thanks for being part of our community! ✌️<br>
        <span style="color: ${MODERN_COLORS.primary}; font-weight: 600;">– The Pep Planner Team</span>
      </p>
    </div>
  `;
  
  return modernEmailWrapper(content);
};

// ========================================
// 🔔 V2: Renewal Reminder Email
// ========================================
exports.renewalReminderEmailV2 = (planName) => {
  const content = `
    <div style="padding: 48px 32px; color: ${MODERN_COLORS.text};">
      <h1 style="color: ${MODERN_COLORS.primary}; font-size: 32px; font-weight: 700; margin: 0 0 12px 0; line-height: 1.2;">
        Renewal coming up 🔄
      </h1>
      
      <p style="font-size: 18px; line-height: 1.6; color: ${MODERN_COLORS.textLight}; margin: 0 0 32px 0;">
        Just a friendly reminder
      </p>
      
      <p style="font-size: 16px; line-height: 1.7; color: ${MODERN_COLORS.text}; margin: 0 0 20px 0;">
        Hey! Your ${planName || 'subscription'} is coming up for renewal soon. This is just a heads up — no action needed if you want to keep your subscription active.
      </p>

      ${modernCard(`
        <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: ${MODERN_COLORS.text};">
          📅 What to expect:
        </p>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${MODERN_COLORS.textLight};">
          We'll automatically charge your payment method on file. You'll receive a receipt once the payment goes through.
        </p>
      `, MODERN_COLORS.infoBg, MODERN_COLORS.info)}

      ${modernButton('Manage Subscription →', 'https://thepepplanner.app/app/account/subscription')}

      ${modernDivider()}

      <h2 style="color: ${MODERN_COLORS.primary}; font-size: 20px; font-weight: 600; margin: 0 0 20px 0;">
        Want to make changes?
      </h2>
      
      <p style="font-size: 15px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 0 0 16px 0;">
        You can update your payment method, change your plan, or cancel anytime from your account settings. No hassles, no hoops to jump through.
      </p>

      ${modernDivider()}

      <p style="font-size: 15px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 0;">
        Questions? Just reply to this email!
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 32px 0 0 0;">
        Thanks for staying with us! ✌️<br>
        <span style="color: ${MODERN_COLORS.primary}; font-weight: 600;">– The Pep Planner Team</span>
      </p>
    </div>
  `;
  
  return modernEmailWrapper(content);
};

// ========================================
// 📅 V2: Weekly Research Reminder Email
// ========================================
exports.weeklyResearchReminderEmailV2 = (firstName, summary = {}) => {
  const {
    thisWeekTotal   = 0,
    lastWeekTotal   = 0,
    thisWeekDays    = 0,
    delta           = 0,
    activeProtocols = [],
    lowStockCount   = 0,
    lowStockItems   = [],
    hasData         = false
  } = summary;

  const deltaColor = delta > 0 ? MODERN_COLORS.success : delta < 0 ? MODERN_COLORS.error || '#DC2626' : MODERN_COLORS.textLight;
  const deltaText = (() => {
    if (lastWeekTotal === 0 && thisWeekTotal > 0) return '🎉 First activity this week!';
    if (delta > 0)  return `↑ ${delta} more than last week`;
    if (delta < 0)  return `↓ ${Math.abs(delta)} fewer than last week`;
    if (lastWeekTotal > 0) return 'Same as last week';
    return 'No logged doses yet';
  })();

  const protocolsLine = activeProtocols.length
    ? activeProtocols.join(', ')
    : 'None set up yet';

  const lowStockSection = lowStockCount > 0
    ? modernCard(`
        <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: ${MODERN_COLORS.text};">⚠️ Stockpile running low</p>
        <p style="margin: 0; font-size: 14px; color: ${MODERN_COLORS.textLight};">
          ${lowStockItems.join(', ')}${lowStockCount > lowStockItems.length ? ` +${lowStockCount - lowStockItems.length} more` : ''}
        </p>
      `, MODERN_COLORS.warningBg || '#FEF3C7', MODERN_COLORS.warning || '#F59E0B')
    : '';

  const statsCard = hasData
    ? modernCard(`
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 0 20px 0 0; vertical-align: top; width: 50%;">
              <p style="margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: ${MODERN_COLORS.textLight};">Doses logged</p>
              <p style="margin: 0 0 4px 0; font-size: 32px; font-weight: 700; color: ${MODERN_COLORS.primary};">${thisWeekTotal}</p>
              <p style="margin: 0; font-size: 13px; color: ${deltaColor};">${deltaText}</p>
            </td>
            <td style="padding: 0 0 0 20px; vertical-align: top; border-left: 1px solid ${MODERN_COLORS.accent || '#E5E7EB'};">
              <p style="margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: ${MODERN_COLORS.textLight};">Active days</p>
              <p style="margin: 0 0 4px 0; font-size: 32px; font-weight: 700; color: ${MODERN_COLORS.primary};">${thisWeekDays}<span style="font-size: 16px; font-weight: 400; color: ${MODERN_COLORS.textLight};"> / 7</span></p>
              <p style="margin: 0; font-size: 13px; color: ${MODERN_COLORS.textLight};">days with activity</p>
            </td>
          </tr>
        </table>
        <p style="margin: 16px 0 0 0; padding-top: 16px; border-top: 1px solid ${MODERN_COLORS.accent || '#E5E7EB'}; font-size: 13px; color: ${MODERN_COLORS.textLight};">
          <strong style="color: ${MODERN_COLORS.text};">Active protocols:</strong> ${protocolsLine}
        </p>
      `, MODERN_COLORS.infoBg, MODERN_COLORS.info)
    : modernCard(`
        <p style="margin: 0; font-size: 15px; color: ${MODERN_COLORS.textLight};">
          No logged activity yet this week — your weekly snapshot will appear here once you start tracking.
        </p>
      `, MODERN_COLORS.infoBg, MODERN_COLORS.info);

  const content = `
    <div style="padding: 48px 32px; color: ${MODERN_COLORS.text};">
      <h1 style="color: ${MODERN_COLORS.primary}; font-size: 32px; font-weight: 700; margin: 0 0 8px 0; line-height: 1.2;">
        Your week at a glance${firstName ? `, ${firstName}` : ''} 📊
      </h1>

      <p style="font-size: 17px; line-height: 1.6; color: ${MODERN_COLORS.textLight}; margin: 0 0 28px 0;">
        Here's how your research went this week.
      </p>

      ${statsCard}

      ${lowStockSection}

      ${modernButton('View Full Analytics →', 'https://thepepplanner.app/app/analytics')}

      ${modernDivider()}

      <p style="font-size: 14px; line-height: 1.6; color: ${MODERN_COLORS.textLight}; margin: 0 0 16px 0; font-style: italic;">
        Don't want these summaries? You can turn them off anytime in your notification settings.
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 24px 0 0 0;">
        Keep it up! ✌️<br>
        <span style="color: ${MODERN_COLORS.primary}; font-weight: 600;">– The Pep Planner Team</span>
      </p>
    </div>
  `;

  return modernEmailWrapper(content);
};

// ========================================
// ⏱️ V2: Gift Expiring Soon Email
// ========================================
exports.giftExpiringSoonEmailV2 = (recipientEmail, planName, daysLeft, giftGiverName) => {
  const content = `
    <div style="padding: 48px 32px; color: ${MODERN_COLORS.text};">
      <h1 style="color: ${MODERN_COLORS.warning}; font-size: 32px; font-weight: 700; margin: 0 0 12px 0; line-height: 1.2;">
        Gift subscription ending soon ⏰
      </h1>
      
      <p style="font-size: 18px; line-height: 1.6; color: ${MODERN_COLORS.textLight}; margin: 0 0 32px 0;">
        Time to make a decision
      </p>
      
      <p style="font-size: 16px; line-height: 1.7; color: ${MODERN_COLORS.text}; margin: 0 0 20px 0;">
        Hey! The gift subscription from ${giftGiverName || 'a friend'} is ending in ${daysLeft} days. 
        After that, you'll lose access to all your research data.
      </p>

      ${modernCard(`
        <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: ${MODERN_COLORS.text};">
          🎁 Your gift details:
        </p>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${MODERN_COLORS.textLight};">
          Plan: <strong>${planName || 'The Pep Planner'}</strong><br>
          Days remaining: <strong>${daysLeft}</strong>
        </p>
      `, MODERN_COLORS.warningBg, MODERN_COLORS.warning)}

      <p style="font-size: 16px; line-height: 1.7; color: ${MODERN_COLORS.text}; margin: 24px 0;">
        Want to keep all your protocols, orders, and research data? Subscribe now to pick up where you left off.
      </p>

      ${modernButton('Continue with a Subscription →', 'https://thepepplanner.app/app/account/subscription')}

      ${modernDivider()}

      <p style="font-size: 15px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 0 0 16px 0;">
        Not ready to commit? No worries! Your data will be safely stored for 30 days after your gift expires, 
        just in case you change your mind.
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 32px 0 0 0;">
        Questions? Just reply! ✌️<br>
        <span style="color: ${MODERN_COLORS.primary}; font-weight: 600;">– The Pep Planner Team</span>
      </p>
    </div>
  `;
  
  return modernEmailWrapper(content);
};

// ========================================
// 🎁 V2: Gift Notification Email
// ========================================
exports.giftNotificationEmailV2 = (recipientName, giftGiverName, giftMessage, giftId, subscriptionType) => {
  const content = `
    <div style="padding: 48px 32px; color: ${MODERN_COLORS.text};">
      <h1 style="color: ${MODERN_COLORS.success}; font-size: 32px; font-weight: 700; margin: 0 0 12px 0; line-height: 1.2;">
        You got a gift! 🎁
      </h1>
      
      <p style="font-size: 18px; line-height: 1.6; color: ${MODERN_COLORS.textLight}; margin: 0 0 32px 0;">
        Someone special sent you access
      </p>
      
      <p style="font-size: 16px; line-height: 1.7; color: ${MODERN_COLORS.text}; margin: 0 0 20px 0;">
        Hey${recipientName ? ` ${recipientName}` : ''}! ${giftGiverName || 'Someone'} just gifted you a subscription to The Pep Planner! 🎉
      </p>

      ${modernCard(`
        <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: ${MODERN_COLORS.text};">
          🎁 Your gift:
        </p>
        <p style="margin: 0 0 6px 0; font-size: 14px; color: ${MODERN_COLORS.textLight};">
          <strong>From:</strong> ${giftGiverName || 'A friend'}
        </p>
        <p style="margin: 0; font-size: 14px; color: ${MODERN_COLORS.textLight};">
          <strong>Plan:</strong> ${subscriptionType || 'The Pep Planner'}
        </p>
        ${giftMessage ? `
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid ${MODERN_COLORS.accent};">
          <p style="margin: 0; font-size: 14px; font-style: italic; color: ${MODERN_COLORS.text};">
            "${giftMessage}"
          </p>
        </div>
        ` : ''}
      `, MODERN_COLORS.successBg, MODERN_COLORS.success)}

      ${modernButton('Redeem Your Gift →', `https://thepepplanner.app/redeem/${giftId}`)}

      ${modernDivider()}

      <h2 style="color: ${MODERN_COLORS.primary}; font-size: 20px; font-weight: 600; margin: 0 0 20px 0;">
        What you'll get:
      </h2>
      
      <div style="margin: 24px 0;">
        <div style="margin-bottom: 12px;">
          <p style="margin: 0; font-size: 15px; color: ${MODERN_COLORS.text};">📊 Track unlimited protocols</p>
        </div>
        <div style="margin-bottom: 12px;">
          <p style="margin: 0; font-size: 15px; color: ${MODERN_COLORS.text};">📦 Manage your stockpile</p>
        </div>
        <div style="margin-bottom: 12px;">
          <p style="margin: 0; font-size: 15px; color: ${MODERN_COLORS.text};">🧮 Use all calculators & tools</p>
        </div>
        <div>
          <p style="margin: 0; font-size: 15px; color: ${MODERN_COLORS.text};">📱 Sync across all devices</p>
        </div>
      </div>

      ${modernDivider()}

      <p style="font-size: 15px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 0 0 16px 0;">
        Don't forget to thank ${giftGiverName || 'your gift giver'} — they're pretty awesome! 💚
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 32px 0 0 0;">
        Happy researching! ✌️<br>
        <span style="color: ${MODERN_COLORS.primary}; font-weight: 600;">– The Pep Planner Team</span>
      </p>
    </div>
  `;
  
  return modernEmailWrapper(content);
};

// ========================================
// 🎁 V2: Gift Purchase Confirmation Email
// ========================================
exports.giftPurchaseConfirmationEmailV2 = (giftGiverEmail, giftGiverName, recipientEmail, giftMessage, giftId, subscriptionType, pricePaid) => {
  const content = `
    <div style="padding: 48px 32px; color: ${MODERN_COLORS.text};">
      <h1 style="color: ${MODERN_COLORS.success}; font-size: 32px; font-weight: 700; margin: 0 0 12px 0; line-height: 1.2;">
        Gift sent! 🎁
      </h1>
      
      <p style="font-size: 18px; line-height: 1.6; color: ${MODERN_COLORS.textLight}; margin: 0 0 32px 0;">
        Thanks for spreading the love
      </p>
      
      <p style="font-size: 16px; line-height: 1.7; color: ${MODERN_COLORS.text}; margin: 0 0 20px 0;">
        Hey${giftGiverName ? ` ${giftGiverName}` : ''}! Your gift has been sent to ${recipientEmail}. 
        They're going to love it! 💚
      </p>

      ${modernCard(`
        <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: ${MODERN_COLORS.text};">
          🎁 Gift details:
        </p>
        <p style="margin: 0 0 6px 0; font-size: 14px; color: ${MODERN_COLORS.textLight};">
          <strong>To:</strong> ${recipientEmail}
        </p>
        <p style="margin: 0 0 6px 0; font-size: 14px; color: ${MODERN_COLORS.textLight};">
          <strong>Plan:</strong> ${subscriptionType || 'The Pep Planner'}
        </p>
        ${pricePaid ? `<p style="margin: 0 0 6px 0; font-size: 14px; color: ${MODERN_COLORS.textLight};">
          <strong>Amount:</strong> $${pricePaid}
        </p>` : ''}
        ${giftMessage ? `
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid ${MODERN_COLORS.accent};">
          <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: ${MODERN_COLORS.textLight};">Your message:</p>
          <p style="margin: 0; font-size: 14px; font-style: italic; color: ${MODERN_COLORS.text};">
            "${giftMessage}"
          </p>
        </div>
        ` : ''}
      `, MODERN_COLORS.successBg, MODERN_COLORS.success)}

      ${modernDivider()}

      <p style="font-size: 15px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 0 0 16px 0;">
        We've sent them an email with instructions on how to redeem their gift. You'll get a notification once they activate it!
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 32px 0 0 0;">
        Thanks for being awesome! ✌️<br>
        <span style="color: ${MODERN_COLORS.primary}; font-weight: 600;">– The Pep Planner Team</span>
      </p>
    </div>
  `;
  
  return modernEmailWrapper(content);
};

// ========================================
// 🎁 V2: Gift Redeemed Email (to recipient)
// ========================================
exports.giftRedeemedEmailV2 = (recipientEmail, giftGiverName, subscriptionType, subscriptionEndDate) => {
  const content = `
    <div style="padding: 48px 32px; color: ${MODERN_COLORS.text};">
      <h1 style="color: ${MODERN_COLORS.success}; font-size: 32px; font-weight: 700; margin: 0 0 12px 0; line-height: 1.2;">
        Gift activated! 🎉
      </h1>
      
      <p style="font-size: 18px; line-height: 1.6; color: ${MODERN_COLORS.textLight}; margin: 0 0 32px 0;">
        You're all set
      </p>
      
      <p style="font-size: 16px; line-height: 1.7; color: ${MODERN_COLORS.text}; margin: 0 0 20px 0;">
        Awesome! You've successfully redeemed your gift from ${giftGiverName || 'a friend'}. Your subscription is now active!
      </p>

      ${modernCard(`
        <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: ${MODERN_COLORS.text};">
          ✅ Active subscription:
        </p>
        <p style="margin: 0 0 6px 0; font-size: 14px; color: ${MODERN_COLORS.textLight};">
          <strong>Plan:</strong> ${subscriptionType || 'The Pep Planner'}
        </p>
        ${subscriptionEndDate ? `<p style="margin: 0; font-size: 14px; color: ${MODERN_COLORS.textLight};">
          <strong>Access until:</strong> ${subscriptionEndDate}
        </p>` : ''}
      `, MODERN_COLORS.successBg, MODERN_COLORS.success)}

      ${modernButton('Go to Dashboard →', 'https://thepepplanner.app/app/dashboard')}

      ${modernDivider()}

      <p style="font-size: 15px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 0 0 16px 0;">
        Now you have full access to track protocols, manage your stockpile, use all calculators, and sync across all your devices. 
        Don't forget to thank ${giftGiverName || 'your gift giver'}!
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 32px 0 0 0;">
        Happy researching! ✌️<br>
        <span style="color: ${MODERN_COLORS.primary}; font-weight: 600;">– The Pep Planner Team</span>
      </p>
    </div>
  `;
  
  return modernEmailWrapper(content);
};

// ========================================
// 🎁 V2: Gift Redeemed Notification Email (to gift giver)
// ========================================
exports.giftRedeemedNotificationEmailV2 = (giftGiverEmail, giftGiverName, recipientEmail, subscriptionType) => {
  const content = `
    <div style="padding: 48px 32px; color: ${MODERN_COLORS.text};">
      <h1 style="color: ${MODERN_COLORS.success}; font-size: 32px; font-weight: 700; margin: 0 0 12px 0; line-height: 1.2;">
        Your gift was redeemed! 🎉
      </h1>
      
      <p style="font-size: 18px; line-height: 1.6; color: ${MODERN_COLORS.textLight}; margin: 0 0 32px 0;">
        They loved it
      </p>
      
      <p style="font-size: 16px; line-height: 1.7; color: ${MODERN_COLORS.text}; margin: 0 0 20px 0;">
        Hey${giftGiverName ? ` ${giftGiverName}` : ''}! Great news — ${recipientEmail} just activated their gift subscription. 
        Thanks for spreading the love! 💚
      </p>

      ${modernCard(`
        <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: ${MODERN_COLORS.text};">
          🎁 Gift activated:
        </p>
        <p style="margin: 0 0 6px 0; font-size: 14px; color: ${MODERN_COLORS.textLight};">
          <strong>Recipient:</strong> ${recipientEmail}
        </p>
        <p style="margin: 0; font-size: 14px; color: ${MODERN_COLORS.textLight};">
          <strong>Plan:</strong> ${subscriptionType || 'The Pep Planner'}
        </p>
      `, MODERN_COLORS.successBg, MODERN_COLORS.success)}

      ${modernDivider()}

      <p style="font-size: 15px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 0 0 16px 0;">
        They now have full access to all features. Thanks for introducing someone new to The Pep Planner community!
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 32px 0 0 0;">
        You're awesome! ✌️<br>
        <span style="color: ${MODERN_COLORS.primary}; font-weight: 600;">– The Pep Planner Team</span>
      </p>
    </div>
  `;
  
  return modernEmailWrapper(content);
};

// ========================================
// ⏰ V2: Trial Extension Email
// ========================================
exports.trialExtensionEmailV2 = (userName, userEmail, daysAdded, newEndDate, adminNote) => {
  const content = `
    <div style="padding: 48px 32px; color: ${MODERN_COLORS.text};">
      <h1 style="color: ${MODERN_COLORS.success}; font-size: 32px; font-weight: 700; margin: 0 0 12px 0; line-height: 1.2;">
        Trial extended! 🎉
      </h1>
      
      <p style="font-size: 18px; line-height: 1.6; color: ${MODERN_COLORS.textLight}; margin: 0 0 32px 0;">
        More time to explore
      </p>
      
      <p style="font-size: 16px; line-height: 1.7; color: ${MODERN_COLORS.text}; margin: 0 0 20px 0;">
        Hey${userName ? ` ${userName}` : ''}! Good news — we've extended your trial by ${daysAdded} days!
      </p>

      ${modernCard(`
        <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: ${MODERN_COLORS.text};">
          ⏰ Your new trial details:
        </p>
        <p style="margin: 0 0 6px 0; font-size: 14px; color: ${MODERN_COLORS.textLight};">
          <strong>Days added:</strong> ${daysAdded}
        </p>
        <p style="margin: 0; font-size: 14px; color: ${MODERN_COLORS.textLight};">
          <strong>New end date:</strong> ${newEndDate || 'Check your account'}
        </p>
        ${adminNote ? `
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid ${MODERN_COLORS.accent};">
          <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: ${MODERN_COLORS.textLight};">Note from our team:</p>
          <p style="margin: 0; font-size: 14px; font-style: italic; color: ${MODERN_COLORS.text};">
            "${adminNote}"
          </p>
        </div>
        ` : ''}
      `, MODERN_COLORS.successBg, MODERN_COLORS.success)}

      ${modernButton('Go to Dashboard →', 'https://thepepplanner.app/app/dashboard')}

      ${modernDivider()}

      <p style="font-size: 15px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 0 0 16px 0;">
        Keep exploring all features, and let us know if you have any questions or feedback. We're here to help!
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 32px 0 0 0;">
        Happy researching! ✌️<br>
        <span style="color: ${MODERN_COLORS.primary}; font-weight: 600;">– The Pep Planner Team</span>
      </p>
    </div>
  `;
  
  return modernEmailWrapper(content);
};

// ========================================
// 📧 V2: Email Change Notification Email
// ========================================
exports.emailChangeNotificationEmailV2 = (oldEmail, newEmail, timestamp) => {
  const content = `
    <div style="padding: 48px 32px; color: ${MODERN_COLORS.text};">
      <h1 style="color: ${MODERN_COLORS.warning}; font-size: 32px; font-weight: 700; margin: 0 0 12px 0; line-height: 1.2;">
        Email address changed 📧
      </h1>
      
      <p style="font-size: 18px; line-height: 1.6; color: ${MODERN_COLORS.textLight}; margin: 0 0 32px 0;">
        Important security notification
      </p>
      
      <p style="font-size: 16px; line-height: 1.7; color: ${MODERN_COLORS.text}; margin: 0 0 20px 0;">
        Hey! This is a security notification that your account email was just changed.
      </p>

      ${modernCard(`
        <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: ${MODERN_COLORS.text};">
          📋 Change details:
        </p>
        <p style="margin: 0 0 6px 0; font-size: 14px; color: ${MODERN_COLORS.textLight};">
          <strong>Old email:</strong> ${oldEmail}
        </p>
        <p style="margin: 0 0 6px 0; font-size: 14px; color: ${MODERN_COLORS.textLight};">
          <strong>New email:</strong> ${newEmail}
        </p>
        <p style="margin: 0; font-size: 14px; color: ${MODERN_COLORS.textLight};">
          <strong>When:</strong> ${timestamp || 'Just now'}
        </p>
      `, MODERN_COLORS.warningBg, MODERN_COLORS.warning)}

      ${modernDivider()}

      <h2 style="color: ${MODERN_COLORS.primary}; font-size: 20px; font-weight: 600; margin: 0 0 20px 0;">
        What to do:
      </h2>
      
      <p style="font-size: 15px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 0 0 16px 0;">
        <strong style="color: ${MODERN_COLORS.success};">If you made this change:</strong><br>
        You're all set! No action needed. Your new email will need to be verified before it becomes active.
      </p>

      <p style="font-size: 15px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 0 0 16px 0;">
        <strong style="color: ${MODERN_COLORS.error};">If you did NOT make this change:</strong><br>
        Your account may have been compromised. Change your password immediately and contact support.
      </p>

      ${modernButton('Secure Your Account →', 'https://thepepplanner.app/app/account/profile', MODERN_COLORS.warning)}

      ${modernDivider()}

      <p style="font-size: 15px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 0;">
        Questions or concerns? Reply to this email or contact us at support@thepepplanner.app
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 32px 0 0 0;">
        Stay secure! ✌️<br>
        <span style="color: ${MODERN_COLORS.primary}; font-weight: 600;">– The Pep Planner Security Team</span>
      </p>
    </div>
  `;
  
  return modernEmailWrapper(content);
};

// ========================================
// ✉️ V2: Email Change Verification Email
// ========================================
exports.emailChangeVerificationEmailV2 = (newEmail, oldEmail) => {
  const content = `
    <div style="padding: 48px 32px; color: ${MODERN_COLORS.text};">
      <h1 style="color: ${MODERN_COLORS.info}; font-size: 32px; font-weight: 700; margin: 0 0 12px 0; line-height: 1.2;">
        Verify your new email 📬
      </h1>
      
      <p style="font-size: 18px; line-height: 1.6; color: ${MODERN_COLORS.textLight}; margin: 0 0 32px 0;">
        One more step
      </p>
      
      <p style="font-size: 16px; line-height: 1.7; color: ${MODERN_COLORS.text}; margin: 0 0 20px 0;">
        Hey! You've requested to change your account email from <strong>${oldEmail}</strong> to <strong>${newEmail}</strong>.
      </p>

      ${modernCard(`
        <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: ${MODERN_COLORS.text};">
          📬 Check your inbox
        </p>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${MODERN_COLORS.textLight};">
          You should receive a verification email from Firebase shortly. Please check your inbox (and spam folder) for an email with the subject "Verify your email for The Pep Planner".
        </p>
      `, MODERN_COLORS.infoBg, MODERN_COLORS.info)}

      ${modernDivider()}

      <h2 style="color: ${MODERN_COLORS.primary}; font-size: 20px; font-weight: 600; margin: 0 0 20px 0;">
        To complete the change:
      </h2>
      
      <div style="margin: 24px 0;">
        <div style="margin-bottom: 12px;">
          <p style="margin: 0; font-size: 15px; color: ${MODERN_COLORS.text};">1. Check your inbox for the verification email</p>
        </div>
        <div style="margin-bottom: 12px;">
          <p style="margin: 0; font-size: 15px; color: ${MODERN_COLORS.text};">2. Click the verification link in that email</p>
        </div>
        <div>
          <p style="margin: 0; font-size: 15px; color: ${MODERN_COLORS.text};">3. Your email address will be updated once verified</p>
        </div>
      </div>

      ${modernDivider()}

      <p style="font-size: 15px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 0;">
        If you didn't request this email change, please contact support immediately at support@thepepplanner.app
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 32px 0 0 0;">
        Almost there! ✌️<br>
        <span style="color: ${MODERN_COLORS.primary}; font-weight: 600;">– The Pep Planner Team</span>
      </p>
    </div>
  `;
  
  return modernEmailWrapper(content);
};

/**
 * Email change verification WITH link (admin resend / manual recovery).
 * Use when sending the verification link via Resend instead of Firebase's native email.
 */
exports.emailChangeVerificationWithLinkEmail = (newEmail, oldEmail, verificationLink) => {
  const content = `
    <div style="padding: 48px 32px; color: ${MODERN_COLORS.text};">
      <h1 style="color: ${MODERN_COLORS.info}; font-size: 32px; font-weight: 700; margin: 0 0 12px 0; line-height: 1.2;">
        Verify your new email 📬
      </h1>
      
      <p style="font-size: 18px; line-height: 1.6; color: ${MODERN_COLORS.textLight}; margin: 0 0 32px 0;">
        One more step
      </p>
      
      <p style="font-size: 16px; line-height: 1.7; color: ${MODERN_COLORS.text}; margin: 0 0 20px 0;">
        You requested to change your account email from <strong>${oldEmail}</strong> to <strong>${newEmail}</strong>.
      </p>

      <p style="font-size: 16px; line-height: 1.7; color: ${MODERN_COLORS.text}; margin: 0 0 24px 0;">
        Click the button below to verify this email address and complete the change. This link will expire in 24 hours.
      </p>

      ${modernButton('Verify new email address →', verificationLink, MODERN_COLORS.primary)}

      ${modernDivider()}

      <p style="font-size: 14px; line-height: 1.6; color: ${MODERN_COLORS.textLight}; margin: 0;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${verificationLink}" style="color: ${MODERN_COLORS.primary}; word-break: break-all;">${verificationLink}</a>
      </p>

      ${modernDivider()}

      <p style="font-size: 15px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 0;">
        If you didn't request this email change, please contact support at support@thepepplanner.app
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 32px 0 0 0;">
        – The Pep Planner Team
      </p>
    </div>
  `;
  return modernEmailWrapper(content);
};

/**
 * Support ticket reply notification -- sent to user when admin responds to their open ticket
 */
exports.supportTicketReplyEmail = (userEmail, ticketSubject, adminMessage, ticketId) => {
  const content = `
    <div style="padding: 48px 32px; color: ${MODERN_COLORS.text};">
      <h1 style="color: ${MODERN_COLORS.primary}; font-size: 28px; font-weight: 700; margin: 0 0 8px 0; line-height: 1.2;">
        You have a new reply 💬
      </h1>

      <p style="font-size: 16px; line-height: 1.6; color: ${MODERN_COLORS.textLight}; margin: 0 0 28px 0;">
        Support team responded to your ticket
      </p>

      <div style="background: ${MODERN_COLORS.accent}; border-left: 4px solid ${MODERN_COLORS.primary}; border-radius: 8px; padding: 16px 20px; margin: 0 0 28px 0;">
        <p style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: ${MODERN_COLORS.textLight}; margin: 0 0 6px 0;">
          Ticket Subject
        </p>
        <p style="font-size: 16px; font-weight: 600; color: ${MODERN_COLORS.text}; margin: 0;">
          ${ticketSubject || 'Support Request'}
        </p>
      </div>

      <p style="font-size: 15px; line-height: 1.7; color: ${MODERN_COLORS.text}; margin: 0 0 16px 0;">
        Our support team just sent you a reply:
      </p>

      <div style="background: ${MODERN_COLORS.secondary}; border: 1px solid ${MODERN_COLORS.accent}; border-radius: 12px; padding: 20px 24px; margin: 0 0 28px 0;">
        <p style="font-size: 14px; font-weight: 600; color: ${MODERN_COLORS.primaryDark}; margin: 0 0 10px 0;">
          🛡️ The Pep Planner Support
        </p>
        <p style="font-size: 15px; line-height: 1.7; color: ${MODERN_COLORS.text}; margin: 0; white-space: pre-wrap;">
          ${adminMessage || ''}
        </p>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://thepepplanner.app/app/support" style="display: inline-block; background: ${MODERN_COLORS.primary}; color: #fff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px;">
          View Full Conversation →
        </a>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: ${MODERN_COLORS.textLight}; margin: 0 0 24px 0;">
        You can reply directly in the app. If you have any additional questions, our team is happy to help!
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: ${MODERN_COLORS.text}; margin: 24px 0 0 0;">
        – The Pep Planner Support Team
      </p>
    </div>
  `;
  return modernEmailWrapper(content);
};

/**
 * Win-back email -- honest, confident re-engagement for users who couldn't subscribe
 */
exports.winBackEmail = (userName = null, promoCode = null) => {

  const content = `
    <div style="padding: 0 8px;">
      <h1 style="font-size: 26px; font-weight: 700; color: ${MODERN_COLORS.heading}; margin: 0 0 20px 0; line-height: 1.3;">
        The doors are open.
      </h1>

      <p style="font-size: 16px; line-height: 1.7; color: ${MODERN_COLORS.text}; margin: 0 0 16px 0;">
        When you signed up for The Pep Planner, subscriptions weren't fully set up yet &mdash;
        and if you tried to upgrade, it didn't work. That's on us.
      </p>

      <p style="font-size: 16px; line-height: 1.7; color: ${MODERN_COLORS.text}; margin: 0 0 20px 0;">
        We've spent the time since then building. A lot has changed &mdash; here's the short version:
      </p>

      <!-- What's new -->
      <div style="background: ${MODERN_COLORS.secondary}; border-radius: 12px; padding: 24px; margin: 0 0 24px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding: 8px 0; font-size: 15px; line-height: 1.5; color: ${MODERN_COLORS.text};">
              <span style="color: ${MODERN_COLORS.primary}; font-weight: 700;">&#10003;</span>&nbsp;&nbsp;Completely rebuilt protocol tracking with smart dosing schedules
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 15px; line-height: 1.5; color: ${MODERN_COLORS.text};">
              <span style="color: ${MODERN_COLORS.primary}; font-weight: 700;">&#10003;</span>&nbsp;&nbsp;New analytics dashboard &mdash; actually see your research trends
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 15px; line-height: 1.5; color: ${MODERN_COLORS.text};">
              <span style="color: ${MODERN_COLORS.primary}; font-weight: 700;">&#10003;</span>&nbsp;&nbsp;Redesigned reconstitution calculator
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 15px; line-height: 1.5; color: ${MODERN_COLORS.text};">
              <span style="color: ${MODERN_COLORS.primary}; font-weight: 700;">&#10003;</span>&nbsp;&nbsp;Real-time sync across all your devices
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 15px; line-height: 1.5; color: ${MODERN_COLORS.text};">
              <span style="color: ${MODERN_COLORS.primary}; font-weight: 700;">&#10003;</span>&nbsp;&nbsp;Subscriptions that actually work (finally)
            </td>
          </tr>
        </table>
      </div>

      <p style="font-size: 16px; line-height: 1.7; color: ${MODERN_COLORS.text}; margin: 0 0 8px 0;">
        The app you signed up for? It's grown up.
      </p>

      <!-- Reactivation notice -->
      <div style="background: linear-gradient(135deg, ${MODERN_COLORS.primary}12, ${MODERN_COLORS.primary}06); border: 2px solid ${MODERN_COLORS.primary}25; border-radius: 16px; padding: 28px; margin: 24px 0; text-align: center;">
        <p style="font-size: 15px; color: ${MODERN_COLORS.text}; margin: 0 0 6px 0; line-height: 1.5;">
          We've unlocked your account with <strong style="color: ${MODERN_COLORS.primary};">14 days of full access</strong>
          so you can see everything that's changed.
        </p>
        <p style="font-size: 14px; color: ${MODERN_COLORS.textLight}; margin: 0;">
          No card needed &mdash; just log in.
        </p>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://thepepplanner.com/app" style="display: inline-block; background: ${MODERN_COLORS.primary}; color: #fff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Log In &amp; Explore
        </a>
      </div>

      <p style="font-size: 16px; line-height: 1.7; color: ${MODERN_COLORS.text}; margin: 24px 0 0 0;">
        &mdash; <span style="color: ${MODERN_COLORS.primary}; font-weight: 600;">Lea</span><br>
        <span style="font-size: 14px; color: ${MODERN_COLORS.textLight};">Founder, The Pep Planner</span>
      </p>
    </div>
  `;

  return modernEmailWrapper(content);
};

// 🔑 Magic Link (Passwordless Sign-In) Email
exports.magicLinkEmail = (email, signInLink) => {
  const content = `
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 26px; margin: 0 0 12px 0;">Your Sign-In Link 🔑</h1>

      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin: 0 0 16px 0;">
        Hey there! We received a request to sign in to <strong>The Pep Planner</strong> using this email address.
        Click the button below to log in instantly — no password needed.
      </p>

      <div class="highlight-box">
        <p style="margin: 0; font-size: 14px; color: ${COLORS.textLight};">
          🔒 This link is <strong>single-use</strong> and expires in <strong>1 hour</strong> for your security.
        </p>
      </div>

      <center>
        <a href="${signInLink}" class="button" style="display: inline-block; padding: 16px 40px; background-color: ${COLORS.primary}; color: #FFFFFF !important; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 17px; margin: 28px 0; letter-spacing: 0.3px;">
          Sign In to The Pep Planner →
        </a>
      </center>

      <p style="font-size: 13px; line-height: 1.6; color: ${COLORS.textLight}; margin: 0 0 8px 0;">
        Button not working? Copy and paste this link into your browser:
      </p>
      <p style="font-size: 12px; word-break: break-all; color: ${COLORS.primaryLight}; background: #F9FAFB; border: 1px solid ${COLORS.border}; border-radius: 8px; padding: 12px; margin: 0 0 24px 0;">
        ${signInLink}
      </p>

      <hr class="divider">

      <p style="font-size: 13px; line-height: 1.6; color: ${COLORS.textLight}; margin: 0;">
        ⚠️ If you didn't request this sign-in link, you can safely ignore this email. Your account is secure — no one can access it without clicking the link.
      </p>
    </div>
  `;

  return emailWrapper(content);
};

// 👋 Unregistered Magic Link — "We've never met" email
exports.unregisteredMagicLinkEmail = (email) => {
  const signupUrl = 'https://thepepplanner.app/login';

  const content = `
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 26px; margin: 0 0 16px 0;">Hmm&hellip; looks like we&rsquo;ve never met! 👋</h1>

      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin: 0 0 16px 0;">
        We received a request to send a sign-in link to <strong>${email}</strong>, but we couldn&rsquo;t find an account with that address.
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin: 0 0 24px 0;">
        If you&rsquo;re new here &mdash; welcome! The Pep Planner is your personal research management hub.
        Create your free account and get full access for 14 days, no credit card required.
      </p>

      <center>
        <a href="${signupUrl}" class="button" style="display: inline-block; padding: 16px 40px; background-color: ${COLORS.primary}; color: #FFFFFF !important; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 17px; margin: 0 0 28px 0; letter-spacing: 0.3px;">
          Create Your Account &rarr;
        </a>
      </center>

      <div class="highlight-box">
        <p style="margin: 0; font-size: 14px; color: ${COLORS.textLight};">
          Already have an account? Double-check the email address you signed up with and try again.
        </p>
      </div>

      <hr class="divider">

      <p style="font-size: 13px; line-height: 1.6; color: ${COLORS.textLight}; margin: 0;">
        If you didn&rsquo;t request this email, no action is needed &mdash; your information is safe.
      </p>
    </div>
  `;

  return emailWrapper(content);
};