import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mail, Eye, Save, Send, Copy, CheckCircle, HelpCircle, ChevronDown, ChevronUp, Users, Loader2, Zap, AlertTriangle, Pencil, Palette, RefreshCw, Trash2 } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, auth } from '../../config/firebase';
import { doc, getDoc, setDoc, deleteField, collection, query, where, getDocs } from 'firebase/firestore';
import { getUserList } from '../../services/firebase';

const DEFAULT_TEMPLATES = {
  welcome: {
    name: 'Welcome Email',
    subject: 'Welcome to The Pep Planner!',
    heading: 'Welcome to The Pep Planner!',
    greeting: "Hey there! Thanks for joining!",
    mainMessage: "We built this tool as researchers, for researchers. Everything you need, all in one place.",
    ctaText: 'Get Started',
    ctaLink: 'https://thepepplanner.app/app/dashboard',
    showFeatures: true,
    featuresTitle: "What's waiting for you:",
    features: [
      '📓🔍 Keep your research in ONE place! – Keep your dedicated info in one spot! Schedule your daily, weekly, and monthly protocols.',
      '⏰ Automatic Reminders – Visualize your daily, weekly, and full month of research! View upcoming doses with our calendar.',
      '🧮 Peptide Calculator – Calculate the next dose with a handy vial visual. Research with pens? We got you!',
      '🧪 Stockpile Tracking – No need to PANIC! Always know how much is in your stockpile with aggregate totals.',
      '📦 Peptide Orders – Let the app do the work for you by syncing your incoming peptides into your stockpile!',
      '👥 Vendors – Domestic, International or GB vendor info at your fingertips! Never lose your contacts again.'
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
    showFeatures: true,
    featuresTitle: "What's waiting for you:",
    features: [
      '📓🔍 Keep your research in ONE place! – Keep your dedicated info in one spot! Schedule your daily, weekly, and monthly protocols.',
      '⏰ Automatic Reminders – Visualize your daily, weekly, and full month of research! View upcoming doses with our calendar.',
      '🧮 Peptide Calculator – Calculate the next dose with a handy vial visual. Research with pens? We got you!',
      '🧪 Stockpile Tracking – No need to PANIC! Always know how much is in your stockpile with aggregate totals.',
      '📦 Peptide Orders – Let the app do the work for you by syncing your incoming peptides into your stockpile!',
      '👥 Vendors – Domestic, International or GB vendor info at your fingertips! Never lose your contacts again.'
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
    showFeatures: true,
    featuresTitle: "What's waiting for you:",
    features: [
      '📓🔍 Keep your research in ONE place! – Keep your dedicated info in one spot! Schedule your daily, weekly, and monthly protocols.',
      '⏰ Automatic Reminders – Visualize your daily, weekly, and full month of research! View upcoming doses with our calendar.',
      '🧮 Peptide Calculator – Calculate the next dose with a handy vial visual. Research with pens? We got you!',
      '🧪 Stockpile Tracking – No need to PANIC! Always know how much is in your stockpile with aggregate totals.',
      '📦 Peptide Orders – Let the app do the work for you by syncing your incoming peptides into your stockpile!',
      '👥 Vendors – Domestic, International or GB vendor info at your fingertips! Never lose your contacts again.'
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
    highlightMessage: 'Your gift is active and ready to use.',
    showFeatures: true,
    featuresTitle: "What's waiting for you:",
    features: [
      '📓🔍 Keep your research in ONE place! – Keep your dedicated info in one spot! Schedule your daily, weekly, and monthly protocols.',
      '⏰ Automatic Reminders – Visualize your daily, weekly, and full month of research! View upcoming doses with our calendar.',
      '🧮 Peptide Calculator – Calculate the next dose with a handy vial visual. Research with pens? We got you!',
      '🧪 Stockpile Tracking – No need to PANIC! Always know how much is in your stockpile with aggregate totals.',
      '📦 Peptide Orders – Let the app do the work for you by syncing your incoming peptides into your stockpile!',
      '👥 Vendors – Domestic, International or GB vendor info at your fingertips! Never lose your contacts again.'
    ]
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
    showFeatures: true,
    featuresTitle: "What's waiting for you:",
    features: [
      '📓🔍 Keep your research in ONE place! – Keep your dedicated info in one spot! Schedule your daily, weekly, and monthly protocols.',
      '⏰ Automatic Reminders – Visualize your daily, weekly, and full month of research! View upcoming doses with our calendar.',
      '🧮 Peptide Calculator – Calculate the next dose with a handy vial visual. Research with pens? We got you!',
      '🧪 Stockpile Tracking – No need to PANIC! Always know how much is in your stockpile with aggregate totals.',
      '📦 Peptide Orders – Let the app do the work for you by syncing your incoming peptides into your stockpile!',
      '👥 Vendors – Domestic, International or GB vendor info at your fingertips! Never lose your contacts again.'
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
    showFeatures: false,
    featuresTitle: "",
    features: [],
    postCtaNote: 'If you didn\'t request a password reset, you can safely ignore this email. Your password won\'t change unless you click the link above and create a new one.'
  },
  magicLink: {
    name: 'Magic Link Sign-In',
    subject: 'Your sign-in link for The Pep Planner 🔑',
    heading: 'Your Sign-In Link 🔑',
    greeting: 'Hey there! We received a request to sign in to The Pep Planner.',
    mainMessage: 'Click the button below to log in instantly — no password needed.',
    ctaText: 'Sign In to The Pep Planner',
    ctaLink: '%MAGIC_LINK%',
    highlightTitle: '🔒 Security',
    highlightMessage: 'This link is single-use and expires in 1 hour.',
    showFeatures: false,
    featuresTitle: '',
    features: [],
    postCtaNote: 'If you didn\'t request this sign-in link, you can safely ignore this email.'
  },
  unregisteredMagicLink: {
    name: 'Magic Link (Unregistered User)',
    subject: 'Hmm… looks like we\'ve never met! 👋',
    heading: 'Hmm… looks like we\'ve never met! 👋',
    greeting: 'We received a sign-in link request for this email, but no account was found.',
    mainMessage: 'If you\'re new here, create your account to get started with The Pep Planner.',
    ctaText: 'Create Your Account',
    ctaLink: 'https://thepepplanner.app/login',
    highlightTitle: 'Already have an account?',
    highlightMessage: 'Double-check the email you entered and try again with that address.',
    showFeatures: false,
    featuresTitle: '',
    features: [],
    postCtaNote: 'If you didn\'t request this email, no action is needed.'
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
    showFeatures: true,
    featuresTitle: "What's waiting for you:",
    features: [
      '📓🔍 Keep your research in ONE place! – Keep your dedicated info in one spot! Schedule your daily, weekly, and monthly protocols.',
      '⏰ Automatic Reminders – Visualize your daily, weekly, and full month of research! View upcoming doses with our calendar.',
      '🧮 Peptide Calculator – Calculate the next dose with a handy vial visual. Research with pens? We got you!',
      '🧪 Stockpile Tracking – No need to PANIC! Always know how much is in your stockpile with aggregate totals.',
      '📦 Peptide Orders – Let the app do the work for you by syncing your incoming peptides into your stockpile!',
      '👥 Vendors – Domestic, International or GB vendor info at your fingertips! Never lose your contacts again.'
    ]
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
    showFeatures: true,
    featuresTitle: "What's waiting for you:",
    features: [
      '📓🔍 Keep your research in ONE place! – Keep your dedicated info in one spot! Schedule your daily, weekly, and monthly protocols.',
      '⏰ Automatic Reminders – Visualize your daily, weekly, and full month of research! View upcoming doses with our calendar.',
      '🧮 Peptide Calculator – Calculate the next dose with a handy vial visual. Research with pens? We got you!',
      '🧪 Stockpile Tracking – No need to PANIC! Always know how much is in your stockpile with aggregate totals.',
      '📦 Peptide Orders – Let the app do the work for you by syncing your incoming peptides into your stockpile!',
      '👥 Vendors – Domestic, International or GB vendor info at your fingertips! Never lose your contacts again.'
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
    showFeatures: true,
    featuresTitle: "What's waiting for you:",
    features: [
      '📓🔍 Keep your research in ONE place! – Keep your dedicated info in one spot! Schedule your daily, weekly, and monthly protocols.',
      '⏰ Automatic Reminders – Visualize your daily, weekly, and full month of research! View upcoming doses with our calendar.',
      '🧮 Peptide Calculator – Calculate the next dose with a handy vial visual. Research with pens? We got you!',
      '🧪 Stockpile Tracking – No need to PANIC! Always know how much is in your stockpile with aggregate totals.',
      '📦 Peptide Orders – Let the app do the work for you by syncing your incoming peptides into your stockpile!',
      '👥 Vendors – Domestic, International or GB vendor info at your fingertips! Never lose your contacts again.'
    ]
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
    showFeatures: true,
    featuresTitle: "What's waiting for you:",
    features: [
      '📓🔍 Keep your research in ONE place! – Keep your dedicated info in one spot! Schedule your daily, weekly, and monthly protocols.',
      '⏰ Automatic Reminders – Visualize your daily, weekly, and full month of research! View upcoming doses with our calendar.',
      '🧮 Peptide Calculator – Calculate the next dose with a handy vial visual. Research with pens? We got you!',
      '🧪 Stockpile Tracking – No need to PANIC! Always know how much is in your stockpile with aggregate totals.',
      '📦 Peptide Orders – Let the app do the work for you by syncing your incoming peptides into your stockpile!',
      '👥 Vendors – Domestic, International or GB vendor info at your fingertips! Never lose your contacts again.'
    ]
  },
  weeklyReminder: {
    name: 'Weekly Research Reminder',
    subject: 'Your Weekly Research Summary - The Pep Planner',
    heading: 'Your Week at a Glance 📊',
    greeting: 'Here\'s how your research went this week.',
    mainMessage: 'This email is auto-generated with your personal analytics — doses logged, active days, protocol names, and any low stockpile alerts are pulled live from your account each Sunday.',
    ctaText: 'View Full Analytics →',
    ctaLink: 'https://thepepplanner.app/app/analytics',
    highlightTitle: '',
    highlightMessage: '',
    showFeatures: false,
    featuresTitle: '',
    features: []
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
    showFeatures: true,
    featuresTitle: "What's waiting for you:",
    features: [
      '📓🔍 Keep your research in ONE place! – Keep your dedicated info in one spot! Schedule your daily, weekly, and monthly protocols.',
      '⏰ Automatic Reminders – Visualize your daily, weekly, and full month of research! View upcoming doses with our calendar.',
      '🧮 Peptide Calculator – Calculate the next dose with a handy vial visual. Research with pens? We got you!',
      '🧪 Stockpile Tracking – No need to PANIC! Always know how much is in your stockpile with aggregate totals.',
      '📦 Peptide Orders – Let the app do the work for you by syncing your incoming peptides into your stockpile!',
      '👥 Vendors – Domestic, International or GB vendor info at your fingertips! Never lose your contacts again.'
    ]
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
    showFeatures: true,
    featuresTitle: "What's waiting for you:",
    features: [
      '📓🔍 Keep your research in ONE place! – Keep your dedicated info in one spot! Schedule your daily, weekly, and monthly protocols.',
      '⏰ Automatic Reminders – Visualize your daily, weekly, and full month of research! View upcoming doses with our calendar.',
      '🧮 Peptide Calculator – Calculate the next dose with a handy vial visual. Research with pens? We got you!',
      '🧪 Stockpile Tracking – No need to PANIC! Always know how much is in your stockpile with aggregate totals.',
      '📦 Peptide Orders – Let the app do the work for you by syncing your incoming peptides into your stockpile!',
      '👥 Vendors – Domestic, International or GB vendor info at your fingertips! Never lose your contacts again.'
    ]
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
    showFeatures: true,
    featuresTitle: "What's waiting for you:",
    features: [
      '📓🔍 Keep your research in ONE place! – Keep your dedicated info in one spot! Schedule your daily, weekly, and monthly protocols.',
      '⏰ Automatic Reminders – Visualize your daily, weekly, and full month of research! View upcoming doses with our calendar.',
      '🧮 Peptide Calculator – Calculate the next dose with a handy vial visual. Research with pens? We got you!',
      '🧪 Stockpile Tracking – No need to PANIC! Always know how much is in your stockpile with aggregate totals.',
      '📦 Peptide Orders – Let the app do the work for you by syncing your incoming peptides into your stockpile!',
      '👥 Vendors – Domestic, International or GB vendor info at your fingertips! Never lose your contacts again.'
    ]
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
    showFeatures: true,
    featuresTitle: "What's waiting for you:",
    features: [
      '📓🔍 Keep your research in ONE place! – Keep your dedicated info in one spot! Schedule your daily, weekly, and monthly protocols.',
      '⏰ Automatic Reminders – Visualize your daily, weekly, and full month of research! View upcoming doses with our calendar.',
      '🧮 Peptide Calculator – Calculate the next dose with a handy vial visual. Research with pens? We got you!',
      '🧪 Stockpile Tracking – No need to PANIC! Always know how much is in your stockpile with aggregate totals.',
      '📦 Peptide Orders – Let the app do the work for you by syncing your incoming peptides into your stockpile!',
      '👥 Vendors – Domestic, International or GB vendor info at your fingertips! Never lose your contacts again.'
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
    showFeatures: true,
    featuresTitle: "What's waiting for you:",
    features: [
      '📓🔍 Keep your research in ONE place! – Keep your dedicated info in one spot! Schedule your daily, weekly, and monthly protocols.',
      '⏰ Automatic Reminders – Visualize your daily, weekly, and full month of research! View upcoming doses with our calendar.',
      '🧮 Peptide Calculator – Calculate the next dose with a handy vial visual. Research with pens? We got you!',
      '🧪 Stockpile Tracking – No need to PANIC! Always know how much is in your stockpile with aggregate totals.',
      '📦 Peptide Orders – Let the app do the work for you by syncing your incoming peptides into your stockpile!',
      '👥 Vendors – Domestic, International or GB vendor info at your fingertips! Never lose your contacts again.'
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
    showFeatures: true,
    featuresTitle: "What's waiting for you:",
    features: [
      '📓🔍 Keep your research in ONE place! – Keep your dedicated info in one spot! Schedule your daily, weekly, and monthly protocols.',
      '⏰ Automatic Reminders – Visualize your daily, weekly, and full month of research! View upcoming doses with our calendar.',
      '🧮 Peptide Calculator – Calculate the next dose with a handy vial visual. Research with pens? We got you!',
      '🧪 Stockpile Tracking – No need to PANIC! Always know how much is in your stockpile with aggregate totals.',
      '📦 Peptide Orders – Let the app do the work for you by syncing your incoming peptides into your stockpile!',
      '👥 Vendors – Domestic, International or GB vendor info at your fingertips! Never lose your contacts again.'
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
    showFeatures: true,
    featuresTitle: "What's waiting for you:",
    features: [
      '📓🔍 Keep your research in ONE place! – Keep your dedicated info in one spot! Schedule your daily, weekly, and monthly protocols.',
      '⏰ Automatic Reminders – Visualize your daily, weekly, and full month of research! View upcoming doses with our calendar.',
      '🧮 Peptide Calculator – Calculate the next dose with a handy vial visual. Research with pens? We got you!',
      '🧪 Stockpile Tracking – No need to PANIC! Always know how much is in your stockpile with aggregate totals.',
      '📦 Peptide Orders – Let the app do the work for you by syncing your incoming peptides into your stockpile!',
      '👥 Vendors – Domestic, International or GB vendor info at your fingertips! Never lose your contacts again.'
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
    showFeatures: true,
    featuresTitle: "What's waiting for you:",
    features: [
      '📓🔍 Keep your research in ONE place! – Keep your dedicated info in one spot! Schedule your daily, weekly, and monthly protocols.',
      '⏰ Automatic Reminders – Visualize your daily, weekly, and full month of research! View upcoming doses with our calendar.',
      '🧮 Peptide Calculator – Calculate the next dose with a handy vial visual. Research with pens? We got you!',
      '🧪 Stockpile Tracking – No need to PANIC! Always know how much is in your stockpile with aggregate totals.',
      '📦 Peptide Orders – Let the app do the work for you by syncing your incoming peptides into your stockpile!',
      '👥 Vendors – Domestic, International or GB vendor info at your fingertips! Never lose your contacts again.'
    ]
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
    showFeatures: true,
    featuresTitle: "What's waiting for you:",
    features: [
      '📓🔍 Keep your research in ONE place! – Keep your dedicated info in one spot! Schedule your daily, weekly, and monthly protocols.',
      '⏰ Automatic Reminders – Visualize your daily, weekly, and full month of research! View upcoming doses with our calendar.',
      '🧮 Peptide Calculator – Calculate the next dose with a handy vial visual. Research with pens? We got you!',
      '🧪 Stockpile Tracking – No need to PANIC! Always know how much is in your stockpile with aggregate totals.',
      '📦 Peptide Orders – Let the app do the work for you by syncing your incoming peptides into your stockpile!',
      '👥 Vendors – Domestic, International or GB vendor info at your fingertips! Never lose your contacts again.'
    ]
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
    showFeatures: true,
    featuresTitle: "What's waiting for you:",
    features: [
      '📓🔍 Keep your research in ONE place! – Keep your dedicated info in one spot! Schedule your daily, weekly, and monthly protocols.',
      '⏰ Automatic Reminders – Visualize your daily, weekly, and full month of research! View upcoming doses with our calendar.',
      '🧮 Peptide Calculator – Calculate the next dose with a handy vial visual. Research with pens? We got you!',
      '🧪 Stockpile Tracking – No need to PANIC! Always know how much is in your stockpile with aggregate totals.',
      '📦 Peptide Orders – Let the app do the work for you by syncing your incoming peptides into your stockpile!',
      '👥 Vendors – Domestic, International or GB vendor info at your fingertips! Never lose your contacts again.'
    ]
  },
  accountDeletion: {
    name: 'Account Deletion Confirmation',
    subject: 'We\'re Sad to See You Go - The Pep Planner',
    heading: 'We\'re Sad to See You Go! 😢',
    greeting: 'Hi %USERNAME%,',
    mainMessage: 'Your account and all associated data have been permanently deleted from The Pep Planner. We understand that sometimes things don\'t work out, and we respect your decision.\n\nAll your research data, protocols, and account information have been completely removed from our system. This action cannot be undone.',
    ctaText: 'Share Your Feedback',
    ctaLink: 'https://thepepplanner.app/feedback',
    highlightTitle: '💡 Want to Return?',
    highlightMessage: 'If you change your mind and would like to use The Pep Planner again in the future, you\'ll need to create a new account. We\'d love to have you back!',
    showFeatures: true,
    featuresTitle: "What's waiting for you:",
    features: [
      '📓🔍 Keep your research in ONE place! – Keep your dedicated info in one spot! Schedule your daily, weekly, and monthly protocols.',
      '⏰ Automatic Reminders – Visualize your daily, weekly, and full month of research! View upcoming doses with our calendar.',
      '🧮 Peptide Calculator – Calculate the next dose with a handy vial visual. Research with pens? We got you!',
      '🧪 Stockpile Tracking – No need to PANIC! Always know how much is in your stockpile with aggregate totals.',
      '📦 Peptide Orders – Let the app do the work for you by syncing your incoming peptides into your stockpile!',
      '👥 Vendors – Domestic, International or GB vendor info at your fingertips! Never lose your contacts again.'
    ]
  },
  accountDeletionRequestConfirmation: {
    name: 'Account Deletion Request – Confirmation (Received)',
    subject: 'Deletion of Pep Planner Account',
    heading: "We've Received Your Deletion Request",
    greeting: 'Hi %USERNAME%,',
    mainMessage: "Thank you for letting us know. We've received your request to delete your Pep Planner account.\n\n**This action is irreversible once processed.** Our admin team will review and process your request within 48 hours. You will receive a final confirmation email once your account and all associated data have been permanently deleted.",
    ctaText: '',
    ctaLink: '',
    highlightTitle: '⚠️ Important',
    highlightMessage: 'Once your account is deleted, all your research data, protocols, and account information will be permanently removed. This cannot be undone.',
    showFeatures: true,
    featuresTitle: '',
    features: [
      'Request Status – Pending admin review',
      'Processing Time – Within 48 hours',
      'Confirmation – You\'ll receive an email when complete',
      'Data Removal – All data will be permanently deleted'
    ],
    postCtaNote: 'If you did not request this deletion or have changed your mind, please contact us immediately at contact@thepepplanner.com.'
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
    showFeatures: true,
    featuresTitle: "What's waiting for you:",
    features: [
      '📓🔍 Keep your research in ONE place! – Keep your dedicated info in one spot! Schedule your daily, weekly, and monthly protocols.',
      '⏰ Automatic Reminders – Visualize your daily, weekly, and full month of research! View upcoming doses with our calendar.',
      '🧮 Peptide Calculator – Calculate the next dose with a handy vial visual. Research with pens? We got you!',
      '🧪 Stockpile Tracking – No need to PANIC! Always know how much is in your stockpile with aggregate totals.',
      '📦 Peptide Orders – Let the app do the work for you by syncing your incoming peptides into your stockpile!',
      '👥 Vendors – Domestic, International or GB vendor info at your fingertips! Never lose your contacts again.'
    ]
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
    showFeatures: true,
    featuresTitle: "What's waiting for you:",
    features: [
      '📓🔍 Keep your research in ONE place! – Keep your dedicated info in one spot! Schedule your daily, weekly, and monthly protocols.',
      '⏰ Automatic Reminders – Visualize your daily, weekly, and full month of research! View upcoming doses with our calendar.',
      '🧮 Peptide Calculator – Calculate the next dose with a handy vial visual. Research with pens? We got you!',
      '🧪 Stockpile Tracking – No need to PANIC! Always know how much is in your stockpile with aggregate totals.',
      '📦 Peptide Orders – Let the app do the work for you by syncing your incoming peptides into your stockpile!',
      '👥 Vendors – Domestic, International or GB vendor info at your fingertips! Never lose your contacts again.'
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
    showFeatures: true,
    featuresTitle: "What's waiting for you:",
    features: [
      '📓🔍 Keep your research in ONE place! – Keep your dedicated info in one spot! Schedule your daily, weekly, and monthly protocols.',
      '⏰ Automatic Reminders – Visualize your daily, weekly, and full month of research! View upcoming doses with our calendar.',
      '🧮 Peptide Calculator – Calculate the next dose with a handy vial visual. Research with pens? We got you!',
      '🧪 Stockpile Tracking – No need to PANIC! Always know how much is in your stockpile with aggregate totals.',
      '📦 Peptide Orders – Let the app do the work for you by syncing your incoming peptides into your stockpile!',
      '👥 Vendors – Domestic, International or GB vendor info at your fingertips! Never lose your contacts again.'
    ]
  },
  winBack: {
    name: 'Win-Back Campaign (Lapsed Users)',
    subject: 'The doors are open — and we saved you a spot',
    heading: 'The doors are open.',
    greeting: 'When you signed up for The Pep Planner, subscriptions weren\'t fully set up yet — and if you tried to upgrade, it didn\'t work. That\'s on us.',
    mainMessage: 'We\'ve spent the time since then building. A lot has changed — here\'s the short version:',
    ctaText: 'Log In & Explore',
    ctaLink: 'https://thepepplanner.com/app',
    highlightTitle: '14 Days of Full Access',
    highlightMessage: 'We\'ve unlocked your account so you can see everything that\'s changed. No card needed — just log in.',
    showFeatures: true,
    featuresTitle: "Here's what's changed:",
    features: [
      '✓ Completely rebuilt protocol tracking with smart dosing schedules',
      '✓ New analytics dashboard — actually see your research trends',
      '✓ Redesigned reconstitution calculator',
      '✓ Real-time sync across all your devices',
      '✓ Subscriptions that actually work (finally)'
    ],
    postCtaNote: ''
  },
  emailChangeNotification: {
    name: 'Email Change – Security Alert (Old Email)',
    subject: 'Security Alert: Email Address Change Request - The Pep Planner',
    heading: 'Email Change Request',
    greeting: 'Hi there,',
    mainMessage: 'This is a security notification. A request was made to change the email address for your The Pep Planner account from **%OLDEMAIL%** to **%NEWEMAIL%**.',
    ctaText: 'Secure Your Account',
    ctaLink: 'https://thepepplanner.com/app/account/profile',
    highlightTitle: 'If you made this change',
    highlightMessage: 'No action needed. Your new email will need to be verified before it becomes active.',
    showFeatures: false,
    featuresTitle: '',
    features: [],
    postCtaNote: 'If you did NOT make this change, your account may have been compromised. Change your password immediately and contact support.'
  },
  emailChangeVerification: {
    name: 'Email Change – Verify New Email (Instructional)',
    subject: 'Verify Your New Email Address - The Pep Planner',
    heading: 'Verify your new email',
    greeting: 'Hey!',
    mainMessage: 'You\'ve requested to change your account email from **%OLDEMAIL%** to **%NEWEMAIL%**. Check your inbox (and spam folder) for the verification email with the link to complete the change.',
    ctaText: '',
    ctaLink: '',
    highlightTitle: 'To complete the change',
    highlightMessage: '1. Check your inbox for the verification email. 2. Click the verification link. 3. Your email will be updated.',
    showFeatures: false,
    featuresTitle: '',
    features: [],
    postCtaNote: 'If you didn\'t request this, contact support@thepepplanner.app'
  },
  emailChangeVerificationWithLink: {
    name: 'Email Change – Verification with Link (Main)',
    subject: 'Verify Your New Email Address - The Pep Planner',
    heading: 'Verify your new email',
    greeting: 'You requested to change your account email.',
    mainMessage: 'Click the button below to verify **%NEWEMAIL%** and complete the change. This link expires in 24 hours.',
    ctaText: 'Verify new email address',
    ctaLink: '%VERIFICATION_LINK%',
    highlightTitle: '',
    highlightMessage: 'If the button doesn\'t work, copy the verification link from the full email.',
    showFeatures: false,
    featuresTitle: '',
    features: [],
    postCtaNote: 'If you didn\'t request this, contact support@thepepplanner.app'
  },
  disputeNotification: {
    name: 'Dispute – Notification (Chargeback Created)',
    subject: 'Payment Dispute Received - The Pep Planner',
    heading: 'Payment Dispute Notice',
    greeting: 'We received a dispute (chargeback) on a payment associated with your account.',
    mainMessage: 'Amount: %AMOUNT% | Reason: %REASON%. Please update your payment method or contact us if you believe this is an error. Your access may be affected until the dispute is resolved.',
    ctaText: 'Manage account',
    ctaLink: 'https://thepepplanner.com/app/account',
    highlightTitle: '',
    highlightMessage: '',
    showFeatures: false,
    featuresTitle: '',
    features: [],
    postCtaNote: 'The Pep Planner'
  },
  disputeStatusUpdate: {
    name: 'Dispute – Status Update',
    subject: 'Dispute Status Update - The Pep Planner',
    heading: 'Dispute Status Update',
    greeting: 'There is an update on the payment dispute for your account.',
    mainMessage: 'Status: %STATUS% | Reason: %REASON%',
    ctaText: 'Manage account',
    ctaLink: 'https://thepepplanner.com/app/account',
    highlightTitle: '',
    highlightMessage: '',
    showFeatures: false,
    featuresTitle: '',
    features: [],
    postCtaNote: 'The Pep Planner'
  },
  disputeResolution: {
    name: 'Dispute – Resolution (Closed)',
    subject: 'Dispute Resolved - The Pep Planner',
    heading: 'Dispute Resolved',
    greeting: 'The payment dispute on your account has been closed.',
    mainMessage: 'Outcome: %STATUS% | Reason: %REASON%',
    ctaText: 'Manage account',
    ctaLink: 'https://thepepplanner.com/app/account',
    highlightTitle: '',
    highlightMessage: '',
    showFeatures: false,
    featuresTitle: '',
    features: [],
    postCtaNote: 'The Pep Planner'
  },
  shopOrderConfirmation: {
    name: 'Shop — Order Confirmation (Customer)',
    subject: "Order confirmed! We're prepping your PEP Planner",
    heading: 'Order Confirmed!',
    greeting: 'Hi %CUSTOMERNAME%,',
    mainMessage: "Thank you for your order! We're getting everything ready. Your order details are below.",
    ctaText: 'Track Your Order',
    ctaLink: '%ORDERSTATUSURL%',
    orderPolicies:
      'Shipping: Physical orders ship within 3–5 business days (Monday–Friday). Digital PDF download links arrive in a separate email shortly after payment.\n\nRefunds: Digital PDF purchases are non-refundable once the download link is sent. Physical products may qualify for refund or exchange on unopened or defective items within 14 days — contact us first.\n\nQuestions? Reply to this email or contact@thepepplanner.com.',
    showFeatures: false,
    featuresTitle: '',
    features: [],
  },
  shopOrderOwner: {
    name: 'Shop — New Order (Owner Alert)',
    subject: 'New shop order: %CUSTOMERNAME% — %ORDERTOTAL%',
    heading: 'New Planner Shop Order',
    greeting: 'A new order just came in.',
    mainMessage: 'Fulfill this order from Admin → Shop Orders.',
    ctaText: 'View in Admin',
    ctaLink: 'https://thepepplanner.app/admin/shop/orders',
    showFeatures: false,
    featuresTitle: '',
    features: [],
  },
  shopDigitalDownload: {
    name: 'Shop — Digital PDF Download',
    subject: 'Your PEP Planner PDF download is ready',
    heading: 'Your Download Is Ready',
    greeting: 'Hi %CUSTOMERNAME%,',
    mainMessage: 'Thanks for your purchase! Use the download buttons below for your planner PDF.',
    ctaText: 'View Order Confirmation',
    ctaLink: '%ORDERSTATUSURL%',
    postCtaNote: 'Best on iPad/tablet with GoodNotes or Notability — not intended for printing.',
    orderPolicies:
      'Digital downloads are non-refundable once delivered. Reply to this email if you need help accessing your PDF.',
    showFeatures: false,
    featuresTitle: '',
    features: [],
  },
  shopOrderShipped: {
    name: 'Shop — Order Shipped',
    subject: 'Your PEP Planner order has shipped!',
    heading: 'Your Order Has Shipped!',
    greeting: 'Hi %CUSTOMERNAME%,',
    mainMessage: 'Great news — your PEP Planner order is on its way!',
    ctaText: 'Track Your Order',
    ctaLink: '%ORDERSTATUSURL%',
    orderPolicies: 'Questions about delivery? Reply to this email.',
    showFeatures: false,
    featuresTitle: '',
    features: [],
  },
  shopOrderDelivered: {
    name: 'Shop — Order Delivered',
    subject: 'Your PEP Planner order was delivered!',
    heading: 'Delivered!',
    greeting: 'Hi %CUSTOMERNAME%,',
    mainMessage: 'Your PEP Planner order has been delivered. We hope you love it!',
    ctaText: 'View Your Order',
    ctaLink: '%ORDERSTATUSURL%',
    orderPolicies: 'Thank you for supporting The Pep Planner! Questions? Reply to this email.',
    showFeatures: false,
    featuresTitle: '',
    features: [],
  },
  shopAbandonedCart: {
    name: 'Shop — Abandoned Cart',
    subject: 'You left something in your cart!',
    heading: 'Did You Forget Something?',
    greeting: 'Hey %CUSTOMERNAME%,',
    mainMessage: "We noticed you started checkout but didn't finish. Your PEP Planner is still waiting!",
    ctaText: 'Return to Shop',
    ctaLink: 'https://thepepplanner.app/shop',
    postCtaNote: 'If you had trouble checking out, reply to this email and we will help.',
    showFeatures: false,
    featuresTitle: '',
    features: [],
  },
  shopReviewRequest: {
    name: 'Shop — Review Request',
    subject: 'Loving your PEP Planner? Leave a review!',
    heading: 'Loving Your PEP Planner?',
    greeting: 'Hi %CUSTOMERNAME%,',
    mainMessage: 'Your feedback helps other planners find their perfect match. Would you leave a quick review?',
    ctaText: 'Review on Etsy',
    ctaLink: 'https://www.etsy.com/shop/ThePepPlanner',
    postCtaNote: 'Thank you for supporting The Pep Planner!',
    showFeatures: false,
    featuresTitle: '',
    features: [],
  },
  shopReviewInvite: {
    name: 'Shop — Verified Review Invite',
    subject: 'Write your PEP Planner review — verified purchase',
    heading: 'Share Your Experience',
    greeting: 'Hi %CUSTOMERNAME%,',
    mainMessage:
      'Thanks for ordering from The Pep Planner! Use your private link below to leave a verified review on our shop.',
    ctaText: 'Write your review',
    ctaLink: 'https://thepepplanner.app/shop/review?token=example',
    postCtaNote: 'Did not request this? You can ignore this email.',
    showFeatures: false,
    featuresTitle: '',
    features: [],
  },
  supportTicketReply: {
    name: 'Support Ticket Reply',
    subject: 'You have a new reply on your support ticket - The Pep Planner',
    heading: 'You have a new reply 💬',
    greeting: 'Our support team just responded to your ticket: %TICKETSUBJECT%',
    mainMessage: '%ADMINMESSAGE%',
    ctaText: 'View Full Conversation →',
    ctaLink: 'https://thepepplanner.app/app/support',
    highlightTitle: 'Ticket Subject',
    highlightMessage: '%TICKETSUBJECT%',
    showFeatures: false,
    featuresTitle: '',
    features: [],
    postCtaNote: 'You can reply directly in the app. Our team is happy to help!'
  }
};

const SHOP_TEMPLATE_KEYS = [
  'shopOrderConfirmation',
  'shopOrderOwner',
  'shopDigitalDownload',
  'shopOrderShipped',
  'shopOrderDelivered',
  'shopAbandonedCart',
  'shopReviewRequest',
  'shopReviewInvite',
];

/** Sample order block (items + totals + addresses) for admin preview */
const SHOP_PREVIEW_ORDER_BLOCK = `<table style="width:100%;border-collapse:collapse;margin:20px 0;border-radius:8px;overflow:hidden"><thead><tr style="background:#f5f5f0"><th style="padding:10px 14px;text-align:left;font-size:12px;color:#666;text-transform:uppercase">Item</th><th style="padding:10px 14px;text-align:center;font-size:12px;color:#666;text-transform:uppercase">Qty</th><th style="padding:10px 14px;text-align:right;font-size:12px;color:#666;text-transform:uppercase">Total</th></tr></thead><tbody><tr><td style="padding:10px 14px;border-bottom:1px solid #eee;font-size:14px">PEP Planner — Spring 2026</td><td style="padding:10px 14px;border-bottom:1px solid #eee;text-align:center">1</td><td style="padding:10px 14px;border-bottom:1px solid #eee;text-align:right">$34.99</td></tr><tr><td style="padding:10px 14px;border-bottom:1px solid #eee;font-size:14px">Sticker Pack</td><td style="padding:10px 14px;border-bottom:1px solid #eee;text-align:center">2</td><td style="padding:10px 14px;border-bottom:1px solid #eee;text-align:right">$9.98</td></tr></tbody></table><div style="background:#f9f9f6;border-radius:8px;padding:16px 20px;margin:16px 0"><table style="width:100%;border-collapse:collapse"><tr><td style="padding:6px 0;font-size:14px;color:#555">Subtotal</td><td style="padding:6px 0;text-align:right;font-size:14px">$44.97 USD</td></tr><tr><td style="padding:6px 0;font-size:14px;color:#555">Shipping</td><td style="padding:6px 0;text-align:right;font-size:14px">$5.99 USD</td></tr><tr><td style="padding:6px 0;font-size:14px;color:#555">Tax</td><td style="padding:6px 0;text-align:right;font-size:14px">$3.82 USD</td></tr><tr><td style="padding:10px 0 0;font-size:16px;font-weight:700;border-top:1px solid #ddd">Total</td><td style="padding:10px 0 0;text-align:right;font-size:16px;font-weight:700;border-top:1px solid #ddd">$54.78 USD</td></tr></table></div><div style="border-top:1px solid #eee;margin-top:16px;padding-top:14px;text-align:left"><p style="margin:0 0 8px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em">Ship to</p><p style="color:#555;line-height:1.6;margin:0;font-size:14px">Alex Morgan<br/>123 Planner Lane<br/>Austin, TX 78701<br/>US</p></div><div style="border-top:1px solid #eee;margin-top:16px;padding-top:14px;text-align:left"><p style="margin:0 0 8px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em">Bill to</p><p style="color:#555;line-height:1.6;margin:0;font-size:14px">Alex Morgan<br/>456 Billing Ave<br/>Austin, TX 78702<br/>US</p></div>`;

const SHOP_PREVIEW_TRACKING = `<div style="text-align:left;margin:16px 0;font-size:14px;color:#555"><p style="margin:0 0 6px"><strong>Carrier:</strong> USPS</p><p style="margin:0"><strong>Tracking:</strong> 9400111899223344556677</p></div>`;

/** Sample order tables shown in admin preview for shop templates */
const SHOP_PREVIEW_BODY = {
  shopOrderConfirmation: SHOP_PREVIEW_ORDER_BLOCK,
  shopOrderOwner: `<p style="font-size:14px;color:#555;margin:0 0 12px"><strong>Customer:</strong> Alex (alex@example.com)</p>${SHOP_PREVIEW_ORDER_BLOCK}`,
  shopDigitalDownload: `<table style="width:100%;border-collapse:collapse;margin:20px 0"><tbody><tr><td style="padding:12px;border-bottom:1px solid #eee">Digital Planner PDF</td><td style="padding:12px;text-align:right;border-bottom:1px solid #eee"><span style="background:#344E41;color:#fff;padding:8px 16px;border-radius:6px;font-size:13px">Download PDF</span></td></tr></tbody></table>`,
  shopOrderShipped: SHOP_PREVIEW_ORDER_BLOCK + SHOP_PREVIEW_TRACKING,
  shopOrderDelivered: SHOP_PREVIEW_ORDER_BLOCK,
  shopAbandonedCart: `<table style="width:100%;border-collapse:collapse;margin:20px 0"><thead><tr style="background:#f5f5f0"><th style="padding:10px 14px;text-align:left;font-size:12px;color:#666">Item</th><th style="padding:10px 14px;text-align:center;font-size:12px;color:#666">Qty</th></tr></thead><tbody><tr><td style="padding:8px;border-bottom:1px solid #eee">PEP Planner</td><td style="padding:8px;text-align:center;border-bottom:1px solid #eee">1</td></tr></tbody></table>`,
  shopReviewRequest: `<div style="text-align:center;margin:16px 0"><span style="display:inline-block;background:#f56400;color:#fff;padding:10px 20px;border-radius:8px;margin:4px">Review on Etsy</span> <span style="display:inline-block;background:#4285f4;color:#fff;padding:10px 20px;border-radius:8px;margin:4px">Review on Google</span></div>`,
  shopReviewInvite: `<div style="text-align:center;margin:16px 0"><span style="display:inline-block;background:#7F9E95;color:#fff;padding:12px 24px;border-radius:999px;font-weight:700">Write your review</span></div>`,
};


export default function EmailTemplateManager({ theme }) {
  const [selectedTemplate, setSelectedTemplate] = useState('welcome');
  const [templates, setTemplates] = useState(() => {
    const saved = localStorage.getItem('tpp_email_templates');
    return saved ? JSON.parse(saved) : DEFAULT_TEMPLATES;
  });
  const [showPreview, setShowPreview] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showVariablesCheatSheet, setShowVariablesCheatSheet] = useState(false);
  const [sendingToAll, setSendingToAll] = useState(false);
  const [sendProgress, setSendProgress] = useState({ sent: 0, total: 0 });
  const [isResetting, setIsResetting] = useState(false);
  const [weeklyPreviewData, setWeeklyPreviewData] = useState(null);
  const [weeklyPreviewLoading, setWeeklyPreviewLoading] = useState(false);
  
  // Backend preview state - single source of truth
  const [previewHtml, setPreviewHtml] = useState('<div style="padding: 40px; text-align: center; color: #666;">Loading preview...</div>');
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewDebounceRef = useRef(null);

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
    magicLink: [
      { name: 'MAGIC_LINK', description: 'One-click sign-in URL for existing user' }
    ],
    unregisteredMagicLink: [
      { name: 'USEREMAIL', description: 'Email address entered by the user' }
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
      { name: 'FIRSTNAME', description: 'User\'s first name (auto-injected)' },
      { name: 'THISWEEKTOTAL', description: 'Doses logged this week (auto-injected)' },
      { name: 'LASTWEEKTOTAL', description: 'Doses logged last week (auto-injected)' },
      { name: 'THISWEEKDAYS', description: 'Active days this week out of 7 (auto-injected)' },
      { name: 'ACTIVEPROTOCOLS', description: 'Comma-separated active protocol names (auto-injected)' },
      { name: 'LOWSTOCKCOUNT', description: 'Number of low-stock items (auto-injected)' }
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
    accountDeletionRequestConfirmation: [
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
    ],
    disputeNotification: [
      { name: 'REASON', description: 'Dispute reason from Stripe' },
      { name: 'AMOUNT', description: 'Disputed amount (e.g. $9.99)' },
      { name: 'USEREMAIL', description: 'User\'s email address' }
    ],
    disputeStatusUpdate: [
      { name: 'STATUS', description: 'Dispute status' },
      { name: 'REASON', description: 'Dispute reason' },
      { name: 'USEREMAIL', description: 'User\'s email address' }
    ],
    disputeResolution: [
      { name: 'STATUS', description: 'Resolution outcome (e.g. won, lost)' },
      { name: 'REASON', description: 'Dispute reason' },
      { name: 'USEREMAIL', description: 'User\'s email address' }
    ],
    shopOrderConfirmation: [
      { name: 'CUSTOMERNAME', description: 'Customer name' },
      { name: 'ORDERTOTAL', description: 'Order total (e.g. $24.99 USD)' },
      { name: 'ORDERSTATUSURL', description: 'Public order tracking URL' },
    ],
    shopOrderOwner: [
      { name: 'CUSTOMERNAME', description: 'Customer name or Guest' },
      { name: 'ORDERTOTAL', description: 'Order total' },
      { name: 'ORDERSTATUSURL', description: 'Order page URL' },
    ],
    shopDigitalDownload: [
      { name: 'CUSTOMERNAME', description: 'Customer name' },
      { name: 'ORDERSTATUSURL', description: 'Order confirmation page URL' },
    ],
    shopOrderShipped: [
      { name: 'CUSTOMERNAME', description: 'Customer name' },
      { name: 'ORDERSTATUSURL', description: 'Order tracking URL' },
    ],
    shopOrderDelivered: [
      { name: 'CUSTOMERNAME', description: 'Customer name' },
      { name: 'ORDERSTATUSURL', description: 'Order page URL' },
    ],
    shopAbandonedCart: [
      { name: 'CUSTOMERNAME', description: 'Customer name' },
    ],
    shopReviewRequest: [
      { name: 'CUSTOMERNAME', description: 'Customer name' },
    ],
    supportTicketReply: [
      { name: 'TICKETSUBJECT', description: 'Support ticket subject line' },
      { name: 'ADMINMESSAGE', description: 'Admin reply message body' },
    ],
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

        setTemplates(loaded);

        // Mirror to localStorage for quick reloads
        localStorage.setItem('tpp_email_templates', JSON.stringify(loaded));
      } catch (e) {
        console.error('Failed to load email templates from Firestore:', e);
      }
    };

    loadFromFirestore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute weekly summary from real userData (mirrors emailAutomation.js buildWeeklyResearchSummary)
  const computeWeeklySummary = useCallback((userDataObj, userTimezone = 'America/New_York') => {
    const taskCompletion = userDataObj?.taskCompletion || {};
    const protocols      = userDataObj?.protocols    || [];
    const stockpile      = userDataObj?.stockpile    || [];

    const toDateKey = (d) => {
      const s = d.toLocaleString('en-US', { timeZone: userTimezone, year: 'numeric', month: '2-digit', day: '2-digit' });
      const [m, dy, y] = s.split('/');
      return `${y}-${m.padStart(2,'0')}-${dy.padStart(2,'0')}`;
    };

    const now = new Date();
    const thisWeekKeys = [], lastWeekKeys = [];
    for (let i = 0; i < 7; i++) { const d = new Date(now); d.setDate(d.getDate() - i); thisWeekKeys.push(toDateKey(d)); }
    for (let i = 7; i < 14; i++) { const d = new Date(now); d.setDate(d.getDate() - i); lastWeekKeys.push(toDateKey(d)); }

    const countDay = (dateKey) => {
      const day = taskCompletion[dateKey];
      if (!day) return 0;
      let n = 0;
      for (const slot of Object.values(day)) {
        if (slot && typeof slot === 'object') {
          for (const val of Object.values(slot)) {
            if (val === true || (val && typeof val === 'object' && val.completed === true)) n++;
          }
        }
      }
      return n;
    };

    const thisWeekTotal = thisWeekKeys.reduce((s, k) => s + countDay(k), 0);
    const lastWeekTotal = lastWeekKeys.reduce((s, k) => s + countDay(k), 0);
    const thisWeekDays  = thisWeekKeys.filter(k => countDay(k) > 0).length;
    const lastWeekDays  = lastWeekKeys.filter(k => countDay(k) > 0).length;

    const activeProtocols = protocols
      .filter(p => p.active !== false)
      .map(p => p.name || p.peptides?.[0]?.name || null)
      .filter(Boolean).slice(0, 4);

    const lowStockItems = stockpile
      .filter(item => { const q = Number(item.quantity) || 0; return q <= 3 && q > 0; })
      .map(item => item.name || 'Item').slice(0, 3);

    return {
      thisWeekTotal, lastWeekTotal, thisWeekDays, lastWeekDays,
      delta: thisWeekTotal - lastWeekTotal,
      daysDelta: thisWeekDays - lastWeekDays,
      activeProtocols,
      lowStockCount: lowStockItems.length,
      lowStockItems,
      hasData: thisWeekTotal > 0 || lastWeekTotal > 0 || activeProtocols.length > 0
    };
  }, []);

  // Fetch real user data for weekly reminder preview
  useEffect(() => {
    if (selectedTemplate !== 'weeklyReminder') return;
    let cancelled = false;
    const fetchRealData = async () => {
      setWeeklyPreviewLoading(true);
      try {
        const usersSnap = await getDocs(query(collection(db, 'users'), where('email', '==', 'lebrockmaldonado@gmail.com')));
        if (cancelled || usersSnap.empty) return;
        const userDoc = usersSnap.docs[0];
        const userId = userDoc.id;
        const userData = userDoc.data();
        const userTimezone = userData.settings?.region?.timeZone || 'America/New_York';
        const firstName = userData.displayName?.split(' ')[0] || 'Researcher';

        const userDataDoc = await getDoc(doc(db, 'userData', userId));
        if (cancelled) return;
        const summary = userDataDoc.exists() ? computeWeeklySummary(userDataDoc.data(), userTimezone) : { hasData: false, activeProtocols: [], lowStockCount: 0, lowStockItems: [], thisWeekTotal: 0, lastWeekTotal: 0, thisWeekDays: 0, delta: 0 };
        if (!cancelled) setWeeklyPreviewData({ summary, firstName });
      } catch (e) {
        console.error('Weekly preview fetch failed:', e);
      } finally {
        if (!cancelled) setWeeklyPreviewLoading(false);
      }
    };
    fetchRealData();
    return () => { cancelled = true; };
  }, [selectedTemplate, computeWeeklySummary]);

  // Build client-side preview HTML using real (or fallback mock) user data
  const buildWeeklyReminderPreview = useCallback(() => {
    const primary   = '#344E41';
    const textLight = '#6B7280';

    const data = weeklyPreviewData;
    const firstName      = data?.firstName      ?? 'Researcher';
    const thisWeekTotal  = data?.summary?.thisWeekTotal  ?? '—';
    const thisWeekDays   = data?.summary?.thisWeekDays   ?? '—';
    const lastWeekTotal  = data?.summary?.lastWeekTotal  ?? null;
    const delta          = data?.summary?.delta          ?? null;
    const activeProtocols = data?.summary?.activeProtocols ?? [];
    const lowStockItems  = data?.summary?.lowStockItems  ?? [];
    const lowStockCount  = data?.summary?.lowStockCount  ?? 0;
    const hasData        = data?.summary?.hasData        ?? false;

    const deltaHtml = (() => {
      if (data === null) return `<span style="color:${textLight};">Loading your data…</span>`;
      if (lastWeekTotal === 0 && thisWeekTotal > 0) return `<span style="color:#16A34A;font-weight:600;">🎉 First activity this week!</span>`;
      if (delta > 0)  return `<span style="color:#16A34A;font-weight:600;">↑ ${delta} more than last week</span>`;
      if (delta < 0)  return `<span style="color:#DC2626;font-weight:600;">↓ ${Math.abs(delta)} fewer than last week</span>`;
      if (lastWeekTotal > 0) return `<span style="color:${textLight};">Same as last week</span>`;
      return `<span style="color:${textLight};">No logged doses yet this week</span>`;
    })();

    const protocolsLine = activeProtocols.length ? activeProtocols.join(', ') : 'No active protocols';

    const lowStockHtml = lowStockCount > 0 ? `
    <div style="background:#FEF3C7;border-left:4px solid #F59E0B;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
      <p style="margin:0 0 4px 0;font-size:14px;font-weight:600;color:#1F2937;">⚠️ Stockpile running low</p>
      <p style="margin:0;font-size:13px;color:${textLight};">${lowStockItems.join(', ')}${lowStockCount > lowStockItems.length ? ` +${lowStockCount - lowStockItems.length} more` : ''}</p>
    </div>` : '';

    const statsHtml = hasData ? `
    <div style="background:#F3E8FF;border-left:4px solid #8B5CF6;border-radius:8px;padding:20px;margin-bottom:16px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="50%" style="padding-right:16px;vertical-align:top;">
          <p style="margin:0 0 4px 0;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:${textLight};">Doses Logged</p>
          <p style="margin:0 0 4px 0;font-size:32px;font-weight:700;color:#7C3AED;">${thisWeekTotal}</p>
          <p style="margin:0;font-size:13px;">${deltaHtml}</p>
        </td>
        <td width="50%" style="padding-left:16px;border-left:1px solid #DDD6FE;vertical-align:top;">
          <p style="margin:0 0 4px 0;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:${textLight};">Active Days</p>
          <p style="margin:0 0 4px 0;font-size:32px;font-weight:700;color:#7C3AED;">${thisWeekDays}<span style="font-size:16px;font-weight:400;color:${textLight};"> / 7</span></p>
          <p style="margin:0;font-size:13px;color:${textLight};">days with logged activity</p>
        </td>
      </tr></table>
      <p style="margin:16px 0 0 0;padding-top:16px;border-top:1px solid #DDD6FE;font-size:13px;color:${textLight};">
        <strong style="color:#1F2937;">Active protocols:</strong> ${protocolsLine}
      </p>
    </div>` : `
    <div style="background:#F3F4F6;border-left:4px solid #9CA3AF;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="margin:0;font-size:15px;color:${textLight};">${deltaHtml}</p>
    </div>`;

    const footerNote = data === null
      ? '⏳ Fetching your live account data…'
      : `✅ Live data from lebrockmaldonado@gmail.com`;

    return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;max-width:600px;">
  <tr><td style="background:${primary};padding:20px 32px;text-align:center;">
    <p style="margin:0;font-size:11px;letter-spacing:0.1em;color:rgba(255,255,255,0.7);text-transform:uppercase;">Organize Your Research</p>
  </td></tr>
  <tr><td style="padding:40px 32px;">
    <h1 style="color:${primary};font-size:28px;margin:0 0 8px 0;text-align:center;">Your Weekly Summary 📊</h1>
    <p style="text-align:center;font-size:16px;color:${textLight};margin:0 0 28px 0;">Hi ${firstName} — here's how your research went this week.</p>
    ${statsHtml}
    ${lowStockHtml}
    <div style="text-align:center;margin:24px 0;">
      <a href="https://thepepplanner.app/app/analytics" style="display:inline-block;padding:14px 28px;background:${primary};color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;">View Full Analytics →</a>
    </div>
    <p style="font-size:14px;color:${textLight};font-style:italic;margin:0 0 16px 0;">Don't want these summaries? You can turn them off anytime in your notification settings.</p>
    <p style="font-size:16px;color:#1F2937;margin:0;">Keep it up! ✌️<br/><span style="color:${primary};font-weight:600;">– The Pep Planner Team</span></p>
  </td></tr>
  <tr><td style="padding:12px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:11px;color:${textLight};">${footerNote}</p>
  </td></tr>
</table></td></tr></table></body></html>`;
  }, [weeklyPreviewData]);

  // Fetch preview HTML from backend (single source of truth)
  const fetchPreviewFromBackend = useCallback(async (template) => {
    if (!template) return;

    // Weekly reminder is analytics-driven — render client-side with mock data
    // so the preview matches the actual sent email without needing a cloud function deploy
    if (selectedTemplate === 'weeklyReminder') {
      setPreviewHtml(buildWeeklyReminderPreview());
      return;
    }

    setPreviewLoading(true);
    try {
      const functions = getFunctions();
      const generateEmailPreview = httpsCallable(functions, 'generateEmailPreview');
      
      const templateForPreview = { ...template };
      
      const previewVars = {
        userName: 'Preview User',
        userEmail: 'preview@example.com',
        customerName: 'Alex',
        orderTotal: '$19.99 USD',
        orderStatusUrl: 'https://thepepplanner.app/order/preview_session',
      };
      if (SHOP_PREVIEW_BODY[selectedTemplate]) {
        templateForPreview.bodyHtml = SHOP_PREVIEW_BODY[selectedTemplate];
      }

      const result = await generateEmailPreview({
        template: templateForPreview,
        variables: previewVars,
        templateType: selectedTemplate,
      });
      
      if (result.data?.success && result.data?.html) {
        setPreviewHtml(result.data.html);
      } else {
        console.error('❌ Preview generation failed:', result.data?.error);
        setPreviewHtml(`<div style="padding: 40px; text-align: center; color: #dc2626;">Preview generation failed: ${result.data?.error || 'Unknown error'}</div>`);
      }
    } catch (error) {
      console.error('❌ Error fetching preview:', error);
      setPreviewHtml(`<div style="padding: 40px; text-align: center; color: #dc2626;">Error loading preview: ${error.message}</div>`);
    } finally {
      setPreviewLoading(false);
    }
  }, [selectedTemplate, buildWeeklyReminderPreview]);

  // Re-render weekly reminder preview whenever live data arrives
  useEffect(() => {
    if (selectedTemplate === 'weeklyReminder') {
      setPreviewHtml(buildWeeklyReminderPreview());
    }
  }, [weeklyPreviewData, selectedTemplate, buildWeeklyReminderPreview]);

  // Debounced preview fetch - updates when template or colors change
  useEffect(() => {
    // Clear any existing timeout
    if (previewDebounceRef.current) {
      clearTimeout(previewDebounceRef.current);
    }
    
    // Debounce the preview fetch (500ms delay)
    previewDebounceRef.current = setTimeout(() => {
      if (currentTemplate) {
        fetchPreviewFromBackend(currentTemplate);
      }
    }, 500);
    
    // Cleanup on unmount
    return () => {
      if (previewDebounceRef.current) {
        clearTimeout(previewDebounceRef.current);
      }
    };
  }, [currentTemplate, fetchPreviewFromBackend]);

  // Save templates to Firestore (and localStorage)
  const saveTemplates = async () => {
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
      // Persist each template with embedded colors so backend can render consistently
      const entries = Object.entries(templates);
      
      for (const [key, tpl] of entries) {
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
            html: deleteField()  // Use Firestore deleteField() to actually remove the field
          };
          
          // Remove any undefined values (Firestore doesn't allow them)
          Object.keys(templateToSave).forEach(k => {
            if (templateToSave[k] === undefined) {
              delete templateToSave[k];
            }
          });
          
          // Save with merge: true to allow deleteField() to work
          await setDoc(doc(db, 'emailTemplates', key), templateToSave, { merge: true });
        } catch (templateError) {
          console.error(`    ❌ Failed to save template ${key}:`, templateError);
          throw new Error(`Failed to save template "${tpl.name}": ${templateError.message || 'Permission denied. Make sure you are logged in as an admin.'}`);
        }
      }

      localStorage.setItem('tpp_email_templates', JSON.stringify(templates));
    
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
    }
  };

  // Reset the currently selected template to its JS default and save to Firestore
  const resetCurrentTemplate = async () => {
    const defaultTpl = DEFAULT_TEMPLATES[selectedTemplate];
    if (!defaultTpl) return;
    if (!window.confirm(`Reset "${defaultTpl.name}" to its default? This will overwrite your saved customisations.`)) return;

    setIsResetting(true);
    try {
      const updated = { ...templates, [selectedTemplate]: { ...defaultTpl } };
      setTemplates(updated);
      localStorage.setItem('tpp_email_templates', JSON.stringify(updated));

      // Persist only this template to Firestore
      const cleanDefault = { ...defaultTpl };
      delete cleanDefault.html;
      await setDoc(doc(db, 'emailTemplates', selectedTemplate), { ...cleanDefault, html: deleteField() }, { merge: true });

      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: `✅ "${defaultTpl.name}" reset to default.`, type: 'success' }
      }));
    } catch (e) {
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: `❌ Reset failed: ${e.message}`, type: 'error' }
      }));
    } finally {
      setIsResetting(false);
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
      const result = await testEmailSystem({ 
        testEmail: 'thepepplanner@gmail.com',
        templateType: selectedTemplate,
        templateData: currentTemplate // Send the actual custom template
      });

      console.log('📧 Test email result:', result.data);
      
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
        const errorStack = result.data?.errorStack;
        
        console.error('❌ Email test failed:', detailedError);
        console.error('❌ Full error data:', result.data);
        if (errorStack) {
          console.error('❌ Error stack:', errorStack);
        }
        
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
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error details:', error.details);
      console.error('❌ Full error object:', JSON.stringify(error, null, 2));
      
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

  // NOTE: generateHTMLFromTemplate has been REMOVED
  // Preview is now generated by backend (single source of truth)
  // This eliminates the sync issue between frontend and backend templates

  // Manual refresh preview button
  const refreshPreview = () => {
    fetchPreviewFromBackend(currentTemplate);
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
    <div className="h-full flex flex-col -mx-4 -mt-4 lg:mx-0 lg:mt-0 relative">
      {/* Sticky Top Header: Selector + Actions */}
      <div 
        className="sticky top-0 z-10 p-4 border-b flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center backdrop-blur-md" 
        style={{ borderColor: theme.border, backgroundColor: theme.isDark ? 'rgba(15,23,42,0.8)' : 'rgba(255,255,255,0.8)' }}
      >
        <div className="flex-1 w-full lg:max-w-md">
          <label className="block text-xs font-semibold mb-1 flex items-center gap-1.5" style={{ color: theme.text }}>
            <Mail size={14} style={{ color: theme.primary }} />
            Choose template
          </label>
          <div className="flex items-center gap-2">
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all focus:outline-none focus:ring-2"
              style={{
                borderColor: theme.border,
                backgroundColor: theme.background,
                color: theme.text
              }}
            >
              <optgroup label="Account & Authentication">
                {Object.entries(templates).filter(([key]) => ['welcome', 'verification', 'passwordReset', 'magicLink', 'unregisteredMagicLink'].includes(key)).map(([key, template]) => (
                  <option key={key} value={key}>{template.name}</option>
                ))}
              </optgroup>
              <optgroup label="Email Change">
                {Object.entries(templates).filter(([key]) => ['emailChangeNotification', 'emailChangeVerification', 'emailChangeVerificationWithLink'].includes(key)).map(([key, template]) => (
                  <option key={key} value={key}>{template.name}</option>
                ))}
              </optgroup>
              <optgroup label="Subscription & Billing">
                {Object.entries(templates).filter(([key]) => ['trialEnding', 'trialExtension', 'subscription', 'paymentFailed', 'paymentSuccessful', 'subscriptionCancelled', 'renewalReminder', 'squarespaceActivation', 'squarespaceActivated'].includes(key)).map(([key, template]) => (
                  <option key={key} value={key}>{template.name}</option>
                ))}
              </optgroup>
              <optgroup label="Disputes (Chargebacks)">
                {Object.entries(templates).filter(([key]) => ['disputeNotification', 'disputeStatusUpdate', 'disputeResolution'].includes(key)).map(([key, template]) => (
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
              <optgroup label="Shop Orders">
                {Object.entries(templates).filter(([key]) => SHOP_TEMPLATE_KEYS.includes(key)).map(([key, template]) => (
                  <option key={key} value={key}>{template.name}</option>
                ))}
              </optgroup>
              <optgroup label="Reminders & Notifications">
                {Object.entries(templates).filter(([key]) => ['weeklyReminder'].includes(key)).map(([key, template]) => (
                  <option key={key} value={key}>{template.name}</option>
                ))}
              </optgroup>
              <optgroup label="Campaigns">
                {Object.entries(templates).filter(([key]) => ['winBack', 'trialExpiredSurvey'].includes(key)).map(([key, template]) => (
                  <option key={key} value={key}>{template.name}</option>
                ))}
              </optgroup>
              <optgroup label="Custom & Announcements">
                {Object.entries(templates).filter(([key]) => ['customAnnouncement', 'accountDeletion', 'accountDeletionRequestConfirmation', 'inDepthRequest', 'inviteEmail'].includes(key)).map(([key, template]) => (
                  <option key={key} value={key}>{template.name}</option>
                ))}
              </optgroup>
            </select>
            <span className="text-[10px] whitespace-nowrap" style={{ color: theme.textLight }}>
              {Object.keys(templates).length} templates
            </span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 w-full lg:w-auto shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => sendTestEmail()}
              disabled={isSendingTest || sendingToAll}
              className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 hover:opacity-90 transition-all disabled:opacity-50"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
              {isSendingTest ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Test
            </button>
            
            <button
              onClick={resetCurrentTemplate}
              disabled={isResetting || isSaving}
              className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 hover:opacity-90 transition-all disabled:opacity-50"
              style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: theme.textLight, border: `1px solid ${theme.border}` }}
            >
              {isResetting ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Reset
            </button>

            <button
              onClick={saveTemplates}
              disabled={isSaving || !auth.currentUser}
              className="px-4 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 hover:opacity-90 transition-all disabled:opacity-50"
              style={{ backgroundColor: theme.success || theme.primary, color: '#fff' }}
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : saveSuccess ? <CheckCircle size={14} /> : <Save size={14} />} 
              {saveSuccess ? 'Saved' : 'Save'}
            </button>
          </div>
          
          {selectedTemplate === 'customAnnouncement' && (
            <button
              onClick={sendAnnouncementToAllUsers}
              disabled={isSendingTest || sendingToAll}
              className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 hover:opacity-90 transition-all disabled:opacity-50"
              style={{ backgroundColor: theme.warning || '#f59e0b', color: '#FFFFFF' }}
            >
              {sendingToAll ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {sendProgress.sent}/{sendProgress.total}
                </>
              ) : (
                <>
                  <Users size={14} />
                  Send to ALL
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {!auth.currentUser && (
        <div className="px-4 py-2 text-xs flex items-center gap-2 bg-yellow-100 text-yellow-800 border-b border-yellow-200">
          <AlertTriangle size={14} />
          You must be logged in to save templates
        </div>
      )}

      {testResult && (
        <div className={`px-4 py-2 text-xs border-b ${
          testResult.success 
            ? 'bg-green-100 text-green-800 border-green-200' 
            : 'bg-red-100 text-red-800 border-red-200'
        }`}>
          {testResult.message}
        </div>
      )}

      {sendingToAll && sendProgress.total > 0 && (
        <div className="px-4 py-2 border-b" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
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

      {/* Main Grid: Left Scrollable Editor, Right Sticky Preview */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 items-start relative">
        
        {/* Left Col: Editor Fields */}
        <div className="space-y-6 lg:overflow-y-auto lg:max-h-[calc(100vh-140px)] lg:pr-2 hide-scrollbar">
          
          {selectedTemplate === 'weeklyReminder' && (
            <div className="p-3 rounded-lg flex items-start gap-2 text-xs" style={{ backgroundColor: theme.isDark ? 'rgba(139,92,246,0.12)' : '#F3E8FF', border: '1px solid #DDD6FE' }}>
              <AlertTriangle size={14} style={{ color: '#7C3AED', flexShrink: 0, marginTop: 1 }} />
              <span style={{ color: theme.isDark ? '#C4B5FD' : '#5B21B6', lineHeight: 1.5 }}>
                <strong>Analytics-driven template.</strong> The actual sent email injects live user data (doses logged, active days, protocols, low stock) and bypasses the fields below. Use <em>Reset to Default</em> to clear the old saved version.
              </span>
            </div>
          )}

          {/* Section: Email Info */}
          <div className="p-4 rounded-lg border space-y-4 shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
            <h3 className="text-xs font-semibold flex items-center gap-1.5 uppercase tracking-wide" style={{ color: theme.textLight }}>
              <Mail size={12} style={{ color: theme.primary }} />
              Email Info
            </h3>
            
            <div>
              <label className="block text-[10px] font-medium mb-1" style={{ color: theme.textLight }}>
                Subject Line
              </label>
              <input
                type="text"
                value={currentTemplate.subject}
                onChange={(e) => updateTemplate('subject', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 transition-shadow"
                style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                placeholder="Email subject"
              />
            </div>

            <div>
              <label className="block text-[10px] font-medium mb-1" style={{ color: theme.textLight }}>
                Heading
              </label>
              <input
                type="text"
                value={currentTemplate.heading}
                onChange={(e) => updateTemplate('heading', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 transition-shadow"
                style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                placeholder="Main heading"
              />
            </div>
          </div>

          {/* Section: Body Content */}
          <div className="p-4 rounded-lg border space-y-4 shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
            <h3 className="text-xs font-semibold flex items-center gap-1.5 uppercase tracking-wide" style={{ color: theme.textLight }}>
              <Pencil size={12} style={{ color: theme.primary }} />
              Body Content
            </h3>
            
            <div>
              <label className="block text-[10px] font-medium mb-1" style={{ color: theme.textLight }}>
                Opening
              </label>
              <textarea
                value={currentTemplate.greeting}
                onChange={(e) => updateTemplate('greeting', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 transition-shadow"
                style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                rows={2}
                placeholder="Opening message"
              />
            </div>

            <div>
              <label className="block text-[10px] font-medium mb-1" style={{ color: theme.textLight }}>
                Message
              </label>
              <textarea
                value={currentTemplate.mainMessage}
                onChange={(e) => updateTemplate('mainMessage', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 transition-shadow"
                style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                rows={4}
                placeholder="Main content"
              />
            </div>

            {SHOP_TEMPLATE_KEYS.includes(selectedTemplate) && (
              <div>
                <label className="block text-[10px] font-medium mb-1" style={{ color: theme.textLight }}>
                  Order footer / policies
                </label>
                <p className="text-[10px] mb-2" style={{ color: theme.textLight }}>
                  Shown below the order table (refunds, shipping timeline, contact). Leave blank to hide.
                </p>
                <textarea
                  value={currentTemplate.orderPolicies || ''}
                  onChange={(e) => updateTemplate('orderPolicies', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 transition-shadow"
                  style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                  rows={3}
                  placeholder="Shipping: We ship within 3–5 business days…"
                />
              </div>
            )}
          </div>

          {/* Section: Call to Action */}
          <div className="p-4 rounded-lg border space-y-4 shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
            <h3 className="text-xs font-semibold flex items-center gap-1.5 uppercase tracking-wide" style={{ color: theme.textLight }}>
              <Zap size={12} style={{ color: theme.primary }} />
              Call to Action
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-medium mb-1" style={{ color: theme.textLight }}>
                  Button Text
                </label>
                <input
                  type="text"
                  value={currentTemplate.ctaText}
                  onChange={(e) => updateTemplate('ctaText', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 transition-shadow"
                  style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
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
                  className="w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 transition-shadow"
                  style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          {/* Section: Features List */}
          <div className="p-4 rounded-lg border shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold flex items-center gap-1.5 uppercase tracking-wide" style={{ color: theme.textLight }}>
                <CheckCircle size={12} style={{ color: theme.primary }} />
                Features List
              </h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentTemplate.showFeatures !== false}
                  onChange={(e) => updateTemplate('showFeatures', e.target.checked)}
                  className="w-3.5 h-3.5 rounded border"
                />
                <span className="text-[10px] font-medium" style={{ color: theme.text }}>
                  {currentTemplate.showFeatures !== false ? 'Visible' : 'Hidden'}
                </span>
              </label>
            </div>
            
            {currentTemplate.showFeatures !== false && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-medium mb-1" style={{ color: theme.textLight }}>
                    Card Title
                  </label>
                  <input
                    type="text"
                    value={currentTemplate.featuresTitle || "What's waiting for you:"}
                    onChange={(e) => updateTemplate('featuresTitle', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 transition-shadow"
                    style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                    placeholder="What's waiting for you:"
                  />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[10px] font-medium" style={{ color: theme.textLight }}>
                      Features
                    </label>
                    <button
                      onClick={addFeature}
                      className="text-[10px] px-2 py-1 rounded hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                    >
                      + Add Feature
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {(currentTemplate.features || []).map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={feature}
                          onChange={(e) => updateFeature(index, e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 transition-shadow"
                          style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                        />
                        <button
                          onClick={() => removeFeature(index)}
                          className="p-1.5 rounded-lg hover:opacity-80 transition-opacity flex-shrink-0"
                          style={{ backgroundColor: theme.error || '#ef4444', color: '#fff' }}
                          title="Remove feature"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Variables Cheat Sheet */}
          <div className="p-4 rounded-lg border shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
            <button
              onClick={() => setShowVariablesCheatSheet(!showVariablesCheatSheet)}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-1.5">
                <HelpCircle size={14} style={{ color: theme.primary }} />
                <span className="font-semibold text-xs uppercase tracking-wide" style={{ color: theme.textLight }}>
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
              <div className="mt-3 pt-3 border-t" style={{ borderColor: theme.border }}>
                {templateVariables[selectedTemplate] && templateVariables[selectedTemplate].length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-[10px]" style={{ color: theme.textLight }}>
                      Click a variable to copy. They'll be automatically replaced when sent.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {templateVariables[selectedTemplate].map((variable, idx) => (
                        <button 
                          key={idx}
                          onClick={() => {
                            navigator.clipboard.writeText(`%${variable.name}%`);
                            window.dispatchEvent(new CustomEvent('tpp:toast', {
                              detail: { message: `Copied %${variable.name}%`, type: 'success' }
                            }));
                          }}
                          className="p-2 rounded-lg border text-left hover:opacity-80 transition-opacity"
                          style={{ borderColor: theme.border, backgroundColor: theme.background }}
                        >
                          <code className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono mb-1" style={{ backgroundColor: theme.primary + '20', color: theme.primary }}>
                            %${variable.name}%
                          </code>
                          <p className="text-[10px] leading-tight" style={{ color: theme.textLight }}>
                            {variable.description}
                          </p>
                        </button>
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
        </div>

        {/* Right Col: Preview Iframe */}
        <div className="lg:sticky lg:top-[88px] flex flex-col rounded-lg border shadow-sm" style={{ height: 'calc(100vh - 140px)', minHeight: '600px', borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: theme.border }}>
            <span className="text-xs font-semibold flex items-center gap-1.5 uppercase tracking-wide" style={{ color: theme.textLight }}>
              <Eye size={12} style={{ color: theme.primary }} />
              Preview
              {previewLoading && <Loader2 size={12} className="animate-spin" style={{ color: theme.primary }} />}
            </span>
            <button
              onClick={refreshPreview}
              className="text-xs p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
              style={{ color: theme.primary }}
              title="Refresh preview"
            >
              <RefreshCw size={14} />
            </button>
          </div>
          <iframe
            srcDoc={previewHtml}
            className="w-full flex-1 transition-opacity duration-200 rounded-b-lg"
            style={{ opacity: previewLoading ? 0.6 : 1, minHeight: '500px' }}
            title="Email Preview"
          />
        </div>

      </div>
    </div>
  );
}
