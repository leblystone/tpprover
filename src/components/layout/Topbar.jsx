import React, { useState, useEffect, useMemo } from 'react';
import { Menu, Upload, FileText, NotebookPen, Plus, X, MessageSquareDot, AlertCircle, MessageCircleReply, Smartphone, FlaskConical } from 'lucide-react';
import { UserCheck, User, GearSix } from '@phosphor-icons/react';
import { useTierAccess } from '../../utils/useSubscriptionAccess';
import { useSubscriptionAccess } from '../../utils/useSubscriptionAccess';
import { useFirebase } from '../../context/FirebaseContext';
import { useLocation, useNavigate } from 'react-router-dom';
import GlossaryQuickModal from '../glossary/GlossaryQuickModal';
import { useAppContext } from '../../context/AppContext.jsx';
import { useAnnouncementsUnseen } from '../../hooks/useAnnouncementsUnseen';
import { subscribeUserTickets, markTicketAsRead, getUserAdminMessages, markAdminMessageAsRead, deleteAdminMessage } from '../../services/firebase';
import SupportChatModal from '../common/SupportChatModal';
import AdminMessageModal from '../common/AdminMessageModal';
import { Capacitor } from '@capacitor/core';
import { getProtocolHistory } from '../../utils/protocolHistory';
import { DEV_TEST_UID, getDevOverride, setDevOverride, DEV_STATES, DEV_STATE_META } from '../../utils/devSubscriptionOverride';
import { DEV_UI_PAGES } from '../../utils/devUiPreview';
import SyncStatusIndicator from '../ui/SyncStatusIndicator';

