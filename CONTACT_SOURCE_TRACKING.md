# Contact Form Source Tracking

## ✅ What Was Implemented

### 1. **Source Tracking**
All contact form submissions now track where they came from:
- `landing` - Landing page contact form
- `login` - Login page "Contact Support" button
- `squarespace` - Squarespace website contact form
- `app` - Default for any other source

### 2. **Firestore Storage**
All contact submissions are now saved to the `contactSubmissions` collection with:
```javascript
{
  name: string,
  email: string,
  subject: string,
  message: string,
  source: 'landing' | 'login' | 'squarespace' | 'app',
  status: 'unread' | 'read',
  timestamp: Firestore.Timestamp,
  repliedAt: Firestore.Timestamp | null,
  notes: string | null
}
```

### 3. **Email Notifications**
Contact form emails now include the **source** in the email body:
```
From: John Doe
Email: john@example.com
Subject: Question about planners
Source: squarespace  ← NEW!
```

### 4. **Admin Panel Access**
View all contact submissions in the admin panel:
- **URL**: https://tpp-splendide.web.app/admin/contact
- **Navigation**: Admin Panel → Content tab → **Contact** (first option)

## 📍 Admin Panel Features

### **View Contact Submissions**
- Filter: All / Unread / Read
- Search by name, email, or subject
- See source badge for each submission

### **Manage Submissions**
- Mark as read/unread
- Add internal notes
- Reply directly (opens email client)
- View submission timestamp

### **Source Badges**
Each submission shows a colored badge:
- 🟢 **landing** - Landing page
- 🔵 **login** - Login page
- 🟣 **squarespace** - Squarespace site
- ⚪ **app** - Other

## 🎯 How Sources Are Tracked

### **Landing Page**
```javascript
<LandingContactModal 
  open={showContact} 
  onClose={() => setShowContact(false)} 
  source="landing" // ← Tracked
/>
```

### **Login Page**
```javascript
<LandingContactModal 
  open={showContact} 
  onClose={() => setShowContact(false)} 
  source="login" // ← Tracked
/>
```

### **Squarespace Contact Form**
```javascript
const formData = {
  name: '...',
  email: '...',
  subject: '...',
  message: '...',
  source: 'squarespace' // ← Tracked
};
```

## 📊 Firestore Structure

```
contactSubmissions/
├── {submissionId1}
│   ├── name: "Jane Smith"
│   ├── email: "jane@example.com"
│   ├── subject: "Physical planner question"
│   ├── message: "When will X theme be back in stock?"
│   ├── source: "squarespace"
│   ├── status: "unread"
│   ├── timestamp: Timestamp(2026-01-24)
│   ├── repliedAt: null
│   └── notes: null
├── {submissionId2}
│   ├── name: "John Doe"
│   ├── email: "john@example.com"
│   ├── subject: "Can't log in"
│   ├── message: "I forgot my password"
│   ├── source: "login"
│   ├── status: "read"
│   ├── timestamp: Timestamp(2026-01-24)
│   ├── repliedAt: Timestamp(2026-01-24)
│   └── notes: "Sent password reset link"
```

## 🚀 What's Next

1. **Test the flow**: Submit a contact form from each source
2. **Check admin panel**: Verify you see all submissions with correct sources
3. **Verify emails**: Confirm you receive emails with source information
4. **Update Squarespace**: Paste the updated `squarespace-contact-form.html` code

## 📧 Email Example

**Subject**: Contact Form: Physical planner question

**Body**:
```
Contact Form Message Received

From: Jane Smith
Email: jane@example.com
Subject: Physical planner question
Source: squarespace  ← Shows where it came from!

Message:
When will the "Midnight" theme be back in stock?

---
This message was sent from The Pep Planner contact form.
```

## ✅ Deployment Status

- ✅ **Backend**: `submitContactForm` function deployed
- ✅ **Frontend**: Landing/Login pages deployed with source tracking
- ✅ **Admin Panel**: Contact page deployed and accessible
- ⏳ **Squarespace**: Updated HTML in `squarespace-contact-form.html` (needs manual paste)
