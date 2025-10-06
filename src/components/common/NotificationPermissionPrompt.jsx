import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, Smartphone } from 'lucide-react';
import pwaNotificationService from '../../services/pwaNotifications';

export default function NotificationPermissionPrompt({ theme }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [status, setStatus] = useState({
    supported: false,
    permission: 'default',
    enabled: false
  });

  useEffect(() => {
    // Check if we should show the prompt
    const shouldShowPrompt = () => {
      // Don't show if notifications are not supported
      if (!('Notification' in window)) return false;
      
      // Don't show if permission is already granted or denied
      if (Notification.permission !== 'default') return false;
      
      // Don't show if user has already dismissed it
      const dismissed = localStorage.getItem('tpprover_notification_prompt_dismissed');
      if (dismissed === 'true') return false;
      
      // Show if user is logged in and has been using the app for a bit
      const user = JSON.parse(localStorage.getItem('tpprover_user') || 'null');
      if (!user?.email) return false;
      
      // Check if user has been active for at least 2 minutes (to avoid showing immediately)
      const firstVisit = localStorage.getItem('tpprover_first_visit');
      if (!firstVisit) {
        localStorage.setItem('tpprover_first_visit', Date.now().toString());
        return false;
      }
      
      const timeSinceFirstVisit = Date.now() - parseInt(firstVisit);
      return timeSinceFirstVisit > 120000; // 2 minutes
    };

    // Update status
    const updateStatus = () => {
      const pwaStatus = pwaNotificationService.getStatus();
      setStatus(pwaStatus);
      
      // Show prompt if conditions are met
      if (shouldShowPrompt() && !showPrompt) {
        setShowPrompt(true);
      }
    };

    updateStatus();

    // Listen for PWA notification events
    const handleEnabled = () => updateStatus();
    const handleDisabled = () => updateStatus();

    window.addEventListener('pwa-notifications-enabled', handleEnabled);
    window.addEventListener('pwa-notifications-disabled', handleDisabled);

    return () => {
      window.removeEventListener('pwa-notifications-enabled', handleEnabled);
      window.removeEventListener('pwa-notifications-disabled', handleDisabled);
    };
  }, [showPrompt]);

  const handleEnable = async () => {
    setIsRequesting(true);
    
    try {
      await pwaNotificationService.enable();
      setShowPrompt(false);
      
      // Mark as dismissed so it doesn't show again
      localStorage.setItem('tpprover_notification_prompt_dismissed', 'true');
      
      // Show success message
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { 
          message: '🎉 Notifications enabled! You\'ll now receive important updates.', 
          type: 'success' 
        } 
      }));
    } catch (error) {
      console.error('Failed to enable notifications:', error);
      
      // Show error message
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { 
          message: error.message || 'Failed to enable notifications', 
          type: 'error' 
        } 
      }));
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('tpprover_notification_prompt_dismissed', 'true');
  };

  if (!showPrompt || !status.supported) {
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
        <div className="px-6 py-4" style={{ backgroundColor: '#A3B18A' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/20">
                <Bell size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Stay Updated</h3>
                <p className="text-sm text-white/90">Enable notifications for important updates</p>
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
                  Get notified even when the app is closed
                </h4>
                <p className="text-sm" style={{ color: theme.textLight }}>
                  Receive important updates about your research, orders, and new features directly to your device.
                </p>
              </div>
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
                style={{ backgroundColor: '#A3B18A' }}
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
