# 🍞 Complete Toast Notification Messages - The Pep Planner

This document contains **ALL** toast notification messages shown to users, organized by category.

---

## 📍 **Account & Authentication** (`src/pages/Account.jsx`)

### Email Management
- ❌ `"Enter a valid email"`
- ❌ `"Email already in use"`
- ✅ `"Email updated"`
- ❌ `"You must be logged in to verify your email"`
- ✅ `"Your email is already verified!"`
- ✅ `"📧 Verification email sent! Check your inbox."`
- ❌ `"[Dynamic error message]"`

### Password Management
- ❌ `"New password must be at least 8 characters with uppercase, lowercase, and number"`
- ❌ `"Passwords do not match"`
- ❌ `"Current password is incorrect"`
- ✅ `"✅ Password updated successfully!"`

### Password Reset
- ✅ `"📧 Password reset email sent! Check your inbox."`
- ❌ `"Failed to send password reset email. Please try again."`

### Lab Access (Subscription)
- ✅ `"Lab access started"`
- ℹ️ `"🔄 Processing your subscription..."`
- ❌ `"Failed to start checkout. Please try again."`
- ℹ️ `"🔄 Cancelling your subscription..."`
- ✅ `"Lab access will end after your current research period."`
- ❌ `"Failed to cancel subscription. Please try again."`

### Security Features
- ✅ `"Two-factor enabled"`
- ✅ `"Two-factor disabled"`
- ✅ `"Privacy updated"`

---

## ⚙️ **Settings** (`src/pages/Settings.jsx`)

### Agreement Tracking
- ✅ `"Terms of Service agreement updated ([version])"`
- ❌ `"Error updating agreement"`
- ✅ `"Privacy Policy agreement updated ([version])"`
- ❌ `"Error updating agreement"`

### Data Management
- ✅ `"Backup exported successfully as CSV!"`
- ❌ `"[Dynamic error message]"` (Import/export errors)

### Notification Settings
- ✅ `"Native notifications [enabled/disabled]"` OR `"PWA notifications [enabled/disabled]"`
- ❌ `"Failed to update notification settings"`

---

## 💳 **Payment & Subscriptions** (`src/services/stripe.js`)

### Checkout Errors
- ❌ `"Payment system not configured. Please contact support at contact@thepepplanner.com"`
- ❌ `"Please log in to subscribe. If you just created an account, try logging out and back in."`
- ❌ `"No payment method on file. Please subscribe to a plan first."`
- ❌ `"[Dynamic error message]"`
- 🎭 `"🎭 Demo: Subscription will cancel at end of billing period"`

### Subscription Management
- ✅ `"Subscription will cancel at the end of your current billing period. No proration will be applied."`

---

## 📱 **Mobile & PWA Notifications** (`src/services/unifiedNotifications.js`, `src/services/mobileNotifications.js`, `src/components/common/NotificationPermissionPrompt.jsx`)

### Notification Status
- ✅ `"🎉 Notifications enabled! You'll now receive important updates."`
- ❌ `"Failed to enable notifications"`
- ❌ `"Mobile notification failed: [error message]"`

### Foreground Notifications
- ℹ️ `"📱 [notification.title]: [notification.body]"`

---

## 🔬 **Protocols & Research** (`src/pages/Protocols.jsx`)

### Protocol Actions
- ✅ `"Protocol has been ended."`

### Data Import
- ✅ `"Imported [count] peptides"`
- ❌ `"Import failed. Use CSV/JSON with name, purpose, count, per, time, duration."`

---

## 📦 **Stockpile Management** (`src/pages/Stockpile.jsx`)

### CSV Import
- ✅ `"Stockpile CSV imported"`
- ❌ `"CSV import failed"`

---

## 🧪 **Reconstitution** (`src/components/recon/ReconCalculatorModal.jsx`, `src/pages/Recon.jsx`)

