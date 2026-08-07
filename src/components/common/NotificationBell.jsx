import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, MessageSquare, Megaphone, Sparkles, Wrench, Users, ChevronDown, ChevronUp, Trash2, Clock, Bug, FileText } from 'lucide-react';
import ModernTooltip from '../ui/ModernTooltip';
import BadgeBump from '../ui/BadgeBump';
import { getUserNotifications, markNotificationAsRead, getAnnouncements } from '../../services/firebase';
import { useFirebase } from '../../context/FirebaseContext';
import pwaNotificationService from '../../services/pwaNotifications';
import {
  ANNOUNCEMENTS_SEEN_EVENT,
  countUnseenAnnouncements,
  getAnnouncementsLastSeenMs,
  markAnnouncementsSeen,
} from '../../utils/announcementSeen';

// Canonical body reader — handles legacy admin docs that only set `message`
// and newer docs that use `body`. Falls back to `content` for older seeds.
const getAnnouncementBody = (a) => a?.body || a?.message || a?.content || '';

export default function NotificationBell({ theme }) {
  const { firebaseUser } = useFirebase();
  const [panelPosition, setPanelPosition] = useState({ top: 0, right: 0 });
  // CRITICAL FIX: Persist notifications in localStorage to prevent count reset on refresh
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('tpprover_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [announcements, setAnnouncements] = useState(() => {
    try {
      const saved = localStorage.getItem('tpprover_announcements');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeTab, setActiveTab] = useState('announcements'); // 'announcements' or 'notifications'
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedAnnouncement, setExpandedAnnouncement] = useState(null);
  const [expandedNotification, setExpandedNotification] = useState(null);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, right: 0 });
  const notificationRef = useRef(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('tpprover_notifications', JSON.stringify(notifications));
    } catch (error) {
      console.warn('Failed to save notifications to localStorage:', error);
    }
  }, [notifications]);

  // Save announcements to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('tpprover_announcements', JSON.stringify(announcements));
    } catch (error) {
      console.warn('Failed to save announcements to localStorage:', error);
    }
  }, [announcements]);

  useEffect(() => {
    if (firebaseUser?.email) {
      loadNotifications();
      loadAnnouncements();
      
      // Poll for new notifications every 30 seconds
      const interval = setInterval(() => {
        loadNotifications();
        loadAnnouncements();
      }, 30000);
      
      // Listen for storage events (for cross-tab updates and admin panel updates)
      const handleStorageChange = (e) => {
        if (e.key === 'tpprover_announcements' || e.type === 'storage') {
          console.log('🔔 Storage event detected, reloading announcements...');
          loadAnnouncements();
        }
      };
      
      window.addEventListener('storage', handleStorageChange);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('storage', handleStorageChange);
      };
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
      // Check if click is outside both the button AND the panel
      const isOutsideButton = notificationRef.current && !notificationRef.current.contains(event.target);
      const isOutsidePanel = panelRef.current && !panelRef.current.contains(event.target);
      
      if (isOutsideButton && isOutsidePanel) {
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

  const loadNotifications = useCallback(async () => {
    if (!firebaseUser?.email) {
      // console.log('🔔 NotificationBell: No firebase user email');
      return;
    }
    
    try {
      setLoading(true);
      // console.log('🔔 NotificationBell: Loading notifications for:', firebaseUser.email);
      const userNotifications = await getUserNotifications(firebaseUser.email);
      // console.log('🔔 NotificationBell: Received notifications:', userNotifications);
      
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

      // CRITICAL FIX: Preserve local read state - don't override notifications that were marked as read locally
      setNotifications(prev => {
        const merged = validNotifications.map(newNotification => {
          const existingNotification = prev.find(existing => existing.id === newNotification.id);
          // If notification was marked as read locally, keep the local state
          if (existingNotification && existingNotification.isRead && !newNotification.isRead) {
            return existingNotification;
          }
          
          // Check if this is a new unread notification and show PWA notification
          if (!existingNotification && !newNotification.isRead) {
            // Show as PWA notification if enabled
            if (pwaNotificationService.shouldReceivePWANotifications()) {
              pwaNotificationService.sendPWANotification(newNotification);
            }
          }
          
          return newNotification;
        });
        return merged;
      });
    } catch (error) {
      console.error('🔔 NotificationBell: Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser?.email]);

  const loadAnnouncements = useCallback(async () => {
    try {
      // console.log('📢 NotificationBell: Loading announcements');
      const firebaseAnnouncements = await getAnnouncements();
      // console.log('📢 NotificationBell: Received announcements:', firebaseAnnouncements);
      
      if (firebaseAnnouncements && firebaseAnnouncements.length > 0) {
        setAnnouncements(firebaseAnnouncements);
      }
    } catch (error) {
      console.error('📢 NotificationBell: Failed to load announcements:', error);
      // Fall back to localStorage only
      try {
        const saved = localStorage.getItem('tpprover_announcements');
        if (saved) {
          setAnnouncements(JSON.parse(saved));
        }
      } catch (fallbackError) {
        console.error('📢 NotificationBell: Error loading from localStorage fallback:', fallbackError);
      }
    }
  }, []);

  const handleClearAllNotifications = async () => {
    const unreadNotifications = notifications.filter(n => !n.isRead);
    if (unreadNotifications.length === 0) return;

    // Update UI immediately (optimistic update) with current timestamp
    const readTimestamp = new Date();
    setNotifications(prev =>
      prev.map(n => n.isRead ? n : { ...n, isRead: true, readAt: readTimestamp })
    );

    // Sync to Firebase in background (non-blocking)
    setTimeout(async () => {
      try {
        for (const notification of unreadNotifications) {
          await markNotificationAsRead(notification.id);
        }
        console.log('✅ Successfully cleared all notifications and synced to Firebase');
      } catch (error) {
        console.warn('⚠️ Firebase sync failed (UI already updated, no impact on UX):', error.message);
      }
    }, 100);
  };

  // Calculate button position for portal positioning
  const updateButtonPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonPosition({
        top: rect.bottom + 8, // 8px gap below button
        right: window.innerWidth - rect.right // Align right edge
      });
    }
  };

  const handleBellClick = async () => {
    if (!showNotifications) {
      updateButtonPosition(); // Update position before showing
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

  // Helper function to get announcement category icon
  const getAnnouncementIcon = (category) => {
    const categoryStyles = {
      "What's New":  { icon: Sparkles, color: '#6366f1' },
      'Coming Up':   { icon: Clock,    color: '#f59e0b' },
      'Known Bug':   { icon: Bug,      color: '#ef4444' },
      'Team Update': { icon: Users,    color: '#22c55e' },
      // Legacy category fallbacks
      'New Feature': { icon: Sparkles, color: '#6366f1' },
      'Improvement': { icon: Sparkles, color: '#6366f1' },
      'Patch Note':  { icon: FileText, color: '#0ea5e9' },
      'In Progress': { icon: Clock,    color: '#f59e0b' },
      'WIP Bug':     { icon: Bug,      color: '#f97316' },
      'Community':   { icon: Users,    color: '#22c55e' },
      'General':     { icon: Megaphone, color: theme.textLight },
    };
    
    const style = categoryStyles[category] || categoryStyles['General'];
    const IconComponent = style.icon;
    return <IconComponent size={16} style={{ color: style.color }} />;
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Track unseen announcements (latest announcement vs last-seen timestamp).
  // `tpprover_announcements_last_seen` is written when the user opens the
  // announcements sheet (or the old full page). Until then, any post newer than their
  // last_seen surfaces a small dot on the bell.
  const [announcementsSeenAt, setAnnouncementsSeenAt] = useState(() => getAnnouncementsLastSeenMs());

  useEffect(() => {
    const refresh = (e) => {
      const fromEvent = e?.detail?.lastSeenMs;
      if (typeof fromEvent === 'number' && Number.isFinite(fromEvent)) {
        setAnnouncementsSeenAt(fromEvent);
        return;
      }
      setAnnouncementsSeenAt(getAnnouncementsLastSeenMs());
    };
    window.addEventListener(ANNOUNCEMENTS_SEEN_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(ANNOUNCEMENTS_SEEN_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const unseenAnnouncementCount = useMemo(
    () => countUnseenAnnouncements(announcements, announcementsSeenAt),
    [announcements, announcementsSeenAt]
  );

  const hasAnyUnread = unreadCount > 0 || unseenAnnouncementCount > 0;

  if (!firebaseUser?.email) {
    return null;
  }

  // DEBUG: Always show bell for debugging
  // console.log('🔔 NotificationBell: Rendering with', notifications.length, 'notifications, activeTab:', activeTab);
  
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
      <ModernTooltip text="Updates" position="bottom">
        <button
          ref={buttonRef}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔔 Bell clicked!', { showNotifications });
            handleBellClick();
          }}
          className="relative p-1.5 md:p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
          style={{ 
            cursor: 'pointer',
            pointerEvents: 'auto'
          }}
        >
          <Bell size={18} className="md:h-5 md:w-5" style={{ color: theme.text }} />
          {unreadCount > 0 ? (
            <div className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                 style={{ backgroundColor: theme.error }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          ) : unseenAnnouncementCount > 0 ? (
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full tpp-badge-pulse"
                 style={{ backgroundColor: theme.primary, boxShadow: '0 0 0 2px var(--tw-bg-opacity, rgba(0,0,0,0))' }}
                 title={`${unseenAnnouncementCount} new update${unseenAnnouncementCount > 1 ? 's' : ''} from the team`}
            />
          ) : null}
        </button>
      </ModernTooltip>

      {showNotifications && createPortal(
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0" 
            style={{ zIndex: 2147483646 }} 
          />
          <div 
            ref={panelRef}
            className="notification-overlay fixed w-80 max-h-96 rounded-lg border shadow-xl ring-1 ring-black/10"
            style={{ 
              backgroundColor: theme.cardBackground, 
              borderColor: theme.border,
              top: `${buttonPosition.top}px`,
              right: `${buttonPosition.right}px`,
              zIndex: 2147483647
            }}
          >
        {/* Header with tabs */}
        <div className="p-4 border-b" style={{ borderColor: theme.border }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold" style={{ color: theme.text }}>Updates</h3>
            <button
              onClick={() => setShowNotifications(false)}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              style={{ color: theme.textLight }}
            >
              <X size={16} style={{ color: theme.textLight }} />
            </button>
          </div>
          
          {/* Tab buttons */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveTab('announcements');
                // Mark announcements as seen so the bell dot clears.
                try {
                  const next = markAnnouncementsSeen(announcements || []);
                  setAnnouncementsSeenAt(next);
                } catch {
                  // ignore localStorage failures
                }
              }}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                activeTab === 'announcements' 
                  ? 'text-white' 
                  : 'hover:bg-gray-100'
              }`}
              style={{
                backgroundColor: activeTab === 'announcements' ? theme.primary : 'transparent',
                color: activeTab === 'announcements' ? theme.white : theme.text,
                cursor: 'pointer',
                pointerEvents: 'auto'
              }}
            >
              <div className="flex items-center gap-2">
                <Megaphone size={14} />
                <span>Announcements</span>
                {unseenAnnouncementCount > 0 && activeTab !== 'announcements' && (
                  <BadgeBump
                    count={unseenAnnouncementCount}
                    pulse
                    className="text-white"
                    style={{ backgroundColor: theme.primary }}
                  />
                )}
              </div>
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔔 Notifications tab clicked! Current tab:', activeTab);
                setActiveTab('notifications');
                console.log('🔔 Tab should now be: notifications');
              }}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                activeTab === 'notifications' 
                  ? 'text-white' 
                  : 'hover:bg-gray-100'
              }`}
              style={{
                backgroundColor: activeTab === 'notifications' ? theme.primary : 'transparent',
                color: activeTab === 'notifications' ? theme.white : theme.text,
                cursor: 'pointer',
                pointerEvents: 'auto'
              }}
            >
              <div className="flex items-center gap-2">
                <MessageSquare size={14} />
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-xs bg-red-500 text-white rounded-full px-1 min-w-[16px] h-4 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
            </button>
            </div>
            
            {/* Clear All Button for Notifications */}
            {activeTab === 'notifications' && notifications.some(n => !n.isRead) && (
                <ModernTooltip text="Clear all" position="left">
                  <button
                    onClick={handleClearAllNotifications}
                    className="px-2 py-1 text-xs rounded transition-colors hover:bg-gray-100"
                    style={{ color: theme.textLight }}
                  >
                    <Trash2 size={14} />
                  </button>
                </ModernTooltip>
            )}
          </div>
        </div>
        
        {/* Content area */}
        <div className="max-h-80 overflow-y-auto">
          {activeTab === 'notifications' ? (
            notifications.length === 0 ? (
              <div className="p-4 text-center">
                <MessageSquare size={32} className="mx-auto mb-2" style={{ color: theme.textLight }} />
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
                      <div className="text-sm break-words" style={{ color: theme.text }}>
                        {expandedNotification === notification.id ? (
                          <div>
                            <p>{notification.message}</p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                console.log('🔼 Collapse notification clicked');
                                setExpandedNotification(null);
                              }}
                              className="mt-2 text-xs flex items-center gap-1 hover:underline"
                              style={{ 
                                color: theme.primary,
                                cursor: 'pointer',
                                pointerEvents: 'auto'
                              }}
                            >
                              <ChevronUp size={12} />
                              Show less
                            </button>
                          </div>
                        ) : (
                          <div>
                            <p>
                              {(notification.message || '').length > 150 
                                ? (notification.message || '').substring(0, 150) + '...'
                                : (notification.message || '')
                              }
                            </p>
                            {(notification.message || '').length > 150 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  console.log('🔽 Expand notification clicked:', notification.id);
                                  setExpandedNotification(notification.id);
                                }}
                                className="mt-1 text-xs flex items-center gap-1 hover:underline"
                                style={{ 
                                  color: theme.primary,
                                  cursor: 'pointer',
                                  pointerEvents: 'auto'
                                }}
                              >
                                <ChevronDown size={12} />
                                Read more
                              </button>
                            )}
                          </div>
                        )}
                      </div>
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
            )
          ) : (
            announcements.length === 0 ? (
              <div className="p-4 text-center">
                <Megaphone size={32} className="mx-auto mb-2" style={{ color: theme.textLight }} />
                <p className="text-sm" style={{ color: theme.textLight }}>No announcements</p>
              </div>
            ) : (
              announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="p-4 border-b hover:bg-gray-50 transition-colors"
                  style={{ borderColor: theme.border }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getAnnouncementIcon(announcement.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium" style={{ color: theme.text }}>
                          {announcement.title}
                        </h4>
                        <span 
                          className="text-xs px-2 py-1 rounded"
                          style={{ 
                            backgroundColor: theme.accent + '20',
                            color: theme.text 
                          }}
                        >
                          {announcement.category}
                        </span>
                      </div>
                      <div className="text-sm break-words" style={{ color: theme.text }}>
                        {expandedAnnouncement === announcement.id ? (
                          <div>
                            <p>{getAnnouncementBody(announcement)}</p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                console.log('🔼 Collapse announcement clicked');
                                setExpandedAnnouncement(null);
                              }}
                              className="mt-2 text-xs flex items-center gap-1 hover:underline"
                              style={{ 
                                color: theme.primary,
                                cursor: 'pointer',
                                pointerEvents: 'auto'
                              }}
                            >
                              <ChevronUp size={12} />
                              Show less
                            </button>
                          </div>
                        ) : (
                          <div>
                            <p>
                              {(() => {
                                const b = getAnnouncementBody(announcement);
                                return b.length > 150 ? b.substring(0, 150) + '...' : b;
                              })()}
                            </p>
                            {getAnnouncementBody(announcement).length > 150 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  console.log('🔽 Expand announcement clicked:', announcement.id);
                  setExpandedAnnouncement(announcement.id);
                }}
                className="mt-1 text-xs flex items-center gap-1 hover:underline"
                style={{ 
                  color: theme.primary,
                  cursor: 'pointer',
                  pointerEvents: 'auto'
                }}
              >
                <ChevronDown size={12} />
                Read more
              </button>
                            )}
                          </div>
                        )}
                      </div>
                      {announcement.date && (
                        <p className="text-xs mt-1" style={{ color: theme.textLight }}>
                          {new Date(announcement.date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>
        </>,
        document.body
      )}
    </div>
  );
}
