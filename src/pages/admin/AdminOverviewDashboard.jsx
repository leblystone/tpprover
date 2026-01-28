import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Ticket,
  ClipboardList,
  TrendingUp,
  Users,
  Mail,
  ArrowRight,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';

export default function AdminOverviewDashboard() {
  const { theme } = useOutletContext();
  const navigate = useNavigate();
  const {
    analytics,
    feedback,
    tickets,
    loading,
    loadRealAnalytics,
    loadFeedback,
    loadTickets,
  } = useAdmin();

  const newFeedback = feedback.filter((f) => f.status === 'new');
  const openTickets = tickets.filter((t) => t.status === 'new' || t.status === 'in-progress');
  const totalUsers = analytics?.totalUsers || 0;
  const activeUsers = analytics?.activeUsers || 0;

  const handleRefresh = async () => {
    await Promise.all([
      loadRealAnalytics(),
      loadFeedback(),
      loadTickets(),
    ]);
  };

  const metricCards = [
    {
      id: 'feedback',
      label: 'New Feedback',
      value: newFeedback.length,
      icon: MessageSquare,
      color: '#3b82f6',
      path: '/admin/overview/support',
      description: 'Unread feedback items',
    },
    {
      id: 'tickets',
      label: 'Open Tickets',
      value: openTickets.length,
      icon: Ticket,
      color: '#ef4444',
      path: '/admin/overview/support',
      description: 'Active support tickets',
    },
    {
      id: 'users',
      label: 'Total Users',
      value: totalUsers,
      icon: Users,
      color: '#10b981',
      path: '/admin/users/subscriptions',
      description: 'Registered users',
    },
    {
      id: 'active',
      label: 'Active Users',
      value: activeUsers,
      icon: TrendingUp,
      color: '#8b5cf6',
      path: '/admin/overview/analytics',
      description: 'Users active in last 30 days',
    },
  ];

  const quickActions = [
    {
      id: 'support',
      label: 'View Support',
      icon: MessageSquare,
      path: '/admin/overview/support',
      description: 'Feedback, tickets, and contact',
    },
    {
      id: 'analytics',
      label: 'View Analytics',
      icon: TrendingUp,
      path: '/admin/overview/analytics',
      description: 'User growth and metrics',
    },
    {
      id: 'automation',
      label: 'Automation',
      icon: ClipboardList,
      path: '/admin/overview/automation',
      description: 'Ghost Worker and triggers',
    },
  ];

  const recentFeedback = feedback
    .sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
      return dateB - dateA;
    })
    .slice(0, 5);

  const recentTickets = tickets
    .sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
      return dateB - dateA;
    })
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: theme.text }}>
            <LayoutDashboard size={24} />
            Overview Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: theme.textLight }}>
            Quick overview of your daily work
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading.analytics || loading.feedback}
          className="px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-opacity disabled:opacity-50"
          style={{
            backgroundColor: theme.primary + '15',
            border: `1px solid ${theme.primary}30`,
            color: theme.primary,
          }}
        >
          <RefreshCw size={16} className={loading.analytics || loading.feedback ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              onClick={() => navigate(card.path)}
              className="p-4 rounded-lg border text-left transition-all hover:shadow-md"
              style={{
                backgroundColor: theme.cardBackground || theme.white,
                borderColor: theme.border,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = card.color;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = theme.border;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: card.color + '15' }}
                >
                  <Icon size={20} style={{ color: card.color }} />
                </div>
                <ArrowRight size={16} style={{ color: theme.textLight }} />
              </div>
              <div className="text-2xl font-bold mb-1" style={{ color: theme.text }}>
                {card.value}
              </div>
              <div className="text-sm font-medium" style={{ color: theme.text }}>
                {card.label}
              </div>
              <div className="text-xs mt-1" style={{ color: theme.textLight }}>
                {card.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => navigate(action.path)}
              className="p-4 rounded-lg border text-left transition-all hover:shadow-md"
              style={{
                backgroundColor: theme.cardBackground || theme.white,
                borderColor: theme.border,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = theme.primary;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = theme.border;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: theme.primary + '15' }}
                >
                  <Icon size={20} style={{ color: theme.primary }} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold" style={{ color: theme.text }}>
                    {action.label}
                  </div>
                  <div className="text-xs mt-1" style={{ color: theme.textLight }}>
                    {action.description}
                  </div>
                </div>
                <ArrowRight size={16} style={{ color: theme.textLight }} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Feedback */}
        <div
          className="rounded-lg border p-4"
          style={{
            backgroundColor: theme.cardBackground || theme.white,
            borderColor: theme.border,
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: theme.text }}>
              <MessageSquare size={16} />
              Recent Feedback
            </h3>
            <button
              onClick={() => navigate('/admin/overview/support')}
              className="text-xs font-medium flex items-center gap-1"
              style={{ color: theme.primary }}
            >
              View All
              <ArrowRight size={12} />
            </button>
          </div>
          {recentFeedback.length === 0 ? (
            <div className="text-sm text-center py-4" style={{ color: theme.textLight }}>
              No recent feedback
            </div>
          ) : (
            <div className="space-y-2">
              {recentFeedback.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate('/admin/overview/support')}
                  className="p-2 rounded border cursor-pointer transition-colors hover:bg-opacity-50"
                  style={{
                    backgroundColor: item.status === 'new' ? '#3b82f6' + '10' : 'transparent',
                    borderColor: theme.border,
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate" style={{ color: theme.text }}>
                        {item.userEmail || 'Unknown'}
                      </div>
                      <div className="text-xs mt-1 line-clamp-2" style={{ color: theme.textLight }}>
                        {item.message || item.feedback || 'No message'}
                      </div>
                    </div>
                    {item.status === 'new' && (
                      <div className="ml-2 flex-shrink-0">
                        <AlertCircle size={12} style={{ color: '#3b82f6' }} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Tickets */}
        <div
          className="rounded-lg border p-4"
          style={{
            backgroundColor: theme.cardBackground || theme.white,
            borderColor: theme.border,
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: theme.text }}>
              <Ticket size={16} />
              Recent Tickets
            </h3>
            <button
              onClick={() => navigate('/admin/overview/support')}
              className="text-xs font-medium flex items-center gap-1"
              style={{ color: theme.primary }}
            >
              View All
              <ArrowRight size={12} />
            </button>
          </div>
          {recentTickets.length === 0 ? (
            <div className="text-sm text-center py-4" style={{ color: theme.textLight }}>
              No recent tickets
            </div>
          ) : (
            <div className="space-y-2">
              {recentTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => navigate('/admin/overview/support')}
                  className="p-2 rounded border cursor-pointer transition-colors hover:bg-opacity-50"
                  style={{
                    backgroundColor:
                      ticket.status === 'new' || ticket.status === 'in-progress'
                        ? '#ef4444' + '10'
                        : 'transparent',
                    borderColor: theme.border,
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate" style={{ color: theme.text }}>
                        {ticket.userEmail || ticket.subject || 'Unknown'}
                      </div>
                      <div className="text-xs mt-1 line-clamp-2" style={{ color: theme.textLight }}>
                        {ticket.subject || ticket.messages?.[0]?.message || 'No subject'}
                      </div>
                    </div>
                    {(ticket.status === 'new' || ticket.status === 'in-progress') && (
                      <div className="ml-2 flex-shrink-0">
                        <AlertCircle size={12} style={{ color: '#ef4444' }} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
