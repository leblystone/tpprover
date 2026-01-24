# 📧 Squarespace Contact Form - What You're Getting

## ✨ **Live Preview**

### Desktop View
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│              📧 Get in Touch                            │
│    Have a question about our physical planners?         │
│              We're here to help!                        │
│                                                         │
│  ┌───────────────────────────────────────────────┐     │
│  │ Name *                                        │     │
│  │ [Your name                               ]    │     │
│  └───────────────────────────────────────────────┘     │
│                                                         │
│  ┌───────────────────────────────────────────────┐     │
│  │ Email *                                       │     │
│  │ [your@email.com                          ]    │     │
│  └───────────────────────────────────────────────┘     │
│                                                         │
│  ┌───────────────────────────────────────────────┐     │
│  │ Subject *                                     │     │
│  │ [What's this about?                      ]    │     │
│  └───────────────────────────────────────────────┘     │
│                                                         │
│  ┌───────────────────────────────────────────────┐     │
│  │ Message *                                     │     │
│  │ [Tell us what's on your mind...          ]    │     │
│  │                                               │     │
│  │                                               │     │
│  │                                               │     │
│  └───────────────────────────────────────────────┘     │
│                                                         │
│  ┌───────────────────────────────────────────────┐     │
│  │         🚀 Send Message                       │     │
│  └───────────────────────────────────────────────┘     │
│                                                         │
│  ┌───────────────────────────────────────────────┐     │
│  │ ✅ Message sent successfully!                 │     │
│  │    We'll get back to you soon.                │     │
│  └───────────────────────────────────────────────┘     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 **Design Features**

### ✅ **Modern Gradient Background**
- Soft blue-gray gradient (like your app)
- Professional and calming aesthetic
- Subtle shadow for depth

### ✅ **Clean Input Fields**
- Large, easy-to-tap inputs (perfect for mobile)
- Smooth focus animations with your signature green (#7fa79a)
- Clear placeholder text
- Proper validation with red asterisks for required fields

### ✅ **Beautiful Button**
- Your brand green gradient (#7fa79a → #6B8E7F)
- Hover effect (lifts up slightly)
- Disabled state while submitting
- Loading text ("Sending...")

### ✅ **Success/Error Messages**
- Animated slide-in
- Green for success, red for errors
- Auto-dismisses after 5 seconds
- Clear, friendly messaging

---

## 📱 **Mobile Responsive**

On phones, the form automatically:
- Reduces padding for smaller screens
- Adjusts font sizes
- Maintains easy-to-tap buttons (48px minimum)
- Stacks nicely without horizontal scrolling

---

## 🔄 **What Happens on Submit**

### **Step 1: User Fills Form**
```
Name: John Doe
Email: john@example.com
Subject: Question about digital planner
Message: Do you offer bulk discounts?
```

### **Step 2: Form Validation**
- ✅ All required fields filled?
- ✅ Valid email format?
- ✅ Not a bot?

### **Step 3: Submit to Firebase**
```javascript
submitContactForm({
  name: "John Doe",
  email: "john@example.com",
  subject: "Question about digital planner",
  message: "Do you offer bulk discounts?"
})
```

### **Step 4: Email Sent to You**
**To:** theaveragebudget@gmail.com  
**Subject:** Contact Form: Question about digital planner

```html
┌──────────────────────────────────────┐
│ Contact Form Message Received       │
├──────────────────────────────────────┤
│ From: John Doe                       │
│ Email: john@example.com              │
│ Subject: Question about digital      │
│          planner                     │
├──────────────────────────────────────┤
│ ┌────────────────────────────────┐   │
│ │ Do you offer bulk discounts?   │   │
│ └────────────────────────────────┘   │
├──────────────────────────────────────┤
│ This message was sent from The Pep   │
│ Planner contact form.                │
└──────────────────────────────────────┘
```

### **Step 5: Success Message**
User sees:
```
┌────────────────────────────────────────┐
│ ✅ Message sent successfully!          │
│    We'll get back to you soon.         │
└────────────────────────────────────────┘
```

Form resets automatically.

---

## 🚀 **How to Add to Squarespace**

### **Quick Steps:**

1. **Open your contact page** in Squarespace editor
2. Click the **"+" button** where you want the form
3. Select **"Code"** block
4. Copy ALL code from `squarespace-contact-form.html`
5. Paste it in
6. Click **"Apply"**
7. Save and publish! 🎉

**That's it!** The form will work immediately because your Firebase function is already deployed.

---

## 🎯 **Key Benefits**

✅ **Uses your existing backend** - Same system as your app  
✅ **No third-party tools** - No Typeform, no JotForm, no monthly fees  
✅ **You own the data** - Everything in Firebase  
✅ **Fast and reliable** - Firebase Functions auto-scale  
✅ **Email notifications** - Instant alerts to your inbox  
✅ **Mobile-first design** - Beautiful on all devices  
✅ **Easy to customize** - Change colors, fields, text  
✅ **Spam protection ready** - reCAPTCHA support built-in (optional)  

---

## 🔧 **Customization Examples**

### **Change Button Text**
```html
<button type="submit" class="tpp-submit-btn" id="submitBtn">
  Let's Chat! 💬  <!-- Change this -->
</button>
```

### **Change Success Message**
```javascript
statusMessage.innerHTML = `
  <div class="tpp-message success">
    🎉 Got it! We'll email you back ASAP.  <!-- Change this -->
  </div>
`;
```

### **Change Form Title**
```html
<h2>📧 Get in Touch</h2>  <!-- Change this -->
<p class="subtitle">Have a question about our physical planners? We're here to help!</p>  <!-- Change this -->
```

---

## 📊 **What You'll Track**

Every submission includes:
- **Name** (who contacted you)
- **Email** (so you can reply)
- **Subject** (what it's about)
- **Message** (full inquiry)
- **Timestamp** (when they submitted)
- **Source** (from thepepplanner.com)

---

## 💡 **Pro Tips**

### **Test Before Going Live**
1. Add the form to your page
2. Save as draft (don't publish yet)
3. Use Squarespace preview mode
4. Submit a test message
5. Check if you received the email
6. Once confirmed → Publish!

### **Reply Directly**
When you get an email notification, you can hit "Reply" and it will go directly to the customer's email (because we set `reply_to: email` in the function).

### **Check Spam Folder**
First few emails from Resend might land in spam. Mark them as "Not Spam" to train your inbox.

---

## 🆘 **Troubleshooting**

### **"Form not submitting"**
- Check browser console for errors (right-click → Inspect → Console)
- Verify Firebase config in HTML matches your project
- Make sure you saved the code block in Squarespace

### **"Email not received"**
- Check spam/junk folder
- Verify `RESEND_API_KEY` is set in Firebase
- Check Firebase logs: `firebase functions:log --only submitContactForm`

### **"Form looks weird"**
- Make sure you're using a full-width section in Squarespace
- Try adjusting the `max-width` in CSS (currently 600px)
- Check mobile view in Squarespace preview

---

## ✨ **You're All Set!**

Your contact form is **production-ready** and will:
- ✅ Match your app's design
- ✅ Send emails to **theaveragebudget@gmail.com**
- ✅ Work on all devices
- ✅ Handle spam gracefully
- ✅ Give users instant feedback

Just paste the code into Squarespace and you're live! 🚀

Need any changes to colors, text, or fields? Just ask! 💪
