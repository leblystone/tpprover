# Android Notification Debugging Guide

## Method 1: Chrome DevTools (Remote Debugging)

### Setup:
1. Enable Developer Options on your Android device:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
   - Go back to Settings → Developer Options
   - Enable "USB Debugging"

2. Connect your phone to your computer via USB

3. Open Chrome on your computer and go to: `chrome://inspect`

4. You should see your device and the TPP app listed

5. Click "Inspect" next to the TPP app

6. In the DevTools console, run:
   ```javascript
   await window.debugNotifications()
   ```

### Troubleshooting:
- If device not showing: Make sure USB debugging is enabled and accept the prompt on your phone
- If app not showing: Make sure the app is open and running
- On Windows: You may need to install Android USB drivers

## Method 2: In-App Debug Button (Easier)

I can add a debug button directly in your app's Settings page that runs the diagnostic and displays results in the app.

## Method 3: Admin Panel Debug Button

I can add a debug button in your admin panel that you can tap on mobile to see the diagnostic results.

---

## Quick Test: Manual Notification Test

In the meantime, you can test if FCM tokens are working by:

1. Open your app on Android
2. Go to Settings → Notifications
3. Make sure "Push Notifications" is enabled
4. Check your Firestore console to see if the FCM token is saved

Then from your desktop, go to Admin Panel and send a test notification to yourself.
