# Comprehensive Toast Notifications List

This document lists all toast notifications in The Pep Planner application and when they are triggered.

## Toast System Overview

- **Event**: `tpp:toast` CustomEvent
- **Format**: `{ message: string, type: 'success' | 'error' | 'warning' | 'info', duration?: number }`
- **Component**: `ModernToast` in `src/components/ui/ModernToast.jsx`
- **Auto-dismiss**: 4 seconds (default)
- **Settings**: Can be disabled via `settings.features.toastNotifications`

---

## Protocols Page (`src/pages/Protocols.jsx`)

### Success Toasts

1. **"Protocol has been ended."**
   - **Type**: `success`
   - **Trigger**: When a protocol is ended (no history entry exists)

2. **"Imported {count} peptides"**
   - **Type**: `success`
   - **Trigger**: After successfully importing protocols from CSV/JSON file

3. **"🎉 Push notifications enabled! Research reminders are now active."**
   - **Type**: `success`
   - **Trigger**: After successfully enabling push notifications for protocol reminders

4. **"Protocol updated successfully!"**
   - **Type**: `success`
   - **Trigger**: After successfully updating a protocol from history

5. **"Protocol deleted successfully"**
   - **Type**: `success`
   - **Trigger**: After successfully deleting a protocol

### Error Toasts

6. **"Import failed. Use CSV/JSON with name, purpose, count, per, time, duration."**
   - **Type**: `error`
   - **Trigger**: When protocol import fails due to invalid format

7. **"Failed to enable notifications. Please enable them in your device settings."**
   - **Type**: `error`
   - **Trigger**: When push notification permission is denied or fails

---

## Stockpile Page (`src/pages/Stockpile.jsx`)

### Success Toasts

8. **"Link Copied 📋"**
   - **Type**: `success`
   - **Trigger**: When a stockpile link is successfully copied to clipboard

9. **"Item deleted successfully"**
   - **Type**: `success`
   - **Trigger**: After successfully deleting a stockpile item

10. **"Stockpile CSV imported"**
    - **Type**: `success`
    - **Trigger**: After successfully importing stockpile items from CSV

11. **"✅ {itemName} added to stockpile!"**
    - **Type**: `success`
    - **Trigger**: After successfully adding a new item to stockpile

12. **"{count} items deleted successfully"** (or "Item deleted successfully" for single item)
    - **Type**: `success`
    - **Trigger**: After successfully deleting out-of-stock items

### Warning Toasts

13. **"Item deleted locally but failed to sync to cloud"**
    - **Type**: `warning`
    - **Trigger**: When item deletion succeeds locally but cloud sync fails

14. **"Items deleted locally but failed to sync to cloud"**
    - **Type**: `warning`
    - **Trigger**: When bulk item deletion succeeds locally but cloud sync fails

### Error Toasts

15. **"Failed to copy link"**
    - **Type**: `error`
    - **Trigger**: When clipboard copy operation fails

16. **"Failed to delete item. Please try again."**
    - **Type**: `error`
    - **Trigger**: When item deletion fails

17. **"CSV import failed"**
    - **Type**: `error`
    - **Trigger**: When stockpile CSV import fails

18. **"Cannot remove the last variant. Delete the entire group from the main view instead."**
    - **Type**: `error`
    - **Trigger**: When trying to remove the last variant in a stockpile group

---

## Reconstitution Page (`src/pages/Recon.jsx`)

### Success Toasts

19. **"✅ Loaded {peptideName} from stockpile!"**
    - **Type**: `success`
    - **Trigger**: When prefill data is loaded from stockpile for reconstitution calculator

20. **"Calculation saved successfully!"**
    - **Type**: `success`
    - **Trigger**: After successfully saving a reconstitution calculation

21. **"Draft saved successfully!"**
    - **Type**: `success`
    - **Trigger**: After successfully saving a reconstitution draft

22. **"History entry removed."**
    - **Type**: `success`
    - **Trigger**: After successfully deleting a reconstitution history entry

### Error Toasts

23. **"Failed to delete history entry."**
    - **Type**: `error`
    - **Trigger**: When reconstitution history deletion fails

---

## Orders Page (`src/pages/Orders.jsx`)

### Success Toasts

24. **"Order deleted successfully! 🗑️"**
    - **Type**: `success`
    - **Duration**: 3000ms
    - **Trigger**: After successfully deleting an order

