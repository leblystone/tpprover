import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, Smartphone } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { getCurrentDeviceInfo } from '../../utils/deviceDetection';
import unifiedNotificationService from '../../services/unifiedNotifications';

export default function AndroidPermissionPrompt({ theme }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('default');
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let timeoutId = null;

    const checkAndroidPermission = async () => {
      // Only check on Android native platform
      if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
        setIsChecking(false);
        return;
      }

      try {
        // Check if first launch permission prompt was already shown
        // This component is a FOLLOW-UP prompt, not the initial one
        const firstLaunchShown = localStorage.getItem('tpprover_native_first_launch_permission_shown');
        if (firstLaunchShown !== 'true') {
          // Let NativeFirstLaunchPermission handle the first prompt
          console.log('📱 AndroidPermissionPrompt: First launch prompt not yet shown - deferring to NativeFirstLaunchPermission');
          setIsChecking(false);
          return;
        }

        // Check if user has already dismissed this follow-up prompt
        const dismissed = localStorage.getItem('tpprover_android_permission_prompt_dismissed');
        if (dismissed === 'true') {
          setIsChecking(false);
          return;
        }

        // Check if user is logged in (this is a follow-up prompt, so require login)
        const user = JSON.parse(localStorage.getItem('tpprover_user') || 'null');
        if (!user?.email) {
          setIsChecking(false);
          return;
        }

        // Check current permission status
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const permission = await LocalNotifications.checkPermissions();
        
        setPermissionStatus(permission.display);

        // Show prompt if permission is not granted
        if (permission.display !== 'granted') {
          // Wait a bit after app launch before showing (better UX)
          timeoutId = setTimeout(() => {
            setShowPrompt(true);
          }, 3000); // 3 seconds after app loads
        }
      } catch (error) {
        console.error('❌ Failed to check Android notification permission:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkAndroidPermission();

    // Cleanup function
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const handleEnable = async () => {
    setIsRequesting(true);
    
    try {
      // Request permission using unified notification service
      const result = await unifiedNotificationService.requestPermission();
      
      if (result === 'granted') {
        setPermissionStatus('granted');
        setShowPrompt(false);
        
        // Mark as dismissed so it doesn't show again
        localStorage.setItem('tpprover_android_permission_prompt_dismissed', 'true');
        
        // Show success message
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { 
            message: '🎉 Notifications enabled! You\'ll now receive important updates.', 
            type: 'success' 
          } 
        }));

        // Try to initialize push notifications if available
        try {
          const { PushNotifications } = await import('@capacitor/push-notifications');
          
          // Add listener BEFORE registering to catch token immediately
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
                  deviceInfo: getCurrentDeviceInfo(),
                }, { merge: true });
                console.log('✅ FCM token saved to Firestore from Android prompt');
              }
            } catch (error) {
              console.error('Failed to save FCM token:', error);
            }
          });
          
          const pushPermission = await PushNotifications.requestPermissions();
          if (pushPermission.receive === 'granted') {
            await PushNotifications.register();
          }
        } catch (error) {
          console.warn('Push notifications not available:', error);
        }
      } else {
        throw new Error('Permission was not granted');
      }
    } catch (error) {
      console.error('Failed to enable Android notifications:', error);
      
      // Show error message
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { 
          message: error.message || 'Failed to enable notifications. You can enable them later in Settings.', 
          type: 'error' 
        } 
      }));
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('tpprover_android_permission_prompt_dismissed', 'true');
  };

  // Don't show if checking, not Android, or permission already granted
  if (isChecking || !showPrompt || permissionStatus === 'granted') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={handleDismiss}
      />
      
      {/* Prompt */}
      <div 
        className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4" style={{ backgroundColor: theme.primary }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/20">
                <Bell size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Enable Notifications</h3>
                <p className="text-sm text-white/90">Stay updated on your research</p>
              </div>
            </div>
            <button 
              onClick={handleDismiss}
              className="p-1 rounded-full text-white hover:bg-white/20 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 bg-white">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Smartphone size={20} className="mt-1" style={{ color: theme.primary }} />
              <div>
                <h4 className="font-semibold mb-1" style={{ color: theme.text }}>
                  Get important updates
                </h4>
                <p className="text-sm" style={{ color: theme.textLight }}>
                  Receive notifications about research reminders, order updates, low stock alerts, and more - even when the app is closed.
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs" style={{ color: theme.textLight }}>
                <strong>Note:</strong> You can change notification settings anytime in Settings → Notifications
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDismiss}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
                style={{ backgroundColor: '#F3F4F6', color: '#374151' }}
              >
                Maybe Later
              </button>
              <button
                onClick={handleEnable}
                disabled={isRequesting}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: theme.primary }}
              >
                {isRequesting ? 'Enabling...' : 'Enable Notifications'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

