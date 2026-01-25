import React, { useState, useEffect } from 'react';
import { Mail, Eye, Save, Send, RotateCcw, Copy, CheckCircle, HelpCircle, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, auth } from '../../config/firebase';
import { doc, getDoc, setDoc, deleteField } from 'firebase/firestore';
import { getUserList } from '../../services/firebase';

const DEFAULT_TEMPLATES = {
  welcome: {
    name: 'Welcome Email',
    subject: 'Welcome to The Pep Planner!',
    heading: 'Welcome to The Pep Planner!',
    greeting: "Hi there! We're thrilled to have you join our research community.",
    mainMessage: "We built this tool as researchers, for researchers. Everything you need, all in one place.",
    ctaText: 'Get Started',
    ctaLink: 'https://thepepplanner.app/app/dashboard',
    highlightTitle: '🎁 Your Research Trial is Active!',
    highlightMessage: 'Full access to all features. No credit card required.',
    features: [
      'Create Custom Protocols – Build and manage research protocols',
      'Track Your Progress – Calendar integration and task management',
      'Reconstitution Calculator – Calculate dosages with precision',
      'Inventory Management – Track orders, stockpile, and vendors',
      'Research Notes – Document findings and observations',
      'Data Analytics – Visualize trends and metrics'
    ]
  },
  giftPurchaseConfirmation: {
    name: 'Gift Purchase Confirmation',
    subject: '🎁 Gift Purchase Confirmed - The Pep Planner',
    heading: 'Thank You For Your Gift!',
    greeting: 'Hi %GIFTGIVERNAME%,',
    mainMessage: 'Your gift for %RECIPIENTEMAIL% has been successfully processed. A confirmation has been sent, and they can redeem their access at any time.',
    ctaText: 'Manage Gifts',
    ctaLink: 'https://thepepplanner.app/app/account',
    highlightTitle: 'Gift Details',
    highlightMessage: 'Type: %SUBSCRIPTIONTYPE% • Price: %PRICEPAID% • Gift ID: %GIFTID%',
    features: [
      'Recipient receives instructions to redeem access',
      'You can track redemption status anytime',
      'No account required for the recipient until redemption'
    ]
  },
  giftRedeemed: {
    name: 'Gift Redeemed (Recipient)',
    subject: '🎉 Gift Successfully Redeemed - Welcome to The Pep Planner!',
    heading: 'Welcome to The Pep Planner!',
    greeting: 'Great news! Your gift from %GIFTGIVERNAME% has been redeemed.',
    mainMessage: 'You now have access to The Pep Planner for %SUBSCRIPTIONTYPE%. Explore the workspace and organize your research.',
    ctaText: 'Open Dashboard',
    ctaLink: 'https://thepepplanner.app/app/dashboard',
    highlightTitle: 'Access Details',
    highlightMessage: 'Ends on %SUBSCRIPTIONENDDATE%',
    features: [
      'Create and manage research protocols',
      'Track vendors, orders, and stockpile',
      'Use calculators and analytics to optimize your research'
    ]
  },
  giftRedeemedNotification: {
    name: 'Gift Redeemed (Giver Notice)',
    subject: '🎉 Your Gift Was Redeemed - The Pep Planner',
    heading: 'Your Gift Was Redeemed!',
    greeting: 'Hi %GIFTGIVERNAME%,',
    mainMessage: '%RECIPIENTEMAIL% has successfully redeemed your gift of %SUBSCRIPTIONTYPE% access to The Pep Planner.',
    ctaText: 'View Gifts',
    ctaLink: 'https://thepepplanner.app/app/account',
    highlightTitle: 'Redemption Details',
    highlightMessage: 'Your gift is active and ready to use.'
  },
  verification: {
    name: 'Email Verification',
    subject: 'Verify your email for The Pep Planner',
    heading: 'Verify Your Email 📧',
    greeting: 'Thanks for signing up! Please verify your email address to ensure you can:',
    mainMessage: '',
    ctaText: 'Verify Email Address',
    ctaLink: '%VERIFICATION_LINK%',
    highlightTitle: '',
    highlightMessage: "If you didn't create an account with The Pep Planner, you can safely ignore this email.",
    features: [
      'Reset your password if needed',
      'Receive important account notifications',
      'Access all features securely'
    ]
  },
  passwordReset: {
    name: 'Password Reset',
    subject: 'Reset your password for The Pep Planner',
    heading: 'Reset Your Password 🔐',
    greeting: 'We received a request to reset the password for your account.',
    mainMessage: 'Click the button below to create a new password:',
    ctaText: 'Reset Password',
    ctaLink: '%RESET_LINK%',
    highlightTitle: '⏱️ This link expires in 1 hour',
    highlightMessage: 'For your security, this password reset link is only valid for 60 minutes.',
    features: []
  },
  trialEnding: {
    name: 'Trial Ending Soon',
    subject: 'Your trial ends in 2 days - The Pep Planner',
    heading: 'Your Trial Ends in 2 Days ⏰',
    greeting: "Hi there! We hope you're enjoying The Pep Planner.",
    mainMessage: 'Your 10-day research trial will end in 2 days. To continue accessing your research data and all features, please choose a subscription plan.',
    ctaText: 'View Plans & Pricing',
    ctaLink: 'https://thepepplanner.app/app/account',
    highlightTitle: '✨ Continue Your Research Journey',
    highlightMessage: 'Choose from flexible plans starting at $8.99/month',
    features: []
  },
  trialExtension: {
    name: 'Trial Extension Notification',
    subject: '🎉 Your Research Trial Has Been Extended!',
    heading: 'Your Research Trial Has Been Extended! 🎉',
    greeting: 'Hi %USERNAME%! Great news!',
    mainMessage: 'We\'ve extended your research trial access to The Pep Planner! You now have %DAYSADDED% additional days to explore all the features. Your new trial end date is %NEWENDDATE%.',
    ctaText: 'Continue Your Research',
    ctaLink: 'https://thepepplanner.app/app/dashboard',
    highlightTitle: '⏰ Updated Trial Period',
    highlightMessage: 'Additional Days: %DAYSADDED% | New End Date: %NEWENDDATE%',
    features: [
      'Unlimited research protocol tracking',
      'Vendor management and comparison',
      'Order history and analytics',
      'Lab access tracking and planning',
      'Comprehensive research notes'
    ]
  },
  subscription: {
    name: 'Subscription Confirmed',
    subject: 'Subscription Confirmed - The Pep Planner',
    heading: 'Welcome to Pro Plan! 🎉',
    greeting: 'Thank you for subscribing to The Pep Planner!',
    mainMessage: 'You now have full access to all features. Your subscription will automatically renew, and you can manage your billing at any time from your Account.',
    ctaText: 'Go to Dashboard',
    ctaLink: 'https://thepepplanner.app/app/dashboard',
    highlightTitle: 'Subscription Details',
    highlightMessage: 'Plan: Pro Plan • Status: Active ✓',
    features: []
  },
  paymentFailed: {
    name: 'Payment Failed',
    subject: 'Payment Failed - Action Required - The Pep Planner',
    heading: 'Payment Failed - Action Required ⚠️',
    greeting: 'We were unable to process your recent payment for The Pep Planner.',
    mainMessage: 'Your subscription is at risk of being suspended. Please update your payment method to continue accessing your research data and all features.',
    ctaText: 'Update Payment Method',
    ctaLink: 'https://thepepplanner.app/app/account',
    highlightTitle: 'Immediate Action Required',
    highlightMessage: 'Your subscription will be suspended in 3 days if payment is not updated. Don\'t lose access to your research data!',
    features: []
  },
  weeklyReminder: {
    name: 'Weekly Research Reminder',
    subject: 'Your Research Progress - Weekly Update - The Pep Planner',
    heading: 'Your Research Progress 📊',
    greeting: 'Hi there! Here\'s your weekly research update.',
    mainMessage: 'Track your progress, log your protocols, and stay organized with your research journey. Every small step counts!',
    ctaText: 'Continue Research',
    ctaLink: 'https://thepepplanner.app/app/dashboard',
    highlightTitle: '💡 Research Tip',
    highlightMessage: 'Consistent logging helps identify patterns and optimize your research outcomes.',
    features: [
      'Log your daily protocols',
      'Track your progress metrics',
      'Update your research notes',
      'Review your inventory levels',
      'Plan your next research phase'
    ]
  },
  paymentSuccessful: {
    name: 'Payment Successful',
    subject: 'Payment Confirmed - The Pep Planner',
    heading: 'Payment Confirmed ✅',
    greeting: 'Great news! Your payment has been successfully processed.',
    mainMessage: 'Your subscription is now active and you have full access to all features. Thank you for continuing your research journey with us.',
    ctaText: 'Access Dashboard',
    ctaLink: 'https://thepepplanner.app/app/dashboard',
    highlightTitle: '🎉 Subscription Active',
    highlightMessage: 'Your research data is safe and all features are unlocked.',
    features: []
  },
  renewalReminder: {
    name: 'Subscription Renewal Reminder',
    subject: 'Your subscription renews in 3 days - The Pep Planner',
    heading: 'Subscription Renewal in 3 Days ⏰',
    greeting: 'Your The Pep Planner subscription will automatically renew in 3 days.',
    mainMessage: 'No action needed - your payment method will be charged automatically. You can manage your subscription or update payment details anytime.',
    ctaText: 'Manage Subscription',
    ctaLink: 'https://thepepplanner.app/app/account',
    highlightTitle: '💳 Automatic Renewal',
    highlightMessage: 'Your subscription will continue seamlessly. Update payment method if needed.',
    features: []
  },
  subscriptionCancelled: {
    name: 'Subscription Cancelled',
    subject: 'Subscription Cancelled - The Pep Planner',
    heading: 'Subscription Cancelled 📋',
    greeting: 'We\'re sorry to see you go! Your subscription has been cancelled.',
    mainMessage: 'You\'ll continue to have access to your research data until the end of your current billing period. We hope you\'ll consider rejoining us in the future.',
    ctaText: 'Reactivate Subscription',
    ctaLink: 'https://thepepplanner.app/app/account',
    highlightTitle: '📊 Your Research Data',
    highlightMessage: 'Your data remains accessible until [END_DATE]. Export your research if needed.',
    features: []
  },
  lifetimeAccessGranted: {
    name: 'Lifetime Access Granted',
    subject: '🎉 You\'ve Been Granted Lifetime Access to The Pep Planner!',
    heading: 'Congratulations! 🎉',
    greeting: 'Great news! You\'ve been granted lifetime access to The Pep Planner!',
    mainMessage: 'The Pep Planner is your complete research management platform, designed to help you organize protocols, track progress, and optimize your research journey. You now have permanent access to all features - no subscription required!',
    ctaText: 'Start Researching',
    ctaLink: 'https://thepepplanner.app/app/dashboard',
    highlightTitle: '🏆 Lifetime Access Activated',
    highlightMessage: 'Full access to all features forever. Happy researching!',
    features: [
      'Create Custom Protocols – Build and manage research protocols',
      'Track Your Progress – Calendar integration and task management', 
      'Reconstitution Calculator – Calculate dosages with precision',
      'Inventory Management – Track orders, stockpile, and vendors',
      'Research Notes – Document findings and observations',
      'Data Analytics – Visualize trends and metrics',
      'Priority Support – Get help when you need it'
    ]
  },
  manualLifetimeGrant: {
    name: 'Manual Lifetime Grant',
    subject: '✅ Lifetime Access Granted by Admin - The Pep Planner',
    heading: 'Lifetime Access Granted',
    greeting: 'An administrator has granted your account lifetime access to The Pep Planner.',
    mainMessage: 'You now have permanent access to all features with no recurring billing. This is a special research authorization applied directly to your account.',
    ctaText: 'Create Your Account',
    ctaLink: 'https://thepepplanner.app/login?email=%USEREMAIL%&signup=true&pregrant=true',
    highlightTitle: 'Access Details',
    highlightMessage: 'Status: Active • Type: Admin Granted • Expires: Never',
    features: [
      'Full access to all research features',
      'Priority support',
      'All future updates included',
    ]
  },
  giftNotification: {
    name: "Gift Received Notification",
    subject: "🎁 You've Been Gifted Access to The Pep Planner!",
    heading: "You've Been Gifted!",
    greeting: "Great news! %GIFTGIVERNAME% just gifted you access to The Pep Planner.",
    mainMessage: "%GIFTMESSAGE%",
    highlightTitle: 'Gift Details',
    highlightMessage: 'This gift includes full access for the selected term. Activate to begin your research journey.',
    ctaText: 'Redeem Your Gift',
    ctaLink: 'https://thepepplanner.app/app/redeem',
    features: [
      'Full access to all features during the gift period',
      'Keep your data — upgrade anytime to continue',
      'Fast setup — be up and running in minutes',
    ]
  },
  giftExpiringSoon: {
    name: 'Gift Subscription Expiring Soon',
    subject: '🎁 Your Gifted Research Time Is Ending Soon - The Pep Planner',
    heading: 'Your Gifted Research Time Is Ending Soon',
    greeting: 'Hi there!',
    mainMessage: 'Your gifted subscription from a friend is ending soon. Don\'t let your research organization stop!',
    ctaText: 'Extend Your Research Plan',
    ctaLink: 'https://thepepplanner.app/app/account',
    highlightTitle: '⏰ Time Remaining',
    highlightMessage: 'Your gift expires in 3 days. Continue your research journey with our flexible plans.',
    features: [
      'Continue organizing your research seamlessly',
      'Keep all your data and research notes',
      'Choose from monthly, quarterly, or annual plans',
      'Flexible pricing to fit your research needs'
    ]
  },
  squarespaceActivation: {
    name: 'Squarespace Activation Email',
    subject: 'Activate Your The Pep Planner Account 🧬',
    heading: 'Welcome to The Pep Planner! 🧬',
    greeting: 'Hi %CUSTOMERNAME%,',
    mainMessage: 'Thank you for your purchase! Your %PLANKEY% subscription is ready to activate.',
    ctaText: 'Activate My Account',
    ctaLink: '%ACTIVATION_LINK%',
    highlightTitle: "What's Next?",
    highlightMessage: 'Click below to activate your account and start using The Pep Planner app. This will only take a moment!',
    features: []
  },
  squarespaceActivated: {
    name: 'Squarespace Subscription Activated',
    subject: 'Your Subscription is Now Active! ✅',
    heading: 'Subscription Activated! 🎉',
    greeting: 'Hi %CUSTOMERNAME%,',
    mainMessage: 'Great news! Your %PLANNAME% subscription from Squarespace is now active.',
    ctaText: 'Login to The Pep Planner',
    ctaLink: 'https://thepepplanner.app',
    highlightTitle: 'Access Granted',
    highlightMessage: 'You now have full access to all features of The Pep Planner.',
    features: []
  },
  customAnnouncement: {
    name: 'Custom Announcement / Maintenance',
    subject: 'Important Update - The Pep Planner',
    heading: 'Important Update',
    greeting: 'Hello!',
    mainMessage: 'We wanted to let you know about an important update regarding The Pep Planner.',
    ctaText: 'Learn More',
    ctaLink: 'https://thepepplanner.app',
    highlightTitle: 'Action Required',
    highlightMessage: 'Please review this information carefully.',
    features: []
  },
  accountDeletion: {
    name: 'Account Deletion',
    subject: 'Account Deletion Confirmation - The Pep Planner',
    heading: 'Your Account Has Been Deleted',
    greeting: 'Hi %USERNAME%,',
    mainMessage: 'Your account associated with %USEREMAIL% has been permanently deleted. All your research data, protocols, and account information have been removed from our system.',
    ctaText: '',
    ctaLink: '',
    highlightTitle: 'Important Information',
    highlightMessage: 'This action cannot be undone. If you would like to use The Pep Planner again in the future, you will need to create a new account.',
    features: []
  },
  inDepthRequest: {
    name: 'In-Depth Request',
    subject: 'In-Depth Request - The Pep Planner',
    heading: 'In-Depth Request',
    greeting: 'Hi %USERNAME%,',
    mainMessage: 'Thank you for your in-depth request. We have received your inquiry and will review it carefully. Our team will get back to you as soon as possible.',
    ctaText: 'View Request',
    ctaLink: 'https://thepepplanner.app/app/account',
    highlightTitle: '📋 Request Received',
    highlightMessage: 'We typically respond within 24-48 hours.',
    features: []
  },
  inviteEmail: {
    name: 'Invite Email',
    subject: 'You\'re Invited to The Pep Planner! 🎉',
    heading: 'You\'re Invited!',
    greeting: 'Hi there!',
    mainMessage: 'You\'ve been invited to join The Pep Planner, your complete research management platform. Create an account to get started with organizing your research protocols and tracking your progress.',
    ctaText: 'Accept Invitation',
    ctaLink: 'https://thepepplanner.app/signup',
    highlightTitle: '🎁 Special Invitation',
    highlightMessage: 'Join our research community and start organizing your protocols today.',
    features: [
      'Create Custom Protocols – Build and manage research protocols',
      'Track Your Progress – Calendar integration and task management',
      'Reconstitution Calculator – Calculate dosages with precision',
      'Inventory Management – Track orders, stockpile, and vendors',
      'Research Notes – Document findings and observations'
    ]
  },
  trialExpiredSurvey: {
    name: 'Trial Expired Survey',
    subject: 'Quick Survey: Help Us Improve The Pep Planner 📊',
    heading: 'We\'d Love Your Feedback!',
    greeting: 'Hey there!',
    mainMessage: 'Your trial period has ended, and we\'d love to hear about your experience with The Pep Planner. Your feedback helps us improve the platform for researchers like you.',
    ctaText: 'Take Survey',
    ctaLink: 'https://docs.google.com/forms/d/e/1FAIpQLSfWCDthbS9tBOY-L-XhF4hzYcC6Dd3eXr9cDFANc7-uVJx-eg/viewform?usp=header',
    highlightTitle: '📗As a thank you; 14 day trial extension!',
    highlightMessage: 'Complete this quick survey (less than 2 minutes) and we\'ll extend your trial by 14 days so you can continue your research!',
    features: [
      'Help us improve The Pep Planner',
      'Share what worked and what didn\'t',
      'Suggest features you\'d like to see',
      'Get 14 days of free access upon completion'
    ]
  }
};