25. **"🚚 Order #{orderNumber} is now in transit!"**
    - **Type**: `info`
    - **Duration**: 4000ms
    - **Trigger**: When order status changes to "Shipped" (from tracking sync or manual update)

26. **"📦 Order #{orderNumber} has been delivered!"**
    - **Type**: `success`
    - **Duration**: 5000ms
    - **Trigger**: When order status changes to "Delivered" (from tracking sync or manual update)

27. **"🚚 Order marked as shipped!"**
    - **Type**: `info`
    - **Trigger**: When order status is manually advanced to "Shipped"

28. **"📦 Order marked as delivered!"**
    - **Type**: `success`
    - **Trigger**: When order status is manually advanced to "Delivered"

### Error Toasts

29. **"Order deleted locally, but sync failed. It may reappear. Please try again."**
    - **Type**: `error`
    - **Duration**: 5000ms
    - **Trigger**: When order deletion succeeds locally but cloud sync fails after retry

30. **"Failed to delete order. Please try again."**
    - **Type**: `error`
    - **Duration**: 4000ms
    - **Trigger**: When order deletion fails

---

## Account Profile Page (`src/pages/AccountProfile.jsx`)

### Success Toasts

31. **"Verification email sent to new address"**
    - **Type**: `success`
    - **Trigger**: After sending email verification for email change

32. **"📧 Verification email sent! Check your inbox."**
    - **Type**: `success`
    - **Trigger**: After successfully sending verification email

33. **"Password updated successfully"**
    - **Type**: `success`
    - **Trigger**: After successfully updating password

34. **"Secret key copied to clipboard"**
    - **Type**: `success`
    - **Trigger**: After copying 2FA secret key to clipboard

35. **"Two-factor authentication enabled successfully!"**
    - **Type**: `success`
    - **Trigger**: After successfully enabling 2FA

36. **"Two-factor authentication disabled"**
    - **Type**: `success`
    - **Trigger**: After successfully disabling 2FA

### Error Toasts

37. **"Failed to update email"**
    - **Type**: `error`
    - **Trigger**: When email update fails

38. **"Failed to send verification email. Please try again."**
    - **Type**: `error`
    - **Trigger**: When verification email sending fails

39. **"You must be logged in to request a verification email."**
    - **Type**: `error`
    - **Trigger**: When user is not authenticated and tries to request verification email

40. **"Please fill in all fields"**
    - **Type**: `error`
    - **Trigger**: When password update form has empty fields

41. **"New passwords do not match"**
    - **Type**: `error`
    - **Trigger**: When password confirmation doesn't match new password

42. **"Password must be at least 6 characters"**
    - **Type**: `error`
    - **Trigger**: When new password is too short

43. **"Current password is incorrect"**
    - **Type**: `error`
    - **Trigger**: When current password is wrong during password update

44. **"Password is too weak"**
    - **Type**: `error`
    - **Trigger**: When new password doesn't meet strength requirements

45. **"Failed to update password"**
    - **Type**: `error`
    - **Trigger**: When password update fails (generic error)

46. **"Error generating QR code"**
    - **Type**: `error`
    - **Trigger**: When 2FA QR code generation fails

47. **"User not authenticated"**
    - **Type**: `error`
    - **Trigger**: When user is not authenticated during 2FA setup

48. **"Please enter a valid 6-digit code"**
    - **Type**: `error`
    - **Trigger**: When 2FA verification code format is invalid

49. **"Invalid code. Please try again."**
    - **Type**: `error`
    - **Trigger**: When 2FA verification code is incorrect

50. **"Failed to save 2FA settings"**
    - **Type**: `error`
    - **Trigger**: When 2FA settings save fails

51. **"Failed to enable 2FA"**
    - **Type**: `error`
    - **Trigger**: When 2FA enable operation fails

52. **"Failed to disable 2FA"**
    - **Type**: `error`
    - **Trigger**: When 2FA disable operation fails

---

## Account Security Page (`src/pages/AccountSecurity.jsx`)

### Success Toasts

53. **"Secret key copied to clipboard"**
    - **Type**: `success`
    - **Trigger**: After copying 2FA secret key to clipboard

54. **"Two-factor authentication enabled successfully!"**
    - **Type**: `success`
    - **Trigger**: After successfully enabling 2FA

55. **"Two-factor authentication disabled"**
    - **Type**: `success`
    - **Trigger**: After successfully disabling 2FA

56. **"Password updated successfully"**
    - **Type**: `success`
    - **Trigger**: After successfully updating password

