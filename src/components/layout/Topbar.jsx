import React, { useState, useEffect } from 'react';
import { Menu, Upload, Edit, Plus, X, MessageSquareDot, AlertCircle, MessageCircleReply, User, Settings } from 'lucide-react';
import ModernTooltip from '../ui/ModernTooltip';
import { useLocation, useNavigate } from 'react-router-dom';
import GlossaryQuickModal from '../glossary/GlossaryQuickModal';
import { useAppContext } from '../../context/AppContext.jsx';
import { getUserTickets, markTicketAsRead, getUserAdminMessages, markAdminMessageAsRead, deleteAdminMessage } from '../../services/firebase';
import SupportChatModal from '../common/SupportChatModal';
import AdminMessageModal from '../common/AdminMessageModal';
import { Capacitor } from '@capacitor/core';

export default function Topbar({ onMenuClick, theme, onDashboardCustomize, isCustomizing = false, tabs, activeTab, onTabChange, onActionClick, actionDisabled, autoSaveIndicator }) {
  const location = useLocation();
  const navigate = useNavigate();
  // Handle both /page and /app/page routing patterns
  const pathParts = location.pathname.split('/').filter(Boolean);
  const seg = pathParts[0] === 'app' ? (pathParts[1] || 'dashboard') : (pathParts[0] || 'dashboard');
  const onDashboard = seg === 'dashboard' || location.pathname === '/app' || location.pathname === '/app/' || location.pathname.includes('/dashboard');
  const [customizingState, setCustomizingState] = React.useState(false);

  // Listen for customizing state changes from dashboard
  useEffect(() => {
    const handleCustomizingChange = (event) => {
      setCustomizingState(event.detail.isCustomizing);
    };
    window.addEventListener('tpp:dashboard-customizing-changed', handleCustomizingChange);
    return () => window.removeEventListener('tpp:dashboard-customizing-changed', handleCustomizingChange);
  }, []);

  const { user } = useAppContext();
  
  // Support ticket state
  const [openTicket, setOpenTicket] = useState(null);
  const [hasUnreadResponse, setHasUnreadResponse] = useState(false);
  const [showSupportChat, setShowSupportChat] = useState(false);
  
  // Admin message state
  const [adminMessage, setAdminMessage] = useState(null);
  const [hasUnreadAdminMessage, setHasUnreadAdminMessage] = useState(false);
  const [showAdminMessage, setShowAdminMessage] = useState(false);

  // Load user's open tickets
  useEffect(() => {
    if (!user?.email) {
      return;
    }

    const loadOpenTickets = async () => {
      try {
        const tickets = await getUserTickets(user.email);
        
        // Helper function to check if closed ticket should be shown
        const shouldShowClosedTicket = (ticket) => {
          if (ticket.status !== 'closed' && ticket.status !== 'resolved') {
            return false;
          }
          
          const now = new Date();
          const twentyFourHoursAgo = now.getTime() - (24 * 60 * 60 * 1000);
          
          // Helper to convert Firestore Timestamp to Date
          const convertTimestamp = (timestamp) => {
            if (!timestamp) return null;
            try {
              if (timestamp?.toDate) {
                return timestamp.toDate();
              } else if (timestamp?.toMillis) {
                return new Date(timestamp.toMillis());
              } else if (timestamp instanceof Date) {
                return timestamp;
              } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
                return new Date(timestamp);
              } else {
                return new Date(timestamp);
              }
            } catch (error) {
              console.warn('⚠️ Error converting timestamp:', error, timestamp);
              return null;
            }
          };
          
          // Check closedAt timestamp - if closed more than 24 hours ago, hide it
          let closedAt = convertTimestamp(ticket.closedAt);
          const updatedAt = convertTimestamp(ticket.updatedAt);
          const readAt = convertTimestamp(ticket.userReadAt);
          
          // If no closedAt, we need to be smart about using updatedAt
          // updatedAt gets updated when ticket is read, so we can't trust it if readAt is more recent
          if ((!closedAt || isNaN(closedAt.getTime())) && (ticket.status === 'closed' || ticket.status === 'resolved')) {
            // Only use updatedAt if it's older than userReadAt (meaning it wasn't updated when read)
            // OR if there's no userReadAt
            if (updatedAt && !isNaN(updatedAt.getTime())) {
              if (!readAt || isNaN(readAt.getTime()) || updatedAt.getTime() < readAt.getTime()) {
                // updatedAt is valid and predates the read, so it likely represents when ticket was closed
                closedAt = updatedAt;
              }
            }
          }
          
          // If still no closedAt, use createdAt as last resort (ticket creation time)
          // This handles edge cases where tickets don't have proper timestamps
          if ((!closedAt || isNaN(closedAt.getTime())) && (ticket.status === 'closed' || ticket.status === 'resolved')) {
            const createdAt = convertTimestamp(ticket.createdAt);
            if (createdAt && !isNaN(createdAt.getTime())) {
              closedAt = createdAt;
            }
          }
          
          // Primary check: if we have a closedAt timestamp, use it
          if (closedAt && !isNaN(closedAt.getTime())) {
            const hoursSinceClosed = (now.getTime() - closedAt.getTime()) / (1000 * 60 * 60);
            // If closed more than 24 hours ago, hide it regardless of read status
            if (hoursSinceClosed >= 24) {
              return false;
            }
          }
          
          // If no closedAt timestamp, we need to be more careful
          // If userReadAt exists and is > 24h ago, ticket was definitely closed > 24h ago (closed before read)
          // If userReadAt is recent, we can't determine closure time reliably, so hide it
          if ((!closedAt || isNaN(closedAt.getTime()))) {
            if (!readAt || isNaN(readAt.getTime())) {
              // No read timestamp - can't determine closure time, hide it
              console.warn('⚠️ Ticket has no closedAt and no userReadAt, hiding:', ticket.id);
              return false;
            }
            
            // Use readAt as proxy: if ticket was read > 24h ago, it was closed > 24h ago
            // If read recently, we can't tell when it was closed, so hide it to be safe
            const hoursSinceRead = (now.getTime() - readAt.getTime()) / (1000 * 60 * 60);
            if (hoursSinceRead >= 24) {
              // Read more than 24 hours ago - ticket was definitely closed > 24h ago
              return false;
            }
            
            // Read within last 24 hours, but we don't know when it was closed
            // To prevent indefinite display of old tickets, hide it if we can't determine closure time
            // Only show if we have updatedAt that predates the read (indicating closure before read)
            if (updatedAt && !isNaN(updatedAt.getTime()) && updatedAt.getTime() < readAt.getTime()) {
              // updatedAt predates readAt, so it likely represents closure time
              const hoursSinceUpdated = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
              if (hoursSinceUpdated >= 24) {
                return false; // Closed more than 24h ago
              }
              return true; // Closed within 24h
            }
            
            // Can't reliably determine closure time - hide it
            console.warn('⚠️ Ticket has no closedAt and updatedAt is not reliable, hiding:', ticket.id);
            return false;
          }
          
          // We have a valid closedAt and it's within 24 hours
          // Show if unread OR read within last 24 hours
          if (!readAt || isNaN(readAt.getTime())) {
            // Ticket was closed within 24 hours and is unread - show it
            return true;
          }
          
          // Ticket was closed within 24 hours - show it regardless of read status
          // (The 24-hour timer is based on closure, not read time)
          return true;
        };
        
        // Find tickets to show: open tickets OR closed tickets that meet criteria
        let visibleTicket = null;
        let foundOpenTicket = false;
        
        for (const t of tickets) {
          // Always show open tickets
          if (t.status === 'new' || t.status === 'in-progress') {
            visibleTicket = t;
            foundOpenTicket = true;
            console.log('✅ Showing open ticket:', { id: t.id, status: t.status });
            break; // Open tickets take priority
          }
          
          // Check closed tickets
          const shouldShow = shouldShowClosedTicket(t);
          
          // Debug logging for closed tickets
          if (t.status === 'closed' || t.status === 'resolved') {
            const closedAt = t.closedAt?.toDate ? t.closedAt.toDate() : (t.closedAt?.toMillis ? new Date(t.closedAt.toMillis()) : null);
            const readAt = t.userReadAt?.toDate ? t.userReadAt.toDate() : (t.userReadAt?.toMillis ? new Date(t.userReadAt.toMillis()) : null);
            const updatedAt = t.updatedAt?.toDate ? t.updatedAt.toDate() : (t.updatedAt?.toMillis ? new Date(t.updatedAt.toMillis()) : null);
            const now = new Date();
            const hoursSinceClosed = closedAt ? (now.getTime() - closedAt.getTime()) / (1000 * 60 * 60) : null;
            const hoursSinceRead = readAt ? (now.getTime() - readAt.getTime()) / (1000 * 60 * 60) : null;
            const hoursSinceUpdated = updatedAt ? (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60) : null;
            
            if (shouldShow) {
              console.log('✅ Showing closed ticket:', {
                id: t.id,
                status: t.status,
                closedAt: closedAt?.toISOString() || 'undefined',
                userReadAt: readAt?.toISOString() || 'undefined',
                updatedAt: updatedAt?.toISOString() || 'undefined',
                hoursSinceClosed: hoursSinceClosed?.toFixed(2) || 'N/A',
                hoursSinceRead: hoursSinceRead?.toFixed(2) || 'N/A',
                hoursSinceUpdated: hoursSinceUpdated?.toFixed(2) || 'N/A',
                rawClosedAt: t.closedAt,
                rawUserReadAt: t.userReadAt,
                rawUpdatedAt: t.updatedAt
              });
              if (!visibleTicket) {
                visibleTicket = t; // Use first visible closed ticket
              }
            }
          }
        }
        
        // Summary log
        if (visibleTicket) {
          console.log('📌 Support response visible:', { 
            id: visibleTicket.id, 
            status: visibleTicket.status,
            isOpen: foundOpenTicket
          });
        } else {
          console.log('✅ No support response to show (all tickets filtered out)');
        }
        
        setOpenTicket(visibleTicket || null);
        
        // Check if there are unread responses
        if (visibleTicket) {
          // For open tickets, check admin messages
          if ((visibleTicket.status === 'new' || visibleTicket.status === 'in-progress') && visibleTicket.lastAdminMessageAt) {
            const lastRead = localStorage.getItem(`ticket_${visibleTicket.id}_lastRead`);
            const lastReadTime = lastRead ? new Date(lastRead) : new Date(0);
            const lastAdminTime = visibleTicket.lastAdminMessageAt?.toDate ? visibleTicket.lastAdminMessageAt.toDate() : new Date(visibleTicket.lastAdminMessageAt);
            const hasUnread = lastAdminTime > lastReadTime;
            setHasUnreadResponse(hasUnread);
          }
          // For closed tickets, check if unread
          else if (visibleTicket.status === 'closed' || visibleTicket.status === 'resolved') {
            const isUnread = !visibleTicket.userReadAt || visibleTicket.userReadAt === null;
            setHasUnreadResponse(isUnread);
          } else {
            setHasUnreadResponse(false);
          }
        } else {
          setHasUnreadResponse(false);
        }
      } catch (error) {
        console.error('❌ Failed to load open tickets:', error);
      }
    };

    loadOpenTickets();
    // Reload every 30 seconds to check for new responses
    const interval = setInterval(loadOpenTickets, 30000);
    return () => clearInterval(interval);
  }, [user?.email]);

  // Load user's admin messages (optimized to reduce main thread blocking)
  useEffect(() => {
    if (!user?.email) {
      return;
    }

    let isMounted = true;
    let intervalId = null;

    const loadAdminMessages = async () => {
      if (!isMounted) return;
      
      try {
        // Defer non-critical work to avoid blocking main thread
        const messages = await getUserAdminMessages(user.email);
        
        if (!isMounted) return;
        
        // Optimize: Calculate once outside the loop
        const now = Date.now();
        const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
        
        // Find the most recent message that should be shown (optimized)
        let visibleMessage = null;
        for (const msg of messages) {
          // Show if unread
          if (!msg.userReadAt || msg.userReadAt === null) {
            visibleMessage = msg;
            break; // First unread message is the one to show
          }
          
          // Show if read within last 24 hours (optimized date comparison)
          const readAt = msg.userReadAt?.toMillis 
            ? msg.userReadAt.toMillis() 
            : (msg.userReadAt?.toDate ? msg.userReadAt.toDate().getTime() : new Date(msg.userReadAt).getTime());
          
          if (readAt >= twentyFourHoursAgo) {
            visibleMessage = msg;
            break; // Most recent message within 24h
          }
        }
        
        if (!isMounted) return;
        
        // Update state in a single batch
        setAdminMessage(visibleMessage || null);
        setHasUnreadAdminMessage(visibleMessage ? (!visibleMessage.userReadAt || visibleMessage.userReadAt === null) : false);
      } catch (error) {
        if (isMounted) {
          console.error('❌ Failed to load admin messages:', error);
        }
      }
    };

    // Initial load with slight delay to avoid blocking initial render
    const timeoutId = setTimeout(() => {
      loadAdminMessages();
      // Reload every 60 seconds (reduced frequency to reduce main thread pressure)
      intervalId = setInterval(loadAdminMessages, 60000);
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [user?.email]);

  // Mark ticket as read
  const handleMarkAsRead = async () => {
    if (openTicket) {
      try {
        // Mark as read in Firestore (for closed tickets)
        await markTicketAsRead(openTicket.id);
        
        // Also update localStorage for backward compatibility with open tickets
        localStorage.setItem(`ticket_${openTicket.id}_lastRead`, new Date().toISOString());
        
        // Update local state to remove unread indicator
        setHasUnreadResponse(false);
      } catch (error) {
        console.error('❌ Failed to mark ticket as read:', error);
      }
    }
  };

  // Mark admin message as read
  const handleMarkAdminMessageAsRead = async () => {
    if (adminMessage) {
      try {
        await markAdminMessageAsRead(adminMessage.id);
        setHasUnreadAdminMessage(false);
      } catch (error) {
        console.error('❌ Failed to mark admin message as read:', error);
      }
    }
  };

  // Only apply safe area padding for native apps (Android/iOS), not PWA/web
  const isNative = Capacitor.isNativePlatform();
  
  return (
    <>
      <header 
        className="backdrop-blur-xl border-b flex items-center px-3 lg:px-6 relative transition-all duration-300 topbar-header" 
        style={{ 
          paddingTop: isNative ? '0.375rem' : '0.5rem',
          paddingBottom: '0.5rem',
          minHeight: '3rem',
          borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
          background: theme.isDark 
            ? 'linear-gradient(180deg, rgba(17, 24, 39, 0.85) 0%, rgba(17, 24, 39, 0.95) 100%)'
            : 'linear-gradient(180deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.95) 100%)',
          boxShadow: theme.isDark
            ? '0 1px 3px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
            : '0 1px 3px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
        }}
      >
        {/* Left section - removed hamburger menu for mobile */}
        <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
          {/* Desktop: Keep hamburger for sidebar toggle */}
          <button 
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
            }}
            onTouchStart={(e) => {
              if (e.cancelable) {
                e.preventDefault();
              }
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMenuClick();
            }}
            className="hidden lg:block no-shadow p-1.5 touch-manipulation rounded-lg transition-all duration-200 hover:scale-105 active:scale-95" 
            style={{ 
              color: theme.text,
              WebkitTapHighlightColor: 'transparent',
              backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'
            }}
            aria-label="Open navigation menu"
            aria-expanded="false"
          >
            <Menu size={22} />
          </button>
        </div>
          
        {/* Tabs in Topbar - Center position - Desktop */}
        {tabs && tabs.length > 0 && (
          <div className="hidden lg:flex items-center gap-4 absolute left-1/2 transform -translate-x-1/2">
            {tabs.map(tab => (
              <button
                key={tab.value}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onTabChange(tab.value);
                }}
                className="px-2 pb-4 pt-2 text-base capitalize tracking-normal transition-all duration-200 relative whitespace-nowrap touch-manipulation"
                style={{
                  color: activeTab === tab.value ? theme.text : theme.textLight,
                  fontWeight: activeTab === tab.value ? 600 : 500,
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                {tab.label}
                {/* Active indicator line - below text */}
                {activeTab === tab.value && (
                  <span 
                    className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-300"
                    style={{ 
                      backgroundColor: theme.primary,
                      height: '3px',
                      boxShadow: `0 0 8px ${theme.primary}60`
                    }}
                  />
                )}
              </button>
            ))}
            {onActionClick && (
              <div 
                className="h-6 w-px mx-2" 
                style={{ backgroundColor: theme.border }}
              />
            )}
            {onActionClick && (
              <button 
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onActionClick();
                }}
                className="p-1.5 rounded-lg hover:scale-110 active:scale-95 hover:opacity-80 transition-all duration-200 touch-manipulation" 
                style={{ 
                  color: actionDisabled ? theme.textLight : theme.primary, 
                  backgroundColor: actionDisabled ? 'transparent' : `${theme.primary}10`,
                  border: `1.5px solid ${actionDisabled ? theme.border : theme.primary}`,
                  opacity: actionDisabled ? 0.4 : 1,
                  cursor: actionDisabled ? 'not-allowed' : 'pointer',
                  WebkitTapHighlightColor: 'transparent'
                }} 
                disabled={actionDisabled}
                title="Add New"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
              </button>
            )}
          </div>
        )}
        
        {/* Spacer to push icons to the right when no tabs */}
        {(!tabs || tabs.length === 0) && <div className="flex-1" />}
        
        {/* Mobile tabs - minimal underline style */}
        {tabs && tabs.length > 0 && (
          <div 
            className="lg:hidden flex items-center gap-2 flex-1 overflow-x-auto mobile-tabs-container mr-2" 
            style={{ 
              scrollbarWidth: 'none', 
              msOverflowStyle: 'none',
              minWidth: 0
            }}
          >
            <style>{`
              .mobile-tabs-container::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            {tabs.map(tab => (
              <button
                key={tab.value}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                }}
                onTouchStart={(e) => {
                  if (e.cancelable) {
                    e.preventDefault();
                  }
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onTabChange(tab.value);
                }}
                className="px-2 py-2 text-sm capitalize tracking-normal transition-all duration-200 relative whitespace-nowrap flex-shrink-0 touch-manipulation flex items-center"
                style={{
                  color: activeTab === tab.value ? theme.text : theme.textLight,
                  fontWeight: activeTab === tab.value ? 600 : 500,
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                {tab.label}
                {/* Active indicator line - below text */}
                {activeTab === tab.value && (
                  <span 
                    className="absolute left-0 right-0 rounded-full transition-all duration-300"
                    style={{ 
                      backgroundColor: theme.primary,
                      height: '3px',
                      boxShadow: `0 0 8px ${theme.primary}60`,
                      bottom: '0.25rem'
                    }}
                  />
                )}
              </button>
            ))}
          </div>
        )}
        
        <div className="flex items-center gap-1.5 lg:gap-2 flex-shrink-0" style={{ minWidth: 0 }}>
          {/* Mobile Add button - positioned in right container to avoid cutoff */}
          {tabs && tabs.length > 0 && onActionClick && (
            <button 
              type="button"
              onMouseDown={(e) => {
                // Prevent blur events on mobile
                e.preventDefault();
              }}
              onTouchStart={(e) => {
                // Prevent blur events on touch devices
                if (e.cancelable) {
                  e.preventDefault();
                }
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onActionClick();
              }}
              className="lg:hidden p-1.5 rounded-lg hover:scale-110 active:scale-95 transition-all duration-200 flex-shrink-0 touch-manipulation" 
              style={{ 
                color: actionDisabled ? theme.textLight : theme.primary, 
                backgroundColor: actionDisabled ? 'transparent' : `${theme.primary}10`,
                border: `1.5px solid ${actionDisabled ? theme.border : theme.primary}`,
                opacity: actionDisabled ? 0.4 : 1,
                cursor: actionDisabled ? 'not-allowed' : 'pointer',
                WebkitTapHighlightColor: 'transparent'
              }} 
              disabled={actionDisabled}
              title="Add New"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
            </button>
          )}
          {/* Auto Save Indicator */}
          {autoSaveIndicator && (
            <div className="mr-2">
              {autoSaveIndicator}
            </div>
          )}
          {/* Admin Message Chip - Only show on dashboard, appears first (before support response) - Personal Alert Style */}
          {onDashboard && adminMessage && (
              <button
                type="button"
                onMouseDown={(e) => {
                  // Prevent blur events on mobile
                  e.preventDefault();
                }}
                onTouchStart={(e) => {
                  // Prevent blur events on touch devices
                  e.preventDefault();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowAdminMessage(true);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 touch-manipulation ${
                  hasUnreadAdminMessage ? 'animate-breathe' : ''
                }`}
              style={{
                backgroundColor: hasUnreadAdminMessage 
                  ? (theme.primary || '#6366F1') 
                  : `${theme.primary || '#6366F1'}80`,
                color: '#FFFFFF',
                boxShadow: hasUnreadAdminMessage ? '0 2px 8px rgba(184, 112, 76, 0.3)' : 'none',
                WebkitTapHighlightColor: 'transparent'
              }}
              >
                <span className="whitespace-nowrap flex items-center gap-1">
                  From the Team
                  <MessageCircleReply size={14} />
                </span>
              </button>
          )}
          {/* Support Response Chip - Only show on dashboard, appears after admin message */}
          {onDashboard && openTicket && (
              <button
                type="button"
                onMouseDown={(e) => {
                  // Prevent blur events on mobile
                  e.preventDefault();
                }}
                onTouchStart={(e) => {
                  // Prevent blur events on touch devices
                  e.preventDefault();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowSupportChat(true);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 touch-manipulation ${
                  hasUnreadResponse ? 'animate-sway' : ''
                }`}
              style={{
                backgroundColor: hasUnreadResponse ? '#B8704C' : '#B8704C80',
                color: '#FFFFFF',
                boxShadow: hasUnreadResponse ? '0 2px 8px rgba(184, 112, 76, 0.3)' : 'none',
                WebkitTapHighlightColor: 'transparent'
              }}
              >
                <span className="whitespace-nowrap">Support Response</span>
                <MessageSquareDot size={14} />
              </button>
          )}
          {/* Account and Settings icons */}
          <button 
            type="button"
            onClick={() => navigate('/app/account')}
            className="p-1.5 lg:p-2 rounded-lg no-shadow transition-all duration-200 hover:scale-110 active:scale-95 hover:opacity-80 touch-manipulation"
            style={{ 
              color: theme.text,
              backgroundColor: 'transparent',
              WebkitTapHighlightColor: 'transparent'
            }}
            aria-label="Account"
          >
            <User className="h-5 w-5 lg:h-5 lg:w-5" />
          </button>
          
          <button 
            type="button"
            onClick={() => navigate('/app/settings')}
            className="p-1.5 lg:p-2 rounded-lg no-shadow transition-all duration-200 hover:scale-110 active:scale-95 hover:opacity-80 touch-manipulation"
            style={{ 
              color: theme.text,
              backgroundColor: 'transparent',
              WebkitTapHighlightColor: 'transparent'
            }}
            aria-label="Settings"
          >
            <Settings className="h-5 w-5 lg:h-5 lg:w-5" />
          </button>
          
          {onDashboard && onDashboardCustomize && (
              <button 
                type="button"
                onMouseDown={(e) => {
                  // Prevent blur events on mobile
                  e.preventDefault();
                }}
                onTouchStart={(e) => {
                  // Prevent blur events on touch devices
                  e.preventDefault();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDashboardCustomize();
                }}
                className={`p-1.5 lg:p-2 rounded-full no-shadow transition-all duration-200 touch-manipulation ${
                  customizingState ? 'ring-2 ring-opacity-50' : ''
                }`}
                style={{ 
                  color: theme.text,
                  backgroundColor: customizingState ? theme.primary : 'transparent',
                  ringColor: customizingState ? theme.primary : 'transparent',
                  WebkitTapHighlightColor: 'transparent'
                }}
                aria-label={customizingState ? "Done editing dashboard" : "Customize dashboard"}
              >
                <Edit className="h-4 w-4 lg:h-5 lg:w-5" />
              </button>
          )}
        </div>
      </header>

      {/* Admin Message Modal */}
      {showAdminMessage && adminMessage && (
        <AdminMessageModal
          message={adminMessage}
          onClose={() => setShowAdminMessage(false)}
          theme={theme}
          onMarkRead={handleMarkAdminMessageAsRead}
          onDelete={() => {
            // Reload messages after deletion
            setAdminMessage(null);
            setHasUnreadAdminMessage(false);
          }}
        />
      )}

      {/* Support Chat Modal */}
      {showSupportChat && openTicket && (
        <SupportChatModal
          ticket={openTicket}
          onClose={() => setShowSupportChat(false)}
          theme={theme}
          onMarkRead={handleMarkAsRead}
        />
      )}

      <style>{`
        .topbar-header {
          /* Height handled inline with safe area calculations */
        }
        @media (min-width: 1024px) {
          .topbar-header {
            min-height: 3rem !important; /* lg:h-12 for desktop */
            padding-top: 0px !important; /* No safe area padding on desktop */
          }
        }
        @keyframes sway {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-3deg); }
          75% { transform: rotate(3deg); }
        }
        .animate-sway {
          animation: sway 2s ease-in-out infinite;
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.9; }
        }
        .animate-breathe {
          animation: breathe 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}


