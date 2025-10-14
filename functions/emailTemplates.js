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
        <img src="https://thepepplanner.app/tpp-logo.png" alt="The Pep Planner" class="logo-image" width="120" />
        <div class="tagline">Organize Your Research</div>
      </div>
      ${content}
      <div class="footer">
        <p style="margin: 0 0 12px 0; font-weight: 600; color: ${COLORS.text};">The Pep Planner</p>
        <p style="margin: 0 0 16px 0;">Your research management platform</p>
        <p style="margin: 0;">
          <a href="https://thepepplanner.app" style="color: ${COLORS.primary}; text-decoration: none;">Visit Website</a> • 
          <a href="https://thepepplanner.app/app/dashboard" style="color: ${COLORS.primary}; text-decoration: none;">Dashboard</a> • 
          <a href="https://thepepplanner.app/support" style="color: ${COLORS.primary}; text-decoration: none;">Support</a>
        </p>
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
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">🎁 Your 7-Day Free Trial is Active!</p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: ${COLORS.textLight};">
          Full access to all features. No credit card required.
        </p>
      </div>

      <h2 style="color: ${COLORS.primary}; font-size: 20px; margin: 32px 0 16px 0;">What you can do:</h2>
      
      <ul class="feature-list">
        <li><strong>Create Custom Protocols</strong> – Build and manage research protocols</li>
        <li><strong>Track Your Progress</strong> – Calendar integration and task management</li>
        <li><strong>Reconstitution Calculator</strong> – Calculate dosages with precision</li>
        <li><strong>Inventory Management</strong> – Track orders, stockpile, and vendors</li>
        <li><strong>Research Notes</strong> – Document findings and observations</li>
        <li><strong>Data Analytics</strong> – Visualize trends and metrics</li>
      </ul>

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
        Best,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

// ✉️ Email Verification
exports.verificationEmail = (verificationLink) => {
  const content = `
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Verify Your Email 📧</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Thanks for signing up! Please verify your email address to ensure you can:
      </p>
      
      <ul class="feature-list">
        <li>Reset your password if needed</li>
        <li>Receive important account notifications</li>
        <li>Access all features securely</li>
      </ul>

      <center>
        <a href="${verificationLink}" class="button">
          Verify Email Address
        </a>
      </center>

      <p style="font-size: 14px; color: ${COLORS.textLight}; text-align: center; margin: 16px 0;">
        Or copy and paste this link into your browser:<br>
        <span style="font-size: 12px; word-break: break-all;">${verificationLink}</span>
      </p>

      <div class="highlight-box">
        <p style="margin: 0; font-size: 14px; color: ${COLORS.textLight};">
          ⚠️ If you didn't create an account with The Pep Planner, you can safely ignore this email.
        </p>
      </div>

      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text}; margin-top: 24px;">
        Best,<br>
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
        Best,<br>
        <strong style="color: ${COLORS.primary};">The Pep Planner Team</strong>
      </p>
    </div>
  `;
  
  return emailWrapper(content);
};

// 🔔 Trial Ending Soon
exports.trialEndingEmail = (daysLeft, userEmail) => {
  const content = `
    <div class="content">
      <h1 style="color: ${COLORS.primary}; font-size: 28px; margin: 0 0 16px 0;">Your Trial Ends in ${daysLeft} Days ⏰</h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Hi there! We hope you're enjoying The Pep Planner.
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
        Your 7-day free trial will end in <strong>${daysLeft} days</strong>. 
        To continue accessing your research data and all features, please choose a subscription plan.
      </p>

      <div class="highlight-box">
        <p style="margin: 0; font-weight: 600; color: ${COLORS.primary};">✨ Continue Your Research Journey</p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: ${COLORS.textLight};">
          Choose from flexible plans starting at $8.99/month
        </p>
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
        Best,<br>
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