### Error Toasts

57. **"Error generating QR code"**
    - **Type**: `error`
    - **Trigger**: When 2FA QR code generation fails

58. **"User not authenticated"**
    - **Type**: `error`
    - **Trigger**: When user is not authenticated during 2FA setup

59. **"Email OTP 2FA coming soon!"**
    - **Type**: `info`
    - **Trigger**: When user tries to enable email-based 2FA (not yet implemented)

60. **"Please enter a valid 6-digit code"**
    - **Type**: `error`
    - **Trigger**: When 2FA verification code format is invalid

61. **"Invalid code. Please try again."**
    - **Type**: `error`
    - **Trigger**: When 2FA verification code is incorrect

62. **"Failed to save 2FA settings"**
    - **Type**: `error`
    - **Trigger**: When 2FA settings save fails

63. **"Failed to enable 2FA"**
    - **Type**: `error`
    - **Trigger**: When 2FA enable operation fails

64. **"Failed to disable 2FA"**
    - **Type**: `error`
    - **Trigger**: When 2FA disable operation fails

65. **"Please fill in all fields"**
    - **Type**: `error`
    - **Trigger**: When password update form has empty fields

66. **"New passwords do not match"**
    - **Type**: `error`
    - **Trigger**: When password confirmation doesn't match new password

67. **"Password must be at least 6 characters"**
    - **Type**: `error`
    - **Trigger**: When new password is too short

68. **"Current password is incorrect"**
    - **Type**: `error`
    - **Trigger**: When current password is wrong during password update

69. **"Password is too weak"**
    - **Type**: `error`
    - **Trigger**: When new password doesn't meet strength requirements

70. **"Failed to update password"**
    - **Type**: `error`
    - **Trigger**: When password update fails (generic error)

---

## Account Subscription Page (`src/pages/AccountSubscription.jsx`)

### Error Toasts

71. **"Failed to start checkout. Please try again."**
    - **Type**: `error`
    - **Trigger**: When Stripe checkout session creation fails

72. **"Failed to open billing portal."**
    - **Type**: `error`
    - **Trigger**: When Stripe customer portal session creation fails

---

## Account Legal Page (`src/pages/AccountLegal.jsx`)

### Success Toasts

73. **"Terms of Service agreement updated ({version})"**
    - **Type**: `success`
    - **Trigger**: After successfully recording Terms of Service agreement

74. **"Privacy Policy agreement updated ({version})"**
    - **Type**: `success`
    - **Trigger**: After successfully recording Privacy Policy agreement

### Error Toasts

75. **"Error updating agreement"**
    - **Type**: `error`
    - **Trigger**: When agreement recording fails (for both Terms and Privacy)

---

## Settings Legal Page (`src/pages/SettingsLegal.jsx`)

### Success Toasts

76. **"Terms of Service agreement updated ({version})"**
    - **Type**: `success`
    - **Trigger**: After successfully recording Terms of Service agreement

77. **"Privacy Policy agreement updated ({version})"**
    - **Type**: `success`
    - **Trigger**: After successfully recording Privacy Policy agreement

### Error Toasts

78. **"Error updating agreement"**
    - **Type**: `error`
    - **Trigger**: When agreement recording fails (for both Terms and Privacy)

---

## Settings Preferences Page (`src/pages/SettingsPreferences.jsx`)

### Success Toasts

79. **"Shipping costs will now be included in stockpile and reconstitution calculations"**
    - **Type**: `success`
    - **Trigger**: When shipping cost inclusion is enabled

80. **"Shipping costs will be excluded from stockpile and reconstitution calculations"**
    - **Type**: `success`
    - **Trigger**: When shipping cost inclusion is disabled

---

## Settings Notifications Page (`src/pages/SettingsNotifications.jsx`)

### Success Toasts

81. **"Notifications {enabled/disabled}"**
    - **Type**: `success`
    - **Trigger**: After successfully toggling notification settings

### Error Toasts

82. **"Failed to update notification settings"**
    - **Type**: `error`
    - **Trigger**: When notification settings update fails

---

## Notification Permission Prompt (`src/components/common/NotificationPermissionPrompt.jsx`)

### Success Toasts

83. **"🎉 Notifications enabled! You'll now receive important updates."**
    - **Type**: `success`
    - **Trigger**: After successfully granting notification permission

### Error Toasts

