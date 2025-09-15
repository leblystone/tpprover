import React, { useState, useEffect } from 'react';
import { Bell, X, MessageSquare } from 'lucide-react';
import { getUserNotifications, markNotificationAsRead } from '../../services/firebase';
import { useFirebase } from '../../context/FirebaseContext';

export default function NotificationBell({ theme }) {
  const { firebaseUser } = useFirebase();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (firebaseUser?.email) {
      loadNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [firebaseUser?.email]);

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
      setNotifications(userNotifications);
    } catch (error) {
      console.error('🔔 NotificationBell: Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBellClick = async () => {
    setShowNotifications(!showNotifications);
    
    // Auto-mark all unread notifications as read when bell is clicked
    const unreadNotifications = notifications.filter(n => !n.isRead);
    if (unreadNotifications.length > 0) {
      try {
        // Mark all unread notifications as read
        for (const notification of unreadNotifications) {
          await markNotificationAsRead(notification.id);
        }
        
        // Update local state
        setNotifications(prev => 
          prev.map(n => ({ ...n, isRead: true, readAt: new Date() }))
        );
        
        console.log('🔔 Auto-marked', unreadNotifications.length, 'notifications as read');
      } catch (error) {
        console.error('Failed to auto-mark notifications as read:', error);
      }
    }
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
    <div className="relative">
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
          <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-lg border shadow-lg z-50"
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
