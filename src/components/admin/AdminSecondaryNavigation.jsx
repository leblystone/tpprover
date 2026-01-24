import React from 'react';
import { Users, Crown, Gift, Layers, MessagesSquare, Lightbulb, Smartphone, BellRing, MailOpen, Clock, Shield, Trash2, FileCheck, Bot } from 'lucide-react';

/**
 * AdminSecondaryNavigation Component
 * Clean underline-style sub-menu tabs (like main app navigation)
 */
export default function AdminSecondaryNavigation({ activeTab, setActiveTab, theme }) {
  // Define tab groups - flat structure with simple tabs
  const tabGroups = {
    users: [
      { id: 'allUsers', label: 'All Users' },
      { id: 'subscriptions', label: 'Subscriptions' },
      { id: 'gifts', label: 'Gifts' }
    ],
    support: [
      { id: 'contact', label: 'Contact' },
      { id: 'feedback', label: 'Feedback' },
      { id: 'feedback-new', label: 'New' },
      { id: 'feedback-resolved', label: 'Resolved' },
      { id: 'tickets', label: 'Tickets' },
      { id: 'tickets-open', label: 'Open' },
      { id: 'tickets-closed', label: 'Closed' },
      { id: 'ghost-worker', label: 'Ghosty👻' }
    ],
    content: [
      { id: 'glossary', label: 'Glossary' },
      { id: 'ideas', label: 'Ideas' }
    ],
    messages: [
      { id: 'pushNotifications', label: 'Push' },
      { id: 'inAppNotifications', label: 'In-App' },
      { id: 'emails', label: 'Templates' },
      { id: 'emailTriggers', label: 'Triggers' }
    ],
    settings: [
      { id: 'security', label: 'Security' },
      { id: 'deletions', label: 'Deletions' },
      { id: 'version', label: 'Version' },
      { id: 'agreements', label: 'Legal' }
    ]
  };

  // Find which group the current tab belongs to
  let currentGroup = null;
  for (const [groupKey, tabs] of Object.entries(tabGroups)) {
    if (tabs.some(tab => tab.id === activeTab)) {
      currentGroup = tabs;
      break;
    }
  }

  // Don't show secondary tabs for analytics (single item) or if no group found
  if (!currentGroup || activeTab === 'analytics') return null;

  return (
    <div 
      className="px-3 lg:px-6 flex-shrink-0 relative z-10 sticky top-0 border-b overflow-x-auto" 
      style={{
        backgroundColor: theme.cardBackground || theme.white || '#FFFFFF',
        borderColor: theme.border,
        zIndex: 20,
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}
    >
      <style>{`
        .admin-secondary-nav::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      
      <div className="admin-secondary-nav flex items-center gap-6">
        {currentGroup.map(tab => {
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-2 pb-3 pt-3 text-sm capitalize tracking-normal transition-all duration-200 relative whitespace-nowrap"
              style={{
                color: isActive ? theme.text : theme.textLight,
                fontWeight: isActive ? 600 : 500
              }}
            >
              {tab.label}
              
              {/* Active underline indicator */}
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
    </div>
  );
}

