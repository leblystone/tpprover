# 📧 Customize Firebase Email Templates

## 🔧 Step-by-Step Guide

### **1. Access Email Templates**

1. Go to: https://console.firebase.google.com/project/tpp-splendide/authentication/emails
2. Or navigate: Firebase Console → Authentication → Templates

### **2. Customize Each Template**

Click on each template to edit:

---

## ✉️ **Email Verification Template**

### **Settings to Change:**

**Sender Name:**
```
The Pep Planner
```

**Subject:**
```
Verify your email for The Pep Planner
```

**Email Body:**
```html
<p>Hi there! 👋</p>

<p>Welcome to <strong>The Pep Planner</strong>! 🧬</p>

<p>Please verify your email address to ensure you can:</p>
<ul>
  <li>Reset your password if needed</li>
  <li>Receive important account notifications</li>
  <li>Access all features securely</li>
</ul>

<p>Click the button below to verify your email:</p>

<p><a href="%LINK%" style="display: inline-block; padding: 12px 24px; background-color: #344E41; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Verify Email Address</a></p>

<p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:<br>
%LINK%</p>

<p style="color: #666; font-size: 14px;">If you didn't create an account with The Pep Planner, you can safely ignore this email.</p>

<p>Best,<br>
The Pep Planner Team</p>

<hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

<p style="color: #999; font-size: 12px; text-align: center;">
  The Pep Planner - Research. Track. Optimize.<br>
  <a href="https://thepepplanner.app" style="color: #344E41;">Visit our website</a>
</p>
```

---

## 🔐 **Password Reset Template**

### **Settings to Change:**

**Sender Name:**
```
The Pep Planner
```

**Subject:**
```
Reset your password for The Pep Planner
```

**Email Body:**
```html
<p>Hi there! 👋</p>

<p>We received a request to reset your password for <strong>The Pep Planner</strong>.</p>

<p>Click the button below to create a new password:</p>

<p><a href="%LINK%" style="display: inline-block; padding: 12px 24px; background-color: #344E41; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Reset Password</a></p>

<p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:<br>
%LINK%</p>

<p style="color: #dc2626; font-size: 14px; font-weight: 600;">⚠️ This link will expire in 1 hour.</p>

<p style="color: #666; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email. Your password won't change unless you click the link above.</p>

<p>Best,<br>
The Pep Planner Team</p>

<hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

<p style="color: #999; font-size: 12px; text-align: center;">
  The Pep Planner - Research. Track. Optimize.<br>
  <a href="https://thepepplanner.app" style="color: #344E41;">Visit our website</a>
</p>
```

---

## 📧 **Email Change Verification**

**Sender Name:**
```
The Pep Planner
```

**Subject:**
```
Verify your new email for The Pep Planner
```

**Email Body:**
```html
<p>Hi there! 👋</p>

<p>You recently changed your email address for <strong>The Pep Planner</strong>.</p>

<p>Please verify your new email address to complete the change:</p>

<p><a href="%LINK%" style="display: inline-block; padding: 12px 24px; background-color: #344E41; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Verify New Email</a></p>

<p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:<br>
%LINK%</p>

<p style="color: #666; font-size: 14px;">If you didn't request this change, please contact support immediately.</p>

<p>Best,<br>
The Pep Planner Team</p>

<hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

<p style="color: #999; font-size: 12px; text-align: center;">
  The Pep Planner - Research. Track. Optimize.<br>
  <a href="https://thepepplanner.app" style="color: #344E41;">Visit our website</a>
</p>
```

---

## 🎨 **Advanced Customization**

### **Add Your Logo**

```html
<div style="text-align: center; margin-bottom: 20px;">
  <img src="https://thepepplanner.app/tpp-logo.png" alt="The Pep Planner" style="width: 150px; height: auto;">
</div>
```

### **Brand Colors**
- Primary: `#344E41` (Dark Green)
- Secondary: `#A3B18A` (Light Green)
- Background: `#D4D7CD` (Sage)
- White: `#FFFFFF`

---

## 🧪 **How to Test**

### **Method 1: Create Test Account**
```
1. Go to your app (localhost or live)
2. Sign up with a test email
3. Check email inbox for verification
4. Click link and verify it works
```

### **Method 2: Firebase Console Preview**
```
1. Go to Authentication → Templates
2. Click on a template
3. Look for "Preview" or "Send test email" option
4. Send to your own email
```

### **Method 3: Use Real Features**
```
Email Verification:
- Sign up → check inbox

Password Reset:
- Go to Account page
- Click "Forgot password?"
- Check inbox

Email Change:
- Go to Account page
- Change email address
- Check inbox
```

---

## 📝 **Important Variables**

Firebase provides these variables you can use in templates:

- `%LINK%` - The action link (verification, reset, etc.)
- `%EMAIL%` - The user's email address
- `%APP_NAME%` - Your app name (defaults to Firebase project name)
- `%DISPLAY_NAME%` - User's display name (if set)

---

## ⚙️ **SMTP Settings (Optional)**

By default, Firebase sends from: `noreply@tpp-splendide.firebaseapp.com`

To use your own domain email (e.g., `noreply@thepepplanner.app`):

1. Upgrade to **Blaze Plan** (pay-as-you-go)
2. Go to: **Project Settings** → **Email**
3. Configure SMTP settings:
   - SMTP Server (e.g., Gmail, SendGrid, Mailgun)
   - Port (587 or 465)
   - Username & Password
   - Sender Email

**Recommended Services:**
- **SendGrid** - 100 emails/day free
- **Mailgun** - 5,000 emails/month free for 3 months
- **Gmail SMTP** - Free but has daily limits

---

## ✅ **After Customization Checklist**

- [ ] Updated sender name to "The Pep Planner"
- [ ] Customized all three email templates
- [ ] Added brand colors and styling
- [ ] Tested verification email with real signup
- [ ] Tested password reset email
- [ ] Checked emails on mobile and desktop
- [ ] Verified links work correctly
- [ ] Emails land in inbox (not spam)

---

## 🚨 **Common Issues**

**Emails Going to Spam:**
- Add SPF/DKIM records to your domain
- Use custom SMTP with authenticated domain
- Ask users to whitelist your email address

**Emails Not Sending:**
- Check Firebase Console → Usage for limits
- Verify user has valid email address
- Check Firebase Console → Logs for errors

**Template Changes Not Showing:**
- Clear browser cache
- Wait a few minutes for Firebase to update
- Try in incognito/private browsing mode

---

**Pro Tip:** Create a test account with your own email to preview all emails before launching! 🚀