export default function Topbar({ onMenuClick, theme, tabs, activeTab, onTabChange, onActionClick, actionItems, actionDisabled, autoSaveIndicator }) {
  const location = useLocation();
  const navigate = useNavigate();
  // Handle both /page and /app/page routing patterns
  const pathParts = location.pathname.split('/').filter(Boolean);
  const seg = pathParts[0] === 'app' ? (pathParts[1] || 'dashboard') : (pathParts[0] || 'dashboard');
  const onDashboard = seg === 'dashboard' || location.pathname === '/app' || location.pathname === '/app/' || location.pathname.includes('/dashboard');

  const { user, vendors = [], stockpile = [] } = useAppContext();
  const { firebaseUser } = useFirebase();
  const { unseenCount: unseenAnnouncementCount } = useAnnouncementsUnseen();
  const { subscriptionStatus } = useSubscriptionAccess();
  const { isFounder, tier } = useTierAccess();
  // UserCheck (checkmark) only for genuinely active paid/trialing accounts — not lapsed founders or free
  const isSubscribed = (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') && tier !== 'free';
  // Gold tint: active paid, trialing, OR active founder tier (not lapsed)
  const showPremiumAccountTint = isSubscribed || (isFounder && tier === 'founder');

  const computedActionItemCount = useMemo(() => {
    const pendingVendorCount = vendors.filter((v) => v?.isStub === true).length;
    const incompleteStockpileCount = stockpile.filter((item) => {
      const notes = item?.notes || '';
      return notes.includes('Added during protocol start') || notes.includes('Added during protocol edit');
    }).length;
    const protocolsNeedingFollowUpCount = getProtocolHistory().filter((entry) => {
      if (!entry?.endDate) return false;
      const hasFollowUpNote = entry.notes?.some((note) => note?.type === 'follow_up');
      return !hasFollowUpNote;
    }).length;

    return pendingVendorCount + incompleteStockpileCount + protocolsNeedingFollowUpCount;
  }, [vendors, stockpile]);


  // Expanding action menu (multi-item add button)
  const [showActionMenu, setShowActionMenu] = useState(false);
  const desktopActionMenuRef = React.useRef(null);
  const mobileActionMenuRef = React.useRef(null);
  const isInsideActionMenu = (target) => {
    if (!target) return false;
    return (
      desktopActionMenuRef.current?.contains(target) ||
      mobileActionMenuRef.current?.contains(target)
    );
  };

  // Dev-only: preview store / "what's new" / re-consent / page intro modals
  const [showDevUpdateMenu, setShowDevUpdateMenu] = useState(false);
  const devUpdateMenuRef = React.useRef(null);
  const showDevUpdatePreview =
    import.meta.env.DEV &&
    location.pathname.startsWith('/app') &&
    firebaseUser?.uid === DEV_TEST_UID;

  // Dev-only: subscription state switcher (replaces the floating DevToolbar)
  const [showDevSubMenu, setShowDevSubMenu] = useState(false);
  const devSubMenuRef = React.useRef(null);
  const [devSubCurrent, setDevSubCurrent] = useState(() => getDevOverride(firebaseUser?.uid));
  const showDevSubPicker =
    import.meta.env.DEV &&
    location.pathname.startsWith('/app') &&
    firebaseUser?.uid === DEV_TEST_UID;
  useEffect(() => {
    if (!showActionMenu) return;
    const handle = (e) => {
      if (!isInsideActionMenu(e.target)) {
        setShowActionMenu(false);
      }
    };
    document.addEventListener('mousedown', handle);
    document.addEventListener('touchstart', handle);
    return () => {
      document.removeEventListener('mousedown', handle);
      document.removeEventListener('touchstart', handle);
    };
  }, [showActionMenu]);

  useEffect(() => {
    if (!showDevUpdateMenu) return;
    const handle = (e) => {
      if (devUpdateMenuRef.current && !devUpdateMenuRef.current.contains(e.target)) {
        setShowDevUpdateMenu(false);
      }
    };
    document.addEventListener('mousedown', handle);
    document.addEventListener('touchstart', handle);
    return () => {
      document.removeEventListener('mousedown', handle);
      document.removeEventListener('touchstart', handle);
    };
  }, [showDevUpdateMenu]);

  useEffect(() => {
    if (!showDevSubMenu) return;
    const handle = (e) => {
      if (devSubMenuRef.current && !devSubMenuRef.current.contains(e.target)) {
        setShowDevSubMenu(false);
      }
    };
    document.addEventListener('mousedown', handle);
    document.addEventListener('touchstart', handle);
    return () => {
      document.removeEventListener('mousedown', handle);
      document.removeEventListener('touchstart', handle);
    };
  }, [showDevSubMenu]);

  // Keep sub picker in sync when override changes from elsewhere
  useEffect(() => {
    const uid = firebaseUser?.uid;
    const sync = () => setDevSubCurrent(getDevOverride(uid));
    window.addEventListener('tpp:dev-override-changed', sync);
    return () => window.removeEventListener('tpp:dev-override-changed', sync);
  }, [firebaseUser?.uid]);

  // Close menu when tabs/page changes
  useEffect(() => { setShowActionMenu(false); }, [activeTab, tabs]);
  useEffect(() => { setShowDevUpdateMenu(false); setShowDevSubMenu(false); }, [location.pathname, activeTab, tabs]);

  // Action items badge count
  const [actionItemCount, setActionItemCount] = useState(0);
  useEffect(() => {
    setActionItemCount(computedActionItemCount);
  }, [computedActionItemCount]);

  useEffect(() => {
    const handler = (e) => {
      const n = e.detail?.count;
      if (typeof n === 'number') setActionItemCount(n);
    };
    window.addEventListener('tpp:action-item-count', handler);
    return () => window.removeEventListener('tpp:action-item-count', handler);
  }, []);

  const ANNOUNCEMENTS_INTRO_KEY = 'tpp_announcements_icon_onboarding_done_v1';
  const [showAnnouncementsIntro, setShowAnnouncementsIntro] = useState(false);
  const [announcementsBuzz, setAnnouncementsBuzz] = useState(false);

  const markAnnouncementsIntroDone = () => {
    try {
      localStorage.setItem(ANNOUNCEMENTS_INTRO_KEY, '1');
    } catch {
      /* ignore */
    }
    setShowAnnouncementsIntro(false);
    setAnnouncementsBuzz(false);
  };

  // One-time nudge: toast + short buzz on the newspaper icon (first app use after this shipped).
  useEffect(() => {
    if (!firebaseUser) return undefined;
    let tShow;
    let tBuzz;
    let tToast;
    try {
      if (localStorage.getItem(ANNOUNCEMENTS_INTRO_KEY)) return undefined;
    } catch {
      return undefined;
    }
    tShow = setTimeout(() => {
      setShowAnnouncementsIntro(true);
      setAnnouncementsBuzz(true);
      tBuzz = setTimeout(() => setAnnouncementsBuzz(false), 2200);
      tToast = setTimeout(() => {
        setShowAnnouncementsIntro(false);
        try {
          localStorage.setItem(ANNOUNCEMENTS_INTRO_KEY, '1');
        } catch {
          /* ignore */
        }
      }, 8000);
    }, 1200);
    return () => {
      clearTimeout(tShow);
      clearTimeout(tBuzz);
      clearTimeout(tToast);
    };
  }, [firebaseUser]);

  // Dismiss intro when the sheet opens from anywhere (Topbar or deep link).
  useEffect(() => {
    const onOpen = () => markAnnouncementsIntroDone();
    window.addEventListener('tpp:open-announcements', onOpen);
    return () => window.removeEventListener('tpp:open-announcements', onOpen);
  }, []);

  // Support ticket state
  const [openTicket, setOpenTicket] = useState(null);
  const [allTickets, setAllTickets] = useState([]);
  const [hasUnreadResponse, setHasUnreadResponse] = useState(false);
  const [showSupportChat, setShowSupportChat] = useState(false);
  
  // Admin message state
  const [adminMessage, setAdminMessage] = useState(null);
  const [hasUnreadAdminMessage, setHasUnreadAdminMessage] = useState(false);
  const [showAdminMessage, setShowAdminMessage] = useState(false);

  // Subscribe to user's tickets in real time so when admin marks as closed, user sees it immediately (and 24h disappearance applies)
  useEffect(() => {
    if (!user?.email) {
      return;
    }

    const applyTickets = (tickets) => {
      try {
        // Store all tickets so unified chat can access full history
        setAllTickets(tickets || []);
        
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
              if (!visibleTicket) {
                visibleTicket = t; // Use first visible closed ticket
              }
            }
          }
        }
        
        setOpenTicket(visibleTicket || null);
        
        // Check if there are unread responses
        if (visibleTicket) {
          // For open tickets, check admin OR ghost-worker messages
          if (visibleTicket.status === 'new' || visibleTicket.status === 'in-progress') {
            const lastRead = localStorage.getItem(`ticket_${visibleTicket.id}_lastRead`);
            const lastReadTime = lastRead ? new Date(lastRead) : new Date(0);
            
            // Check both lastAdminMessageAt and lastMessageAt (which includes Ghosty responses)
            const lastAdminTime = visibleTicket.lastAdminMessageAt?.toDate 
              ? visibleTicket.lastAdminMessageAt.toDate() 
              : (visibleTicket.lastAdminMessageAt ? new Date(visibleTicket.lastAdminMessageAt) : null);
            
            const lastMessageTime = visibleTicket.lastMessageAt?.toDate 
              ? visibleTicket.lastMessageAt.toDate() 
              : (visibleTicket.lastMessageAt ? new Date(visibleTicket.lastMessageAt) : null);
            
            // Use the most recent time between admin and any message (includes Ghosty)
            let mostRecentResponseTime = lastReadTime;
            
            if (lastAdminTime && lastAdminTime > mostRecentResponseTime) {
              mostRecentResponseTime = lastAdminTime;
            }
            
            if (lastMessageTime && lastMessageTime > mostRecentResponseTime) {
              mostRecentResponseTime = lastMessageTime;
            }
            
            const hasUnread = mostRecentResponseTime > lastReadTime;
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
        console.error('❌ Failed to process tickets:', error);
      }
    };

    const unsubscribe = subscribeUserTickets(user.email, applyTickets);
    return () => unsubscribe();
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
  // Native apps always use mobile layout (even on iPad)
  const lgHidden = isNative ? '' : 'lg:hidden';
  const lgShow = isNative ? 'hidden' : 'hidden lg:flex';
  const lgBlock = isNative ? 'hidden' : 'hidden lg:block';
  
  return (
    <>
      <header 
        className={`backdrop-blur-xl border-b flex items-center px-3 ${isNative ? '' : 'lg:px-6'} relative transition-all duration-300 topbar-header ${isNative ? 'topbar-native' : ''} glass-bar`} 
        style={{ 
          paddingTop: isNative ? 'calc(var(--safe-area-top, 0px) + 0.375rem)' : '0.5rem',
          paddingBottom: '0.5rem',
          minHeight: isNative ? 'calc(3rem + var(--safe-area-top, 0px))' : '3rem',
          borderColor: theme.name === 'Pearlescent'
            ? 'rgba(107, 163, 200, 0.32)'
            : theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
          boxShadow: theme.name === 'Pearlescent'
            ? '0 1px 4px rgba(107, 163, 200, 0.14), inset 0 0.5px 0 rgba(255, 255, 255, 0.7)'
            : theme.isDark
            ? '0 1px 3px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
            : '0 1px 3px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
        }}
      >
        {/* Left section */}
        <div className="flex items-center gap-1.5 lg:gap-2 flex-shrink-0">
          {/* Desktop: hamburger for sidebar toggle */}
          <button 
            type="button"
            onMouseDown={(e) => { e.preventDefault(); }}
            onTouchStart={(e) => { if (e.cancelable) e.preventDefault(); }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMenuClick(); }}
            className={`${lgBlock} no-shadow p-1.5 touch-manipulation rounded-lg transition-all duration-200 hover:scale-105 active:scale-95`} 
            style={{ color: theme.text, WebkitTapHighlightColor: 'transparent', backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' }}
            aria-label="Open navigation menu"
            aria-expanded="false"
          >
            <Menu size={22} />
          </button>

          {/* Research Notes — left side, always visible */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('tpp:open-research-notes'))}
            className="p-1.5 rounded-lg no-shadow transition-all duration-200 hover:scale-110 active:scale-95 hover:opacity-80 touch-manipulation"
            style={{
              color: theme.primaryDark || theme.primary,
              backgroundColor: 'transparent',
              WebkitTapHighlightColor: 'transparent',
            }}
            aria-label="Research notes"
          >
            <NotebookPen size={24} strokeWidth={2} aria-hidden />
          </button>
        </div>
          
        {/* Tabs in Topbar - Center position - Desktop */}
        {tabs && tabs.length > 0 && (
          <div className={`${lgShow} items-center gap-4 absolute left-1/2 transform -translate-x-1/2`}>
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
            {(onActionClick || actionItems?.length) && (
              <div className="relative" ref={desktopActionMenuRef}>
                <button 
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (actionItems?.length) {
                      setShowActionMenu(v => !v);
                    } else {
                      onActionClick?.();
                    }
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200 touch-manipulation" 
                  style={{ 
                    color: actionDisabled ? theme.textLight : '#ffffff', 
                    backgroundColor: actionDisabled ? theme.border : (showActionMenu ? theme.primaryDark || theme.primary : theme.primary),
                    border: 'none',
                    opacity: actionDisabled ? 0.4 : 1,
                    cursor: actionDisabled ? 'not-allowed' : 'pointer',
                    boxShadow: actionDisabled ? 'none' : 'inset 0 2px 4px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.10)',
                    WebkitTapHighlightColor: 'transparent'
                  }} 
                  disabled={actionDisabled}
                  title="Add New"
                >
                  <Plus className="h-4 w-4 transition-transform duration-200" strokeWidth={2.5} style={{ transform: showActionMenu ? 'rotate(45deg)' : 'rotate(0deg)' }} />
                </button>
                {showActionMenu && actionItems?.length > 0 && (
                  <div
                    className="absolute right-0 top-10 z-50 rounded-xl border overflow-hidden"
                    style={{
                      minWidth: '160px',
                      backgroundColor: theme.isDark ? theme.cardBackground : '#ffffff',
                      borderColor: theme.border,
                      boxShadow: theme.isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.14)',
                    }}
                  >
                    {actionItems.map((item, i) => (
                      <button
                        key={item.label}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowActionMenu(false);
                          item.onClick?.();
                        }}
                        className="w-full text-left px-4 py-3 text-sm font-medium transition-colors touch-manipulation"
                        style={{
                          color: theme.text,
                          backgroundColor: 'transparent',
                          borderTop: i > 0 ? `1px solid ${theme.border}` : 'none',
                          WebkitTapHighlightColor: 'transparent',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.06)' : `${theme.primary}10`; e.currentTarget.style.color = theme.primary; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = theme.text; }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Spacer to push icons to the right when no tabs */}
        {(!tabs || tabs.length === 0) && <div className="flex-1" />}
        
        {/* Mobile tabs - minimal underline style */}
        {tabs && tabs.length > 0 && (
          <div 
            className={`${lgHidden} flex items-center gap-0.5 flex-1 overflow-x-auto mobile-tabs-container`} 
            style={{ 
              scrollbarWidth: 'none', 
              msOverflowStyle: 'none',
              minWidth: 0,
              // Responsive padding - adjusted via CSS media queries below
              // Base padding for larger phones, media queries handle smaller screens
              paddingRight: 'calc(8rem + env(safe-area-inset-right, 0px))',
              marginRight: '0.25rem',
              // Ensure tabs container respects right-side button space
              maxWidth: 'calc(100% - 9rem)',
              WebkitOverflowScrolling: 'touch'
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
                className="px-1.5 py-2 text-xs capitalize tracking-tight transition-all duration-200 relative whitespace-nowrap flex-shrink-0 touch-manipulation flex items-center"
                style={{
                  color: activeTab === tab.value ? theme.text : theme.textLight,
                  fontWeight: activeTab === tab.value ? 600 : 500,
                  WebkitTapHighlightColor: 'transparent',
                  fontSize: '0.75rem',
                  lineHeight: '1rem'
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
        
        <div className="flex items-center gap-1.5 lg:gap-2 flex-shrink-0 ml-auto" style={{ minWidth: 0 }}>
          {/* Mobile Add button — hidden on mobile; GlobalFAB handles it there */}
          {tabs && tabs.length > 0 && (onActionClick || actionItems?.length) && (
            <div className="hidden relative flex-shrink-0" ref={mobileActionMenuRef}>
              <button 
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => { if (e.cancelable) e.preventDefault(); }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (actionItems?.length) {
                    setShowActionMenu(v => !v);
                  } else {
                    onActionClick?.();
                  }
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200 touch-manipulation"
                style={{ 
                  color: actionDisabled ? theme.textLight : '#ffffff', 
                  backgroundColor: actionDisabled ? theme.border : (showActionMenu ? theme.primaryDark || theme.primary : theme.primary),
                  border: 'none',
                  opacity: actionDisabled ? 0.4 : 1,
                  cursor: actionDisabled ? 'not-allowed' : 'pointer',
                  boxShadow: actionDisabled ? 'none' : 'inset 0 2px 4px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.10)',
                  WebkitTapHighlightColor: 'transparent'
                }} 
                disabled={actionDisabled}
                title="Add New"
              >
                <Plus className="h-4 w-4 transition-transform duration-200" strokeWidth={2.5} style={{ transform: showActionMenu ? 'rotate(45deg)' : 'rotate(0deg)' }} />
              </button>
              {showActionMenu && actionItems?.length > 0 && (
                <div
                  className="absolute right-0 top-10 z-50 rounded-xl border overflow-hidden"
                  style={{
                    minWidth: '160px',
                    backgroundColor: theme.isDark ? theme.cardBackground : '#ffffff',
                    borderColor: theme.border,
                    boxShadow: theme.isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.14)',
                  }}
                >
                  {actionItems.map((item, i) => (
                    <button
                      key={item.label}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onTouchStart={(e) => { if (e.cancelable) e.preventDefault(); }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowActionMenu(false);
                        item.onClick?.();
                      }}
                      className="w-full text-left px-4 py-3 text-sm font-medium transition-colors touch-manipulation"
                      style={{
                        color: theme.text,
                        backgroundColor: 'transparent',
                        borderTop: i > 0 ? `1px solid ${theme.border}` : 'none',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.06)' : `${theme.primary}10`; e.currentTarget.style.color = theme.primary; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = theme.text; }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
                backgroundColor: hasUnreadAdminMessage ? theme.primary : `${theme.primary}50`,
                color: theme.isDark ? '#fff' : '#fff',
                boxShadow: hasUnreadAdminMessage ? `0 2px 8px ${theme.primary}55` : 'none',
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
                backgroundColor: hasUnreadResponse ? theme.primary : `${theme.primary}50`,
                color: '#fff',
                boxShadow: hasUnreadResponse ? `0 2px 8px ${theme.primary}55` : 'none',
                WebkitTapHighlightColor: 'transparent'
              }}
              >
                <span className="whitespace-nowrap">Support Response</span>
                <MessageSquareDot size={14} />
              </button>
          )}
          {/* Dev-only: subscription state picker */}
          {showDevSubPicker && (
            <div className="relative flex-shrink-0" ref={devSubMenuRef}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => { if (e.cancelable) e.preventDefault(); }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowDevSubMenu((v) => !v);
                }}
                className="p-1.5 rounded-lg no-shadow transition-all duration-200 hover:scale-110 active:scale-95 touch-manipulation"
                style={{
                  color: DEV_STATE_META[devSubCurrent]?.dot ?? '#7F9E95',
                  backgroundColor: `${DEV_STATE_META[devSubCurrent]?.dot ?? '#7F9E95'}22`,
                  WebkitTapHighlightColor: 'transparent',
                }}
                title="Dev: subscription state"
                aria-label="Dev menu: subscription state"
                aria-expanded={showDevSubMenu}
              >
                <FlaskConical className="h-5 w-5" strokeWidth={2} aria-hidden />
              </button>
              {showDevSubMenu && (
                <div
                  className="absolute right-0 top-full mt-1 z-[200] rounded-xl border overflow-hidden"
                  style={{
                    minWidth: '180px',
                    backgroundColor: 'rgba(15,15,15,0.97)',
                    borderColor: 'rgba(255,255,255,0.10)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                  }}
                  role="menu"
                >
                  <div
                    className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide border-b"
                    style={{ color: 'rgba(255,255,255,0.35)', borderColor: 'rgba(255,255,255,0.08)' }}
                  >
                    Subscription state
                  </div>
                  {DEV_STATES.map((state, i) => {
                    const m = DEV_STATE_META[state];
                    const active = state === devSubCurrent;
                    return (
                      <button
                        key={state}
                        type="button"
                        role="menuitem"
                        onMouseDown={(e) => e.preventDefault()}
                        onTouchStart={(e) => { if (e.cancelable) e.preventDefault(); }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDevOverride(state);
                          setShowDevSubMenu(false);
                        }}
                        className="w-full text-left px-3 py-2.5 text-xs font-medium transition-colors touch-manipulation flex items-center gap-2"
                        style={{
                          color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                          backgroundColor: active ? `${m.dot}22` : 'transparent',
                          borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                          WebkitTapHighlightColor: 'transparent',
                          fontWeight: active ? 700 : 400,
                          outline: active ? `1.5px solid ${m.dot}55` : 'none',
                          outlineOffset: '-1.5px',
                        }}
                      >
                        <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: active ? m.dot : 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {showDevUpdatePreview && (
            <div className="relative flex-shrink-0" ref={devUpdateMenuRef}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => { if (e.cancelable) e.preventDefault(); }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowDevUpdateMenu((v) => !v);
                }}
                className="p-1.5 rounded-lg no-shadow transition-all duration-200 hover:scale-110 active:scale-95 touch-manipulation"
                style={{
                  color: theme.warning ?? theme.primary,
                  backgroundColor: theme.isDark ? 'rgba(250, 204, 21, 0.12)' : 'rgba(250, 204, 21, 0.2)',
                  WebkitTapHighlightColor: 'transparent',
                }}
                title="Dev: preview modals & UI pages"
                aria-label="Dev menu: preview modals and UI pages"
                aria-expanded={showDevUpdateMenu}
              >
                <Smartphone className="h-5 w-5" strokeWidth={2} aria-hidden />
              </button>
              {showDevUpdateMenu && (
                <div
                  className="absolute right-0 top-full mt-1 z-[200] rounded-xl border overflow-hidden max-h-[min(70vh,420px)] overflow-y-auto"
                  style={{
                    minWidth: '220px',
                    backgroundColor: 'rgba(15,15,15,0.97)',
                    borderColor: 'rgba(255,255,255,0.10)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                  }}
                  role="menu"
                >
                  <div
                    className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide border-b"
                    style={{ color: 'rgba(255,255,255,0.35)', borderColor: 'rgba(255,255,255,0.08)' }}
                  >
                    Preview update UX
                  </div>
                  {[
                    { kind: 'store-optional', label: 'Store prompt · optional' },
                    { kind: 'store-recommended', label: 'Store prompt · recommended' },
                    { kind: 'store-critical', label: 'Store prompt · required' },
                    { kind: 'feature-announcement', label: "What's New modal" },
                    { kind: 'reconsent', label: 'Legal re-consent' },
                    { kind: 'page-intro', label: 'Page intro (this route)' },
                    { kind: 'onboarding', label: 'Onboarding walkthrough' },
                    { kind: 'toast-success', label: 'Toast · success', toast: { type: 'success', message: 'Toast preview — success (sage)' } },
                    { kind: 'toast-error', label: 'Toast · error', toast: { type: 'error', message: 'Toast preview — error (red)' } },
                    { kind: 'toast-warning', label: 'Toast · warning', toast: { type: 'warning', message: 'Toast preview — warning' } },
                    { kind: 'toast-info', label: 'Toast · info', toast: { type: 'info', message: 'Toast preview — info' } },
                    { kind: 'nudge-usage-calc', label: 'Nudge · usage · Calculator', nudge: { type: 'usage', path: '/app/recon' } },
                    { kind: 'nudge-usage-analytics', label: 'Nudge · usage · Analytics', nudge: { type: 'usage', path: '/app/insights' } },
                    { kind: 'nudge-usage-goals', label: 'Nudge · usage · Goals', nudge: { type: 'usage', path: '/app/goals' } },
                    { kind: 'nudge-discovery-calc', label: 'Nudge · discovery · Calculator', nudge: { type: 'discovery', path: '/app/recon' } },
                    { kind: 'nudge-discovery-analytics', label: 'Nudge · discovery · Analytics', nudge: { type: 'discovery', path: '/app/insights' } },
                    { kind: 'nudge-discovery-goals', label: 'Nudge · discovery · Goals', nudge: { type: 'discovery', path: '/app/goals' } },
                    { kind: 'upgrade-checklist', label: 'Upgrade Checklist modal', checklist: true },
                  ].map((item, i) => (
                    <button
                      key={item.kind}
                      type="button"
                      role="menuitem"
                      onMouseDown={(e) => e.preventDefault()}
                      onTouchStart={(e) => { if (e.cancelable) e.preventDefault(); }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowDevUpdateMenu(false);
                        if (item.toast) {
                          window.dispatchEvent(
                            new CustomEvent('tpp:toast', { detail: item.toast })
                          );
                          return;
                        }
                        if (item.nudge) {
                          window.dispatchEvent(
                            new CustomEvent('tpp:dev-preview-mode-nudge', { detail: item.nudge })
                          );
                          return;
                        }
                        if (item.checklist) {
                          window.dispatchEvent(
                            new CustomEvent('tpp:show-upgrade-checklist')
                          );
                          return;
                        }
                        window.dispatchEvent(
                          new CustomEvent('tpp:dev-preview-user-update-modal', { detail: { kind: item.kind } })
                        );
                      }}
                      className="w-full text-left px-3 py-2.5 text-xs font-medium transition-colors touch-manipulation"
                      style={{
                        color: 'rgba(255,255,255,0.55)',
                        backgroundColor: 'transparent',
                        borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
                    >
                      {item.label}
                    </button>
                  ))}
                  <div
                    className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide border-t border-b"
                    style={{ color: 'rgba(255,255,255,0.35)', borderColor: 'rgba(255,255,255,0.08)' }}
                  >
                    UI pages (no app route)
                  </div>
                  {DEV_UI_PAGES.map((item, i) => (
                    <button
                      key={item.path}
                      type="button"
                      role="menuitem"
                      onMouseDown={(e) => e.preventDefault()}
                      onTouchStart={(e) => { if (e.cancelable) e.preventDefault(); }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowDevUpdateMenu(false);
                        navigate(item.path);
                      }}
                      className="w-full text-left px-3 py-2.5 text-xs font-medium transition-colors touch-manipulation"
                      style={{
                        color: 'rgba(255,255,255,0.55)',
                        backgroundColor: 'transparent',
                        borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Sync status — subtle grey, next to account */}
          <SyncStatusIndicator theme={theme} />
          {/* Account icon */}
          <button 
            type="button"
            onClick={() => navigate('/app/account')}
            className="relative p-1.5 lg:p-2 rounded-lg no-shadow transition-all duration-200 hover:scale-110 active:scale-95 hover:opacity-80 touch-manipulation"
            style={{
              color: showPremiumAccountTint ? '#D4A030' : theme.text,
              backgroundColor: 'transparent',
              WebkitTapHighlightColor: 'transparent'
            }}
            aria-label="Account"
          >
            {isSubscribed
              ? <UserCheck size={24} weight="duotone" aria-hidden />
              : <User size={24} weight="duotone" aria-hidden />
            }
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
            <GearSix size={24} weight="duotone" aria-hidden />
          </button>
          
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

      {/* Support Chat Modal — unified thread across ALL user tickets */}
      {showSupportChat && (openTicket || allTickets.length > 0) && (
        <SupportChatModal
          ticket={openTicket}
          allTickets={allTickets}
          onClose={() => setShowSupportChat(false)}
          theme={theme}
          onMarkRead={handleMarkAsRead}
          onTicketUpdate={() => {
            // Re-subscribe will update allTickets and openTicket automatically
          }}
        />
      )}

      <style>{`
        .topbar-header {
          /* Height handled inline with safe area calculations */
        }
        @media (min-width: 1024px) {
          .topbar-header:not(.topbar-native) {
            min-height: 3rem !important; /* lg:h-12 for desktop */
            padding-top: 0px !important; /* No safe area padding on desktop */
          }
        }
        /* Responsive tab spacing for mobile devices */
        @media (max-width: 374px) {
          .mobile-tabs-container {
            padding-right: calc(9rem + env(safe-area-inset-right, 0px)) !important;
            max-width: calc(100% - 10rem) !important;
          }
        }
        @media (min-width: 375px) and (max-width: 413px) {
          .mobile-tabs-container {
            padding-right: calc(8.5rem + env(safe-area-inset-right, 0px)) !important;
            max-width: calc(100% - 9.5rem) !important;
          }
        }
        @media (min-width: 414px) and (max-width: 767px) {
          .mobile-tabs-container {
            padding-right: calc(8rem + env(safe-area-inset-right, 0px)) !important;
            max-width: calc(100% - 9rem) !important;
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
        @keyframes tppAnnBuzz {
          0%, 100% { transform: rotate(0deg) scale(1); }
          20% { transform: rotate(-10deg) scale(1.05); }
          40% { transform: rotate(8deg) scale(1.05); }
          60% { transform: rotate(-6deg) scale(1.02); }
          80% { transform: rotate(4deg) scale(1.02); }
        }
        .tpp-ann-buzz {
          animation: tppAnnBuzz 0.45s ease-in-out 4;
        }
      `}</style>
    </>
  );
}


