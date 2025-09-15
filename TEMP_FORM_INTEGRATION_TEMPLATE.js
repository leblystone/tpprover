// Template for your Google Form integration
// I'll use this once you provide the field IDs

const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfpJ4cqo0ND5Yz_KOZqpRL2xXVGtNCWA91XNtEIkYsVOg5sBg/formResponse';

const submitToGoogleForm = async (data) => {
  const formDataToSubmit = new FormData();
  
  // Replace these with your actual entry IDs:
  formDataToSubmit.append('entry.PHASE_FIELD_ID', 'Phase 1'); // Or 'Phase 2'
  formDataToSubmit.append('entry.EMAIL_FIELD_ID', data.email);
  // Add more fields as you provide the IDs...
  
  await fetch(GOOGLE_FORM_URL, {
    method: 'POST',
    mode: 'no-cors',
    body: formDataToSubmit
  });
};
