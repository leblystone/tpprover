# 📧 Custom Email Service Setup Guide

## 🎨 What You're Getting

Beautiful, branded emails with your sage color palette that are:
- ✅ Professional and modern design
- ✅ Mobile responsive
- ✅ Match your app's branding
- ✅ Land in inbox (not spam)
- ✅ Free for up to 100 emails/day

---

## 📋 Quick Setup (5 Steps)

### **Step 1: Create SendGrid Account** (2 minutes)

1. Go to: https://signup.sendgrid.com/
2. Sign up for **FREE** account
3. Verify your email
4. Complete account setup

**Free Plan Includes:**
- 100 emails/day forever
- Email analytics
- Professional deliverability
- No credit card required

---

### **Step 2: Get Your API Key** (1 minute)

1. In SendGrid Dashboard, go to: **Settings** → **API Keys**
2. Click **Create API Key**
3. Name it: `The Pep Planner Production`
4. Permissions: **Full Access** (or at minimum: Mail Send)
5. Click **Create & View**
6. **COPY THE KEY** (you'll only see it once!)

Example: `SG.xxxxxxxxxxxxxxxxxxx.yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy`

---

### **Step 3: Verify Your Sender Email** (2 minutes)

SendGrid requires sender verification to prevent spam.

**Option A: Single Sender Verification (Easiest)**
1. Go to: **Settings** → **Sender Authentication** → **Single Sender Verification**
2. Click **Create New Sender**
3. Fill in:
   - **From Name**: The Pep Planner
   - **From Email**: noreply@thepepplanner.app (or use your Gmail for testing)
   - **Reply To**: support@thepepplanner.app (or your email)
   - **Company**: The Pep Planner
   - **Address**: Your business address
4. Click **Save**
5. **Check your email** for verification link
6. Click link to verify

**Option B: Domain Authentication (Advanced)**
- Requires DNS access to thepepplanner.app
- Better deliverability
- Can send from any @thepepplanner.app address

---

### **Step 4: Add API Key to Firebase** (1 minute)

In your terminal:

```bash
cd functions
firebase functions:config:set sendgrid.api_key="YOUR_SENDGRID_API_KEY_HERE"
```

Replace `YOUR_SENDGRID_API_KEY_HERE` with the key you copied.

To verify it worked:
```bash
firebase functions:config:get
```

---

### **Step 5: Install Dependencies & Deploy** (3 minutes)

```bash
# Install SendGrid package
cd functions
npm install

# Deploy functions
npm run deploy
```

---

## ✅ **What Emails Will Be Sent:**

### **1. Welcome Email** (on signup)
**Trigger**: New user creates account  
**Sent**: Immediately  
**Purpose**: Greet new users, explain features, encourage first steps

### **2. Trial Ending Reminder** (scheduled)
**Trigger**: User's trial has 2 days left  
**Sent**: Daily at 9 AM EST  
**Purpose**: Remind users to subscribe before losing access

### **3. Subscription Confirmed**
**Trigger**: User completes Stripe checkout (can add webhook later)  
**Sent**: After payment  
**Purpose**: Confirm subscription, provide invoice details

---

## 🎨 **Email Preview**

### **Welcome Email:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🧬 The Pep Planner
  Research. Track. Optimize.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Welcome to The Pep Planner! 🎉

Hi there! We're thrilled to have you join our 
research community.

The Pep Planner is your complete research 
management platform, designed to help you 
organize protocols, track progress, and 
optimize your research journey.

┌──────────────────────────────────────┐
│ 🎁 Your 10-Day Free Trial is Active! │
│ Full access to all features.         │
│ No credit card required.             │
└──────────────────────────────────────┘

What you can do:

✓ Create Custom Protocols
✓ Track Your Progress
✓ Reconstitution Calculator
✓ Inventory Management
✓ Research Notes
✓ Data Analytics

        [ Get Started → ]

Quick Tips:
📱 Mobile App: Access from any device
🎨 Themes: Customize your experience
📊 Dashboard: Draggable widgets
🔔 Reminders: Schedule notifications

Happy researching! 🧪

Best,
The Pep Planner Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The Pep Planner - Your research platform
Visit Website • Dashboard • Support
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🧪 **How to Test:**

### **Test Welcome Email:**
```bash
# In Firebase Console or your app's backend
# Create a test user with YOUR email address
# You'll immediately receive the welcome email
```

### **View HTML Locally:**
```bash
# Create a test HTML file
node -e "const t = require('./functions/emailTemplates'); console.log(t.welcomeEmail('Test User', 'test@example.com'))" > test-email.html

# Open in browser to preview
start test-email.html  # Windows
open test-email.html   # Mac
```

---

## 🔧 **SendGrid Dashboard Features:**

Once set up, you can view in SendGrid:
- 📊 **Email analytics** (opens, clicks, bounces)
- 📧 **Email activity** (see every email sent)
- 🎯 **Deliverability stats** (inbox vs spam placement)
- 🚫 **Bounce management** (handle invalid emails)
- 📱 **Mobile preview** (how emails look on phones)

---

## 💰 **Pricing Guide:**

**SendGrid Pricing:**
- **Free**: 100 emails/day (3,000/month)
- **Essentials**: $20/month (50,000 emails)
- **Pro**: $90/month (1.5M emails)

**When You'll Need to Upgrade:**
- 100 signups/day = need paid plan
- Until then, FREE works perfectly!

---

## 🎨 **Customization Options:**

Want to change the emails? Just edit `functions/emailTemplates.js`:

```javascript
// Change colors
const COLORS = {
  primary: '#344E41',    // Your brand color
  secondary: '#A3B18A',  // Accent color
  sage: '#D4D7CD',       // Background
};

// Edit content
exports.welcomeEmail = (userName, userEmail) => {
  // Modify the HTML here
  // Add your own copy, images, CTAs
};
```

---

## 📝 **Alternative: Email Template Builders**

If you want even fancier emails without coding:

**Free Tools:**
- **MJML**: Email framework (creates responsive HTML)
- **Beefree**: Free drag-and-drop email builder
- **Maizzle**: Tailwind CSS for emails

**Export HTML → paste into `emailTemplates.js`**

---

## 🚀 **Next Steps:**

1. ✅ Sign up for SendGrid (free)
2. ✅ Get API key
3. ✅ Verify sender email
4. ✅ Add API key to Firebase config
5. ✅ Install dependencies: `cd functions && npm install`
6. ✅ Deploy: `npm run deploy`
7. ✅ Test by creating new account
8. ✅ Check your inbox for beautiful welcome email!

---

**Ready to set this up? I've created all the code - you just need to get the SendGrid API key!** 🚀

