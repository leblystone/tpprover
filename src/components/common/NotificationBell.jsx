import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, MessageSquare } from 'lucide-react';
import { getUserNotifications, markNotificationAsRead } from '../../services/firebase';
import { useFirebase } from '../../context/FirebaseContext';

export default function NotificationBell({ theme }) {
  const { firebaseUser } = useFirebase();
  // CRITICAL FIX: Persist notifications in localStorage to prevent count reset on refresh
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('tpprover_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(false);
  const notificationRef = useRef(null);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('tpprover_notifications', JSON.stringify(notifications));
    } catch (error) {
      console.warn('Failed to save notifications to localStorage:', error);
    }
  }, [notifications]);

  useEffect(() => {
    if (firebaseUser?.email) {
      loadNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [firebaseUser?.email]);

  // CRITICAL FIX: Clean up expired notifications from localStorage on app start
  useEffect(() => {
    const cleanupExpiredNotifications = () => {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      setNotifications(prev => {
        const validNotifications = prev.filter(notification => {
          // Keep unread notifications
          if (!notification.isRead) return true;
          
          // For read notifications, check if they're within 24 hours
          const readAt = notification.readAt;
          if (!readAt) return true; // Keep if no readAt timestamp
          
          // Convert timestamp if needed
          const readDate = new Date(readAt);
          const isWithin24Hours = readDate > twentyFourHoursAgo;
          
          if (!isWithin24Hours) {
            console.log('🔔 Cleaning up expired localStorage notification:', notification.id);
          }
          
          return isWithin24Hours;
        });
        
        return validNotifications;
      });
    };

    // Run cleanup on component mount
    cleanupExpiredNotifications();
    
    // Also run cleanup every hour to keep localStorage clean
    const cleanupInterval = setInterval(cleanupExpiredNotifications, 60 * 60 * 1000); // 1 hour
    
    return () => clearInterval(cleanupInterval);
  }, []);

  // Handle click outside to close notifications panel
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showNotifications]);

  const loadNotifications = async () => {
    if (!firebaseUser?.email) {
      console.log('🔔 NotificationBell: No firebase user email');
      return;
    }
    
    try {
      setLoading(true);
      console.log('🔔 NotificationBell: Loading notifications for:', firebaseUser.email);
      const userNotifications = await getUserNotifications(firebaseUser.email);
      console.log('🔔 NotificationBell: Received notifications:', userNotifications);
      
      // CRITICAL FIX: Filter out notifications that should be auto-dismissed (24h after read)
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const validNotifications = userNotifications.filter(notification => {
        // Keep unread notifications
        if (!notification.isRead) return true;
        
        // For read notifications, check if they're within 24 hours
        const readAt = notification.readAt;
        if (!readAt) return true; // Keep if no readAt timestamp
        
        // Convert Firebase timestamp if needed
        const readDate = readAt.toDate ? readAt.toDate() : new Date(readAt);
        const isWithin24Hours = readDate > twentyFourHoursAgo;
        
        if (!isWithin24Hours) {
          console.log('🔔 Auto-filtering expired notification:', notification.id);
        }
        
        return isWithin24Hours;
      });
      
      setNotifications(validNotifications);
    } catch (error) {
      console.error('🔔 NotificationBell: Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBellClick = async () => {
    if (!showNotifications) {
      // Opening notifications panel - mark all as read immediately for instant UI feedback
      const unreadNotifications = notifications.filter(n => !n.isRead);
      if (unreadNotifications.length > 0) {
        // Update UI immediately (optimistic update) with current timestamp
        const readTimestamp = new Date();
        setNotifications(prev => 
          prev.map(n => ({ ...n, isRead: true, readAt: readTimestamp }))
        );
        
        // Try to sync with Firebase in background (optional)
        setTimeout(async () => {
          try {
            for (const notification of unreadNotifications) {
              await markNotificationAsRead(notification.id);
            }
            console.log('✅ Successfully synced read status to Firebase');
          } catch (error) {
            console.warn('⚠️ Firebase sync failed (UI already updated, no impact on UX):', error.message);
            // Don't revert the optimistic update - user experience is more important than Firebase sync
            // The notifications will auto-delete after 24 hours anyway
          }
        }, 100); // Small delay to ensure UI updates first
      }
    }
    
    setShowNotifications(!showNotifications);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (!firebaseUser?.email) {
    return null;
  }

  // DEBUG: Always show bell for debugging
  console.log('🔔 NotificationBell: Rendering with', notifications.length, 'notifications');
  
  // Make debugging functions available globally
  React.useEffect(() => {
    window.debugNotifications = {
      checkAuth: () => {
        console.log('🔔 Firebase User:', firebaseUser);
        console.log('🔔 User Email:', firebaseUser?.email);
        return firebaseUser;
      },
      testNotifications: async () => {
        if (!firebaseUser?.email) {
          console.error('🔔 No Firebase user logged in!');
          return;
        }
        try {
          const notifications = await getUserNotifications(firebaseUser.email);
          console.log('🔔 Test result:', notifications);
          return notifications;
        } catch (error) {
          console.error('🔔 Test failed:', error);
        }
      },
      forceRefresh: () => {
        loadNotifications();
      }
    };
  }, [firebaseUser, loadNotifications]);

  return (
    <div className="relative" ref={notificationRef}>
      <button
        onClick={handleBellClick}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
        title="Notifications"
      >
        <Bell size={20} style={{ color: theme.text }} />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
               style={{ backgroundColor: theme.error }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {showNotifications && (
        <>
          {/* Backdrop to prevent blending */}
          <div className="fixed inset-0 z-[9998]" onClick={() => setShowNotifications(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-lg border shadow-xl z-[9999] ring-1 ring-black/10"
               style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}>
            <div className="p-4 border-b" style={{ borderColor: theme.border }}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold" style={{ color: theme.text }}>Notifications</h3>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-1 rounded hover:bg-gray-100"
                >
                  <X size={16} style={{ color: theme.textLight }} />
                </button>
              </div>
            </div>
            
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center">
                  <Bell size={32} className="mx-auto mb-2" style={{ color: theme.textLight }} />
                  <p className="text-sm" style={{ color: theme.textLight }}>No notifications</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b hover:bg-gray-50 transition-colors ${!notification.isRead ? 'bg-blue-50' : ''}`}
                    style={{ borderColor: theme.border }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <MessageSquare size={16} style={{ color: theme.primary }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-medium" style={{ color: theme.text }}>
                            {notification.title}
                          </h4>
                          {!notification.isRead && (
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                          )}
                        </div>
                        <p className="text-sm break-words" style={{ color: theme.text }}>
                          {notification.message}
                        </p>
                        {notification.createdAt && (
                          <p className="text-xs mt-1" style={{ color: theme.textLight }}>
                            {notification.createdAt.toDate ? 
                              notification.createdAt.toDate().toLocaleDateString() : 
                              'Recently'
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
