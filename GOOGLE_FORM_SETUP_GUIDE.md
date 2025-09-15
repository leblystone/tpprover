# Google Form Integration Setup Guide

## Overview
Your Google Form has been integrated into the app! Here's how to complete the setup with your actual form details.

## Step 1: Get Your Form's Public URL

Your edit URL: `https://docs.google.com/forms/d/15R4aJoBOA7QWHdFfH7M9deaJaxl2CI5lbrLRfUh6n8Q/edit`

**Convert to public URL:**
- Public URL: `https://docs.google.com/forms/d/15R4aJoBOA7QWHdFfH7M9deaJaxl2CI5lbrLRfUh6n8Q/viewform`
- Submission URL: `https://docs.google.com/forms/d/e/1FAIpQLSfpJ4cqo0ND5Yz_KOZqpRL2xXVGtNCWA91XNtEIkYsVOg5sBg/formResponse`

## Step 2: Extract Form Field IDs

1. **Open the public form** in your browser: 
   ```
   https://docs.google.com/forms/d/15R4aJoBOA7QWHdFfH7M9deaJaxl2CI5lbrLRfUh6n8Q/viewform
   ```

2. **Right-click and select "Inspect"** (or press F12)

3. **Find the form fields** - Look for `<input>` elements with `name` attributes like:
   ```html
   <input name="entry.123456789" type="text">
   <input name="entry.987654321" type="email">
   <textarea name="entry.456789123"></textarea>
   ```

4. **Map each question to its entry ID:**

## Step 3: Update the Configuration

Edit `src/services/googleForm.js` and update these sections:

### Update the Form URLs
```javascript
const FORM_CONFIG = {
  formId: '15R4aJoBOA7QWHdFfH7M9deaJaxl2CI5lbrLRfUh6n8Q',
  
  get submitUrl() {
    return `https://docs.google.com/forms/d/e/1FAIpQLSfpJ4cqo0ND5Yz_KOZqpRL2xXVGtNCWA91XNtEIkYsVOg5sBg/formResponse`;
  },
```

### Update the Field Mappings
Replace the example entry IDs with your actual ones:

```javascript
fields: {
  phase: 'entry.XXXXXXXXX',           // "Which phase of The Pep Planner are you participating in?"
  email: 'entry.YYYYYYYYY',           // "What is the email you used to sign up at The Pep Planner?"
  overallExperience: 'entry.ZZZZZZZZZ',
  mostUsefulFeature: 'entry.AAAAAAAAA',
  suggestedImprovements: 'entry.BBBBBBBBB',
  recommendToOthers: 'entry.CCCCCCCCC',
  additionalComments: 'entry.DDDDDDDDD',
  favoriteFeatures: 'entry.EEEEEEEEE',
  // Add more fields as needed for your 15-page form
}
```

## Step 4: Add All Your Form Questions

Since your form has 15 pages, you'll need to:

1. **Go through each page** of your Google Form
2. **Note down every question** and its corresponding entry ID
3. **Update the `FORM_QUESTIONS` array** in `googleForm.js`
4. **Update the `formData` state** in `BetaClosed.jsx`
5. **Add form fields** to the JSX in `BetaClosed.jsx`

### Example Question Structure:
```javascript
{
  id: 'yourFieldName',
  question: 'Your actual question text?',
  type: 'multiple_choice', // or 'text', 'textarea', 'email', 'rating', etc.
  required: true,
  options: ['Option 1', 'Option 2', 'Option 3'] // for multiple choice
}
```

## Step 5: Test the Integration

1. **Open your app** after Sept 21st (or temporarily change the beta end date for testing)
2. **Fill out the survey form**
3. **Check the browser console** for any errors
4. **Verify submission** by checking your Google Form responses

## Quick Setup Script

Here's a browser console script to help extract form field IDs:

```javascript
// Run this in the browser console on your Google Form's public page
const inputs = document.querySelectorAll('input[name^="entry."], textarea[name^="entry."], select[name^="entry."]');
const fields = {};
inputs.forEach((input, index) => {
  const label = input.closest('[data-params]')?.querySelector('[data-params*="0,1"]')?.textContent || `Question ${index + 1}`;
  fields[input.name] = label.trim();
});
console.table(fields);
```

## Current Status

✅ **Completed:**
- Google Form service created (`src/services/googleForm.js`)
- BetaClosed.jsx updated to use the service
- Form validation added
- Basic form structure implemented

⏳ **Needs Your Input:**
- Actual Google Form entry IDs
- All 15 pages of questions mapped
- Testing with real form submission

## Next Steps

1. **Get the entry IDs** from your form's HTML
2. **Update the configuration** in `googleForm.js`
3. **Add all your questions** to both the config and the form UI
4. **Test the submission** works correctly

Would you like me to help with any specific part of this setup?