const DEFAULT_COLORS = {
  primary: '#344E41',
  primaryLight: '#3A5A40',
  secondary: '#A3B18A',
  sage: '#D4D7CD',
  white: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280'
};

export default function EmailTemplateManager({ theme }) {
  const [selectedTemplate, setSelectedTemplate] = useState('welcome');
  const [templates, setTemplates] = useState(() => {
    const saved = localStorage.getItem('tpp_email_templates');
    return saved ? JSON.parse(saved) : DEFAULT_TEMPLATES;
  });
  const [colors, setColors] = useState(() => {
    const saved = localStorage.getItem('tpp_email_colors');
    return saved ? JSON.parse(saved) : DEFAULT_COLORS;
  });
  const [showPreview, setShowPreview] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showVariablesCheatSheet, setShowVariablesCheatSheet] = useState(false);
  const [sendingToAll, setSendingToAll] = useState(false);
  const [sendProgress, setSendProgress] = useState({ sent: 0, total: 0 });

  // Available variables for each template type
  const templateVariables = {
    welcome: [
      { name: 'USERNAME', description: 'User\'s name' },
      { name: 'USEREMAIL', description: 'User\'s email address' }
    ],
    verification: [
      { name: 'VERIFICATION_LINK', description: 'Email verification link' }
    ],
    passwordReset: [
      { name: 'RESET_LINK', description: 'Password reset link' }
    ],
    trialEnding: [
      { name: 'DAYSLEFT', description: 'Days remaining in trial' }
    ],
    trialExtension: [
      { name: 'USERNAME', description: 'User\'s name' },
      { name: 'USEREMAIL', description: 'User\'s email address' },
      { name: 'DAYSADDED', description: 'Number of days added to trial' },
      { name: 'NEWENDDATE', description: 'New trial end date' },
      { name: 'ADMINNOTE', description: 'Optional note from admin (can be empty)' }
    ],
    subscription: [
      { name: 'PLAN', description: 'Subscription plan name' },
      { name: 'INTERVAL', description: 'Billing interval (month/year)' },
      { name: 'PRICE', description: 'Subscription price' }
    ],
    paymentFailed: [
      { name: 'AMOUNT', description: 'Failed payment amount' },
      { name: 'CURRENCY', description: 'Currency code (e.g., USD)' },
      { name: 'INVOICEURL', description: 'Link to invoice/payment page' }
    ],
    paymentSuccessful: [
      { name: 'AMOUNT', description: 'Payment amount' },
      { name: 'CURRENCY', description: 'Currency code (e.g., USD)' },
      { name: 'RECEIPTURL', description: 'Link to receipt' }
    ],
    subscriptionCancelled: [
      { name: 'PLANNAME', description: 'Cancelled plan name' },
      { name: 'ENDDATE', description: 'Subscription end date' }
    ],
    renewalReminder: [
      { name: 'PLANNAME', description: 'Plan name renewing' }
    ],
    weeklyReminder: [
      { name: 'FIRSTNAME', description: 'User\'s first name' }
    ],
    lifetimeAccessGranted: [
      { name: 'USEREMAIL', description: 'User\'s email address' },
      { name: 'USERNAME', description: 'User\'s name' }
    ],
    manualLifetimeGrant: [
      { name: 'USERNAME', description: 'User\'s name' },
      { name: 'USEREMAIL', description: 'User\'s email address' },
      { name: 'REASON', description: 'Reason why lifetime access was granted' }
    ],
    giftNotification: [
      { name: 'RECIPIENTNAME', description: 'Gift recipient\'s name' },
      { name: 'GIFTGIVERNAME', description: 'Name of person who sent the gift' },
      { name: 'GIFTMESSAGE', description: 'Optional personal message from giver' },
      { name: 'GIFTID', description: 'Unique gift ID' },
      { name: 'SUBSCRIPTIONTYPE', description: 'Type of subscription (monthly/annual)' }
    ],
    giftPurchaseConfirmation: [
      { name: 'GIFTGIVEREMAIL', description: 'Email of gift giver' },
      { name: 'GIFTGIVERNAME', description: 'Name of gift giver' },
      { name: 'RECIPIENTEMAIL', description: 'Email of gift recipient' },
      { name: 'GIFTMESSAGE', description: 'Personal message included with gift' },
      { name: 'GIFTID', description: 'Unique gift ID' },
      { name: 'SUBSCRIPTIONTYPE', description: 'Type of subscription gifted' },
      { name: 'PRICEPAID', description: 'Amount paid for gift' }
    ],
    giftRedeemed: [
      { name: 'GIFTGIVERNAME', description: 'Name of person who sent the gift' },
      { name: 'SUBSCRIPTIONTYPE', description: 'Type of subscription' },
      { name: 'SUBSCRIPTIONENDDATE', description: 'When the gift subscription ends' }
    ],
    giftRedeemedNotification: [
      { name: 'GIFTGIVERNAME', description: 'Name of person who sent the gift' },
      { name: 'RECIPIENTEMAIL', description: 'Email of person who redeemed' },
      { name: 'SUBSCRIPTIONTYPE', description: 'Type of subscription redeemed' }
    ],
    giftExpiringSoon: [
      { name: 'PLANNAME', description: 'Gift subscription plan name' },
      { name: 'DAYSLEFT', description: 'Days until gift expires' },
      { name: 'GIFTGIVERNAME', description: 'Name of person who sent the gift' }
    ],
    customAnnouncement: [
      { name: 'USERNAME', description: 'User\'s name' },
      { name: 'USEREMAIL', description: 'User\'s email address' },
      { name: 'FIRSTNAME', description: 'User\'s first name' }
    ],
    accountDeletion: [
      { name: 'USERNAME', description: 'User\'s name' },
      { name: 'USEREMAIL', description: 'User\'s email address' }
    ],
    inDepthRequest: [
      { name: 'USERNAME', description: 'User\'s name' },
      { name: 'USEREMAIL', description: 'User\'s email address' }
    ],
    inviteEmail: [
      { name: 'USERNAME', description: 'User\'s name (if known)' },
      { name: 'USEREMAIL', description: 'User\'s email address' },
      { name: 'INVITE_LINK', description: 'Invitation signup link' }
    ]
  };

  const currentTemplate = templates[selectedTemplate];

  // Load all templates from Firestore into state (merging with defaults)
  useEffect(() => {
    const loadFromFirestore = async () => {
      try {
        const keys = Object.keys(DEFAULT_TEMPLATES);
        const loaded = { ...DEFAULT_TEMPLATES };

        for (const key of keys) {
          const snap = await getDoc(doc(db, 'emailTemplates', key));
          if (snap.exists()) {
            const data = snap.data();
            // Always preserve html field if it exists in Firestore, even when merging with defaults
            loaded[key] = {
              ...loaded[key],
              ...data,
              // Explicitly preserve html field - it should always be included if it exists
              html: data.html !== undefined ? data.html : loaded[key].html
            };
          }
        }

        // Try global colors in a special doc
        const colorSnap = await getDoc(doc(db, 'emailTemplates', '_branding'));
        const fsColors = colorSnap.exists() ? (colorSnap.data()?.colors || DEFAULT_COLORS) : DEFAULT_COLORS;

        setTemplates(loaded);
        setColors(fsColors);

        // Mirror to localStorage for quick reloads
        localStorage.setItem('tpp_email_templates', JSON.stringify(loaded));
        localStorage.setItem('tpp_email_colors', JSON.stringify(fsColors));
      } catch (e) {
        console.error('Failed to load email templates from Firestore:', e);
      }
    };

    loadFromFirestore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save templates to Firestore (and localStorage)
  const saveTemplates = async () => {
    console.log('🔵 Save Templates Button Clicked!');
    console.log('👤 Current user:', auth.currentUser?.email);
    console.log('🔐 User authenticated:', !!auth.currentUser);
    console.log('📧 Templates to save:', Object.keys(templates));
    console.log('🎨 Colors to save:', colors);
    
    // Check authentication first
    if (!auth.currentUser) {
      console.error('❌ User not authenticated - cannot save to Firestore');
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: '❌ You must be logged in to save templates. Please log in to the main app first, then navigate to /admin', type: 'error' }
      }));
      return;
    }
    
    setIsSaving(true);
    try {
      console.log('💾 Starting Firestore save operation...');
      
      // Persist each template with embedded colors so backend can render consistently
      const entries = Object.entries(templates);
      console.log(`📝 Saving ${entries.length} templates to Firestore...`);
      
      for (const [key, tpl] of entries) {
        console.log(`  - Saving template: ${key} (${tpl.name})`);
        try {
          // Build template to save: include all current fields + colors
          // Remove html field entirely - we always generate from simple fields
          const cleanTemplate = { ...tpl };
          delete cleanTemplate.html; // Never save html field - always generate from simple fields
          
          // Remove features from giftRedeemedNotification - it shouldn't show "What you can do"
          if (key === 'giftRedeemedNotification' && cleanTemplate.features) {
            delete cleanTemplate.features;
          }
          
          // Build final template to save
          const templateToSave = {
            ...cleanTemplate,  // All current template fields (without html)
            colors,  // Always include colors
            html: deleteField()  // Use Firestore deleteField() to actually remove the field
          };
          
          // Remove any undefined values (Firestore doesn't allow them)
          Object.keys(templateToSave).forEach(k => {
            if (templateToSave[k] === undefined) {
              delete templateToSave[k];
            }
          });
          
          // Save WITHOUT merge to completely replace the document
          await setDoc(doc(db, 'emailTemplates', key), templateToSave);
          console.log(`    ✅ Saved: ${key}`);
        } catch (templateError) {
          console.error(`    ❌ Failed to save template ${key}:`, templateError);
          throw new Error(`Failed to save template "${tpl.name}": ${templateError.message || 'Permission denied. Make sure you are logged in as an admin.'}`);
        }
      }
      
      // Save branding colors separately too (optional)
      console.log('🎨 Saving branding colors...');
      try {
        await setDoc(doc(db, 'emailTemplates', '_branding'), { colors }, { merge: true });
        console.log('  ✅ Branding colors saved');
      } catch (colorError) {
        console.error('  ❌ Failed to save branding colors:', colorError);
        throw new Error(`Failed to save branding colors: ${colorError.message || 'Permission denied. Make sure you are logged in as an admin.'}`);
      }

      localStorage.setItem('tpp_email_templates', JSON.stringify(templates));
      localStorage.setItem('tpp_email_colors', JSON.stringify(colors));
      console.log('💾 Templates also saved to localStorage');
    
      console.log('✅ ALL TEMPLATES SAVED SUCCESSFULLY TO FIRESTORE!');
      setSaveSuccess(true);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: '✅ Templates saved to Firestore!', type: 'success' }
      }));
      
      // Reset save success state after 2 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    } catch (e) {
      console.error('❌ Failed to save templates to Firestore:', e);
      console.error('❌ Error details:', e.message);
      console.error('❌ Error code:', e.code);
      console.error('❌ Full error object:', e);
      setSaveSuccess(false);
      
      // Provide more specific error messages
      let errorMessage = '❌ Failed to save templates';
      if (e.code === 'permission-denied') {
        errorMessage = '❌ Permission denied. You must be logged in as an admin to save templates. Please log in to the main app first, then navigate to /admin.';
      } else if (e.message) {
        errorMessage = `❌ ${e.message}`;
      } else if (e.code) {
        errorMessage = `❌ Save failed: ${e.code}`;
      }
      
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: errorMessage, type: 'error' }
      }));
    } finally {
      setIsSaving(false);
      console.log('🔵 Save operation completed');
    }
  };

  // Send test email for current template
  const sendTestEmail = async () => {

    setIsSendingTest(true);
    setTestResult(null);

    try {

      const functions = getFunctions();

      const testEmailSystem = httpsCallable(functions, 'testEmailSystem');

      // Send specific template based on current selection WITH custom template data
      console.log('📧 Calling testEmailSystem with:', {
        testEmail: 'thepepplanner@gmail.com',
        templateType: selectedTemplate,
        hasTemplateData: !!currentTemplate
      });
      
      const result = await testEmailSystem({ 
        testEmail: 'thepepplanner@gmail.com',
        templateType: selectedTemplate,
        templateData: currentTemplate // Send the actual custom template
      });

      console.log('📧 testEmailSystem response:', result.data);

      if (result.data && result.data.success) {
        setTestResult({ 
          success: true, 
          message: `${currentTemplate.name} sent successfully to thepepplanner@gmail.com!` 
        });
      } else {
        const errorMsg = result.data?.error || result.data?.message || 'Failed to send test email';
        const testDetails = result.data?.results?.tests?.[selectedTemplate];
        const detailedError = testDetails?.error || testDetails?.message || errorMsg;
        const errorCode = result.data?.errorCode;
        
        console.error('❌ Email test failed:', detailedError);
        console.error('❌ Error code:', errorCode);
        console.error('❌ Full response:', result.data);
        console.error('❌ Test details:', testDetails);
        console.error('❌ Results object:', result.data?.results);
        
        // Show more detailed error message
        let displayError = detailedError || errorMsg;
        if (errorCode) {
          displayError += ` (Code: ${errorCode})`;
        }
        
        setTestResult({ 
          success: false, 
          message: displayError
        });
      }
    } catch (error) {
      console.error('❌ Error sending test email:', error);
      console.error('❌ Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        stack: error.stack
      });
      
      let errorMessage = 'Failed to send test email';
      if (error.code === 'functions/not-found') {
        errorMessage = 'Function not found. Please deploy Firebase functions.';
      } else if (error.code === 'functions/internal') {
        errorMessage = `Function error: ${error.message || 'Internal server error'}`;
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      } else if (error.details) {
        errorMessage = `Error: ${JSON.stringify(error.details)}`;
      }
      
      setTestResult({ 
        success: false, 
        message: errorMessage
      });
      
      // Also show toast notification
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: `❌ ${errorMessage}`, type: 'error' }
      }));
    } finally {
      setIsSendingTest(false);
    }
  };

  // Reset to defaults
  const resetToDefaults = () => {
    if (confirm('Reset all templates to default? This cannot be undone.')) {
      setTemplates(DEFAULT_TEMPLATES);
      setColors(DEFAULT_COLORS);
      localStorage.removeItem('tpp_email_templates');
      localStorage.removeItem('tpp_email_colors');
      
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: '🔄 Templates reset to defaults', type: 'success' }
      }));
    }
  };

  // Update template field
  const updateTemplate = (field, value) => {
    setTemplates({
      ...templates,
      [selectedTemplate]: {
        ...currentTemplate,
        [field]: value
      }
    });
  };

  // Update feature in list
  const updateFeature = (index, value) => {
    const features = currentTemplate.features || [];
    const newFeatures = [...features];
    newFeatures[index] = value;
    updateTemplate('features', newFeatures);
  };

  // Add feature
  const addFeature = () => {
    const features = currentTemplate.features || [];
    updateTemplate('features', [...features, 'New feature']);
  };

  // Remove feature
  const removeFeature = (index) => {
    const features = currentTemplate.features || [];
    const newFeatures = features.filter((_, i) => i !== index);
    updateTemplate('features', newFeatures);
  };

  // Generate HTML from template fields (for simple mode) - V2 MODERN STYLE
  const generateHTMLFromTemplate = (template) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Cedarville+Cursive&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #F5F5F0;">
  <!-- Full-width background wrapper -->
  <div style="background-color: #F5F5F0; padding: 40px 20px;">
    <!-- Main container -->
    <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);">
      
      <!-- Header - Matching Landing Page Topbar -->
      <div style="background-color: #FFFFFF; padding: 16px 32px; border-bottom: 1px solid #DDE6DE;">
        <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
          <tr>
            <!-- Left: Tagline (centered in column) -->
            <td width="33%" valign="middle" align="center">
              <p style="margin: 0; font-size: 10px; font-weight: 500; letter-spacing: 0.15em; text-transform: uppercase; color: #9CA3AF; font-family: 'Poppins', sans-serif; text-align: center;">
                Organize Your Research
              </p>
            </td>
            
            <!-- Center: Logo -->
            <td width="34%" valign="middle" align="center">
              <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
                <img src="https://thepepplanner.app/tpp_logo.png" alt="The Pep Planner" style="width: 64px; height: 64px; border-radius: 50%; display: block; margin: 0 auto; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);" onerror="this.style.display='none';" />
              </a>
            </td>
            
            <!-- Right: Dashboard Link -->
            <td width="33%" valign="middle" align="right">
              <a href="https://thepepplanner.app/app/dashboard" style="color: ${colors.primary}; text-decoration: none; font-size: 13px; font-weight: 500; font-family: 'Poppins', sans-serif;">
                Dashboard →
              </a>
            </td>
          </tr>
        </table>
      </div>
      
      <!-- Section: Intro (light off-white) -->
      <div style="background-color: #F5F5F0; padding: 40px 32px; color: ${colors.text};">
        <h1 style="color: ${colors.primary}; font-size: 28px; font-weight: 700; margin: 0 0 24px 0; line-height: 1.3; text-align: center;">
          ${(template.heading || 'Welcome to the Family!').replace(/🥼/g, '')}
        </h1>
        
        <p style="font-size: 16px; line-height: 1.8; color: ${colors.text}; margin: 0 0 24px 0; text-align: center;">
          ${template.greeting || ''}
        </p>
        
        ${template.mainMessage ? `<p style="font-size: 14px; line-height: 1.6; color: ${colors.textLight}; margin: 0 0 32px 0; text-align: center;">${template.mainMessage.replace(/\n/g, '<br>')}</p>` : ''}

        ${template.ctaText ? `
        <center style="margin: 24px 0 0 0;">
          <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: separate; border-spacing: 0; margin: 0 auto;">
            <tr>
              <td align="center" style="border-radius: 12px; background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryLight} 100%); box-shadow: 0 4px 16px rgba(52, 78, 65, 0.3), 0 2px 6px rgba(0, 0, 0, 0.1);">
                <a href="${template.ctaLink || '#'}" style="display: inline-block; padding: 14px 32px; color: #FFFFFF !important; text-decoration: none; font-weight: 600; font-size: 15px; letter-spacing: 0.3px; border: 2px solid rgba(255, 255, 255, 0.2); border-radius: 12px;">
                  ${template.ctaText}
                </a>
              </td>
            </tr>
          </table>
        </center>
        ` : ''}
      </div>

      ${template.features && template.features.length > 0 ? `
      <!-- Section: Features (one card with bullets) -->
      <div style="background-color: #EFF2EE; padding: 24px 32px 40px 32px;">
        <div style="background-color: #FFFFFF; border-radius: 16px; padding: 32px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);">
          <h2 style="font-size: 18px; font-weight: 700; color: ${colors.primary}; margin: 0 0 24px 0; text-align: center;">What's waiting for you:</h2>
          <div style="text-align: left;">
            ${template.features.map(feature => {
              const [title, desc] = feature.includes(' – ') ? feature.split(' – ') : [feature, ''];
              return `
                <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px;">
                  <span style="color: ${colors.primary}; font-size: 18px; line-height: 1.2; flex-shrink: 0;">✓</span>
                  <div>
                    <p style="margin: 0; font-size: 15px; font-weight: 600; color: ${colors.text};">${title}</p>
                    ${desc ? `<p style="margin: 4px 0 0 0; font-size: 13px; color: ${colors.textLight}; line-height: 1.5;">${desc}</p>` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Section: Post-CTA Note + Signature (light off-white) -->
      <div style="background-color: #F5F5F0; padding: 40px 32px; color: ${colors.text};">

        ${template.postCtaNote ? `
        <p style="font-size: 14px; line-height: 1.6; color: ${colors.textLight}; text-align: center; margin: 0 0 32px 0; font-style: italic;">
          ${template.postCtaNote}
        </p>
        ` : ''}

        <div style="text-align: center; padding-top: 0;">
          <p style="font-size: 16px; line-height: 1.6; color: ${colors.text}; margin: 0;">
            Happy researching,
          </p>
          <p style="font-size: 16px; font-weight: 700; color: ${colors.primary}; margin: 4px 0 0 0;">
            The Pep Planner Team
          </p>
        </div>
      </div>
      
      <!-- Footer - Simple Copyright -->
      <div style="background-color: #2F3B3A; padding: 32px; text-align: center;">
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #A0B9B3;">
          © ${new Date().getFullYear()} The Pep Planner. All rights reserved.
        </p>
        <p style="margin: 0; font-size: 16px; color: #D1D9D6; font-family: 'Cedarville Cursive', cursive; font-style: italic;">
          — for the love of research
        </p>
      </div>
      
    </div>
  </div>
</body>
</html>
    `;
  };

  // Generate preview HTML - always from simple fields
  const generatePreviewHTML = () => {
    return generateHTMLFromTemplate(currentTemplate);
  };

  // Copy HTML to clipboard
  const copyHTML = () => {
    const html = generatePreviewHTML();
    navigator.clipboard.writeText(html);
    window.dispatchEvent(new CustomEvent('tpp:toast', {
      detail: { message: '📋 HTML copied to clipboard!', type: 'success' }
    }));
  };

  // Send custom announcement to all users
  const sendAnnouncementToAllUsers = async () => {
    if (selectedTemplate !== 'customAnnouncement') {
      return;
    }

    if (!confirm('⚠️ Are you sure you want to send this announcement email to ALL users? This cannot be undone.')) {
      return;
    }

    setSendingToAll(true);
    setSendProgress({ sent: 0, total: 0 });
    setTestResult(null);

    try {
      const users = await getUserList();
      const functions = getFunctions();
      const sendCustomAnnouncementEmail = httpsCallable(functions, 'sendCustomAnnouncementEmail');
      
      setSendProgress({ sent: 0, total: users.length });
      
      let successCount = 0;
      let failCount = 0;

      // Send emails in batches to avoid overwhelming the system
      const batchSize = 5;
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(async (user) => {
            try {
              await sendCustomAnnouncementEmail({
                userEmail: user.email,
                userName: user.displayName || user.email.split('@')[0]
              });
              successCount++;
            } catch (error) {
              console.error(`Failed to send to ${user.email}:`, error);
              failCount++;
            } finally {
              setSendProgress({ sent: successCount + failCount, total: users.length });
            }
          })
        );

        // Small delay between batches to avoid rate limiting
        if (i + batchSize < users.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      setTestResult({ 
        success: true, 
        message: `✅ Sent announcement emails to ${successCount} users${failCount > 0 ? ` (${failCount} failed)` : ''}!` 
      });
    } catch (error) {
      console.error('Error sending announcement emails:', error);
      setTestResult({ 
        success: false, 
        message: `Failed to send announcement emails: ${error.message}` 
      });
    } finally {
      setSendingToAll(false);
      setSendProgress({ sent: 0, total: 0 });
    }
  };

  return (
    <div className="space-y-3">
      {/* V2 Template Library Section */}
      <div className="p-3 rounded-lg border" style={{ borderColor: theme.primary, backgroundColor: theme.cardBackground, borderWidth: '2px' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">✨</span>
            <h3 className="text-sm font-semibold" style={{ color: theme.primary }}>Modern V2 Email Templates</h3>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: theme.successBg, color: theme.success }}>
            19 Templates
          </span>
        </div>
        <p className="text-xs mb-3" style={{ color: theme.textLight }}>
          New modern email templates with Poppins font, sage colors, and personal tone. These are used for automated system emails.
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          {[
            { id: 'welcome', name: 'Welcome', emoji: '👋', color: theme.success },
            { id: 'trialEnding', name: 'Trial Ending', emoji: '⏰', color: theme.warning },
            { id: 'subscriptionConfirmed', name: 'Subscription', emoji: '✅', color: theme.success },
            { id: 'paymentFailed', name: 'Payment Failed', emoji: '❌', color: theme.error },
            { id: 'passwordReset', name: 'Password', emoji: '🔑', color: theme.info },
            { id: 'trialExpiredSurvey', name: 'Survey', emoji: '📝', color: theme.primary },
            { id: 'lifetimeAccess', name: 'Lifetime', emoji: '🎁', color: theme.success },
            { id: 'paymentSuccessful', name: 'Payment OK', emoji: '💰', color: theme.success },
            { id: 'subscriptionCancelled', name: 'Cancelled', emoji: '🚫', color: theme.textLight },
            { id: 'renewalReminder', name: 'Renewal', emoji: '🔔', color: theme.info },
            { id: 'weeklyReminder', name: 'Weekly', emoji: '📅', color: theme.primary },
            { id: 'giftExpiring', name: 'Gift Expiring', emoji: '⏱️', color: theme.warning },
            { id: 'giftNotification', name: 'Gift Received', emoji: '🎁', color: theme.success },
            { id: 'giftPurchase', name: 'Gift Sent', emoji: '🎁', color: theme.success },
            { id: 'giftRedeemed', name: 'Gift Active', emoji: '🎉', color: theme.success },
            { id: 'trialExtension', name: 'Trial +', emoji: '⏰', color: theme.success },
            { id: 'emailChange', name: 'Email Changed', emoji: '📧', color: theme.warning },
            { id: 'emailVerify', name: 'Verify Email', emoji: '✉️', color: theme.info },
          ].map((template) => (
            <button
              key={template.id}
              onClick={() => {
                window.dispatchEvent(new CustomEvent('tpp:toast', {
                  detail: { 
                    message: `V2 ${template.name} template - Available in Firebase Functions`, 
                    type: 'info' 
                  }
                }));
              }}
              className="p-2 rounded-lg border text-left hover:opacity-80 transition-all"
              style={{ 
                borderColor: template.color,
                backgroundColor: `${template.color}15`
              }}
              title={`${template.name} Email V2`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{template.emoji}</span>
                <span className="text-[10px] font-medium truncate" style={{ color: theme.text }}>
                  {template.name}
                </span>
              </div>
            </button>
          ))}
        </div>
        
        <div className="mt-3 pt-3 border-t" style={{ borderColor: theme.border }}>
          <div className="text-[10px] space-y-1" style={{ color: theme.textLight }}>
            <p><strong style={{ color: theme.text }}>✨ Features:</strong> Poppins font, Sage theme colors, Personal tone, Mobile-optimized</p>
            <p><strong style={{ color: theme.text }}>📍 Location:</strong> functions/emailTemplates.js (V2 suffix)</p>
            <p><strong style={{ color: theme.text }}>🚀 Usage:</strong> Switch backend functions to use V2 template names (e.g., welcomeEmailV2)</p>
          </div>
        </div>
      </div>

      {/* Template Selector & Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Template Selector */}
        <div className="lg:col-span-2 p-3 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: theme.text }}>
            📧 Email Templates
          </label>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm font-medium transition-all focus:outline-none focus:ring-2"
            style={{
              borderColor: theme.border,
              backgroundColor: theme.background,
              color: theme.text
            }}
          >
            <optgroup label="Account & Authentication">
              {Object.entries(templates).filter(([key]) => ['welcome', 'verification', 'passwordReset'].includes(key)).map(([key, template]) => (
                <option key={key} value={key}>{template.name}</option>
              ))}
            </optgroup>
            <optgroup label="Subscription & Billing">
              {Object.entries(templates).filter(([key]) => ['trialEnding', 'trialExtension', 'subscription', 'paymentFailed', 'paymentSuccessful', 'subscriptionCancelled', 'renewalReminder', 'squarespaceActivation', 'squarespaceActivated'].includes(key)).map(([key, template]) => (
                <option key={key} value={key}>{template.name}</option>
              ))}
            </optgroup>
            <optgroup label="Lifetime Access">
              {Object.entries(templates).filter(([key]) => ['lifetimeAccessGranted', 'manualLifetimeGrant'].includes(key)).map(([key, template]) => (
                <option key={key} value={key}>{template.name}</option>
              ))}
            </optgroup>
            <optgroup label="Gift Subscriptions">
              {Object.entries(templates).filter(([key]) => ['giftNotification', 'giftPurchaseConfirmation', 'giftRedeemed', 'giftRedeemedNotification', 'giftExpiringSoon'].includes(key)).map(([key, template]) => (
                <option key={key} value={key}>{template.name}</option>
              ))}
            </optgroup>
            <optgroup label="Reminders & Notifications">
              {Object.entries(templates).filter(([key]) => ['weeklyReminder'].includes(key)).map(([key, template]) => (
                <option key={key} value={key}>{template.name}</option>
              ))}
            </optgroup>
            <optgroup label="Custom & Announcements">
              {Object.entries(templates).filter(([key]) => ['customAnnouncement', 'accountDeletion', 'inDepthRequest', 'inviteEmail', 'trialExpiredSurvey'].includes(key)).map(([key, template]) => (
                <option key={key} value={key}>{template.name}</option>
              ))}
            </optgroup>
          </select>
          <div className="mt-2 text-[10px]" style={{ color: theme.textLight }}>
            {Object.keys(templates).length} templates • {currentTemplate.name}
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div className="p-3 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <div className="text-xs font-semibold mb-1.5" style={{ color: theme.text }}>⚡ Actions</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => sendTestEmail()}
              disabled={isSendingTest || sendingToAll}
              className="px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 hover:opacity-90 transition-all disabled:opacity-50"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
              {isSendingTest ? (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send size={12} />
                  Test
                </>
              )}
            </button>
            
            <button
              onClick={saveTemplates}
              disabled={isSaving || !auth.currentUser}
              className="px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 hover:opacity-90 transition-all disabled:opacity-50"
              style={{ backgroundColor: theme.success || theme.primary, color: '#fff' }}
            >
              {isSaving ? (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : saveSuccess ? (
                <>
                  <CheckCircle size={12} />
                  Saved
                </>
              ) : (
                <>
                  <Save size={12} />
                  Save
                </>
              )}
            </button>

            <button
              onClick={copyHTML}
              className="px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 hover:opacity-90 transition-all"
              style={{ backgroundColor: theme.secondary, color: theme.text }}
            >
              <Copy size={12} />
              HTML
            </button>
            
            <button
              onClick={resetToDefaults}
              className="px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 hover:opacity-90 transition-all"
              style={{ backgroundColor: theme.secondary, color: theme.text }}
            >
              <RotateCcw size={12} />
              Reset
            </button>
          </div>
          
          {/* Send to All - Full Width */}
          {selectedTemplate === 'customAnnouncement' && (
            <button
              onClick={sendAnnouncementToAllUsers}
              disabled={isSendingTest || sendingToAll}
              className="w-full mt-2 px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 hover:opacity-90 transition-all disabled:opacity-50"
              style={{ backgroundColor: theme.warning || '#f59e0b', color: '#FFFFFF' }}
            >
              {sendingToAll ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {sendProgress.sent}/{sendProgress.total}
                </>
              ) : (
                <>
                  <Users size={12} />
                  Send to ALL
                </>
              )}
            </button>
          )}
        </div>
      </div>
      
      {!auth.currentUser && (
        <div className="px-3 py-2 rounded-lg text-xs bg-yellow-100 text-yellow-800 border border-yellow-200">
          ⚠️ You must be logged in to save templates
        </div>
      )}

      {/* Test Result */}
      {testResult && (
        <div className={`px-3 py-2 rounded-lg text-xs ${
          testResult.success 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {testResult.message}
        </div>
      )}

      {/* Send Progress for All Users */}
      {sendingToAll && sendProgress.total > 0 && (
        <div className="px-3 py-2 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: theme.text }}>
              Sending to All Users...
            </span>
            <span className="text-xs" style={{ color: theme.textLight }}>
              {sendProgress.sent} / {sendProgress.total}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2" style={{ backgroundColor: theme.border }}>
            <div 
              className="h-2 rounded-full transition-all duration-300"
              style={{
                backgroundColor: theme.primary,
                width: `${(sendProgress.sent / sendProgress.total) * 100}%`
              }}
            />
          </div>
        </div>
      )}

      {/* Variables Cheat Sheet */}
      <div className="p-3 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <button
          onClick={() => setShowVariablesCheatSheet(!showVariablesCheatSheet)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <HelpCircle size={14} style={{ color: theme.primary }} />
            <span className="font-semibold text-xs" style={{ color: theme.text }}>
              Available Variables
            </span>
          </div>
          {showVariablesCheatSheet ? (
            <ChevronUp size={14} style={{ color: theme.textLight }} />
          ) : (
            <ChevronDown size={14} style={{ color: theme.textLight }} />
          )}
        </button>

        {showVariablesCheatSheet && (
          <div className="mt-2 pt-2 border-t" style={{ borderColor: theme.border }}>
            {templateVariables[selectedTemplate] && templateVariables[selectedTemplate].length > 0 ? (
              <div className="space-y-2">
                <p className="text-[10px] mb-2" style={{ color: theme.textLight }}>
                  Use these variables in your template fields. They'll be automatically replaced when sent.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {templateVariables[selectedTemplate].map((variable, idx) => (
                    <div 
                      key={idx}
                      className="p-2 rounded-lg border"
                      style={{ borderColor: theme.border, backgroundColor: theme.background }}
                    >
                      <div className="flex items-center gap-1 mb-0.5">
                        <code className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ backgroundColor: theme.primary + '20', color: theme.primary }}>
                          %{variable.name}%
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`%${variable.name}%`);
                            window.dispatchEvent(new CustomEvent('tpp:toast', {
                              detail: { message: `Copied!`, type: 'success' }
                            }));
                          }}
                          className="text-[10px] px-1 py-0.5 rounded hover:opacity-80"
                          style={{ backgroundColor: theme.secondary, color: theme.text }}
                        >
                          <Copy size={10} />
                        </button>
                      </div>
                      <p className="text-[10px]" style={{ color: theme.textLight }}>
                        {variable.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs" style={{ color: theme.textLight }}>
                This template doesn't have dynamic variables.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Editor & Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Left: Editor + Colors */}
        <div className="space-y-3">
          {/* Form Editor */}
          <div className="p-3 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
            <h3 className="text-xs font-semibold mb-2 flex items-center gap-1" style={{ color: theme.text }}>
              ✏️ Edit Template
            </h3>

            <div className="space-y-2">
              {/* Subject */}
              <div>
                <label className="block text-[10px] font-medium mb-1" style={{ color: theme.textLight }}>
                  Subject Line
                </label>
                <input
                  type="text"
                  value={currentTemplate.subject}
                  onChange={(e) => updateTemplate('subject', e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1"
                  style={{ 
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                    color: theme.text
                  }}
                  placeholder="Email subject"
                />
              </div>

              {/* Heading */}
              <div>
                <label className="block text-[10px] font-medium mb-1" style={{ color: theme.textLight }}>
                  Heading
                </label>
                <input
                  type="text"
                  value={currentTemplate.heading}
                  onChange={(e) => updateTemplate('heading', e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1"
                  style={{ 
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                    color: theme.text
                  }}
                  placeholder="Main heading"
                />
              </div>

              {/* Greeting */}
              <div>
                <label className="block text-[10px] font-medium mb-1" style={{ color: theme.textLight }}>
                  Opening
                </label>
                <textarea
                  value={currentTemplate.greeting}
                  onChange={(e) => updateTemplate('greeting', e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1"
                  style={{ 
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                    color: theme.text
                  }}
                  rows="2"
                  placeholder="Opening message"
                />
              </div>

              {/* Main Message */}
              <div>
                <label className="block text-[10px] font-medium mb-1" style={{ color: theme.textLight }}>
                  Message
                </label>
                <textarea
                  value={currentTemplate.mainMessage}
                  onChange={(e) => updateTemplate('mainMessage', e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1"
                  style={{ 
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                    color: theme.text
                  }}
                  rows="2"
                  placeholder="Main content"
                />
              </div>

              {/* CTA */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-medium mb-1" style={{ color: theme.textLight }}>
                    Button Text
                  </label>
                  <input
                    type="text"
                    value={currentTemplate.ctaText}
                    onChange={(e) => updateTemplate('ctaText', e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1"
                    style={{ 
                      borderColor: theme.border,
                      backgroundColor: theme.background,
                      color: theme.text
                    }}
                    placeholder="Button text"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium mb-1" style={{ color: theme.textLight }}>
                    Button Link
                  </label>
                  <input
                    type="text"
                    value={currentTemplate.ctaLink}
                    onChange={(e) => updateTemplate('ctaLink', e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1"
                    style={{ 
                      borderColor: theme.border,
                      backgroundColor: theme.background,
                      color: theme.text
                    }}
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Features List */}
              {(selectedTemplate === 'welcome' || selectedTemplate === 'verification' || selectedTemplate === 'lifetimeAccessGranted') && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-medium" style={{ color: theme.textLight }}>
                      Features
                    </label>
                    <button
                      onClick={addFeature}
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                    >
                      + Add
                    </button>
                  </div>
                  {(currentTemplate.features || []).map((feature, index) => (
                    <div key={index} className="flex gap-1 mb-1">
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => updateFeature(index, e.target.value)}
                        className="flex-1 px-2 py-1 rounded border text-[10px] focus:outline-none focus:ring-1"
                        style={{ 
                          borderColor: theme.border,
                          backgroundColor: theme.background,
                          color: theme.text
                        }}
                      />
                      <button
                        onClick={() => removeFeature(index)}
                        className="px-2 py-1 rounded text-[10px] hover:opacity-80"
                        style={{ backgroundColor: theme.error || '#ef4444', color: '#fff' }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Colors - Compact Grid */}
          <div className="p-3 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
            <h3 className="text-xs font-semibold mb-2 flex items-center gap-1" style={{ color: theme.text }}>
              🎨 Colors
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(colors).map(([key, value]) => (
                <div key={key} className="flex items-center gap-1">
                  <input
                    type="color"
                    value={value}
                    onChange={(e) => setColors({ ...colors, [key]: e.target.value })}
                    className="w-6 h-6 rounded border cursor-pointer"
                    style={{ borderColor: theme.border }}
                    title={key}
                  />
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setColors({ ...colors, [key]: e.target.value })}
                    className="flex-1 px-1 py-1 rounded border text-[10px] font-mono"
                    style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="sticky top-4">
          <div className="p-3 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
            <h3 className="text-xs font-semibold mb-2 flex items-center gap-1" style={{ color: theme.text }}>
              👁️ Preview
            </h3>
            <iframe
              srcDoc={generatePreviewHTML()}
              className="w-full rounded-lg border"
              style={{ height: '600px', borderColor: theme.border }}
              title="Email Preview"
            />
          </div>
        </div>
      </div>

    </div>
  );
}

