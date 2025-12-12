import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, BellRing } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMobile } from '@fortawesome/free-solid-svg-icons';
import pwaNotificationService from '../../services/pwaNotifications';
import { syncNotificationSettingsToFirestore } from '../../utils/settingsHelpers';
import Modal from './Modal';
import { Capacitor } from '@capacitor/core';

export default function NotificationPermissionPrompt({ theme }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [status, setStatus] = useState({
    supported: false,
    permission: 'default',
    enabled: false
  });
  const checkIntervalRef = useRef(null);
  const forceShowRef = useRef(false); // For local testing

  // Function to check actual permission status from device
  const checkActualPermissionStatus = async () => {
    try {
      // For native apps, check Capacitor permissions
      if (Capacitor.isNativePlatform()) {
        try {
          const { LocalNotifications } = await import('@capacitor/local-notifications');
          const permission = await LocalNotifications.checkPermissions();
          return permission.display === 'granted';
        } catch (e) {
          // Fallback to browser permission if Capacitor check fails
          return Notification.permission === 'granted';
        }
      } else {
        // For PWA/web, check browser permission
        return Notification.permission === 'granted';
      }
    } catch (e) {
      console.error('Error checking permission status:', e);
      return Notification.permission === 'granted';
    }
  };

  // Helper function to check test mode (needs to be defined outside useEffect)
  const checkTestMode = () => {
    // Check URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('testNotificationPrompt') === 'true') {
      return true;
    }
    
    // Check localStorage flag
    if (localStorage.getItem('tpp_test_notification_prompt') === 'true') {
      return true;
    }
    
    // Check if test function was called
    return forceShowRef.current;
  };

  useEffect(() => {

    // Check if we should show the prompt
    const shouldShowPrompt = async () => {
      // TEST MODE: Force show for local testing
      if (checkTestMode()) {
        console.log('🧪 TEST MODE: Forcing notification prompt to show');
        return true;
      }
      
      // Don't show if notifications are not supported
      if (!('Notification' in window)) return false;
      
      // Check actual device permission status first
      const hasPermission = await checkActualPermissionStatus();
      if (hasPermission) {
        // Permission granted - update settings and don't show
        try {
          const settings = JSON.parse(localStorage.getItem('tpprover_settings') || '{}');
          if (!settings.notifications) settings.notifications = {};
          settings.notifications.push = true;
          localStorage.setItem('tpprover_settings', JSON.stringify(settings));
        } catch (e) {
          // Ignore
        }
        return false;
      }
      
      // Show if user is logged in
      const user = JSON.parse(localStorage.getItem('tpprover_user') || 'null');
      if (!user?.email) return false;
      
      // Check if notifications are already enabled in settings (but verify actual permission)
      try {
        const settings = JSON.parse(localStorage.getItem('tpprover_settings') || '{}');
        if (settings.notifications?.push === true && hasPermission) return false;
      } catch (e) {
        // Ignore parse errors
      }
      
      // Check last prompt time (15 days = 15 * 24 * 60 * 60 * 1000 ms)
      // This cooldown prevents spamming users who dismiss/close/ignore the modal
      const FIFTEEN_DAYS = 15 * 24 * 60 * 60 * 1000;
      const lastPromptTime = localStorage.getItem('tpprover_notification_prompt_last_shown');
      
      if (lastPromptTime) {
        const timeSinceLastPrompt = Date.now() - parseInt(lastPromptTime, 10);
        // Only show if 15 days (1,296,000,000 ms) have passed since last dismissal
        if (timeSinceLastPrompt < FIFTEEN_DAYS) {
          const daysRemaining = Math.ceil((FIFTEEN_DAYS - timeSinceLastPrompt) / (24 * 60 * 60 * 1000));
          console.log(`⏸️ Notification prompt cooldown active. Will show again in ${daysRemaining} day(s).`);
          return false;
        }
      }
      
      // For first-time users, wait at least 2 minutes before showing
      const firstVisit = localStorage.getItem('tpprover_first_visit');
      if (!firstVisit) {
        localStorage.setItem('tpprover_first_visit', Date.now().toString());
        return false;
      }
      
      const timeSinceFirstVisit = Date.now() - parseInt(firstVisit, 10);
      if (timeSinceFirstVisit < 120000) { // 2 minutes
        return false;
      }
      
      // All conditions met - show the prompt
      return true;
    };

    // Update status and check if prompt should show
    const updateStatus = async () => {
      // Check if we're in test mode - if so, don't auto-close
      const isTestMode = checkTestMode();
      
      // First, refresh the PWA notification service status
      const pwaStatus = pwaNotificationService.getStatus();
      
      // Check actual device permission status
      const actualPermission = await checkActualPermissionStatus();
      
      // Update status with actual permission
      setStatus({
        ...pwaStatus,
        permission: actualPermission ? 'granted' : Notification.permission,
        enabled: actualPermission
      });
      
      // If permission is actually granted, hide modal immediately (unless in test mode)
      if (actualPermission && !isTestMode) {
        setShowPrompt(false);
        return;
      }
      
      // If in test mode, keep modal open (don't auto-close)
      if (isTestMode) {
        // Don't check other conditions, just ensure it stays open
        if (!showPrompt) {
          setShowPrompt(true);
        }
        return; // Skip normal checks in test mode
      }
      
      // Check if we should show prompt based on all conditions
      const shouldShow = await shouldShowPrompt();
      setShowPrompt(shouldShow);
    };

    // Initial check
    updateStatus();

    // Set up periodic checks to sync with device permission changes
    // This is important because users can change permissions in system settings
    checkIntervalRef.current = setInterval(() => {
      updateStatus();
    }, 5000); // Check every 5 seconds

    // Listen for PWA notification events
    const handleEnabled = () => {
      updateStatus();
    };
    const handleDisabled = () => {
      updateStatus();
    };

    // Listen for app focus/visibility changes (user might have changed permissions while app was in background)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // App came to foreground - check permission status
        updateStatus();
      }
    };

    // Listen for focus events
    const handleFocus = () => {
      updateStatus();
    };

    window.addEventListener('pwa-notifications-enabled', handleEnabled);
    window.addEventListener('pwa-notifications-disabled', handleDisabled);
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // TEST HELPER: Expose test function to window for local testing
    // Usage: window.testNotificationPrompt() in browser console
    window.testNotificationPrompt = () => {
      console.log('🧪 TEST: Forcing notification permission prompt to show');
      forceShowRef.current = true;
      // Clear cooldown and other restrictions for testing
      localStorage.removeItem('tpprover_notification_prompt_last_shown');
      localStorage.setItem('tpp_test_notification_prompt', 'true');
      setShowPrompt(true);
    };

    // TEST HELPER: Clear test mode
    window.clearNotificationPromptTest = () => {
      console.log('🧪 TEST: Clearing notification prompt test mode');
      forceShowRef.current = false;
      localStorage.removeItem('tpp_test_notification_prompt');
      setShowPrompt(false);
    };

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      window.removeEventListener('pwa-notifications-enabled', handleEnabled);
      window.removeEventListener('pwa-notifications-disabled', handleDisabled);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleEnable = async () => {
    setIsRequesting(true);
    
    try {
      // Request permission based on platform
      let permissionGranted = false;
      
      if (Capacitor.isNativePlatform()) {
        // Native app - use Capacitor
        try {
          const { LocalNotifications } = await import('@capacitor/local-notifications');
          const result = await LocalNotifications.requestPermissions();
          permissionGranted = result.display === 'granted';
          
          // Also request push notification permissions if available
          try {
            const { PushNotifications } = await import('@capacitor/push-notifications');
            const pushResult = await PushNotifications.requestPermissions();
            if (pushResult.receive === 'granted') {
              await PushNotifications.register();
            }
          } catch (e) {
            // Push notifications not available or failed - continue anyway
            console.warn('Push notifications not available:', e);
          }
        } catch (error) {
          throw new Error('Failed to request native notification permissions');
        }
      } else {
        // PWA - use browser API
        await pwaNotificationService.enable();
        // Check actual permission after request
        permissionGranted = await checkActualPermissionStatus();
      }
      
      if (permissionGranted) {
        // Update settings in localStorage and sync to Firestore
        try {
          const settings = JSON.parse(localStorage.getItem('tpprover_settings') || '{}');
          if (!settings.notifications) settings.notifications = {};
          settings.notifications.push = true;
          localStorage.setItem('tpprover_settings', JSON.stringify(settings));
          
          // Sync notification settings to Firestore (enables server-side push notifications)
          await syncNotificationSettingsToFirestore();
        } catch (e) {
          console.error('Error saving notification settings:', e);
        }
        
        // For native apps, ensure FCM token gets saved when registered
        if (Capacitor.isNativePlatform()) {
          try {
            const { PushNotifications } = await import('@capacitor/push-notifications');
            // Add listener for when token is received
            PushNotifications.addListener('registration', async (token) => {
              try {
                const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
                const { db } = await import('../../config/firebase');
                const user = JSON.parse(localStorage.getItem('tpprover_user') || 'null');
                const userId = user.uid || user.email?.toLowerCase();
                
                if (userId) {
                  const userRef = doc(db, 'users', userId);
                  await setDoc(userRef, {
                    fcmToken: token.value,
                    pushToken: token.value, // Backward compatibility
                    notificationSettings: {
                      push: true,
                      pushEnabled: true,
                      lastUpdated: serverTimestamp()
                    },
                    deviceInfo: {
                      platform: Capacitor.getPlatform(),
                      isNative: true,
                      lastUpdated: serverTimestamp()
                    }
                  }, { merge: true });
                  console.log('✅ FCM token saved to Firestore');
                }
              } catch (error) {
                console.error('Failed to save FCM token:', error);
              }
            });
          } catch (e) {
            // Push notifications not available
            console.warn('Push notifications listener not available:', e);
          }
        }
        
        // Update status immediately
        setStatus(prev => ({ ...prev, permission: 'granted', enabled: true }));
        setShowPrompt(false);
        
        // Record that we showed this prompt now (will show again in 15 days if they dismiss)
        // But if they enable, we won't show again until disabled
        localStorage.setItem('tpprover_notification_prompt_last_shown', Date.now().toString());
        
        // Show success message
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { 
            message: '🎉 Notifications enabled! You\'ll now receive important updates.', 
            type: 'success' 
          } 
        }));
      } else {
        throw new Error('Permission was not granted');
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error);
      
      // Re-check actual permission status (user might have granted it manually)
      const actualPermission = await checkActualPermissionStatus();
      if (actualPermission) {
        // Permission was actually granted (maybe user granted it in system settings)
        setShowPrompt(false);
        setStatus(prev => ({ ...prev, permission: 'granted', enabled: true }));
      } else {
        // Show error message
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { 
            message: error.message || 'Failed to enable notifications. Please enable them in your device settings.', 
            type: 'error' 
          } 
        }));
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Record current time - will show again in 15 days
    // This prevents spamming users if they dismiss/close/ignore the modal
    const now = Date.now();
    localStorage.setItem('tpprover_notification_prompt_last_shown', now.toString());
    console.log('📅 Notification prompt dismissed. Will show again in 15 days.');
  };

  if (!showPrompt || !status.supported) {
    return null;
  }

  return (
    <Modal
      open={showPrompt}
      onClose={handleDismiss}
      title="Enable Your Notifications"
      theme={theme}
      variant="modern"
      maxWidth="max-w-md"
      titleExtra={
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faMobile} style={{ fontSize: '18px' }} />
        </div>
      }
    >
      <div className="space-y-4">
        {/* Content */}
        <div className="space-y-4">
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold mb-1" style={{ color: theme.text }}>
              Stay on Track
            </h2>
            <p className="text-sm" style={{ color: theme.textLight }}>
              Reminders of your research!
            </p>
          </div>
          {/* Benefits List */}
          <div 
            className="rounded-lg p-4 space-y-2"
            style={{
              background: theme?.cardBackground || '#f9fafb',
              border: `1px solid ${theme?.border || '#e5e7eb'}`
            }}
          >
            <p className="text-sm font-medium mb-2" style={{ color: theme.text }}>
              You'll receive notifications for:
            </p>
            <ul className="space-y-1.5 ml-4">
              {[
                'Research reminders and protocol updates',
                'Order delivery status',
                'Cycle reminders when a repeated protocol should be started',
                'Low stock alerts for your peptides',
                'Important app updates and new features'
              ].map((benefit, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm" style={{ color: theme.textLight }}>
                  <span style={{ color: theme.primary }} className="mt-1">•</span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={handleEnable}
              disabled={isRequesting}
              className="w-full px-6 py-3 rounded-lg text-white font-semibold text-sm shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #5F7F76 0%, #3d5a52 100%)'
              }}
            >
              <BellRing size={18} />
              {isRequesting ? 'Enabling...' : 'Enable Notifications'}
            </button>
            
            <button
              onClick={handleDismiss}
              className="w-full px-6 py-3 rounded-lg font-medium text-sm transition-all hover:opacity-80"
              style={{
                background: theme?.cardBackground || '#f3f4f6',
                color: theme?.textLight || '#6b7280'
              }}
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