84. **"Notifications denied. Please enable them in Settings > The Pep Planner > Notifications, or try again to show the permission prompt."** (iOS)
    - **Type**: `error`
    - **Trigger**: When notification permission is denied on iOS

85. **"Notifications denied. Please enable them in Settings > Apps > The Pep Planner > Notifications, or try again to show the permission prompt."** (Android)
    - **Type**: `error`
    - **Trigger**: When notification permission is denied on Android

86. **"Notifications denied. Please enable them in your device settings, or try again to show the permission prompt."** (Other platforms)
    - **Type**: `error`
    - **Trigger**: When notification permission is denied on other platforms

---

## Android Permission Prompt (`src/components/common/AndroidPermissionPrompt.jsx`)

### Success Toasts

87. **"🎉 Notifications enabled! You'll now receive important updates."**
    - **Type**: `success`
    - **Trigger**: After successfully granting Android notification permission

### Error Toasts

88. **"Failed to enable notifications. You can enable them later in Settings."**
    - **Type**: `error`
    - **Trigger**: When Android notification permission request fails

---

## Vendors Page (`src/pages/Vendors.jsx`)

### Success Toasts

89. **"Vendor deleted successfully"**
    - **Type**: `success`
    - **Trigger**: After successfully deleting a vendor

---

## Customizable Dashboard Page (`src/pages/CustomizableDashboard.jsx`)

### Success Toasts

90. **"Wishlist item updated"** or **"Item added to wishlist"**
    - **Type**: `success`
    - **Trigger**: After successfully adding or updating a wishlist item

---

## Admin Page (`src/pages/Admin.jsx`)

### Success Toasts

91. **"Content updated successfully!"**
    - **Type**: `success`
    - **Trigger**: After successfully saving content data (pen types, etc.)

92. **"Ticket status updated"**
    - **Type**: `success`
    - **Trigger**: After successfully updating support ticket status

93. **"Admin message sent! 📨"**
    - **Type**: `success`
    - **Trigger**: After successfully sending admin message to user

94. **"✅ Trial extended! User will see updated status on next refresh."**
    - **Type**: `success`
    - **Trigger**: After successfully extending user trial period

95. **"Test admin message sent! Check your dashboard."**
    - **Type**: `success`
    - **Trigger**: After successfully sending test admin message

96. **"Topic updated! Remember to save changes."**
    - **Type**: `success`
    - **Trigger**: After updating a feedback topic (reminder to save)

97. **"Audit complete! Found {count} potential conflicts."**
    - **Type**: `warning` (if conflicts found) or `success` (if none)
    - **Trigger**: After completing user data audit

### Error Toasts

98. **"Error saving content data"**
    - **Type**: `error`
    - **Trigger**: When content data save fails

99. **"Error sending response"**
    - **Type**: `error`
    - **Trigger**: When admin message sending fails

100. **"Error updating ticket status"**
    - **Type**: `error`
    - **Trigger**: When ticket status update fails

101. **"Failed to send message"**
    - **Type**: `error`
    - **Trigger**: When admin message sending fails

102. **"Failed to extend research trial."**
    - **Type**: `error`
    - **Trigger**: When trial extension fails

103. **"Please log in first"**
    - **Type**: `error`
    - **Trigger**: When admin tries to send test message without authentication

104. **"Function not deployed. Please deploy Firebase functions: cd functions && firebase deploy --only functions:createAdminMessage"**
    - **Type**: `error`
    - **Trigger**: When Firebase function is not found

105. **"Audit failed"**
    - **Type**: `error`
    - **Trigger**: When user data audit fails

---

## Admin - User Detail Modal (`src/components/admin/UserDetailModal.jsx`)

### Success Toasts

106. **"One-way message sent! The user will see it in their dashboard."**
    - **Type**: `success`
    - **Trigger**: After successfully sending one-way support message

107. **"Support ticket created! The user can now respond."**
    - **Type**: `success`
    - **Trigger**: After successfully creating two-way support ticket

### Error Toasts

108. **"Failed to send message"**
    - **Type**: `error`
    - **Trigger**: When one-way message sending fails

109. **"Failed to create ticket"**
    - **Type**: `error`
    - **Trigger**: When support ticket creation fails

---

## Admin - Email History (`src/components/admin/EmailHistory.jsx`)

### Success Toasts

110. **"✅ Email resent successfully to {email}"**
    - **Type**: `success`
    - **Trigger**: After successfully resending an email

### Error Toasts

