/**
 * Google Form Integration Service
 * 
 * This service handles submitting data to your Google Form.
 * You'll need to configure FORM_CONFIG with your actual form details.
 */

// TODO: Replace with your actual Google Form configuration
const FORM_CONFIG = {
  // Your form ID from the URL: https://docs.google.com/forms/d/15R4aJoBOA7QWHdFfH7M9deaJaxl2CI5lbrLRfUh6n8Q/viewform
  formId: '15R4aJoBOA7QWHdFfH7M9deaJaxl2CI5lbrLRfUh6n8Q',
  
  // Form submission URL (extracted from your actual form)
  get submitUrl() {
    return `https://docs.google.com/forms/u/0/d/e/1FAIpQLSfpJ4cqo0ND5Yz_KOZqpRL2xXVGtNCWA91XNtEIkYsVOg5sBg/formResponse`;
  },
  
  // Field mappings - you'll need to replace these with actual entry IDs from your form
  // To get these: Navigate through each page of your form and run the extraction script
  fields: {
    // Confirmed entry IDs from your form
    phase: 'entry.2069441371',          // "Which phase of The Pep Planner are you participating in?"
    
    // TODO: Replace these placeholder entry IDs with actual ones from your form
    // You'll need to navigate through each page and extract the real entry IDs
    email: 'entry.PLACEHOLDER_EMAIL',
    firstImpression: 'entry.PLACEHOLDER_FIRST',
    onboardingExperience: 'entry.PLACEHOLDER_ONBOARD',
    dashboardContent: 'entry.PLACEHOLDER_DASH',
    dashboardInfo: 'entry.PLACEHOLDER_DASHINFO',
    navigationEase: 'entry.PLACEHOLDER_NAV',
    firstActions: 'entry.PLACEHOLDER_ACTIONS',
    confusingTerms: 'entry.PLACEHOLDER_CONFUSE',
    firstProtocol: 'entry.PLACEHOLDER_PROTO1',
    protocolFields: 'entry.PLACEHOLDER_PROTOFIELDS',
    protocolManagement: 'entry.PLACEHOLDER_PROTOMGMT',
    vendorProcess: 'entry.PLACEHOLDER_VENDOR',
    orderTracking: 'entry.PLACEHOLDER_ORDER',
    orderInformation: 'entry.PLACEHOLDER_ORDERINFO',
    upcomingBuys: 'entry.PLACEHOLDER_UPCOMING',
    dataSection: 'entry.PLACEHOLDER_DATA',
    dataPoints: 'entry.PLACEHOLDER_DATAPOINTS',
    dataVisualization: 'entry.PLACEHOLDER_DATAVIZ',
    scheduleLogic: 'entry.PLACEHOLDER_SCHEDULE',
    calendarUsage: 'entry.PLACEHOLDER_CALENDAR',
    calendarFeatures: 'entry.PLACEHOLDER_CALFEATURES',
    stockpileLogic: 'entry.PLACEHOLDER_STOCKPILE',
    incomingFeature: 'entry.PLACEHOLDER_INCOMING',
    autopopulateFeature: 'entry.PLACEHOLDER_AUTOPOP',
    reconCalculator: 'entry.PLACEHOLDER_RECON',
    importFeature: 'entry.PLACEHOLDER_IMPORT',
    glossary: 'entry.PLACEHOLDER_GLOSSARY',
    designThoughts: 'entry.PLACEHOLDER_DESIGN',
    userExperience: 'entry.PLACEHOLDER_UX',
    clutterAreas: 'entry.PLACEHOLDER_CLUTTER',
    themePreference: 'entry.PLACEHOLDER_THEME',
    performanceIssues: 'entry.PLACEHOLDER_PERF',
    crashesErrors: 'entry.PLACEHOLDER_CRASHES',
    bugsGlitches: 'entry.PLACEHOLDER_BUGS',
    appImpact: 'entry.PLACEHOLDER_IMPACT',
    currentMethod: 'entry.PLACEHOLDER_CURRENT',
    essentialRating: 'entry.PLACEHOLDER_ESSENTIAL',
    recommendation: 'entry.PLACEHOLDER_RECOMMEND',
    paymentPreference: 'entry.PLACEHOLDER_PAYMENT',
    paymentStyle: 'entry.PLACEHOLDER_PAYSTYLE',
    monthlyAwesome: 'entry.PLACEHOLDER_MONTHLYAWESOME',
    monthlyTooMuch: 'entry.PLACEHOLDER_MONTHLYTOOMUCH',
    annualAttractive: 'entry.PLACEHOLDER_ANNUALATTRACT',
    annualMax: 'entry.PLACEHOLDER_ANNUALMAX',
    lifetimeMonths: 'entry.PLACEHOLDER_LIFEMONTHS',
    lifetimeMax: 'entry.PLACEHOLDER_LIFEMAX',
    trialPreference: 'entry.PLACEHOLDER_TRIAL',
    ahaFeature: 'entry.PLACEHOLDER_AHA',
    mostValuableFeature: 'entry.PLACEHOLDER_VALUABLE',
    mostFrustrating: 'entry.PLACEHOLDER_FRUSTRATING',
    wishList: 'entry.PLACEHOLDER_WISHLIST'
  }
};