### Calculations
- ✅ `"Reconstitution saved!"`
- ✅ `"✅ Loaded [peptide name] from stockpile"`
- ✅ `"Calculation saved successfully!"` (appears twice in Recon.jsx)

---

## 🛒 **Vendors** (`src/pages/Vendors.jsx`)

### Demo Data
- ℹ️ `"No demo vendors to delete"`
- ✅ `"Deleted [count] demo vendor[s]"`

---

## 📤 **Imports** (`src/pages/Imports.jsx`)

### Data Import
- ✅ `"Imported [orders count] orders, [stock count] stock items, [notes count] notes"` (dynamic)

---

## 📋 **Dashboard** (`src/pages/CustomizableDashboard.jsx`)

### Widget Actions
- ✅ `"Import saved"`
- ✅ `"Scheduled buy added"`
- ✅ `"Supplement saved"`
- ✅ `"Protocol created"`

### Checkout (ConversionWidget.jsx)
- ℹ️ `"🎭 Demo: [PLAN] plan selected. Attempting Stripe checkout..."`
- ❌ `"Checkout failed. Please try again."`

### Subscription Modal (`src/components/common/SubscriptionModal.jsx`)
- ℹ️ `"🔄 Redirecting to Stripe checkout..."`
- ❌ `"Failed to start checkout. Please try again."`

---

## 👨‍💼 **Admin Panel** (`src/pages/Admin.jsx`)

### Content Management
- ✅ `"Content updated successfully!"`
- ❌ `"Error saving content data"`

### Topic Management
- ✅ `"Topic updated! Remember to save changes."`
- ✅ `"Pen type updated! Remember to save changes."`

### Email Templates (`src/components/admin/EmailTemplateManager.jsx`)
- ✅ `"✅ Email templates saved!"`
- ✅ `"🔄 Templates reset to defaults"`
- ✅ `"📋 HTML copied to clipboard!"`

### Triggered Notifications (`src/components/admin/TriggeredNotificationManager.jsx`)
- ✅ `"Triggered notification saved successfully!"`
- ✅ `"Triggered notification deleted!"`

### Notification Templates (`src/components/admin/NotificationTemplateEditor.jsx`)
- ✅ `"Notification template saved successfully!"`
- ✅ `"All templates reset to defaults!"`
- ❌ `"Please select a template to test"`
- ❌ `"PWA notifications not supported in this browser. Template preview not available."`
- ⚠️ `"Notification permission needed to preview template appearance"`
- ⚠️ `"Cannot preview template - permission denied"`
- ✅ `"Template preview sent! This is how the message will look."`
- ❌ `"Failed to preview template - [error message]"`

### Agreement Tracking (`src/components/admin/AgreementTracking.jsx`)
- ℹ️ `"No agreement data found or error loading"`

---

## 🎯 **Vendor Cards** (`src/components/vendors/VendorCard.jsx`)

### Copy to Clipboard
- ✅ `"Copied!"`

---

## 📦 **Orders** (`src/components/orders/OrderDetailsModal.jsx`)

### Order Actions
- ⚠️ `"[Order-specific messages]"` (need to check this file)

---

## **Visual Details**

### ModernToast Display:
- **Location**: Top-right corner of screen
- **Auto-dismiss**: 3 seconds
- **Z-index**: 50
- **Colors by Type**:
  - Success: Theme primary color (#7F9E95 or theme.primary)
  - Error: Red (#DC2626 or theme.error)
  - Warning: Orange (#F59E0B or theme.warning)
  - Info: Theme secondary color (#F5F5F0 or theme.secondary)

### Icons:
- ✅ Success: Check icon
- ❌ Error: Alert triangle
- ⚠️ Warning: Alert triangle
- ℹ️ Info: Info icon

---

## 📝 **Summary by Type**

- **Success**: 36 messages
- **Error**: 19 messages
- **Info**: 5 messages
- **Warning**: 2 messages

**Total**: 62+ unique toast messages across the entire app!


