import React, { useState, useEffect } from 'react';
import { Menu, Search, Upload, Edit, Plus, X, MessageSquareDot, Bell, AlertCircle, MessageCircleReply } from 'lucide-react';
import ModernTooltip from '../ui/ModernTooltip';
import { useLocation } from 'react-router-dom';
import GlossaryQuickModal from '../glossary/GlossaryQuickModal';
import NotificationBell from '../common/NotificationBell';
import TrialButton from '../common/TrialButton';
import { useAppContext } from '../../context/AppContext';
import { getUserTickets, markTicketAsRead, getUserAdminMessages, markAdminMessageAsRead, deleteAdminMessage } from '../../services/firebase';
import SupportChatModal from '../common/SupportChatModal';
import AdminMessageModal from '../common/AdminMessageModal';

export default function Topbar({ onMenuClick, theme, onDashboardCustomize, isCustomizing = false, tabs, activeTab, onTabChange, onActionClick, actionDisabled, autoSaveIndicator, trialInfo }) {
  const location = useLocation();
  // Handle both /page and /app/page routing patterns
  const pathParts = location.pathname.split('/').filter(Boolean);
  const seg = pathParts[0] === 'app' ? (pathParts[1] || 'dashboard') : (pathParts[0] || 'dashboard');
  const onDashboard = seg === 'dashboard' || location.pathname === '/app' || location.pathname === '/app/' || location.pathname.includes('/dashboard');
  const [customizingState, setCustomizingState] = React.useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Listen for customizing state changes from dashboard
  useEffect(() => {
    const handleCustomizingChange = (event) => {
      setCustomizingState(event.detail.isCustomizing);
    };
    window.addEventListener('tpp:dashboard-customizing-changed', handleCustomizingChange);
    return () => window.removeEventListener('tpp:dashboard-customizing-changed', handleCustomizingChange);
  }, []);

  const getPlaceholderForPage = (pageSeg) => {
    const placeholders = {
      recon: 'Search recon entries...',
      orders: 'Search orders...',
      protocols: 'Search protocols...',
      stockpile: 'Search stockpile...',
      vendors: 'Search vendors...',
      glossary: 'Search glossary...',
      research: 'Search supplements...',
      calendar: 'Search events...',
      imports: 'Search imports...',
    };
    return placeholders[pageSeg] || 'Search...';
  };

  const [searchQuery, setSearchQuery] = React.useState('');
  const searchInputRef = React.useRef(null);
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
          
          // Show if unread (userReadAt is null or doesn't exist)
          if (!ticket.userReadAt || ticket.userReadAt === null) {
            return true;
          }
          
          // Show if read within last 24 hours
          const readAt = ticket.userReadAt?.toDate ? ticket.userReadAt.toDate() : new Date(ticket.userReadAt);
          const now = new Date();
          const hoursSinceRead = (now - readAt) / (1000 * 60 * 60);
          
          return hoursSinceRead < 24;
        };
        
        // Find tickets to show: open tickets OR closed tickets that meet criteria
        const visibleTicket = tickets.find(t => {
          // Always show open tickets
          if (t.status === 'new' || t.status === 'in-progress') {
            return true;
          }
          // Show closed tickets if unread or read within 24 hours
          return shouldShowClosedTicket(t);
        });
        
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

  // Load user's admin messages
  useEffect(() => {
    if (!user?.email) {
      return;
    }

    const loadAdminMessages = async () => {
      try {
        console.log('📨 Loading admin messages for:', user.email);
        const messages = await getUserAdminMessages(user.email);
        console.log('📨 Found admin messages:', messages.length);
        
        // Find the most recent message that should be shown
        const visibleMessage = messages.find(msg => {
          // Show if unread
          if (!msg.userReadAt || msg.userReadAt === null) {
            console.log('📨 Found unread message:', msg.id);
            return true;
          }
          
          // Show if read within last 24 hours
          const readAt = msg.userReadAt?.toDate ? msg.userReadAt.toDate() : new Date(msg.userReadAt);
          const now = new Date();
          const hoursSinceRead = (now - readAt) / (1000 * 60 * 60);
          
          if (hoursSinceRead < 24) {
            console.log('📨 Found message read within 24h:', msg.id, hoursSinceRead.toFixed(1), 'hours ago');
            return true;
          }
          
          return false;
        });
        
        console.log('📨 Visible admin message:', visibleMessage ? visibleMessage.id : 'none');
        setAdminMessage(visibleMessage || null);
        
        // Check if message is unread
        if (visibleMessage) {
          const isUnread = !visibleMessage.userReadAt || visibleMessage.userReadAt === null;
          setHasUnreadAdminMessage(isUnread);
          console.log('📨 Admin message unread status:', isUnread);
        } else {
          setHasUnreadAdminMessage(false);
        }
      } catch (error) {
        console.error('❌ Failed to load admin messages:', error);
        console.error('❌ Error details:', error);
      }
    };

    loadAdminMessages();
    // Reload every 30 seconds to check for new messages
    const interval = setInterval(loadAdminMessages, 30000);
    return () => clearInterval(interval);
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

  return (
    <>
      <header className="backdrop-blur border-b h-12 lg:h-16 flex items-center px-3 lg:px-6 relative" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <div className="flex items-center gap-2 lg:gap-4 flex-shrink-0">
          {/* Mobile Menu Button - back on left side for consistency */}
          <button 
            onClick={onMenuClick} 
            className="lg:hidden no-shadow p-2" 
            style={{ color: theme.text }}
            aria-label="Open navigation menu"
            aria-expanded="false"
          >
            <Menu size={28} className="lg:hidden" />
          </button>
        </div>
          
        {/* Tabs in Topbar - Center position */}
        {tabs && tabs.length > 0 && (
          <div className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg absolute left-1/2 transform -translate-x-1/2" style={{ backgroundColor: `${theme.primary}08` }}>
            {tabs.map(tab => (
              <button
                key={tab.value}
                onClick={() => onTabChange(tab.value)}
                className={`px-3 py-1.5 text-xs uppercase tracking-tight rounded-lg transition-all duration-200 relative whitespace-nowrap ${
                  activeTab === tab.value 
                    ? 'shadow-sm' 
                    : 'hover:bg-gray-800 hover:text-white hover:shadow'
                }`}
                style={{
                  backgroundColor: activeTab === tab.value ? `${theme.primary}20` : 'transparent',
                  color: activeTab === tab.value ? theme.primary : theme.textLight,
                  fontWeight: activeTab === tab.value ? 600 : 500
                }}
              >
                {tab.label}
                {/* Active indicator line */}
                {activeTab === tab.value && (
                  <span 
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                    style={{ backgroundColor: theme.primary }}
                  />
                )}
              </button>
            ))}
            {onActionClick && (
              <div 
                className="h-6 md:h-7 w-px mx-1 md:mx-2" 
                style={{ backgroundColor: theme.border }}
              />
            )}
            {onActionClick && (
              <button 
                className="p-1.5 md:p-2 rounded-lg hover:opacity-90 hover:shadow transition-all duration-200" 
                style={{ 
                  color: actionDisabled ? theme.textLight : '#ffffff', 
                  backgroundColor: actionDisabled ? theme.textLight : theme.primary,
                  opacity: actionDisabled ? 0.6 : 1,
                  cursor: actionDisabled ? 'not-allowed' : 'pointer'
                }} 
                onClick={onActionClick}
                disabled={actionDisabled}
                title="Add New"
              >
                <Plus className="h-4 w-4 md:h-4 md:w-4" />
              </button>
            )}
          </div>
        )}
        
        {/* Spacer to push icons to the right when no tabs */}
        {(!tabs || tabs.length === 0) && <div className="flex-1" />}
        
        {/* Mobile tabs - show all tabs with scrollable container */}
        {tabs && tabs.length > 0 && (
          <div 
            className="lg:hidden flex items-center gap-0.5 px-1 py-1 rounded-lg absolute left-1/2 transform -translate-x-1/2 overflow-x-auto mobile-tabs-container" 
            style={{ 
              backgroundColor: `${theme.primary}08`, 
              scrollbarWidth: 'none', 
              msOverflowStyle: 'none',
              maxWidth: isSearchActive ? 'calc(100vw - 180px)' : 'calc(100vw - 80px)',
              transition: 'max-width 0.3s ease',
              willChange: 'max-width'
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
                onClick={() => onTabChange(tab.value)}
                className={`px-1.5 py-0.5 text-[10px] uppercase tracking-tighter rounded-lg transition-all duration-200 relative whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.value 
                    ? 'shadow-sm' 
                    : 'hover:opacity-80'
                }`}
                style={{
                  backgroundColor: activeTab === tab.value ? `${theme.primary}20` : 'transparent',
                  color: activeTab === tab.value ? theme.primary : theme.textLight,
                  fontWeight: activeTab === tab.value ? 600 : 500
                }}
              >
                {tab.label}
                {/* Active indicator line */}
                {activeTab === tab.value && (
                  <span 
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                    style={{ backgroundColor: theme.primary }}
                  />
                )}
              </button>
            ))}
          </div>
        )}
        
        <div className="flex items-center gap-1 lg:gap-2 flex-shrink-0 ml-auto" style={{ minWidth: 0 }}>
          {/* Mobile Add button - positioned in right container to avoid cutoff */}
          {tabs && tabs.length > 0 && onActionClick && (
            <button 
              className="lg:hidden p-1.5 rounded-lg hover:opacity-90 hover:shadow transition-all duration-200 flex-shrink-0" 
              style={{ 
                color: actionDisabled ? theme.textLight : '#ffffff', 
                backgroundColor: actionDisabled ? theme.textLight : theme.primary,
                opacity: actionDisabled ? 0.6 : 1,
                cursor: actionDisabled ? 'not-allowed' : 'pointer'
              }} 
              onClick={onActionClick}
              disabled={actionDisabled}
              title="Add New"
            >
              <Plus className="h-4 w-4" />
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
                onClick={() => setShowAdminMessage(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  hasUnreadAdminMessage ? 'animate-breathe' : ''
                }`}
              style={{
                backgroundColor: hasUnreadAdminMessage 
                  ? (theme.primary || '#6366F1') 
                  : `${theme.primary || '#6366F1'}80`,
                color: '#FFFFFF',
                boxShadow: hasUnreadAdminMessage ? '0 2px 8px rgba(184, 112, 76, 0.3)' : 'none'
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
                onClick={() => setShowSupportChat(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  hasUnreadResponse ? 'animate-sway' : ''
                }`}
              style={{
                backgroundColor: hasUnreadResponse ? '#B8704C' : '#B8704C80',
                color: '#FFFFFF',
                boxShadow: hasUnreadResponse ? '0 2px 8px rgba(184, 112, 76, 0.3)' : 'none'
              }}
              >
                <span className="whitespace-nowrap">Support Response</span>
                <MessageSquareDot size={14} />
              </button>
          )}
          {/* Trial Button - Only show on dashboard */}
          {onDashboard && trialInfo && (trialInfo.daysRemaining <= 2 || trialInfo.isTrialExpired) && (
            <TrialButton
              daysRemaining={trialInfo.daysRemaining}
              isTrialExpired={trialInfo.isTrialExpired}
              onUpgradeClick={trialInfo.onUpgradeClick}
              theme={theme}
            />
          )}
          {/* Search for other pages */}
          {!onDashboard && seg !== 'settings' && seg !== 'account' && seg !== 'calendar' && (
            <form 
              className={`search-box-wrapper ${isSearchActive ? 'is-active' : ''}`}
              style={{ color: theme.text, backgroundColor: theme.cardBackground }}
              onSubmit={(e) => { e.preventDefault(); }}
            >
              <button
                type="button"
                className="search-icon-button"
                onClick={() => {
                  const input = document.querySelector(`.search-box-wrapper input[data-page="${seg}"]`);
                  if (input) {
                    input.focus();
                    setIsSearchActive(true);
                  }
                }}
                style={{ color: theme.textLight, opacity: 0.7 }}
              >
                <Search size={18} />
              </button>
              <input 
                type="text" 
                data-page={seg}
                onFocus={() => setIsSearchActive(true)}
                onBlur={() => setIsSearchActive(false)}
                onChange={(e) => window.dispatchEvent(new CustomEvent(`tpp:${seg}-search`, { detail: { query: e.target.value } }))} 
                placeholder={getPlaceholderForPage(seg)}
                style={{ color: theme.text }}
              />
              <button 
                type="reset"
                onClick={() => {
                  const input = document.querySelector(`.search-box-wrapper input[data-page="${seg}"]`);
                  if (input) {
                    input.value = '';
                    input.blur();
                    window.dispatchEvent(new CustomEvent(`tpp:${seg}-search`, { detail: { query: '' } }));
                    setIsSearchActive(false);
                  }
                }}
              />
            </form>
          )}
          {/* Import feature temporarily hidden - uncomment to re-enable
          {onDashboard && (
            <button data-tour="topbar-import" className="p-2 rounded-full no-shadow" title="Import (OCR)" onClick={() => window.dispatchEvent(new CustomEvent('tpp:openImport'))} style={{ color: theme.text }}><Upload className="h-5 w-5" /></button>
          )}
          */}
          {/* Notifications temporarily hidden - future feature
          <NotificationBell theme={theme} />
          */}
          {onDashboard && onDashboardCustomize && (
              <button 
                className={`p-1.5 lg:p-2 rounded-full no-shadow transition-all duration-200 ${
                  customizingState ? 'ring-2 ring-opacity-50' : ''
                }`}
                onClick={onDashboardCustomize}
                style={{ 
                  color: theme.text,
                  backgroundColor: customizingState ? theme.primary : 'transparent',
                  ringColor: customizingState ? theme.primary : 'transparent'
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