111. **"❌ Firestore index required. Check console for link."**
    - **Type**: `error`
    - **Trigger**: When Firestore index is missing for email history query

112. **"❌ Permission denied. Make sure you're logged in as admin."**
    - **Type**: `error`
    - **Trigger**: When admin permission is denied for email history

113. **"❌ Failed to load email history"**
    - **Type**: `error`
    - **Trigger**: When email history loading fails (generic error)

114. **"❌ Failed to resend email: {message}"**
    - **Type**: `error`
    - **Trigger**: When email resend fails

---

## Admin - Email Template Manager (`src/components/admin/EmailTemplateManager.jsx`)

### Success Toasts

115. **"✅ Templates saved to Firestore!"**
    - **Type**: `success`
    - **Trigger**: After successfully saving email templates to Firestore

116. **"🔄 Templates reset to defaults"**
    - **Type**: `success`
    - **Trigger**: After resetting templates to default values

117. **"📋 HTML copied to clipboard!"**
    - **Type**: `success`
    - **Trigger**: After copying generated HTML to clipboard

### Error Toasts

118. **"❌ You must be logged in to save templates. Please log in to the main app first, then navigate to /admin"**
    - **Type**: `error`
    - **Trigger**: When user is not authenticated when trying to save templates

119. **"❌ Permission denied. You must be logged in as an admin to save templates. Please log in to the main app first, then navigate to /admin."**
    - **Type**: `error`
    - **Trigger**: When admin permission is denied for template save

120. **"❌ {error message}"**
    - **Type**: `error`
    - **Trigger**: When template save fails (with specific error message)

121. **"❌ Failed to send test email"** (with various error details)
    - **Type**: `error`
    - **Trigger**: When test email sending fails

---

## Protocol History Detail Modal (`src/components/protocols/ProtocolHistoryDetailModal.jsx`)

### Success Toasts

122. **"History entry deleted successfully."**
    - **Type**: `success`
    - **Trigger**: After successfully deleting protocol history entry

### Error Toasts

123. **"Failed to delete history entry."**
    - **Type**: `error`
    - **Trigger**: When protocol history entry deletion fails

---

## App Context (`src/context/AppContext.jsx`)

### Success Toasts

124. **"Research has been updated since last login."**
    - **Type**: `success`
    - **Duration**: 4000ms
    - **Trigger**: When cloud data sync detects changes since last login (with throttling to prevent spam)

125. **"🚚 Order #{orderNumber} is now in transit!"**
    - **Type**: `info`
    - **Duration**: 4000ms
    - **Trigger**: When order status changes to "Shipped" during background sync

126. **"📦 Order #{orderNumber} has been delivered!"**
    - **Type**: `success`
    - **Duration**: 5000ms
    - **Trigger**: When order status changes to "Delivered" during background sync

---

## Back Button Handler (`src/utils/useBackButtonHandler.js`)

### Info Toasts

127. **"🔙 Press back again to exit"**
    - **Type**: `info`
    - **Duration**: 2000ms
    - **Trigger**: When user presses back button on mobile (first press - requires second press to exit)

---

## Summary Statistics

- **Total Toast Notifications**: 127
- **Success Toasts**: ~60
- **Error Toasts**: ~50
- **Warning Toasts**: ~5
- **Info Toasts**: ~12

### By Category

- **Protocols**: 7 toasts
- **Stockpile**: 11 toasts
- **Reconstitution**: 5 toasts
- **Orders**: 7 toasts
- **Account Management**: 45+ toasts (Profile, Security, Subscription, Legal)
- **Settings**: 4 toasts
- **Notifications**: 6 toasts
- **Admin Panel**: 30+ toasts
- **System/Context**: 4 toasts
- **Navigation**: 1 toast

---

## Notes

1. **Toast Types**:
   - `success`: Green, checkmark icon - for successful operations
   - `error`: Red, alert icon - for failures/errors
   - `warning`: Yellow/orange, warning icon - for warnings
   - `info`: Blue, info icon - for informational messages

2. **Duration**: Most toasts auto-dismiss after 4 seconds. Some have custom durations (2-5 seconds).

3. **Settings**: Toasts can be disabled via `settings.features.toastNotifications` (default: enabled).

4. **Replacement Behavior**: The toast system replaces existing toasts instead of stacking them.

5. **Research Principal**: All messages maintain the "research principal" terminology (e.g., "research," "protocols," "lab access") rather than direct medical language.


