import React from 'react';
import { Chalkboard, Users, Stack, ChatCircle, EnvelopeOpen, GearSix } from '@phosphor-icons/react';

/**
 * AdminPrimaryNavigation Component
 * Top-level navigation tabs matching main app styling (Topbar pattern)
 * Uses underline indicators instead of background fills
 */
export default function AdminPrimaryNavigation({ activeTab, setActiveTab, theme }) {
  // Navigation configuration - Using shorter labels for space efficiency
  const primaryTabs = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Chalkboard,
      tabId: 'analytics' // Maps to actual activeTab value
    },
    {
      id: 'users',
      label: 'Users',
      icon: Users,
      tabId: 'allUsers' // Default tab for this group
    },
    {
      id: 'support',
      label: 'Support',
      icon: ChatCircle,
      tabId: 'feedback'
    },
    {
      id: 'content',
      label: 'Content',
      icon: Stack,
      tabId: 'glossary'
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: EnvelopeOpen,
      tabId: 'emails'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: GearSix,
      tabId: 'security'
    }
  ];

  // Determine which primary tab is active based on current activeTab
  const getActivePrimaryTab = () => {
    const tabGroups = {
      dashboard: ['analytics'],
      users: ['allUsers', 'subscriptions', 'gifts'],
      support: ['contact', 'feedback', 'feedback-new', 'feedback-resolved', 'tickets', 'tickets-open', 'tickets-closed', 'ghost-worker', 'work-queue'],
      content: ['glossary', 'ideas'],
      messages: ['pushNotifications', 'inAppNotifications', 'emails', 'emailTriggers'],
      settings: ['security', 'deletions', 'version', 'agreements']
    };

    for (const [groupId, tabIds] of Object.entries(tabGroups)) {
      if (tabIds.includes(activeTab)) {
        return groupId;
      }
    }
    return 'dashboard';
  };

  const currentPrimaryTab = getActivePrimaryTab();

  const handleTabClick = (tab) => {
    setActiveTab(tab.tabId);
  };

  return (
    <>
      {/* Desktop Navigation - Center aligned tabs */}
      <div className="hidden lg:flex items-center gap-4 absolute left-1/2 transform -translate-x-1/2">
        {primaryTabs.map(tab => {
          const isActive = currentPrimaryTab === tab.id;
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleTabClick(tab);
              }}
              className="px-2 pb-4 pt-2 text-base capitalize tracking-normal transition-all duration-200 relative whitespace-nowrap touch-manipulation"
              style={{
                color: isActive ? theme.text : theme.textLight,
                fontWeight: isActive ? 600 : 500,
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              {tab.label}
              {/* Active indicator line - below text */}
              {isActive && (
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
          );
        })}
      </div>

      {/* Mobile Navigation - Horizontal scroll */}
      <div 
        className="lg:hidden flex items-center gap-1 overflow-x-auto" 
        style={{ 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        <style>{`
          .lg\\:hidden.overflow-x-auto::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        {primaryTabs.map(tab => {
          const isActive = currentPrimaryTab === tab.id;
          
          return (
            <button
              key={tab.id}
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
                handleTabClick(tab);
              }}
              className="px-3 py-2 text-xs capitalize transition-all duration-200 relative whitespace-nowrap flex-shrink-0 touch-manipulation"
              style={{
                color: isActive ? theme.text : theme.textLight,
                fontWeight: isActive ? 600 : 500,
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              {tab.label}
              {/* Active indicator line - below text */}
              {isActive && (
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
          );
        })}
      </div>
    </>
  );
}