/**
 * Submit data to Google Form
 * @param {Object} formData - The form data to submit
 * @returns {Promise<boolean>} - Success status
 */
export async function submitToGoogleForm(formData) {
  try {
    // Create FormData object for submission
    const submitData = new FormData();
    
    // Map our form data to Google Form entry IDs
    Object.keys(formData).forEach(key => {
      const entryId = FORM_CONFIG.fields[key];
      if (entryId && formData[key]) {
        submitData.append(entryId, formData[key]);
      }
    });
    
    // Submit to Google Form
    const response = await fetch(FORM_CONFIG.submitUrl, {
      method: 'POST',
      mode: 'no-cors', // Required for Google Forms
      body: submitData
    });
    
    // Note: With no-cors mode, we can't read the response
    // We'll assume success if no error was thrown
    console.log('Form submitted successfully to Google Forms');
    return true;
    
  } catch (error) {
    console.error('Error submitting to Google Form:', error);
    return false;
  }
}

/**
 * Complete Beta Testing Questionnaire - 49 Questions
 * Based on your comprehensive Google Form survey
 */
export const FORM_QUESTIONS = [
  // Basic Info
  {
    id: 'phase',
    question: 'Which phase of The Pep Planner are you participating in?',
    type: 'multiple_choice',
    required: true,
    options: ['Beta Testing Phase 1', 'Beta Testing Phase 2', 'Early Access', 'Other']
  },
  {
    id: 'email',
    question: 'What is the email you used to sign up at The Pep Planner?',
    type: 'email',
    required: true
  },
  
  // Initial Impressions
  {
    id: 'firstImpression',
    question: 'What was your very first impression when you opened the app?',
    type: 'textarea',
    required: false
  },
  {
    id: 'onboardingExperience',
    question: 'Did you go through the onboarding (tour) process? If so, was it helpful? What could be improved?',
    type: 'textarea',
    required: false
  },
  
  // Dashboard & Navigation
  {
    id: 'dashboardContent',
    question: 'How useful was the content in the dashboard for you?',
    type: 'multiple_choice',
    required: false,
    options: ['Useful!', 'Not enough info for a Dashboard', 'Too much!']
  },
  {
    id: 'dashboardInfo',
    question: 'Is there any information you\'d like to see added or removed from the dashboard?',
    type: 'textarea',
    required: false
  },
  {
    id: 'navigationEase',
    question: 'Was it easy or difficult to find your way around from the menu?',
    type: 'multiple_choice',
    required: false,
    options: ['Very easy!', 'Difficult!']
  },
  {
    id: 'firstActions',
    question: 'What were the first things you tried to do in the app? Were you able to do them easily without issue or feeling confused?',
    type: 'textarea',
    required: false
  },
  {
    id: 'confusingTerms',
    question: 'Were there any icons, labels, or terms that you found confusing?',
    type: 'textarea',
    required: false
  },
  
  // Protocol Management
  {
    id: 'firstProtocol',
    question: 'How was it creating your first protocol? Did you utilize the import function or manually enter?',
    type: 'textarea',
    required: false
  },
  {
    id: 'protocolFields',
    question: 'Does the protocols section have all the field and options your need? If not, what\'s missing?',
    type: 'textarea',
    required: false
  },
  {
    id: 'protocolManagement',
    question: 'How easy is it to view, edit, and manage your protocols in the app?',
    type: 'rating',
    required: false,
    scale: 5,
    scaleLabels: ['Difficult', 'Very Easy']
  },
  
  // Vendor & Order Management
  {
    id: 'vendorProcess',
    question: 'Was any part of the process to add/edit a vendor unclear?',
    type: 'textarea',
    required: false
  },
  {
    id: 'orderTracking',
    question: 'How well does the app help track orders from various vendors? Are the labels clear?',
    type: 'textarea',
    required: false
  },
  {
    id: 'orderInformation',
    question: 'Is the information in the order section clear and sufficient? Any information missing?',
    type: 'textarea',
    required: false
  },
  {
    id: 'upcomingBuys',
    question: 'How helpful is the "Upcoming Buys" feature on the dashboard and Group Buy tab on the Orders page?',
    type: 'multiple_choice',
    required: false,
    options: ['Very helpful.', 'Not my thing!']
  },
  
  // Research & Data Logging
  {
    id: 'dataSection',
    question: 'Do you find the supplements, body metrics, and goals section to be helpful?',
    type: 'multiple_choice',
    required: false,
    options: ['Yes!', 'No']
  },
  {
    id: 'dataPoints',
    question: 'Is the app capturing all of the data points you need for your research? If not, what would you add?',
    type: 'textarea',
    required: false
  },
  {
    id: 'dataVisualization',
    question: 'How do you feel about the way your research data and progress are visualized in the analytics tab?',
    type: 'textarea',
    required: false
  },
  
  // Calendar & Scheduling
  {
    id: 'scheduleLogic',
    question: 'Were you able to quickly understand the logic of how starting a protocol would schedule your peptide research for you?',
    type: 'multiple_choice',
    required: false,
    options: ['Yes', 'No']
  },
  {
    id: 'calendarUsage',
    question: 'How are you using the calendar feature?',
    type: 'multiple_choice',
    required: false,
    options: ['Monthly View only', 'Weekly view only', 'Both']
  },
  {
    id: 'calendarFeatures',
    question: 'Do you think the calendar needs more interactive features? If so, what kind?',
    type: 'textarea',
    required: false
  },
  
  // Stockpile
  {
    id: 'stockpileLogic',
    question: 'Did you have a hard time figuring out the logic of how the orders, stockpile, and reconstitution features work together?',
    type: 'multiple_choice',
    required: false,
    options: ['Easy to figure out!', 'I didn\'t realize they synced.']
  },
  {
    id: 'incomingFeature',
    question: 'Currently a new entered order that has not yet been delivered will show in your stockpile as "Incoming", once marked as delivered it will automatically transfer to your In Stock Peptides. Is this feature helpful, confusing, or irrelevant? Why or why not?',
    type: 'textarea',
    required: false
  },
  {
    id: 'autopopulateFeature',
    question: 'Incoming peptides allows for users to utilize one certain peptide from a specific vendor; this info will autopopulate into the recon calculator for easy reconstitution and tracking. Was this feature helpful? Why or why not?',
    type: 'textarea',
    required: false
  },
  
  // Specific Tools
  {
    id: 'reconCalculator',
    question: 'Did you utilize the calculator, was it easy to use? Do you prefer other calculators over this one? Do you trust its calculations?',
    type: 'textarea',
    required: false
  },
  {
    id: 'importFeature',
    question: 'Did you utilize the import feature? How well did it work? What kinds of documents or images did you try to import? Did the app recognize the writing and/or data correctly?',
    type: 'textarea',
    required: false
  },
  {
    id: 'glossary',
    question: 'Have you used the glossary? Was the information helpful and easy to access when you needed it?',
    type: 'textarea',
    required: false
  },
  
  // Design & Feel
  {
    id: 'designThoughts',
    question: 'What are your general thoughts on the app\'s design, colors, and layout?',
    type: 'textarea',
    required: false
  },
  {
    id: 'userExperience',
    question: 'Would you describe your experience as a smooth and intuitive design or clunky and confusing? Why?',
    type: 'textarea',
    required: false
  },
  {
    id: 'clutterAreas',
    question: 'Are there any parts of the app that feel cluttered, empty, or too difficult?',
    type: 'textarea',
    required: false
  },
  {
    id: 'themePreference',
    question: 'Currently there are 3 themes to choose from, would you like to see a lot more or it doesn\'t matter?',
    type: 'multiple_choice',
    required: false,
    options: ['A lot more!', 'It\'s fine the way it is.']
  },
  
  // Performance
  {
    id: 'performanceIssues',
    question: 'Did you notice any slowness or lagging while using the app? If so, what were you doing?',
    type: 'textarea',
    required: false
  },
  {
    id: 'crashesErrors',
    question: 'Did the app crash, freeze, or show any error messages? If so, can you describe what happened?',
    type: 'textarea',
    required: false
  },
  {
    id: 'bugsGlitches',
    question: 'Did you encounter any bugs or weird visual glitches?',
    type: 'textarea',
    required: false
  },
  
  // Overall Usefulness
  {
    id: 'appImpact',
    question: 'How has this app changed how you manage your protocols and supplies? What\'s the biggest benefit you\'ve seen?',
    type: 'textarea',
    required: false
  },
  {
    id: 'currentMethod',
    question: 'What do you currently use to track your research? Imagine you had to go back to your old method (e.g., spreadsheets, notebooks, memory). How much of a hassle would that be?',
    type: 'textarea',
    required: false
  },
  {
    id: 'essentialRating',
    question: 'On a scale of 1-10, how essential is this app to your routine now?',
    type: 'rating',
    required: false,
    scale: 10,
    scaleLabels: ['Not essential to my research!', 'I can\'t imagine research without it!']
  },
  {
    id: 'recommendation',
    question: 'If someone in the peptide community asked for a new tracking method, would you recommend this app?',
    type: 'textarea',
    required: false
  },
  
  // Pricing Questions
  {
    id: 'paymentPreference',
    question: 'We plan to offer the app with full, unlimited access. The only choice will be how you\'d like to pay for it. We\'re thinking of three options: a flexible monthly subscription, a discounted annual subscription, or a one-time payment for lifetime access. What would you choose if you had to?',
    type: 'multiple_choice',
    required: false,
    options: ['Flexible Monthly', 'Discounted Annual', 'One Time Payment for Lifetime Access']
  },
  {
    id: 'paymentStyle',
    question: 'Do you generally prefer to "pay-as-you-go" with monthly subscriptions, or do you prefer to "set it and forget it" with a one-time or annual payment?',
    type: 'multiple_choice',
    required: false,
    options: ['Pay as you go/ pay as you need', 'Set it and forget it👨🏻‍🍳']
  },
  {
    id: 'monthlyAwesome',
    question: 'What monthly price would you consider this app an awesome deal?',
    type: 'text',
    required: false
  },
  {
    id: 'monthlyTooMuch',
    question: 'At what monthly price would you say, "No way, I\'ll save it for my peptides!"',
    type: 'text',
    required: false
  },
  {
    id: 'annualAttractive',
    question: 'What annual price would be attractive enough for you to commit to the year?',
    type: 'text',
    required: false
  },
  {
    id: 'annualMax',
    question: 'What is the max you\'d be willing to pay for a one-year subscription?',
    type: 'text',
    required: false
  },
  {
    id: 'lifetimeMonths',
    question: 'How many months of a subscription would you expect a lifetime deal to be worth? 2 years? 4 years? Less? More?!',
    type: 'text',
    required: false
  },
  {
    id: 'lifetimeMax',
    question: 'What is the absolute most you\'d be willing to pay to buy this app once and own it forever?',
    type: 'text',
    required: false
  },
  {
    id: 'trialPreference',
    question: 'We want to offer a free trial so researchers can see if the app is right for them. What feels like a fairer trial?',
    type: 'multiple_choice',
    required: false,
    options: ['Trial Option 1', 'Trial Option 2']
  },
  
  // Closing Thoughts
  {
    id: 'ahaFeature',
    question: 'What is the single most important "aha!" moment or feature that a new user must experience during a trial to convince them to subscribe?',
    type: 'textarea',
    required: false
  },
  {
    id: 'mostValuableFeature',
    question: 'What is the single most valuable feature in this app for you, and why?',
    type: 'textarea',
    required: false
  },
  {
    id: 'mostFrustrating',
    question: 'What is the most frustrating part of the app?',
    type: 'textarea',
    required: false
  },
  {
    id: 'wishList',
    question: 'Is there anything you wish the app could do that it currently doesn\'t?',
    type: 'textarea',
    required: false
  }
];

/**
 * Validate form data before submission
 * @param {Object} formData - The form data to validate
 * @returns {Object} - Validation result with isValid and errors
 */
export function validateFormData(formData) {
  const errors = {};
  let isValid = true;
  
  // Check required fields
  FORM_QUESTIONS.forEach(question => {
    if (question.required && (!formData[question.id] || formData[question.id].trim() === '')) {
      errors[question.id] = `${question.question} is required`;
      isValid = false;
    }
    
    // Validate email format
    if (question.type === 'email' && formData[question.id]) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData[question.id])) {
        errors[question.id] = 'Please enter a valid email address';
        isValid = false;
      }
    }
  });
  
  return { isValid, errors };
}

export default {
  submitToGoogleForm,
  validateFormData,
  FORM_QUESTIONS,
  FORM_CONFIG
};
