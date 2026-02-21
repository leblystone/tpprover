import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mail, Eye, Save, Send, RotateCcw, Copy, CheckCircle, HelpCircle, ChevronDown, ChevronUp, Users, Loader2 } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, auth } from '../../config/firebase';
import { doc, getDoc, setDoc, deleteField } from 'firebase/firestore';
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
      '⏰ Automatic Reminders – Visual your daily, weekly, and full month of research! View upcoming doses with our calendar.',
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
      '⏰ Automatic Reminders – Visual your daily, weekly, and full month of research! View upcoming doses with our calendar.',
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
      '⏰ Automatic Reminders – Visual your daily, weekly, and full month of research! View upcoming doses with our calendar.',
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
      '⏰ Automatic Reminders – Visual your daily, weekly, and full month of research! View upcoming doses with our calendar.',
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
      '⏰ Automatic Reminders – Visual your daily, weekly, and full month of research! View upcoming doses with our calendar.',
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
      '⏰ Automatic Reminders – Visual your daily, weekly, and full month of research! View upcoming doses with our calendar.',
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
      '⏰ Automatic Reminders – Visual your daily, weekly, and full month of research! View upcoming doses with our calendar.',
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
      '⏰ Automatic Reminders – Visual your daily, weekly, and full month of research! View upcoming doses with our calendar.',
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
      '⏰ Automatic Reminders – Visual your daily, weekly, and full month of research! View upcoming doses with our calendar.',
      '🧮 Peptide Calculator – Calculate the next dose with a handy vial visual. Research with pens? We got you!',
      '🧪 Stockpile Tracking – No need to PANIC! Always know how much is in your stockpile with aggregate totals.',
      '📦 Peptide Orders – Let the app do the work for you by syncing your incoming peptides into your stockpile!',
      '👥 Vendors – Domestic, International or GB vendor info at your fingertips! Never lose your contacts again.'
    ]
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
    showFeatures: true,
    featuresTitle: "What's waiting for you:",
    features: [
      '📓🔍 Keep your research in ONE place! – Keep your dedicated info in one spot! Schedule your daily, weekly, and monthly protocols.',
      '⏰ Automatic Reminders – Visual your daily, weekly, and full month of research! View upcoming doses with our calendar.',
      '🧮 Peptide Calculator – Calculate the next dose with a handy vial visual. Research with pens? We got you!',
      '🧪 Stockpile Tracking – No need to PANIC! Always know how much is in your stockpile with aggregate totals.',
      '📦 Peptide Orders – Let the app do the work for you by syncing your incoming peptides into your stockpile!',
      '👥 Vendors – Domestic, International or GB vendor info at your fingertips! Never lose your contacts again.'
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
    showFeatures: true,
    featuresTitle: "What's waiting for you:",
    features: [
      '📓🔍 Keep your research in ONE place! – Keep your dedicated info in one spot! Schedule your daily, weekly, and monthly protocols.',
      '⏰ Automatic Reminders – Visual your daily, weekly, and full month of research! View upcoming doses with our calendar.',
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
      '⏰ Automatic Reminders – Visual your daily, weekly, and full month of research! View upcoming doses with our calendar.',
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
      '⏰ Automatic Reminders – Visual your daily, weekly, and full month of research! View upcoming doses with our calendar.',
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
      '⏰ Automatic Reminders – Visual your daily, weekly, and full month of research! View upcoming doses with our calendar.',
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
      '⏰ Automatic Reminders – Visual your daily, weekly, and full month of research! View upcoming doses with our calendar.',
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
      '⏰ Automatic Reminders – Visual your daily, weekly, and full month of research! View upcoming doses with our calendar.',
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
      '⏰ Automatic Reminders – Visual your daily, weekly, and full month of research! View upcoming doses with our calendar.',
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
      '⏰ Automatic Reminders – Visual your daily, weekly, and full month of research! View upcoming doses with our calendar.',
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
      '⏰ Automatic Reminders – Visual your daily, weekly, and full month of research! View upcoming doses with our calendar.',
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
      '⏰ Automatic Reminders – Visual your daily, weekly, and full month of research! View upcoming doses with our calendar.',
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
      '⏰ Automatic Reminders – Visual your daily, weekly, and full month of research! View upcoming doses with our calendar.',
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
      '⏰ Automatic Reminders – Visual your daily, weekly, and full month of research! View upcoming doses with our calendar.',
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
      '⏰ Automatic Reminders – Visual your daily, weekly, and full month of research! View upcoming doses with our calendar.',
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
      '⏰ Automatic Reminders – Visual your daily, weekly, and full month of research! View upcoming doses with our calendar.',
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

  // Fetch preview HTML from backend (single source of truth)
  const fetchPreviewFromBackend = useCallback(async (template, templateColors) => {
    if (!template) return;
    
    setPreviewLoading(true);
    try {
      const functions = getFunctions();
      const generateEmailPreview = httpsCallable(functions, 'generateEmailPreview');
      
      // Add colors to template for backend generation
      const templateWithColors = {
        ...template,
        colors: templateColors
      };
      
      const result = await generateEmailPreview({ 
        template: templateWithColors,
        variables: { userName: 'Preview User', userEmail: 'preview@example.com' }
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
  }, []);

  // Debounced preview fetch - updates when template or colors change
  useEffect(() => {
    // Clear any existing timeout
    if (previewDebounceRef.current) {
      clearTimeout(previewDebounceRef.current);
    }
    
    // Debounce the preview fetch (500ms delay)
    previewDebounceRef.current = setTimeout(() => {
      if (currentTemplate) {
        fetchPreviewFromBackend(currentTemplate, colors);
      }
    }, 500);
    
    // Cleanup on unmount
    return () => {
      if (previewDebounceRef.current) {
        clearTimeout(previewDebounceRef.current);
      }
    };
  }, [currentTemplate, colors, fetchPreviewFromBackend]);

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
            colors,  // Always include colors
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
      
      // Save branding colors separately too (optional)
      try {
        await setDoc(doc(db, 'emailTemplates', '_branding'), { colors }, { merge: true });
      } catch (colorError) {
        console.error('  ❌ Failed to save branding colors:', colorError);
        throw new Error(`Failed to save branding colors: ${colorError.message || 'Permission denied. Make sure you are logged in as an admin.'}`);
      }

      localStorage.setItem('tpp_email_templates', JSON.stringify(templates));
      localStorage.setItem('tpp_email_colors', JSON.stringify(colors));
    
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

  // NOTE: generateHTMLFromTemplate has been REMOVED
  // Preview is now generated by backend (single source of truth)
  // This eliminates the sync issue between frontend and backend templates

  // Copy HTML to clipboard (uses backend-generated HTML)
  const copyHTML = () => {
    navigator.clipboard.writeText(previewHtml);
    window.dispatchEvent(new CustomEvent('tpp:toast', {
      detail: { message: '📋 HTML copied to clipboard!', type: 'success' }
    }));
  };

  // Manual refresh preview button
  const refreshPreview = () => {
    fetchPreviewFromBackend(currentTemplate, colors);
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

              {/* Features Card Controls */}
              <div className="p-2 rounded-lg border mb-2" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
                {/* Show/Hide Toggle */}
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[10px] font-medium" style={{ color: theme.textLight }}>
                    Features Card
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentTemplate.showFeatures !== false}
                      onChange={(e) => updateTemplate('showFeatures', e.target.checked)}
                      className="w-3 h-3 rounded"
                    />
                    <span className="text-[10px]" style={{ color: theme.text }}>
                      {currentTemplate.showFeatures !== false ? 'Visible' : 'Hidden'}
                    </span>
                  </label>
                </div>
                  
                  {/* Features Title */}
                  {currentTemplate.showFeatures !== false && (
                    <>
                      <div className="mb-2">
                        <label className="block text-[10px] font-medium mb-0.5" style={{ color: theme.textLight }}>
                          Card Title
                        </label>
                        <input
                          type="text"
                          value={currentTemplate.featuresTitle || "What's waiting for you:"}
                          onChange={(e) => updateTemplate('featuresTitle', e.target.value)}
                          placeholder="What's waiting for you:"
                          className="w-full px-2 py-1 rounded border text-[10px] focus:outline-none focus:ring-1"
                          style={{ 
                            borderColor: theme.border,
                            backgroundColor: theme.cardBackground,
                            color: theme.text
                          }}
                        />
                      </div>
                      
                      {/* Features List */}
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
                    </>
                  )}
                  {currentTemplate.showFeatures !== false && (currentTemplate.features || []).map((feature, index) => (
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
            <h3 className="text-xs font-semibold mb-2 flex items-center justify-between" style={{ color: theme.text }}>
              <span className="flex items-center gap-1">
                👁️ Preview
                {previewLoading && (
                  <Loader2 size={12} className="animate-spin ml-1" style={{ color: theme.primary }} />
                )}
              </span>
              <button
                onClick={refreshPreview}
                className="text-xs px-2 py-0.5 rounded hover:opacity-80"
                style={{ color: theme.primary }}
                title="Refresh preview"
              >
                ↻
              </button>
            </h3>
            <iframe
              srcDoc={previewHtml}
              className="w-full rounded-lg border"
              style={{ height: '600px', borderColor: theme.border, opacity: previewLoading ? 0.6 : 1 }}
              title="Email Preview"
            />
            <p className="text-xs mt-1 text-center" style={{ color: theme.textLight }}>
              ✅ Preview generated from backend — what you see is what gets sent
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}

