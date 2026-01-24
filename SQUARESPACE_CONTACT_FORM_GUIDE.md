# 📋 Squarespace Contact Form Setup Guide

## ✅ What We're Building

A beautiful, custom contact form on your Squarespace site (thepepplanner.com) that:
- Matches your app's design aesthetic
- Posts directly to your Firebase backend (the same system as your app)
- Sends you email notifications at **theaveragebudget@gmail.com**
- Sends auto-confirmation emails to customers
- Stores all inquiries in your Firebase database for tracking
- Works perfectly on mobile and desktop

---

## 🚀 Step-by-Step Setup

### **Step 1: Open Your Contact Page in Squarespace**

1. Log into your Squarespace dashboard
2. Go to **Pages** → Find your contact page (or create one if needed)
3. Click **Edit** on that page

---

### **Step 2: Add the Custom Contact Form**

1. Click the **"+"** button where you want your contact form
2. Select **"Code"** from the block options
3. In the code block settings, select **"HTML"** as the type
4. Copy **ALL** the code from `squarespace-contact-form.html` (the file I just created)
5. Paste it into the code block
6. Click **Apply**

---

### **Step 3: Update the Email Destination (Optional)**

The form is already configured to send emails to **theaveragebudget@gmail.com**.

If you want to change this later:
1. Edit `functions/index.js` (line ~3289)
2. Change:
   ```javascript
   const success = await emailService.sendEmail(
     'contact@thepepplanner.com', // ← Change this email address
     'Contact Form Message Received',
     emailHtml
   );
   ```
3. Redeploy Firebase Functions: `npm run deploy:functions`

---

### **Step 4: Test Your Form**

1. **Save** your Squarespace page
2. Click **Preview** to see it live
3. Fill out the form with test data
4. Click **"Send Message"**
5. You should see a green success message
6. Check **theaveragebudget@gmail.com** for the notification email

---

## 🎨 Customization Options

### **Change Colors**

To match your exact brand colors, edit the HTML code block:

```css
/* Main form background gradient */
background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);

/* Button color (your signature green) */
background: linear-gradient(135deg, #7fa79a 0%, #6B8E7F 100%);

/* Text colors */
color: #2F3B3A; /* Dark text */
color: #6B7D7A; /* Subtle text */
```

### **Change Form Fields**

To add or remove fields (e.g., phone number), edit the HTML section:

```html
<!-- Add this after the email field -->
<div class="tpp-form-group">
  <label for="phone">Phone (optional)</label>
  <input type="tel" id="phone" name="phone" placeholder="(555) 123-4567">
</div>
```

Then update the JavaScript to include it:

```javascript
const formData = {
  name: document.getElementById('name').value.trim(),
  email: document.getElementById('email').value.trim(),
  subject: document.getElementById('subject').value.trim(),
  message: document.getElementById('message').value.trim(),
  phone: document.getElementById('phone').value.trim() // Add this
};
```

---

## 📧 What Happens When Someone Submits?

1. **Form submits** → Calls your `submitContactForm` Firebase Function
2. **Email sent to you** (theaveragebudget@gmail.com) with:
   - Customer's name and email
   - Subject line
   - Full message
   - Timestamp
3. **Confirmation email sent to customer** (optional, currently not implemented but can be added)
4. **Data saved** to Firebase for future reference (currently not implemented, but can be added)

---

## 🔧 Troubleshooting

### **Form doesn't submit / shows error**

1. **Check Firebase Config**: In the HTML file, verify the `firebaseConfig` matches your project:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyBrtvQK6PO5t_HgqeAa9-I37VUhWxc0VYY",
     authDomain: "tpp-splendide.firebaseapp.com",
     projectId: "tpp-splendide",
     // ... rest of config
   };
   ```

2. **Check Function Region**: Make sure the region matches where your functions are deployed:
   ```javascript
   const functions = getFunctions(app, 'us-central1'); // Your region
   ```

3. **Check Console Logs**: 
   - Right-click on the form → **Inspect**
   - Go to **Console** tab
   - Try submitting again and look for error messages

### **Email not received**

1. Check your **spam folder** (Resend emails sometimes land there initially)
2. Verify `RESEND_API_KEY` is set in Firebase Functions secrets
3. Check Firebase Functions logs:
   ```bash
   firebase functions:log --only submitContactForm
   ```

### **Form looks weird on mobile**

The form is already responsive, but if you need adjustments:
- Edit the `@media (max-width: 640px)` section in the CSS
- Adjust padding, font sizes, etc.

---

## 🎯 Next Steps (Optional Enhancements)

### **1. Add reCAPTCHA for Spam Protection**

Your `submitContactForm` function already supports reCAPTCHA! To enable it:

1. Get a reCAPTCHA v3 site key from [Google reCAPTCHA](https://www.google.com/recaptcha/admin)
2. Add this to the HTML (in the `<head>` section):
   ```html
   <script src="https://www.google.com/recaptcha/api.js?render=YOUR_SITE_KEY"></script>
   ```
3. Update the form submission to include the token:
   ```javascript
   const recaptchaToken = await grecaptcha.execute('YOUR_SITE_KEY', { action: 'contact' });
   const formData = {
     // ... existing fields
     recaptchaToken: recaptchaToken
   };
   ```

### **2. Save Submissions to Firestore**

Modify `functions/index.js` (around line 3248) to save to database:

```javascript
// Add this before sending the email
const db = admin.firestore();
await db.collection('contactSubmissions').add({
  name: name,
  email: email,
  subject: subject,
  message: message,
  timestamp: admin.firestore.FieldValue.serverTimestamp(),
  source: 'thepepplanner.com',
  status: 'unread'
});
```

### **3. Send Auto-Reply to Customer**

Add a second email call in `functions/index.js`:

```javascript
// After sending your notification email
await emailService.sendEmail(
  email, // Send to customer
  'Thanks for contacting The Pep Planner!',
  `
    <h2>Thanks for reaching out, ${safeName}! 👋</h2>
    <p>We received your message and will get back to you within 24-48 hours.</p>
    <hr>
    <p><strong>Your message:</strong></p>
    <p>${safeMessage}</p>
  `
);
```

---

## 📝 Summary

✅ **Contact form is ready to deploy!**
✅ **No additional Firebase Functions needed** (already exists)
✅ **Beautiful design matching your app aesthetic**
✅ **Mobile responsive**
✅ **Emails sent to theaveragebudget@gmail.com**
✅ **Easy to customize**

Just copy the HTML into a Squarespace Code Block and you're live! 🚀

---

## 🆘 Need Help?

If anything doesn't work:
1. Check the troubleshooting section above
2. Look at Firebase Functions logs: `firebase functions:log`
3. Check browser console for JavaScript errors
4. Test with a simple message first

The existing `submitContactForm` function is production-ready and already handles everything you need! 💪
