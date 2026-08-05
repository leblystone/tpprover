import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mail, Eye, Save, Send, Copy, CheckCircle, HelpCircle, ChevronDown, ChevronUp, Users, Loader2, AlertTriangle, Pencil, RefreshCw, User, Search, X } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { db, auth, functions } from '../../config/firebase';
import { doc, getDoc, setDoc, deleteField, collection, query, where, getDocs } from 'firebase/firestore';
import { getUserList } from '../../services/firebase';
import CustomDropdown from '../common/inputs/CustomDropdown';

const DEFAULT_TEMPLATES = {
  welcome: {
    name: 'Welcome Email',
    subject: 'Welcome to The Pep Planner!',
    heading: 'Welcome to The Pep Planner!',
    greeting: "Hey there! Thanks for joining!",
    mainMessage: "We built this tool as researchers, for researchers. Everything you need, all in one place.",
    ctaText: 'Get Started',
    ctaLink: 'https://thepepplanner.app/app/dashboard',
    highlightTitle: 'Some tips to start organizing your research! 📗',
    highlightMessage: '',
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
    subject: 'Your Weekly Research Summary - The Pep Planner',
    heading: 'Your Weekly Summary 📊',
    greeting: 'Hi {{firstName}} — here\'s how your research went this week.',
    mainMessage: '',
    ctaText: 'View Full Analytics →',
    ctaLink: 'https://thepepplanner.app/app/analytics',
    postCtaNote: 'Don\'t want weekly summaries? <a href="https://thepepplanner.app/app/settings" style="color:#344E41;font-weight:600;text-decoration:none;">Turn them off anytime</a> in your preferences.',
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
  accountDeletionScheduled: {
    name: 'Account Deletion – Scheduled (After Billing Period)',
    subject: 'Your Pep Planner account deletion is scheduled',
    heading: 'Account Deletion Scheduled',
    greeting: 'Hi %USERNAME%,',
    mainMessage: 'Your account deletion request has been approved and **scheduled**.\n\nYour Pep Planner account and all associated data will be permanently deleted on **%SCHEDULED_DELETE_DATE%** (after your current billing period ends).\n\n%PLATFORM_BILLING_NOTE%\n\nBilling platform: %PAYMENT_PROVIDER%\n\nUntil then you can still sign in. You will receive a **final confirmation email** once deletion is complete.\n\nIf you change your mind before that date, contact us at contact@thepepplanner.com.',
    ctaText: 'Contact Support',
    ctaLink: 'mailto:contact@thepepplanner.com',
    highlightTitle: 'Scheduled deletion date',
    highlightMessage: '%SCHEDULED_DELETE_DATE%',
    showFeatures: true,
    featuresTitle: '',
    features: [
      'Request status – Approved & scheduled',
      'Billing – Cancels at end of current period',
      'Final email – Sent when your account is fully deleted',
      'Changed your mind? – Email us before the scheduled date',
    ],
    postCtaNote: 'This action cannot be undone after the scheduled date.',
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

const TEMPLATE_SELECTOR_GROUPS = [
  { label: 'Account & Authentication', keys: ['welcome', 'verification', 'passwordReset', 'magicLink', 'unregisteredMagicLink'] },
  { label: 'Email Change', keys: ['emailChangeNotification', 'emailChangeVerification', 'emailChangeVerificationWithLink'] },
  { label: 'Subscription & Billing', keys: ['trialEnding', 'trialExtension', 'subscription', 'paymentFailed', 'paymentSuccessful', 'subscriptionCancelled', 'renewalReminder', 'squarespaceActivation', 'squarespaceActivated'] },
  { label: 'Disputes (Chargebacks)', keys: ['disputeNotification', 'disputeStatusUpdate', 'disputeResolution'] },
  { label: 'Lifetime Access', keys: ['lifetimeAccessGranted', 'manualLifetimeGrant'] },
  { label: 'Shop Orders', keys: SHOP_TEMPLATE_KEYS },
  { label: 'Reminders & Notifications', keys: ['weeklyReminder'] },
  { label: 'Campaigns', keys: ['winBack', 'trialExpiredSurvey'] },
  { label: 'Custom & Announcements', keys: ['customAnnouncement', 'accountDeletion', 'accountDeletionRequestConfirmation', 'accountDeletionScheduled', 'inDepthRequest', 'inviteEmail'] },
];

const BILLING_TEMPLATE_KEYS = [
  'trialEnding',
  'trialExtension',
  'subscription',
  'paymentFailed',
  'paymentSuccessful',
  'subscriptionCancelled',
  'renewalReminder',
];

const TOKEN_TEMPLATE_KEYS = [
  'verification',
  'passwordReset',
  'magicLink',
  'unregisteredMagicLink',
];

const EMAIL_CHANGE_TEMPLATE_KEYS = [
  'emailChangeNotification',
  'emailChangeVerification',
  'emailChangeVerificationWithLink',
];

const BLOCKED_MANUAL_TEMPLATES = ['squarespaceActivation'];

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

const DEFAULT_COLORS = {
  primary: '#344E41',
  primaryLight: '#3A5A40',
  secondary: '#A3B18A',
  sage: '#D4D7CD',
  white: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280'
};

/** Live analytics preview + weekly test sends use this account. */
const ADMIN_WEEKLY_TEST_EMAIL = 'lebrockmaldonado@gmail.com';

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

  // Manual send to customer
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [useCustomEmail, setUseCustomEmail] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [manualOverrides, setManualOverrides] = useState({
    invoiceUrl: '',
    receiptUrl: '',
    orderId: '',
    oldEmail: '',
    newEmail: '',
    ticketSubject: '',
    adminMessage: '',
    ticketId: '',
  });
  const [isSendingManual, setIsSendingManual] = useState(false);
  const [manualResult, setManualResult] = useState(null);
  
  // Backend preview state - single source of truth
  const [previewHtml, setPreviewHtml] = useState('<div style="padding: 40px; text-align: center; color: #666;">Loading preview...</div>');
  const [weeklyPreviewData, setWeeklyPreviewData] = useState(null);
  const [weeklyPreviewLoading, setWeeklyPreviewLoading] = useState(false);
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
    accountDeletionScheduled: [
      { name: 'USERNAME', description: 'User\'s name' },
      { name: 'USEREMAIL', description: 'User\'s email address' },
      { name: 'SCHEDULED_DELETE_DATE', description: 'Formatted date when account will be deleted' },
      { name: 'PAYMENT_PROVIDER', description: 'Stripe, Google Play, or Apple App Store' },
      { name: 'PLATFORM_BILLING_NOTE', description: 'Platform-specific billing instructions (auto-filled per provider)' },
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

  const computeWeeklySummary = useCallback((userDataObj, userTimezone = 'America/New_York') => {
    const taskCompletion = userDataObj?.taskCompletion || {};
    const protocols = userDataObj?.protocols || [];
    const stockpile = userDataObj?.stockpile || [];

    const toDateKey = (d) => {
      const s = d.toLocaleString('en-US', { timeZone: userTimezone, year: 'numeric', month: '2-digit', day: '2-digit' });
      const [m, dy, y] = s.split('/');
      return `${y}-${m.padStart(2, '0')}-${dy.padStart(2, '0')}`;
    };

    const now = new Date();
    const thisWeekKeys = [];
    const lastWeekKeys = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      thisWeekKeys.push(toDateKey(d));
    }
    for (let i = 7; i < 14; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      lastWeekKeys.push(toDateKey(d));
    }

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
    const thisWeekDays = thisWeekKeys.filter((k) => countDay(k) > 0).length;

    const activeProtocols = protocols
      .filter((p) => p.active !== false)
      .map((p) => p.name || p.peptides?.[0]?.name || null)
      .filter(Boolean)
      .slice(0, 4);

    const lowStockItems = stockpile
      .filter((item) => {
        const q = Number(item.quantity) || 0;
        return q <= 3 && q > 0;
      })
      .map((item) => item.name || 'Item')
      .slice(0, 3);

    return {
      thisWeekTotal,
      lastWeekTotal,
      thisWeekDays,
      delta: thisWeekTotal - lastWeekTotal,
      activeProtocols,
      lowStockCount: lowStockItems.length,
      lowStockItems,
      hasData: thisWeekTotal > 0 || lastWeekTotal > 0 || activeProtocols.length > 0,
    };
  }, []);

  useEffect(() => {
    if (selectedTemplate !== 'weeklyReminder') {
      setWeeklyPreviewData(null);
      return;
    }
    let cancelled = false;
    setWeeklyPreviewLoading(true);

    (async () => {
      try {
        const usersSnap = await getDocs(query(collection(db, 'users'), where('email', '==', ADMIN_WEEKLY_TEST_EMAIL)));
        if (cancelled || usersSnap.empty) {
          if (!cancelled) setWeeklyPreviewData(null);
          return;
        }

        const userDoc = usersSnap.docs[0];
        const userId = userDoc.id;
        const userData = userDoc.data();
        const userTimezone = userData.settings?.region?.timeZone || 'America/New_York';
        const firstName = userData.displayName?.split(' ')[0] || 'Researcher';

        const userDataDoc = await getDoc(doc(db, 'userData', userId));
        if (cancelled) return;

        const summary = userDataDoc.exists()
          ? computeWeeklySummary(userDataDoc.data(), userTimezone)
          : { hasData: false, activeProtocols: [], lowStockCount: 0, lowStockItems: [], thisWeekTotal: 0, lastWeekTotal: 0, thisWeekDays: 0, delta: 0 };

        if (!cancelled) setWeeklyPreviewData({ summary, firstName });
      } catch (e) {
        console.error('Weekly preview data fetch failed:', e);
        if (!cancelled) setWeeklyPreviewData(null);
      } finally {
        if (!cancelled) setWeeklyPreviewLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [selectedTemplate, computeWeeklySummary]);

  // Fetch preview HTML from backend (single source of truth)
  const fetchPreviewFromBackend = useCallback(async (template, templateColors) => {
    if (!template) return;
    
    setPreviewLoading(true);
    try {
      const generateEmailPreview = httpsCallable(functions, 'generateEmailPreview');
      
      // Add colors to template for backend generation
      const templateWithColors = {
        ...template,
        colors: templateColors
      };
      
      const previewVars = {
        userName: 'Preview User',
        userEmail: 'preview@example.com',
        customerName: 'Alex',
        orderTotal: '$19.99 USD',
        orderStatusUrl: 'https://thepepplanner.app/order/preview_session',
      };
      if (SHOP_PREVIEW_BODY[selectedTemplate]) {
        templateWithColors.bodyHtml = SHOP_PREVIEW_BODY[selectedTemplate];
      }

      const payload = {
        template: templateWithColors,
        variables: previewVars,
        templateType: selectedTemplate,
      };

      if (selectedTemplate === 'weeklyReminder') {
        payload.weeklyFirstName = weeklyPreviewData?.firstName || 'Researcher';
        payload.weeklySummary = weeklyPreviewData?.summary || {
          hasData: false,
          thisWeekTotal: 0,
          lastWeekTotal: 0,
          thisWeekDays: 0,
          delta: 0,
          activeProtocols: [],
          lowStockCount: 0,
          lowStockItems: [],
        };
      }

      const result = await generateEmailPreview(payload);
      
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
  }, [selectedTemplate, weeklyPreviewData]);

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
  }, [currentTemplate, colors, weeklyPreviewData, fetchPreviewFromBackend]);

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

      const testEmailSystem = httpsCallable(functions, 'testEmailSystem');

      // Send specific template based on current selection WITH custom template data
      const testRecipient = selectedTemplate === 'weeklyReminder' ? ADMIN_WEEKLY_TEST_EMAIL : 'thepepplanner@gmail.com';

      const result = await testEmailSystem({ 
        testEmail: testRecipient,
        templateType: selectedTemplate,
        templateData: currentTemplate // Send the actual custom template
      });

      console.log('📧 Test email result:', result.data);
      
      const sentTo = result.data?.results?.testEmail || testRecipient;

      if (result.data && result.data.success) {
        setTestResult({ 
          success: true, 
          message: `${currentTemplate.name} sent successfully to ${sentTo}!` 
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setUsersLoading(true);
      try {
        const list = await getUserList();
        if (!cancelled) setUsers(list || []);
      } catch (err) {
        console.error('Failed to load users for manual send:', err);
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setManualResult(null);
  }, [selectedTemplate, selectedCustomer, useCustomEmail, customEmail]);

  const isShopOwnerTemplate = selectedTemplate === 'shopOrderOwner';
  const isManualBlocked = BLOCKED_MANUAL_TEMPLATES.includes(selectedTemplate);
  const showBillingOverrides = BILLING_TEMPLATE_KEYS.includes(selectedTemplate);
  const showShopOrderId =
    SHOP_TEMPLATE_KEYS.includes(selectedTemplate) && !isShopOwnerTemplate;
  const showEmailChangeOverrides = EMAIL_CHANGE_TEMPLATE_KEYS.includes(selectedTemplate);
  const showTokenNote = TOKEN_TEMPLATE_KEYS.includes(selectedTemplate);
  const showSupportOverrides = selectedTemplate === 'supportTicketReply';

  const filteredCustomers = users.filter((user) => {
    const term = customerSearch.toLowerCase().trim();
    if (!term) return true;
    const email = (user.email || '').toLowerCase();
    const name = (user.displayName || '').toLowerCase();
    const uid = (user.uid || user.id || '').toLowerCase();
    return email.includes(term) || name.includes(term) || uid.includes(term);
  }).slice(0, 60);

  const manualRecipientLabel = (() => {
    if (isShopOwnerTemplate) return 'Store owner inbox';
    if (useCustomEmail) {
      return customEmail.trim() || '—';
    }
    if (selectedCustomer) {
      return `${selectedCustomer.displayName || 'User'} <${selectedCustomer.email}>`;
    }
    return null;
  })();

  const canSendManual = (() => {
    if (isManualBlocked || isSendingManual || isSendingTest || sendingToAll) return false;
    if (isShopOwnerTemplate) return true;
    if (useCustomEmail) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customEmail.trim());
    }
    return !!selectedCustomer?.email;
  })();

  const buildManualOverridesPayload = () => {
    const o = {};
    if (manualOverrides.invoiceUrl?.trim()) o.invoiceUrl = manualOverrides.invoiceUrl.trim();
    if (manualOverrides.receiptUrl?.trim()) o.receiptUrl = manualOverrides.receiptUrl.trim();
    if (manualOverrides.orderId?.trim()) o.orderId = manualOverrides.orderId.trim();
    if (manualOverrides.oldEmail?.trim()) o.oldEmail = manualOverrides.oldEmail.trim();
    if (manualOverrides.newEmail?.trim()) o.newEmail = manualOverrides.newEmail.trim();
    if (manualOverrides.ticketSubject?.trim()) o.ticketSubject = manualOverrides.ticketSubject.trim();
    if (manualOverrides.adminMessage?.trim()) o.adminMessage = manualOverrides.adminMessage.trim();
    if (manualOverrides.ticketId?.trim()) o.ticketId = manualOverrides.ticketId.trim();
    return o;
  };

  const sendManualToCustomer = async () => {
    if (!canSendManual) return;

    const templateName = currentTemplate?.name || selectedTemplate;
    const confirmMsg = isShopOwnerTemplate
      ? `Send "${templateName}" to the shop owner inbox?`
      : `Send "${templateName}" to ${manualRecipientLabel}?`;

    if (!window.confirm(confirmMsg)) return;

    setIsSendingManual(true);
    setManualResult(null);

    try {
      const sendManualEmail = httpsCallable(functions, 'sendManualEmail');

      const payload = {
        templateKey: selectedTemplate,
        overrides: buildManualOverridesPayload(),
      };

      if (isShopOwnerTemplate) {
        if (selectedCustomer?.uid || selectedCustomer?.id) {
          payload.userId = selectedCustomer.uid || selectedCustomer.id;
          payload.userEmail = selectedCustomer.email;
        } else if (useCustomEmail && customEmail.trim()) {
          payload.userEmail = customEmail.trim();
        } else {
          payload.userEmail = 'contact@thepepplanner.com';
        }
      } else if (useCustomEmail) {
        payload.userEmail = customEmail.trim();
        if (customName.trim()) {
          payload.overrides = { ...payload.overrides, userName: customName.trim() };
        }
      } else {
        payload.userId = selectedCustomer.uid || selectedCustomer.id;
        payload.userEmail = selectedCustomer.email;
      }

      const result = await sendManualEmail(payload);

      if (result.data?.success) {
        const msg = result.data.message || `Sent to ${result.data.recipientEmail}`;
        setManualResult({ success: true, message: msg });
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { message: `✅ ${msg}`, type: 'success' },
        }));
      } else {
        throw new Error(result.data?.message || 'Send failed');
      }
    } catch (error) {
      const errMsg = error.message || 'Failed to send email';
      setManualResult({ success: false, message: errMsg });
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: `❌ ${errMsg}`, type: 'error' },
      }));
    } finally {
      setIsSendingManual(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Send to Customer */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold flex items-center gap-2 pb-1 border-b" style={{ color: theme.text, borderColor: theme.border }}>
          <Users size={16} style={{ color: theme.primary }} />
          Send to Customer
          <span className="font-normal text-[11px]" style={{ color: theme.textLight }}>
            Send email to customer
          </span>
        </h2>

        {isManualBlocked && (
          <div className="px-3 py-2 rounded-lg text-xs bg-amber-50 text-amber-900 border border-amber-200">
            <AlertTriangle size={14} className="inline mr-1 align-text-bottom" />
            Legacy Squarespace activation emails need a fresh token from the Squarespace admin flow — manual send is disabled here.
          </div>
        )}

        {isShopOwnerTemplate && (
          <div className="px-3 py-2 rounded-lg text-xs border" style={{ borderColor: theme.border, color: theme.textLight }}>
            This template goes to the <strong>shop owner</strong> inbox, not a customer. Optionally pick a customer or order ID so the email includes order details.
          </div>
        )}

        {!isManualBlocked && (
          <div className="p-4 rounded-lg border space-y-4" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
            {/* Step 1 — Find customer */}
            {!isShopOwnerTemplate && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold" style={{ color: theme.text }}>
                    1. Find customer
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setUseCustomEmail(!useCustomEmail);
                      setSelectedCustomer(null);
                      setCustomerSearch('');
                    }}
                    className="text-[10px] px-2 py-1 rounded border"
                    style={{ borderColor: theme.border, color: theme.primary }}
                  >
                    {useCustomEmail ? 'Search registered users' : 'Not a registered user?'}
                  </button>
                </div>

                {useCustomEmail ? (
                  <div className="space-y-2">
                    <input
                      type="email"
                      placeholder="Customer email address"
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                    />
                    <input
                      type="text"
                      placeholder="Name (optional)"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                    />
                  </div>
                ) : selectedCustomer ? (
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(null)}
                    className="w-full p-3 rounded-lg border-2 text-left flex items-center justify-between"
                    style={{ borderColor: theme.success || '#22c55e', backgroundColor: (theme.success || '#22c55e') + '15' }}
                  >
                    <div>
                      <div className="text-sm font-medium" style={{ color: theme.text }}>
                        {selectedCustomer.email || 'No email'}
                      </div>
                      <div className="text-[10px] font-mono mt-1" style={{ color: theme.textLight }}>
                        UID: {selectedCustomer.uid || selectedCustomer.id}
                      </div>
                    </div>
                    <X size={16} style={{ color: theme.textLight }} />
                  </button>
                ) : (
                  <>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.textLight }} />
                      <input
                        type="text"
                        placeholder="Search by email or UID..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm"
                        style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                      />
                    </div>
                    {usersLoading ? (
                      <div className="py-6 text-center text-xs" style={{ color: theme.textLight }}>
                        <Loader2 size={18} className="animate-spin inline mr-2" />
                        Loading users...
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-1 mt-2">
                        {filteredCustomers.length === 0 ? (
                          <p className="text-xs py-4 text-center" style={{ color: theme.textLight }}>
                            No users found. Try custom email instead.
                          </p>
                        ) : (
                          filteredCustomers.map((user) => (
                            <button
                              key={user.uid || user.id}
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(user);
                                setCustomerSearch('');
                              }}
                              className="w-full p-2 rounded-lg border text-left hover:opacity-90 flex items-center gap-2"
                              style={{ borderColor: theme.border, backgroundColor: theme.background }}
                            >
                              <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: theme.border }}>
                                <User size={14} style={{ color: theme.textLight }} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium truncate" style={{ color: theme.text }}>
                                  {user.email || 'No email'}
                                </div>
                              </div>
                              <code className="text-[9px] shrink-0 opacity-60" style={{ color: theme.textLight }}>
                                {(user.uid || user.id || '').slice(0, 8)}…
                              </code>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Step 2 — Extra fields */}
            {(showBillingOverrides || showShopOrderId || showEmailChangeOverrides || showTokenNote || showSupportOverrides) && (
              <div className="pt-2 border-t space-y-2" style={{ borderColor: theme.border }}>
                <label className="text-xs font-semibold" style={{ color: theme.text }}>
                  2. Extra info {isShopOwnerTemplate ? '(optional)' : ''}
                </label>
                {showTokenNote && (
                  <p className="text-[10px]" style={{ color: theme.textLight }}>
                    A fresh secure link will be generated when you send.
                  </p>
                )}
                {showBillingOverrides && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="url"
                      placeholder="Invoice URL (optional)"
                      value={manualOverrides.invoiceUrl}
                      onChange={(e) => setManualOverrides({ ...manualOverrides, invoiceUrl: e.target.value })}
                      className="px-3 py-2 rounded-lg border text-xs"
                      style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                    />
                    <input
                      type="url"
                      placeholder="Receipt URL (optional)"
                      value={manualOverrides.receiptUrl}
                      onChange={(e) => setManualOverrides({ ...manualOverrides, receiptUrl: e.target.value })}
                      className="px-3 py-2 rounded-lg border text-xs"
                      style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                    />
                  </div>
                )}
                {showShopOrderId && (
                  <input
                    type="text"
                    placeholder="Order ID (Stripe session ID) — leave blank for most recent order"
                    value={manualOverrides.orderId}
                    onChange={(e) => setManualOverrides({ ...manualOverrides, orderId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-xs"
                    style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                  />
                )}
                {isShopOwnerTemplate && (
                  <input
                    type="text"
                    placeholder="Order ID for order details (optional)"
                    value={manualOverrides.orderId}
                    onChange={(e) => setManualOverrides({ ...manualOverrides, orderId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-xs"
                    style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                  />
                )}
                {showEmailChangeOverrides && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="email"
                      placeholder="Old email"
                      value={manualOverrides.oldEmail}
                      onChange={(e) => setManualOverrides({ ...manualOverrides, oldEmail: e.target.value })}
                      className="px-3 py-2 rounded-lg border text-xs"
                      style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                    />
                    <input
                      type="email"
                      placeholder="New email"
                      value={manualOverrides.newEmail}
                      onChange={(e) => setManualOverrides({ ...manualOverrides, newEmail: e.target.value })}
                      className="px-3 py-2 rounded-lg border text-xs"
                      style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                    />
                  </div>
                )}
                {showSupportOverrides && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Ticket subject"
                      value={manualOverrides.ticketSubject}
                      onChange={(e) => setManualOverrides({ ...manualOverrides, ticketSubject: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border text-xs"
                      style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                    />
                    <textarea
                      placeholder="Admin reply message"
                      value={manualOverrides.adminMessage}
                      onChange={(e) => setManualOverrides({ ...manualOverrides, adminMessage: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg border text-xs"
                      style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                    />
                    <input
                      type="text"
                      placeholder="Ticket ID (optional)"
                      value={manualOverrides.ticketId}
                      onChange={(e) => setManualOverrides({ ...manualOverrides, ticketId: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border text-xs"
                      style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                    />
                  </div>
                )}
                {selectedTemplate === 'weeklyReminder' && (
                  <p className="text-[10px]" style={{ color: theme.textLight }}>
                    Weekly summary uses this customer&apos;s live research data from the app.
                  </p>
                )}
              </div>
            )}

            {/* Step 3 — Confirm */}
            {canSendManual && manualRecipientLabel && (
              <div className="pt-2 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2" style={{ borderColor: theme.border }}>
                <p className="text-xs" style={{ color: theme.text }}>
                  Send <strong>{currentTemplate?.name}</strong> to{' '}
                  <span style={{ color: theme.primary }}>{manualRecipientLabel}</span>?
                </p>
                <button
                  type="button"
                  onClick={sendManualToCustomer}
                  disabled={!canSendManual || isSendingManual}
                  className="px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: theme.warning || '#d97706', color: '#fff' }}
                >
                  {isSendingManual ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  Send to Customer
                </button>
              </div>
            )}

            {!canSendManual && !isManualBlocked && !isShopOwnerTemplate && (
              <p className="text-[10px]" style={{ color: theme.textLight }}>
                Select a customer above to enable send.
              </p>
            )}
          </div>
        )}

        {manualResult && (
          <div
            className={`px-3 py-2 rounded-lg text-xs ${
              manualResult.success
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}
          >
            {manualResult.message}
            {manualResult.success && (
              <a
                href="/admin/comms/emails?view=history"
                className="block mt-1 underline font-medium"
              >
                View in Email History
              </a>
            )}
          </div>
        )}
      </section>

      {!auth.currentUser && (
        <div className="px-3 py-2 rounded-lg text-xs flex items-center gap-2 bg-yellow-100 text-yellow-800 border border-yellow-200">
          <AlertTriangle size={14} />
          You must be logged in to save templates
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

      {/* Section: Choose template */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold flex items-center gap-2 pb-1 border-b" style={{ color: theme.text, borderColor: theme.border }}>
          <Mail size={16} style={{ color: theme.primary }} />
          Email Templates
        </h2>
        <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <label className="text-xs font-semibold mb-2 flex items-center justify-between gap-2" style={{ color: theme.text }}>
            <span className="flex items-center gap-1.5">
              <Mail size={14} style={{ color: theme.primary }} />
              Choose template
            </span>
            <span className="font-normal text-[11px]" style={{ color: theme.textLight }}>
              {Object.keys(templates).length} templates
            </span>
          </label>
          <CustomDropdown
            value={selectedTemplate}
            onChange={setSelectedTemplate}
            theme={theme}
            outlined
            customShadow
            placeholder="Select a template…"
            options={TEMPLATE_SELECTOR_GROUPS.flatMap(({ label, keys }) =>
              keys
                .filter((key) => templates[key])
                .map((key) => ({
                  value: key,
                  label: templates[key].name,
                  group: label,
                }))
            )}
          />
        </div>
      </section>

      {/* Editor & Preview Grid */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold flex items-center gap-2 pb-1 border-b" style={{ color: theme.text, borderColor: theme.border }}>
          <Pencil size={16} style={{ color: theme.primary }} />
          Edit & Preview
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Editor + Colors */}
          <div className="space-y-4">
            {/* Form Editor */}
            <div
              className="rounded-2xl border overflow-hidden"
              style={{
                borderColor: theme.border,
                backgroundColor: theme.cardBackground,
                boxShadow: theme.isDark ? '0 4px 20px rgba(0,0,0,0.25)' : '0 4px 18px rgba(47,59,58,0.06)',
              }}
            >
              {/* Card header */}
              <div
                className="px-4 py-3.5 flex items-center justify-between gap-3 border-b"
                style={{ borderColor: theme.border }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : `${theme.primary}14` }}
                  >
                    <Pencil size={18} style={{ color: theme.primary }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: theme.text }}>
                      {currentTemplate.name || 'Edit template'}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: theme.textLight }}>
                      Template editor
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => sendTestEmail()}
                    disabled={isSendingTest || sendingToAll}
                    className="px-3.5 py-1.5 rounded-full text-[11px] font-semibold tracking-wide flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 hover:brightness-105 active:scale-[0.97]"
                    style={{
                      backgroundColor: theme.primary,
                      color: theme.textOnPrimary || '#fff',
                      boxShadow: theme.isDark ? '0 2px 8px rgba(0,0,0,0.35)' : `0 2px 8px ${theme.primary}40`,
                    }}
                  >
                    {isSendingTest ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send size={13} strokeWidth={2.25} />
                        Test
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={saveTemplates}
                    disabled={isSaving || !auth.currentUser}
                    className="px-3.5 py-1.5 rounded-full text-[11px] font-semibold tracking-wide flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 hover:brightness-105 active:scale-[0.97]"
                    style={{
                      backgroundColor: theme.success || '#D7806A',
                      color: '#fff',
                      boxShadow: theme.isDark ? '0 2px 8px rgba(0,0,0,0.35)' : `0 2px 8px ${(theme.success || '#D7806A')}45`,
                    }}
                  >
                    {isSaving ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : saveSuccess ? (
                      <>
                        <CheckCircle size={13} strokeWidth={2.25} />
                        Saved
                      </>
                    ) : (
                      <>
                        <Save size={13} strokeWidth={2.25} />
                        Save
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-3">
              {selectedTemplate === 'customAnnouncement' && (
                <button
                  type="button"
                  onClick={sendAnnouncementToAllUsers}
                  disabled={isSendingTest || sendingToAll}
                  className="w-full px-3 py-2 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 hover:brightness-105 transition-all disabled:opacity-50"
                  style={{ backgroundColor: theme.warning || '#f59e0b', color: '#FFFFFF' }}
                >
                  {sendingToAll ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {sendProgress.sent}/{sendProgress.total}
                    </>
                  ) : (
                    <>
                      <Users size={13} />
                      Send to ALL
                    </>
                  )}
                </button>
              )}

            {selectedTemplate === 'weeklyReminder' && (
              <div
                className="p-3 rounded-xl text-[10px] leading-relaxed border"
                style={{ backgroundColor: theme.isDark ? 'rgba(139,92,246,0.12)' : '#F3E8FF', borderColor: '#DDD6FE', color: theme.isDark ? '#C4B5FD' : '#5B21B6' }}
              >
                <strong>Live preview data</strong> from {ADMIN_WEEKLY_TEST_EMAIL}
                {weeklyPreviewLoading && ' — loading…'}
                {!weeklyPreviewLoading && weeklyPreviewData?.firstName && (
                  <> — showing as <strong>{weeklyPreviewData.firstName}</strong> ({weeklyPreviewData.summary?.thisWeekTotal ?? 0} doses this week)</>
                )}
                {!weeklyPreviewLoading && !weeklyPreviewData && (
                  <> — could not load user data. Check Firestore access.</>
                )}
                <br />
                <span style={{ opacity: 0.9 }}>Stats block is always per-user. Use <code>{'{{firstName}}'}</code> in Opening.</span>
              </div>
            )}

            {/* Content */}
            <div
              className="rounded-2xl p-3.5 space-y-3"
              style={{
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(47,59,58,0.035)',
              }}
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.textLight }}>
                Content
              </div>
              <div>
                <label className="block text-[10px] font-medium mb-1.5" style={{ color: theme.textLight }}>
                  Subject Line
                </label>
                <input
                  type="text"
                  value={currentTemplate.subject}
                  onChange={(e) => updateTemplate('subject', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2"
                  style={{
                    borderColor: theme.border,
                    backgroundColor: theme.cardBackground,
                    color: theme.text,
                    '--tw-ring-color': `${theme.primary}33`,
                  }}
                  placeholder="Email subject"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium mb-1.5" style={{ color: theme.textLight }}>
                  Heading
                </label>
                <input
                  type="text"
                  value={currentTemplate.heading}
                  onChange={(e) => updateTemplate('heading', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2"
                  style={{
                    borderColor: theme.border,
                    backgroundColor: theme.cardBackground,
                    color: theme.text,
                  }}
                  placeholder="Main heading"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium mb-1.5" style={{ color: theme.textLight }}>
                  Opening
                </label>
                <textarea
                  value={currentTemplate.greeting}
                  onChange={(e) => updateTemplate('greeting', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 resize-y"
                  style={{
                    borderColor: theme.border,
                    backgroundColor: theme.cardBackground,
                    color: theme.text,
                  }}
                  rows="2"
                  placeholder="Opening message"
                />
              </div>
              {selectedTemplate !== 'weeklyReminder' && (
                <div>
                  <label className="block text-[10px] font-medium mb-1.5" style={{ color: theme.textLight }}>
                    Message
                  </label>
                  <textarea
                    value={currentTemplate.mainMessage}
                    onChange={(e) => updateTemplate('mainMessage', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 resize-y"
                    style={{
                      borderColor: theme.border,
                      backgroundColor: theme.cardBackground,
                      color: theme.text,
                    }}
                    rows="3"
                    placeholder="Main content"
                  />
                </div>
              )}
            </div>

              {/* Highlight callout */}
              {selectedTemplate !== 'weeklyReminder' && (
                <div
                  className="rounded-2xl p-3.5 space-y-3"
                  style={{
                    backgroundColor: theme.isDark ? 'rgba(163,177,138,0.12)' : 'rgba(163,177,138,0.18)',
                  }}
                >
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.textLight }}>
                      Highlight box
                    </div>
                    <p className="text-[10px] mt-0.5" style={{ color: theme.textLight }}>
                      Sage callout above the button — leave blank to hide
                    </p>
                  </div>
                  <input
                    type="text"
                    value={currentTemplate.highlightTitle || ''}
                    onChange={(e) => updateTemplate('highlightTitle', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2"
                    style={{
                      borderColor: theme.border,
                      backgroundColor: theme.cardBackground,
                      color: theme.text,
                    }}
                    placeholder="Highlight title"
                  />
                  <textarea
                    value={currentTemplate.highlightMessage || ''}
                    onChange={(e) => updateTemplate('highlightMessage', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 resize-y"
                    style={{
                      borderColor: theme.border,
                      backgroundColor: theme.cardBackground,
                      color: theme.text,
                    }}
                    rows="2"
                    placeholder="Highlight message"
                  />
                </div>
              )}

              {/* Shop order policies */}
              {SHOP_TEMPLATE_KEYS.includes(selectedTemplate) && (
                <div
                  className="rounded-2xl p-3.5 space-y-2"
                  style={{
                    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(47,59,58,0.035)',
                  }}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.textLight }}>
                    Order policies
                  </div>
                  <p className="text-[10px]" style={{ color: theme.textLight }}>
                    Shown below the order table. Leave blank to hide.
                  </p>
                  <textarea
                    value={currentTemplate.orderPolicies || ''}
                    onChange={(e) => updateTemplate('orderPolicies', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 resize-y"
                    style={{
                      borderColor: theme.border,
                      backgroundColor: theme.cardBackground,
                      color: theme.text,
                    }}
                    rows="5"
                    placeholder="Shipping: We ship within 3–5 business days…"
                  />
                </div>
              )}

              {/* CTA */}
              <div
                className="rounded-2xl p-3.5 space-y-3"
                style={{
                  backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(47,59,58,0.035)',
                }}
              >
                <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.textLight }}>
                  Call to action
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-medium mb-1.5" style={{ color: theme.textLight }}>
                      Button Text
                    </label>
                    <input
                      type="text"
                      value={currentTemplate.ctaText}
                      onChange={(e) => updateTemplate('ctaText', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2"
                      style={{
                        borderColor: theme.border,
                        backgroundColor: theme.cardBackground,
                        color: theme.text,
                      }}
                      placeholder="Button text"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium mb-1.5" style={{ color: theme.textLight }}>
                      Button Link
                    </label>
                    <input
                      type="text"
                      value={currentTemplate.ctaLink}
                      onChange={(e) => updateTemplate('ctaLink', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2"
                      style={{
                        borderColor: theme.border,
                        backgroundColor: theme.cardBackground,
                        color: theme.text,
                      }}
                      placeholder="https://..."
                    />
                  </div>
                </div>
                {(selectedTemplate === 'weeklyReminder' || 'postCtaNote' in currentTemplate) && (
                  <div>
                    <label className="block text-[10px] font-medium mb-1.5" style={{ color: theme.textLight }}>
                      Post-CTA note <span style={{ fontWeight: 400, opacity: 0.7 }}>(HTML links OK)</span>
                    </label>
                    <textarea
                      value={currentTemplate.postCtaNote || ''}
                      onChange={(e) => updateTemplate('postCtaNote', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 resize-y"
                      style={{ borderColor: theme.border, backgroundColor: theme.cardBackground, color: theme.text }}
                      rows="2"
                      placeholder="Optional footer line"
                    />
                  </div>
                )}
              </div>

              {/* Features */}
              {selectedTemplate !== 'weeklyReminder' && (
              <div
                className="rounded-2xl p-3.5 space-y-3"
                style={{
                  backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(47,59,58,0.035)',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.textLight }}>
                    Features card
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentTemplate.showFeatures !== false}
                      onChange={(e) => updateTemplate('showFeatures', e.target.checked)}
                      className="w-3.5 h-3.5 rounded"
                    />
                    <span className="text-[10px] font-medium" style={{ color: theme.text }}>
                      {currentTemplate.showFeatures !== false ? 'Visible' : 'Hidden'}
                    </span>
                  </label>
                </div>
                  
                  {currentTemplate.showFeatures !== false && (
                    <>
                      <div>
                        <label className="block text-[10px] font-medium mb-1.5" style={{ color: theme.textLight }}>
                          Card Title
                        </label>
                        <input
                          type="text"
                          value={currentTemplate.featuresTitle || "What's waiting for you:"}
                          onChange={(e) => updateTemplate('featuresTitle', e.target.value)}
                          placeholder="What's waiting for you:"
                          className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2"
                          style={{
                            borderColor: theme.border,
                            backgroundColor: theme.cardBackground,
                            color: theme.text,
                          }}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-medium" style={{ color: theme.textLight }}>
                          Features
                        </label>
                        <button
                          type="button"
                          onClick={addFeature}
                          className="text-[10px] px-2.5 py-1 rounded-full font-semibold"
                          style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                        >
                          + Add
                        </button>
                      </div>
                    </>
                  )}
                  {currentTemplate.showFeatures !== false && (currentTemplate.features || []).map((feature, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => updateFeature(index, e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2"
                        style={{
                          borderColor: theme.border,
                          backgroundColor: theme.cardBackground,
                          color: theme.text,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeFeature(index)}
                        className="px-2.5 py-2 rounded-xl text-xs hover:opacity-80 shrink-0"
                        style={{ backgroundColor: theme.error || '#ef4444', color: '#fff' }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Available Variables */}
              <div
                className="rounded-2xl border overflow-hidden"
                style={{
                  borderColor: theme.border,
                  backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.65)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowVariablesCheatSheet(!showVariablesCheatSheet)}
                  className="w-full flex items-center justify-between text-left px-3.5 py-3 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : `${theme.primary}14` }}
                    >
                      <HelpCircle size={14} style={{ color: theme.primary }} />
                    </div>
                    <div>
                      <div className="font-semibold text-xs" style={{ color: theme.text }}>
                        Available Variables
                      </div>
                      <div className="text-[10px]" style={{ color: theme.textLight }}>
                        Copy placeholders into any field
                      </div>
                    </div>
                  </div>
                  {showVariablesCheatSheet ? (
                    <ChevronUp size={16} style={{ color: theme.textLight }} />
                  ) : (
                    <ChevronDown size={16} style={{ color: theme.textLight }} />
                  )}
                </button>

                {showVariablesCheatSheet && (
                  <div className="px-3.5 pb-3.5 border-t" style={{ borderColor: theme.border }}>
                    <div className="pt-3">
                    {templateVariables[selectedTemplate] && templateVariables[selectedTemplate].length > 0 ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {templateVariables[selectedTemplate].map((variable, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 rounded-xl border"
                              style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
                            >
                              <div className="flex items-center gap-1.5 mb-1">
                                <code
                                  className="px-1.5 py-0.5 rounded-md text-[10px] font-mono"
                                  style={{ backgroundColor: theme.primary + '20', color: theme.primary }}
                                >
                                  %{variable.name}%
                                </code>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(`%${variable.name}%`);
                                    window.dispatchEvent(new CustomEvent('tpp:toast', {
                                      detail: { message: 'Copied!', type: 'success' },
                                    }));
                                  }}
                                  className="text-[10px] px-1.5 py-0.5 rounded-md hover:opacity-80"
                                  style={{ backgroundColor: theme.secondary, color: theme.text }}
                                >
                                  <Copy size={10} />
                                </button>
                              </div>
                              <p className="text-[10px] leading-snug" style={{ color: theme.textLight }}>
                                {variable.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs" style={{ color: theme.textLight }}>
                        This template doesn&apos;t have dynamic variables.
                      </p>
                    )}
                    </div>
                  </div>
                )}
              </div>
              </div>
          </div>

        </div>

        {/* Right: Preview */}
        <div className="sticky top-4">
          <div
            className="p-4 rounded-2xl border"
            style={{
              borderColor: theme.border,
              backgroundColor: theme.cardBackground,
              boxShadow: theme.isDark ? '0 4px 20px rgba(0,0,0,0.25)' : '0 4px 18px rgba(47,59,58,0.06)',
            }}
          >
            <h3 className="text-xs font-semibold mb-3 flex items-center justify-between uppercase tracking-wider" style={{ color: theme.textLight }}>
              <span className="flex items-center gap-1.5">
                <Eye size={12} style={{ color: theme.primary }} />
                Preview
                {previewLoading && (
                  <Loader2 size={12} className="animate-spin" style={{ color: theme.primary }} />
                )}
              </span>
              <button
                onClick={refreshPreview}
                className="text-xs px-2.5 py-1 rounded-full hover:opacity-80 flex items-center gap-1"
                style={{
                  color: theme.primary,
                  backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : `${theme.primary}12`,
                }}
                title="Refresh preview"
              >
                <RefreshCw size={12} />
                Refresh
              </button>
            </h3>
            <iframe
              srcDoc={previewHtml}
              className="w-full rounded-xl border"
              style={{ height: '600px', borderColor: theme.border, opacity: previewLoading ? 0.6 : 1 }}
              title="Email Preview"
            />
            <p className="text-xs mt-2.5 text-center" style={{ color: theme.textLight }}>
              <CheckCircle size={12} className="inline mr-1 align-text-bottom" style={{ color: theme.success }} />
              {selectedTemplate === 'weeklyReminder'
                ? `Preview uses live data from ${ADMIN_WEEKLY_TEST_EMAIL}`
                : 'Preview from backend — what you see is what gets sent'}
            </p>
          </div>
        </div>
      </div>
      </section>

    </div>
  );
}

