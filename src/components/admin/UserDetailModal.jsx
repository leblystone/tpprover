import React, { useMemo, useState, useEffect } from 'react';
import { X, Users, Mail, Calendar, Clock, CreditCard, Award, Gift, Shield, Book, Coffee, Loader, Copy, Check, Smartphone, Monitor, Code, AlertTriangle, RefreshCw, MessageSquare, Send, Siren, Bug, History, MessageCircle, ExternalLink } from 'lucide-react';
import { createAdminMessage, createSupportTicket, debugUserSubscription, fetchUserActivityHistory, fetchUserCommunications } from '../../services/firebase';

export default function UserDetailModal({
  user,
  onClose,
  theme: enhancedTheme,
  onExtendTrial,
  isExtendingTrial = false,
  isLoadingDetails = false,
  adminPassword = null
}) {
  // Safety check
  if (!user) {
    console.error('❌ UserDetailModal: No user provided!');
    return null;
  }

  // Scroll to top when modal opens
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Check if user has lifetime access
  const [extensionDays, setExtensionDays] = useState('3');
  const [extensionNote, setExtensionNote] = useState('');
  const [localMessage, setLocalMessage] = useState(null);
  const [localMessageType, setLocalMessageType] = useState('success');
  
  // Support response state
  const [showOneWayModal, setShowOneWayModal] = useState(false);
  const [showTwoWayModal, setShowTwoWayModal] = useState(false);
  const [oneWayMessage, setOneWayMessage] = useState('');
  const [twoWayMessage, setTwoWayMessage] = useState('');
  const [twoWaySubject, setTwoWaySubject] = useState('');
  const [isSendingSupport, setIsSendingSupport] = useState(false);
  
  // Debug state
  const [isDebugging, setIsDebugging] = useState(false);

  // Tabs: overview | activity | communications
  const [activeTab, setActiveTab] = useState('overview');
  const [activityEvents, setActivityEvents] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [communications, setCommunications] = useState({ emails: [], adminMessages: [], supportTickets: [] });
  const [commsLoading, setCommsLoading] = useState(false);

  const hasLifetimeAccess = user.subscription?.hasLifetimeAccess || user.subscription?.interval === 'lifetime';

  // Get account status - using same logic as UserTable for consistency
  const getSubscriptionStatus = () => {
    const now = new Date();
    
    // First check trial status (regardless of subscription)
    let trialEndDate = null;
    
    // Check if user has explicit trialEndDate
    if (user.trialEndDate) {
      trialEndDate = user.trialEndDate?.toDate?.() || new Date(user.trialEndDate);
    } else if (user.createdAt) {
      // If no trialEndDate, calculate default 30-day trial from registration
      const createdDate = user.createdAt?.toDate?.() || new Date(user.createdAt);
      trialEndDate = new Date(createdDate.getTime() + (30 * 24 * 60 * 60 * 1000));
    }
    
    if (trialEndDate) {
      if (trialEndDate > now) {
        // Active trial - show days remaining
        const daysLeft = Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24));
        return { 
          label: `Trial (${daysLeft}d left)`, 
          color: '#F59E0B', 
          bgColor: '#F59E0B20', 
          borderColor: '#F59E0B40' 
        };
      } else {
        // Trial expired - check if they have paid subscription
        if (user.subscription?.status === 'active') {
          // Fall through to check subscription type below
        } else {
          return { 
            label: 'Trial Expired', 
            color: enhancedTheme.error, 
            bgColor: enhancedTheme.error + '20', 
            borderColor: enhancedTheme.error + '40' 
          };
        }
      }
    }
    
    // Check for lifetime access
    if (hasLifetimeAccess) {
      return { 
        label: 'Lifetime Access', 
        color: '#FFD700', 
        bgColor: '#FFD70020', 
        borderColor: '#FFD70040' 
      };
    }
    
    // Check for active paid subscription
    if (user.subscription?.status === 'active' && user.subscription?.plan) {
      if (user.subscription.platform === 'squarespace' && user.subscription.planType === 'annual') {
        return { label: 'Annual', color: enhancedTheme.success, bgColor: enhancedTheme.success + '20', borderColor: enhancedTheme.success + '40' };
      }
      if (user.subscription.platform === 'squarespace' || user.subscription.platform === 'stripe') {
        return { label: 'Monthly', color: '#3B82F6', bgColor: '#3B82F620', borderColor: '#3B82F640' };
      }
      if (user.subscription.platform === 'google-play') {
        return { label: 'Google Play', color: enhancedTheme.success, bgColor: enhancedTheme.success + '20', borderColor: enhancedTheme.success + '40' };
      }
      if (user.subscription.platform === 'apple') {
        return { label: 'Apple', color: enhancedTheme.success, bgColor: enhancedTheme.success + '20', borderColor: enhancedTheme.success + '40' };
      }
      return { label: 'Active', color: enhancedTheme.success, bgColor: enhancedTheme.success + '20', borderColor: enhancedTheme.success + '40' };
    }
    
    // Check for refunded / disputed / revoked
    if (user.subscription?.status === 'refunded') {
      return { label: 'Refunded', color: enhancedTheme.error, bgColor: enhancedTheme.error + '20', borderColor: enhancedTheme.error + '40' };
    }
    if (user.subscription?.status === 'disputed') {
      return { label: 'Disputed', color: enhancedTheme.error, bgColor: enhancedTheme.error + '20', borderColor: enhancedTheme.error + '40' };
    }
    if (user.subscription?.status === 'revoked') {
      return { label: 'Revoked', color: enhancedTheme.error, bgColor: enhancedTheme.error + '20', borderColor: enhancedTheme.error + '40' };
    }

    // Check for expired subscription
    if (user.subscription?.status === 'canceled' || user.subscription?.status === 'expired' || user.subscription?.status === 'past_due') {
      return { label: 'Subscription Expired', color: enhancedTheme.error, bgColor: enhancedTheme.error + '20', borderColor: enhancedTheme.error + '40' };
    }
    
    // If we get here, user has no trial date and no subscription - shouldn't happen
    return { label: 'Unknown', color: '#9CA3AF', bgColor: '#9CA3AF20', borderColor: '#9CA3AF40' };
  };

  const subscriptionStatusDisplay = getSubscriptionStatus();
  const isLifetimeGranted = user.subscription?.lifetimeReason && !user.subscription?.paymentMethodId;
  const subscriptionStatus = user.subscription?.status || 'unknown';
  const subscriptionPlan = user.subscription?.plan?.name || user.subscription?.plan || 'No subscription';
  const subscriptionInterval = user.subscription?.interval || 'N/A';

  const trialEndDate = useMemo(() => {
    if (!user) return null;
    if (user.subscription?.currentPeriodEnd) {
      const parsed = new Date(user.subscription.currentPeriodEnd);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    if (user.trialEndDate?.toDate) {
      return user.trialEndDate.toDate();
    }
    if (typeof user.trialEndDate === 'string') {
      const parsed = new Date(user.trialEndDate);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return null;
  }, [user]);

  const trialDaysRemaining = useMemo(() => {
    if (!trialEndDate) return null;
    const diff = trialEndDate.getTime() - Date.now();
    if (diff <= 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [trialEndDate]);

  const trialStatusLabel = user.subscription?.status || (trialEndDate ? (trialEndDate.getTime() > Date.now() ? 'trialing' : 'expired') : 'unknown');
  const trialPlanName = subscriptionPlan !== 'No subscription' ? subscriptionPlan : 'Research Trial';
  const extensionHistory = useMemo(() => {
    if (!Array.isArray(user.trialExtensionHistory)) return [];
    return [...user.trialExtensionHistory].sort((a, b) => {
      const aTime = new Date(a.extendedAt || a.newEnd || 0).getTime();
      const bTime = new Date(b.extendedAt || b.newEnd || 0).getTime();
      return bTime - aTime;
    });
  }, [user.trialExtensionHistory]);

  const handleExtendTrialClick = async () => {
    if (!onExtendTrial || !user) {
      return;
    }

    const parsedDays = Number(extensionDays);
    if (!Number.isFinite(parsedDays) || parsedDays <= 0) {
      setLocalMessage('Enter at least one full day to extend research access.');
      setLocalMessageType('error');
      return;
    }

    try {
      setLocalMessage(null);
      await onExtendTrial({
        userId: user.uid || user.id,
        days: parsedDays,
        note: extensionNote.trim()
      });
      setLocalMessage('✅ Trial extended! The researcher MUST log out and log back in (or refresh their browser) to see their reactivated trial access.');
      setLocalMessageType('success');
      setExtensionNote('');
    } catch (error) {
      setLocalMessage(error.message || 'Unable to extend the research trial right now.');
      setLocalMessageType('error');
    }
  };

  const handleSendOneWayMessage = async () => {
    if (!oneWayMessage.trim() || !user?.email) {
      setLocalMessage('Please enter a message.');
      setLocalMessageType('error');
      return;
    }

    setIsSendingSupport(true);
    setLocalMessage(null);
    
    try {
      // No password needed — cloud function verifies admin via Firebase Auth token
      await createAdminMessage(user.email, oneWayMessage.trim());
      setLocalMessage('One-way support message sent successfully! 📨');
      setLocalMessageType('success');
      setOneWayMessage('');
      setShowOneWayModal(false);
      
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'One-way message sent! The user will see it in their dashboard.', type: 'success' }
      }));
    } catch (error) {
      console.error('❌ Failed to send one-way message:', error);
      setLocalMessage(error.message || 'Failed to send message. Please try again.');
      setLocalMessageType('error');
      
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Failed to send message', type: 'error' }
      }));
    } finally {
      setIsSendingSupport(false);
    }
  };

  const handleSendTwoWayMessage = async () => {
    if (!twoWayMessage.trim() || !twoWaySubject.trim() || !user?.email) {
      setLocalMessage('Please enter both a subject and message.');
      setLocalMessageType('error');
      return;
    }

    setIsSendingSupport(true);
    setLocalMessage(null);
    
    try {
      await createSupportTicket({
        userId: user.uid || user.id || null,
        userEmail: user.email,
        userName: user.displayName || user.email?.split('@')[0] || 'App User',
        type: 'support',
        subject: twoWaySubject.trim(),
        message: twoWayMessage.trim(),
        metadata: {
          createdBy: 'admin',
          userAgent: 'Admin Panel',
          url: window.location.href
        }
      });
      
      setLocalMessage('Two-way support ticket created successfully! 🎫');
      setLocalMessageType('success');
      setTwoWayMessage('');
      setTwoWaySubject('');
      setShowTwoWayModal(false);
      
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Support ticket created! The user can now respond.', type: 'success' }
      }));
    } catch (error) {
      console.error('❌ Failed to create support ticket:', error);
      setLocalMessage(error.message || 'Failed to create ticket. Please try again.');
      setLocalMessageType('error');
      
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Failed to create ticket', type: 'error' }
      }));
    } finally {
      setIsSendingSupport(false);
    }
  };

  const trialEndDisplay = trialEndDate
    ? trialEndDate.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Not scheduled';
  const trialDaysText = trialDaysRemaining === null
    ? 'No active trial'
    : trialDaysRemaining === 0
      ? 'Expired'
      : `${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'} remaining`;
  const disableExtendAction = isExtendingTrial || isLoadingDetails;
  const extensionButtonLabel = isExtendingTrial ? 'Adding Time…' : 'Add Research Time';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 backdrop-blur-sm flex items-start justify-center overflow-y-auto" style={{ paddingTop: '2rem', paddingBottom: '2rem', paddingLeft: '1rem', paddingRight: '1rem' }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative" 
        style={{ 
          backgroundColor: enhancedTheme.cardBackground,
          border: `1px solid ${enhancedTheme.border}`,
          boxShadow: `0 20px 60px ${enhancedTheme.primary}20`
        }}>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 opacity-5 pointer-events-none">
          <Coffee size={150} style={{ color: enhancedTheme.accent }} />
        </div>
        <div className="absolute bottom-0 left-0 opacity-5 pointer-events-none">
          <Book size={120} style={{ color: enhancedTheme.primary }} />
        </div>

        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center relative z-10" 
          style={{ 
            borderColor: enhancedTheme.border + '40',
            background: `linear-gradient(135deg, ${enhancedTheme.primaryLight}08 0%, ${enhancedTheme.cardBackground} 100%)`
          }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
              style={{ 
                background: `linear-gradient(135deg, ${enhancedTheme.primary} 0%, ${enhancedTheme.primaryDark} 100%)`,
                boxShadow: `0 4px 15px ${enhancedTheme.primary}40`
              }}>
              <Users size={20} style={{ color: '#FFFFFF' }} />
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: enhancedTheme.primaryDark }}>User Details</h2>
              <p className="text-xs flex items-center gap-1.5" style={{ color: enhancedTheme.textLight }}>
                <Book size={10} className="opacity-60" />
                View user information
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-lg hover:scale-110 transition-transform duration-200"
            style={{ 
              backgroundColor: enhancedTheme.background,
              border: `1px solid ${enhancedTheme.border}40`
            }}
          >
            <X size={18} style={{ color: enhancedTheme.textLight }} />
          </button>
        </div>
        
        <div className="p-4 space-y-3 relative z-10">
          {/* User Info Header */}
          <div className="relative rounded-xl p-3 overflow-hidden" 
            style={{ 
              background: `linear-gradient(135deg, ${enhancedTheme.primaryLight}10 0%, ${enhancedTheme.accent}08 100%)`,
              border: `1px solid ${enhancedTheme.border}40`
            }}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <img 
                  className="h-16 w-16 rounded-xl shadow-lg border-2" 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=${enhancedTheme.primary.replace('#', '')}&color=ffffff`} 
                  alt=""
                  style={{ borderColor: enhancedTheme.primary }}
                />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-md"
                  style={{ backgroundColor: subscriptionStatusDisplay.color }}>
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm flex items-center gap-1.5 mb-2" style={{ color: enhancedTheme.textLight }}>
                  <Mail size={12} className="opacity-60" />
                  {user.email}
                </p>
                <span className="px-3 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
                  style={{
                    backgroundColor: subscriptionStatusDisplay.bgColor,
                    color: subscriptionStatusDisplay.color,
                    border: `1px solid ${subscriptionStatusDisplay.borderColor}`
                  }}>
                  <div className="w-1.5 h-1.5 rounded-full" 
                    style={{ backgroundColor: subscriptionStatusDisplay.color }} 
                  />
                  {subscriptionStatusDisplay.label}
                </span>
              </div>
            </div>
          </div>

          {/* Two-Column Layout for Key Info */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl hover:scale-[1.02] transition-all duration-200"
              style={{ 
                backgroundColor: enhancedTheme.background,
                border: `1px solid ${enhancedTheme.border}40`
              }}>
              <div className="flex items-center gap-2 mb-1">
                <Calendar size={14} style={{ color: enhancedTheme.info }} />
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: enhancedTheme.textLight }}>Registered</p>
              </div>
              <p className="text-sm font-medium" style={{ color: enhancedTheme.text }}>
                {user.createdAt?.toDate ? new Date(user.createdAt.toDate()).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                }) : 'N/A'}
              </p>
            </div>
            <div className="p-3 rounded-xl hover:scale-[1.02] transition-all duration-200"
              style={{ 
                backgroundColor: enhancedTheme.background,
                border: `1px solid ${enhancedTheme.border}40`
              }}>
              <div className="flex items-center gap-2 mb-1">
                <Clock size={14} style={{ color: enhancedTheme.warning }} />
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: enhancedTheme.textLight }}>Last Active</p>
              </div>
              <p className="text-sm font-medium" style={{ color: enhancedTheme.text }}>
                {user.lastActive?.toDate ? new Date(user.lastActive.toDate()).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                }) : 'N/A'}
              </p>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 p-1 rounded-xl border" style={{ borderColor: enhancedTheme.border, backgroundColor: enhancedTheme.background }}>
            {[
              { id: 'overview', label: 'Overview', icon: Users },
              { id: 'activity', label: 'Activity Log', icon: History },
              { id: 'communications', label: 'Communications', icon: MessageCircle }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: activeTab === id ? enhancedTheme.primary : 'transparent',
                  color: activeTab === id ? '#FFFFFF' : enhancedTheme.textLight
                }}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'overview' && (
            <>
          {/* Subscription Lifecycle Summary */}
          <SubscriptionLifecycleSummary user={user} theme={enhancedTheme} subscriptionStatusDisplay={subscriptionStatusDisplay} />

          {/* Technical Details */}
          <TechnicalDetailsSection user={user} theme={enhancedTheme} />

          {/* Subscription Debug Info */}
          <SubscriptionDebugSection user={user} theme={enhancedTheme} />

          {/* Subscription Details */}
          <div className="rounded-xl border p-3 relative overflow-hidden"
            style={{ 
              borderColor: enhancedTheme.border,
              backgroundColor: enhancedTheme.cardBackground,
              background: `linear-gradient(135deg, ${enhancedTheme.cardBackground} 0%, ${enhancedTheme.success}05 100%)`
            }}>
            <div className="absolute top-0 right-0 opacity-5 pointer-events-none">
              <Award size={80} style={{ color: enhancedTheme.success }} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ 
                    background: `linear-gradient(135deg, ${enhancedTheme.success} 0%, ${enhancedTheme.success}DD 100%)`,
                    boxShadow: `0 2px 8px ${enhancedTheme.success}30`
                  }}>
                  <CreditCard size={14} style={{ color: '#FFFFFF' }} />
                </div>
                <h4 className="font-bold text-sm" style={{ color: enhancedTheme.primaryDark }}>Access & Subscription</h4>
              </div>
              {hasLifetimeAccess ? (
                <div className="space-y-2">
                  <div className="p-3 rounded-lg"
                    style={{ 
                      backgroundColor: isLifetimeGranted ? '#A3B18A20' : enhancedTheme.success + '15',
                      border: `1px solid ${isLifetimeGranted ? '#A3B18A40' : enhancedTheme.success + '30'}`
                    }}>
                    <div className="flex items-center gap-2 mb-1">
                      {isLifetimeGranted ? (
                        <Gift size={16} style={{ color: '#A3B18A' }} />
                      ) : (
                        <Award size={16} style={{ color: enhancedTheme.success }} />
                      )}
                      <span className="text-sm font-semibold" style={{ color: enhancedTheme.text }}>
                        {isLifetimeGranted ? 'Lifetime Granted' : 'Lifetime Access'}
                      </span>
                    </div>
                    {isLifetimeGranted && user.subscription?.lifetimeReason && (
                      <p className="text-xs flex items-center gap-1.5" style={{ color: enhancedTheme.textLight }}>
                        <Book size={10} />
                        Reason: {user.subscription.lifetimeReason}
                      </p>
                    )}
                    {!isLifetimeGranted && (
                      <p className="text-xs flex items-center gap-1.5" style={{ color: enhancedTheme.textLight }}>
                        <Coffee size={10} />
                        Purchased lifetime access
                      </p>
                    )}
                  </div>
                </div>
              ) : subscriptionPlan !== 'No subscription' ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg"
                    style={{ backgroundColor: enhancedTheme.background + '60' }}>
                    <span className="text-xs font-medium" style={{ color: enhancedTheme.textLight }}>Plan</span>
                    <p className="text-sm font-semibold" style={{ color: enhancedTheme.text }}>{subscriptionPlan}</p>
                  </div>
                  <div className="p-2 rounded-lg"
                    style={{ backgroundColor: enhancedTheme.background + '60' }}>
                    <span className="text-xs font-medium" style={{ color: enhancedTheme.textLight }}>Billing</span>
                    <p className="text-sm font-semibold" style={{ color: enhancedTheme.text }}>{subscriptionInterval}</p>
                  </div>
                  <div className="p-2 rounded-lg"
                    style={{ backgroundColor: enhancedTheme.background + '60' }}>
                    <span className="text-xs font-medium" style={{ color: enhancedTheme.textLight }}>Status</span>
                    <span className="px-2 py-0.5 rounded text-xs font-semibold inline-block mt-1"
                      style={{
                        backgroundColor: subscriptionStatus === 'active' ? enhancedTheme.success + '20' : enhancedTheme.warning + '20',
                        color: subscriptionStatus === 'active' ? enhancedTheme.success : enhancedTheme.warning
                      }}>
                      {subscriptionStatus}
                    </span>
                  </div>
                  {/* Subscription Source */}
                  {(user.subscription?.source || user.subscription?.paymentProvider) && (
                    <div className="p-2 rounded-lg"
                      style={{ backgroundColor: enhancedTheme.background + '60' }}>
                      <span className="text-xs font-medium" style={{ color: enhancedTheme.textLight }}>Source</span>
                      <p className="text-sm font-semibold" style={{ color: enhancedTheme.text }}>
                        {(() => {
                          const source = user.subscription?.paymentProvider || user.subscription?.source;
                          if (source === 'stripe') return 'Stripe';
                          if (source === 'googleplay' || source === 'google_play') return 'Google Play';
                          if (source === 'appstore' || source === 'apple') return 'App Store';
                          if (source === 'squarespace') return 'Squarespace';
                          return source || 'Unknown';
                        })()}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-lg text-center"
                  style={{ backgroundColor: enhancedTheme.background + '60' }}>
                  <p className="text-sm flex items-center justify-center gap-2" style={{ color: enhancedTheme.textLight }}>
                    <Book size={14} className="opacity-60" />
                    No active subscription found
                  </p>
                  <p className="text-xs mt-1 flex items-center justify-center gap-1.5" style={{ color: enhancedTheme.textLight }}>
                    <Coffee size={10} />
                    Check Stripe dashboard for details
                  </p>
                </div>
              )}
            </div>
          </div>

          {!hasLifetimeAccess && (
            <div className="rounded-xl border p-3" 
              style={{ 
                borderColor: enhancedTheme.border,
                backgroundColor: enhancedTheme.cardBackground
              }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ 
                    background: `linear-gradient(135deg, ${enhancedTheme.warning} 0%, ${enhancedTheme.warning}DD 100%)`,
                    boxShadow: `0 2px 8px ${enhancedTheme.warning}30`
                  }}>
                  <Clock size={14} style={{ color: '#FFFFFF' }} />
                </div>
                <h4 className="font-bold text-sm" style={{ color: enhancedTheme.primaryDark }}>Trial Controls</h4>
              </div>

              {isLoadingDetails ? (
                <div className="flex items-center justify-center gap-2 py-4 text-sm" style={{ color: enhancedTheme.textLight }}>
                  <Loader size={16} className="animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-lg" 
                      style={{ 
                        backgroundColor: enhancedTheme.background,
                        border: `1px solid ${enhancedTheme.border}30`
                      }}>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: enhancedTheme.textLight }}>Ends</p>
                      <p className="text-sm font-semibold" style={{ color: enhancedTheme.text }}>{trialEndDisplay}</p>
                      <p className="text-xs" style={{ color: enhancedTheme.textLight }}>{trialDaysText}</p>
                    </div>
                    <div className="p-2 rounded-lg" 
                      style={{ 
                        backgroundColor: enhancedTheme.background,
                        border: `1px solid ${enhancedTheme.border}30`
                      }}>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: enhancedTheme.textLight }}>Status</p>
                      <p className="text-sm font-semibold capitalize" style={{ color: enhancedTheme.text }}>{trialStatusLabel}</p>
                      <p className="text-xs" style={{ color: enhancedTheme.textLight }}>{trialPlanName}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: enhancedTheme.textLight }}>Days to add</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={extensionDays}
                        onChange={(e) => setExtensionDays(e.target.value)}
                        className="w-20 px-2 py-1.5 rounded border text-sm"
                        style={{ borderColor: enhancedTheme.border, backgroundColor: enhancedTheme.background, color: enhancedTheme.text }}
                        disabled={disableExtendAction}
                      />
                      <button
                        onClick={handleExtendTrialClick}
                        disabled={disableExtendAction}
                        className="flex-1 px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{ 
                          backgroundColor: enhancedTheme.warning,
                          color: '#FFFFFF',
                          boxShadow: `0 4px 15px ${enhancedTheme.warning}30`
                        }}
                      >
                        {extensionButtonLabel}
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Optional note for audit trail"
                      value={extensionNote}
                      onChange={(e) => setExtensionNote(e.target.value)}
                      className="w-full px-2 py-1.5 rounded border text-xs"
                      style={{ borderColor: enhancedTheme.border, backgroundColor: enhancedTheme.background, color: enhancedTheme.text }}
                      disabled={disableExtendAction}
                    />
                    {localMessage && (
                      <div className="px-2 py-1.5 rounded text-xs" 
                        style={{ 
                          backgroundColor: localMessageType === 'error' ? '#fef2f2' : enhancedTheme.success + '20',
                          color: localMessageType === 'error' ? '#b91c1c' : enhancedTheme.success,
                          border: `1px solid ${localMessageType === 'error' ? '#fecaca' : enhancedTheme.success + '40'}`
                        }}
                      >
                        {localMessage}
                      </div>
                    )}
                    <p className="text-[10px]" style={{ color: enhancedTheme.textLight }}>
                      User may need to sign out and back in to sync.
                    </p>
                  </div>

                  {extensionHistory.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: enhancedTheme.textLight }}>Extension history</p>
                      <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                        {extensionHistory.map((entry, index) => {
                          const newEnd = entry.newEnd ? new Date(entry.newEnd) : null;
                          const entryLabel = newEnd && !Number.isNaN(newEnd.getTime())
                            ? newEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : 'Unknown end date';
                          return (
                            <div key={`${entry.newEnd || index}-${index}`} className="p-2 rounded-lg" 
                              style={{ backgroundColor: enhancedTheme.background, border: `1px solid ${enhancedTheme.border}30` }}>
                              <div className="text-xs font-semibold" style={{ color: enhancedTheme.text }}>
                                +{entry.addedDays} day{entry.addedDays === 1 ? '' : 's'} • {entryLabel}
                              </div>
                              <p className="text-[10px]" style={{ color: enhancedTheme.textLight }}>
                                Extended by {entry.extendedBy || 'admin'} at {entry.extendedAt ? new Date(entry.extendedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'unknown time'}
                              </p>
                              {entry.note && (
                                <p className="text-[10px] mt-0.5" style={{ color: enhancedTheme.textLight }}>
                                  Note: {entry.note}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Admin Actions */}
          <div className="rounded-xl border p-3"
            style={{ 
              borderColor: enhancedTheme.border,
              backgroundColor: enhancedTheme.cardBackground
            }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ 
                  background: `linear-gradient(135deg, ${enhancedTheme.warning} 0%, ${enhancedTheme.warning}DD 100%)`,
                  boxShadow: `0 2px 8px ${enhancedTheme.warning}30`
                }}>
                <Shield size={14} style={{ color: '#FFFFFF' }} />
              </div>
              <h4 className="font-bold text-sm" style={{ color: enhancedTheme.primaryDark }}>Emergency Actions</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {/* One-Way Support Response Button */}
              <button
                onClick={() => setShowOneWayModal(true)}
                className="p-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-200 hover:scale-105 hover:shadow-lg"
                style={{ 
                  backgroundColor: enhancedTheme.info,
                  color: '#FFFFFF',
                  boxShadow: `0 4px 15px ${enhancedTheme.info}30`
                }}
              >
                <MessageSquare size={16} />
                One-Way Message
              </button>
              
              {/* Two-Way Support Response Button */}
              <button
                onClick={() => setShowTwoWayModal(true)}
                className="p-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-200 hover:scale-105 hover:shadow-lg"
                style={{ 
                  backgroundColor: enhancedTheme.primary,
                  color: enhancedTheme.textOnPrimary || '#FFFFFF',
                  boxShadow: `0 4px 15px ${enhancedTheme.primary}30`
                }}
              >
                <Send size={16} />
                Support Ticket
              </button>
            </div>
          </div>
          </>
          )}

          {activeTab === 'activity' && (
            <ActivityLogTab
              user={user}
              theme={enhancedTheme}
              events={activityEvents}
              loading={activityLoading}
              onLoad={() => {
                if (activityEvents.length === 0 && !activityLoading) {
                  setActivityLoading(true);
                  fetchUserActivityHistory(user.uid || user.id)
                    .then((data) => { if (data?.events) setActivityEvents(data.events); })
                    .catch(() => setActivityEvents([]))
                    .finally(() => setActivityLoading(false));
                }
              }}
            />
          )}

          {activeTab === 'communications' && (
            <CommunicationsTab
              user={user}
              theme={enhancedTheme}
              data={communications}
              loading={commsLoading}
              onLoad={() => {
                const empty = communications.emails.length === 0 && communications.adminMessages.length === 0 && communications.supportTickets.length === 0;
                if (!empty || commsLoading) return;
                setCommsLoading(true);
                fetchUserCommunications(user.uid || user.id)
                  .then((data) => {
                    setCommunications({
                      emails: data?.emails || [],
                      adminMessages: data?.adminMessages || [],
                      supportTickets: data?.supportTickets || []
                    });
                  })
                  .catch(() => setCommunications({ emails: [], adminMessages: [], supportTickets: [] }))
                  .finally(() => setCommsLoading(false));
              }}
            />
          )}
          
          {/* One-Way Message Modal */}
          {showOneWayModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg relative"
                style={{ 
                  backgroundColor: enhancedTheme.cardBackground,
                  border: `1px solid ${enhancedTheme.border}`
                }}>
                <div className="p-6 border-b flex justify-between items-center"
                  style={{ borderColor: enhancedTheme.border }}>
                  <div className="flex items-center gap-2">
                    <MessageSquare size={20} style={{ color: enhancedTheme.info }} />
                    <h3 className="text-lg font-bold" style={{ color: enhancedTheme.primaryDark }}>
                      Send One-Way Message
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setShowOneWayModal(false);
                      setOneWayMessage('');
                    }}
                    className="p-2 rounded-lg hover:opacity-70"
                    style={{ backgroundColor: enhancedTheme.background }}
                  >
                    <X size={18} style={{ color: enhancedTheme.textLight }} />
                  </button>
                </div>
                
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: enhancedTheme.text }}>
                      Message to {user.email}
                    </label>
                    <textarea
                      value={oneWayMessage}
                      onChange={(e) => setOneWayMessage(e.target.value)}
                      rows={6}
                      className="w-full p-3 rounded-lg border text-sm"
                      style={{ 
                        borderColor: enhancedTheme.border, 
                        backgroundColor: enhancedTheme.background, 
                        color: enhancedTheme.text 
                      }}
                      placeholder="Type your message here. This will appear as a 'From the Team' notification in the user's dashboard."
                    />
                    <p className="text-xs mt-2" style={{ color: enhancedTheme.textLight }}>
                      This is a one-way message. The user will see it in their dashboard but cannot reply directly.
                    </p>
                  </div>
                  
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowOneWayModal(false);
                        setOneWayMessage('');
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-semibold border"
                      style={{ borderColor: enhancedTheme.border, color: enhancedTheme.text }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendOneWayMessage}
                      disabled={!oneWayMessage.trim() || isSendingSupport}
                      className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      style={{ backgroundColor: enhancedTheme.info, color: '#FFFFFF' }}
                    >
                      {isSendingSupport ? (
                        <>
                          <Loader size={14} className="animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          Send Message
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Two-Way Support Ticket Modal */}
          {showTwoWayModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg relative"
                style={{ 
                  backgroundColor: enhancedTheme.cardBackground,
                  border: `1px solid ${enhancedTheme.border}`
                }}>
                <div className="p-6 border-b flex justify-between items-center"
                  style={{ borderColor: enhancedTheme.border }}>
                  <div className="flex items-center gap-2">
                    <Send size={20} style={{ color: enhancedTheme.primary }} />
                    <h3 className="text-lg font-bold" style={{ color: enhancedTheme.primaryDark }}>
                      Open Support Ticket
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setShowTwoWayModal(false);
                      setTwoWayMessage('');
                      setTwoWaySubject('');
                    }}
                    className="p-2 rounded-lg hover:opacity-70"
                    style={{ backgroundColor: enhancedTheme.background }}
                  >
                    <X size={18} style={{ color: enhancedTheme.textLight }} />
                  </button>
                </div>
                
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: enhancedTheme.text }}>
                      Subject
                    </label>
                    <input
                      type="text"
                      value={twoWaySubject}
                      onChange={(e) => setTwoWaySubject(e.target.value)}
                      className="w-full p-3 rounded-lg border text-sm"
                      style={{ 
                        borderColor: enhancedTheme.border, 
                        backgroundColor: enhancedTheme.background, 
                        color: enhancedTheme.text 
                      }}
                      placeholder="e.g., Account Question, Feature Request, etc."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: enhancedTheme.text }}>
                      Initial Message
                    </label>
                    <textarea
                      value={twoWayMessage}
                      onChange={(e) => setTwoWayMessage(e.target.value)}
                      rows={6}
                      className="w-full p-3 rounded-lg border text-sm"
                      style={{ 
                        borderColor: enhancedTheme.border, 
                        backgroundColor: enhancedTheme.background, 
                        color: enhancedTheme.text 
                      }}
                      placeholder="Type your initial message here. The user will be able to reply to this ticket."
                    />
                    <p className="text-xs mt-2" style={{ color: enhancedTheme.textLight }}>
                      This creates a support ticket that allows two-way conversation. The user can respond to your message.
                    </p>
                  </div>
                  
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowTwoWayModal(false);
                        setTwoWayMessage('');
                        setTwoWaySubject('');
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-semibold border"
                      style={{ borderColor: enhancedTheme.border, color: enhancedTheme.text }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendTwoWayMessage}
                      disabled={!twoWayMessage.trim() || !twoWaySubject.trim() || isSendingSupport}
                      className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      style={{ backgroundColor: enhancedTheme.primary, color: enhancedTheme.textOnPrimary || '#FFFFFF' }}
                    >
                      {isSendingSupport ? (
                        <>
                          <Loader size={14} className="animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          Create Ticket
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Subscription Lifecycle Summary - at-a-glance status, trial bar, billing dates, provider links
function SubscriptionLifecycleSummary({ user, theme, subscriptionStatusDisplay }) {
  const sub = user.subscription || {};
  const now = new Date();
  let trialEndDate = null;
  if (user.trialEndDate) trialEndDate = user.trialEndDate?.toDate?.() || new Date(user.trialEndDate);
  else if (user.createdAt) {
    const created = user.createdAt?.toDate?.() || new Date(user.createdAt);
    trialEndDate = new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000);
  }
  const trialDaysTotal = trialEndDate && user.createdAt ? Math.ceil((trialEndDate - (user.createdAt?.toDate?.() || new Date(user.createdAt))) / (24 * 60 * 60 * 1000)) : 30;
  const trialDaysLeft = trialEndDate && trialEndDate > now ? Math.ceil((trialEndDate - now) / (24 * 60 * 60 * 1000)) : 0;
  const trialDaysUsed = trialDaysTotal - trialDaysLeft;
  const trialProgress = trialDaysTotal > 0 ? Math.min(100, (trialDaysUsed / trialDaysTotal) * 100) : 0;

  const stripeCustomerId = sub.stripeCustomerId || user.stripeCustomerId;
  const source = sub.paymentProvider || sub.source;
  const stripeUrl = stripeCustomerId ? `https://dashboard.stripe.com/customers/${stripeCustomerId}` : null;
  const googlePlayUrl = (source === 'google_play' || source === 'googleplay') ? 'https://play.google.com/console/developers' : null;
  const appStoreUrl = (source === 'apple' || source === 'appstore') ? 'https://appstoreconnect.apple.com' : null;

  const lastBilledRaw = sub.latestInvoice?.createdAt || sub.lastPaymentDate;
  const lastBilled = lastBilledRaw ? (lastBilledRaw.toDate ? lastBilledRaw.toDate() : new Date(lastBilledRaw)) : null;
  const nextBillingRaw = sub.currentPeriodEnd;
  const nextBilling = nextBillingRaw ? (typeof nextBillingRaw === 'string' ? new Date(nextBillingRaw) : nextBillingRaw) : null;

  return (
    <div className="rounded-xl border p-4 relative overflow-hidden"
      style={{ borderColor: theme.border, backgroundColor: theme.cardBackground, background: `linear-gradient(135deg, ${theme.cardBackground} 0%, ${theme.info}08 100%)` }}>
      <div className="flex items-center gap-2 mb-3">
        <CreditCard size={16} style={{ color: theme.info }} />
        <h4 className="font-bold text-sm" style={{ color: theme.primaryDark }}>Subscription Lifecycle</h4>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium" style={{ color: theme.textLight }}>Status</span>
          <span className="px-2 py-1 rounded-lg text-xs font-semibold"
            style={{ backgroundColor: subscriptionStatusDisplay.bgColor, color: subscriptionStatusDisplay.color, border: `1px solid ${subscriptionStatusDisplay.borderColor}` }}>
            {subscriptionStatusDisplay.label}
          </span>
        </div>
        {trialEndDate && trialEndDate > now && (
          <div>
            <div className="flex justify-between text-xs mb-1" style={{ color: theme.textLight }}>
              <span>Trial</span>
              <span>{trialDaysLeft}d left</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: theme.background }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${trialProgress}%`, backgroundColor: theme.warning }} />
            </div>
          </div>
        )}
        {lastBilled && !Number.isNaN(lastBilled.getTime()) && (
          <div className="flex justify-between text-xs">
            <span style={{ color: theme.textLight }}>Last billed</span>
            <span style={{ color: theme.text }}>{lastBilled.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        )}
        {nextBilling && !Number.isNaN(new Date(nextBilling).getTime()) && sub.status === 'active' && (
          <div className="flex justify-between text-xs">
            <span style={{ color: theme.textLight }}>Next billing</span>
            <span style={{ color: theme.text }}>{new Date(nextBilling).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        )}
        {(sub.status === 'refunded' || sub.status === 'canceled' || sub.status === 'expired') && (
          <div className="text-xs" style={{ color: theme.error }}>{sub.status}</div>
        )}
        <div className="flex flex-wrap gap-2 pt-1 border-t" style={{ borderColor: theme.border }}>
          {stripeUrl && (
            <a href={stripeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: theme.info + '20', color: theme.info }}>
              <ExternalLink size={12} /> Stripe
            </a>
          )}
          {googlePlayUrl && (
            <a href={googlePlayUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: theme.success + '20', color: theme.success }}>
              <ExternalLink size={12} /> Google Play
            </a>
          )}
          {appStoreUrl && (
            <a href={appStoreUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: theme.primary + '20', color: theme.primary }}>
              <ExternalLink size={12} /> App Store
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// Activity Log tab - chronological event timeline
function ActivityLogTab({ user, theme, events, loading, onLoad }) {
  React.useEffect(() => { onLoad(); }, [onLoad]);
  const severityColors = { success: theme.success, info: theme.info, warning: theme.warning, error: theme.error };
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
      <div className="flex items-center gap-2 mb-4">
        <History size={18} style={{ color: theme.primary }} />
        <h4 className="font-bold" style={{ color: theme.primaryDark }}>Activity Log</h4>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8 gap-2" style={{ color: theme.textLight }}>
          <Loader size={20} className="animate-spin" />
          <span>Loading activity...</span>
        </div>
      ) : events.length === 0 ? (
        <p className="text-sm py-4" style={{ color: theme.textLight }}>No activity events found.</p>
      ) : (
        <div className="space-y-0 max-h-[60vh] overflow-y-auto">
          {events.map((ev) => (
            <div key={ev.id} className="flex gap-3 py-3 border-b last:border-b-0" style={{ borderColor: theme.border }}>
              <div className="w-2 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: severityColors[ev.severity] || theme.textLight }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold" style={{ color: theme.text }}>{ev.title}</div>
                {ev.description && <div className="text-xs mt-0.5" style={{ color: theme.textLight }}>{ev.description}</div>}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] uppercase" style={{ color: theme.textLight }}>{ev.timestamp ? new Date(ev.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: theme.background, color: theme.textLight }}>{ev.source}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Communications tab - emails, admin messages, support tickets
function CommunicationsTab({ user, theme, data, loading, onLoad }) {
  React.useEffect(() => { onLoad(); }, [onLoad]);
  const { emails, adminMessages, supportTickets } = data;
  return (
    <div className="rounded-xl border p-4 space-y-4" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
      <div className="flex items-center gap-2">
        <MessageCircle size={18} style={{ color: theme.primary }} />
        <h4 className="font-bold" style={{ color: theme.primaryDark }}>Communications</h4>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8 gap-2" style={{ color: theme.textLight }}>
          <Loader size={20} className="animate-spin" />
          <span>Loading...</span>
        </div>
      ) : (
        <>
          {emails.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase mb-2" style={{ color: theme.textLight }}>Emails sent</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {emails.slice(0, 30).map((e) => (
                  <div key={e.id} className="p-2 rounded-lg text-xs" style={{ backgroundColor: theme.background }}>
                    <span className="font-medium" style={{ color: theme.text }}>{e.type}</span>
                    {e.subject && <span className="ml-1" style={{ color: theme.textLight }}> – {e.subject}</span>}
                    <div style={{ color: theme.textLight }}>{e.sentAt ? new Date(e.sentAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''} · {e.status}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {adminMessages.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase mb-2" style={{ color: theme.textLight }}>Admin messages</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {adminMessages.slice(0, 20).map((m) => (
                  <div key={m.id} className="p-2 rounded-lg text-xs" style={{ backgroundColor: theme.background }}>
                    <div style={{ color: theme.text }}>{m.message?.slice(0, 80)}{m.message?.length > 80 ? '...' : ''}</div>
                    <div style={{ color: theme.textLight }}>{m.createdAt ? new Date(m.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {supportTickets.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase mb-2" style={{ color: theme.textLight }}>Support tickets</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {supportTickets.slice(0, 20).map((t) => (
                  <div key={t.id} className="p-2 rounded-lg text-xs" style={{ backgroundColor: theme.background }}>
                    <span className="font-medium" style={{ color: theme.text }}>#{t.ticketNumber}</span>
                    <span className="ml-1" style={{ color: theme.textLight }}>{t.subject}</span>
                    <div style={{ color: theme.textLight }}>{t.status} · {t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {emails.length === 0 && adminMessages.length === 0 && supportTickets.length === 0 && (
            <p className="text-sm py-4" style={{ color: theme.textLight }}>No communications found.</p>
          )}
        </>
      )}
    </div>
  );
}

// Sync from Stripe Button Component (forceRefresh = show as "Force refresh" when user already has subscription data)
function SyncFromStripeButton({ user, theme, forceRefresh = false }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState(null);

  const handleSync = async () => {
    setIsSyncing(true);
    setResult(null);

    try {
      const userId = user.uid || user.id;
      
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const syncFunction = httpsCallable(functions, 'manualSyncSubscription');
      
      const payload = { userId };
      
      const response = await syncFunction(payload);
      
      if (response.data.success) {
        setResult({
          type: 'success',
          message: `✅ Success! Synced subscription: ${response.data.plan} (${response.data.interval})`
        });
        
        // Trigger a refresh after 2 seconds
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setResult({
          type: 'error',
          message: response.data.message || 'Sync failed'
        });
      }
    } catch (error) {
      console.error('Sync error:', error);
      setResult({
        type: 'error',
        message: error.message || 'Failed to sync subscription from Stripe'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="p-4 rounded-lg flex flex-col gap-3"
      style={{ backgroundColor: theme.warning + '10', border: `2px solid ${theme.warning}30` }}>
      {!forceRefresh && (
        <div className="flex items-start gap-2">
          <Siren size={16} style={{ color: theme.warning }} className="mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: theme.warning }}>EMPTY SUBSCRIPTION DATA</p>
            <p className="text-xs mt-1" style={{ color: theme.textLight }}>
              This user has no subscription data in Firestore. If they have a paid subscription in Stripe, click below to sync it.
            </p>
          </div>
        </div>
      )}
      {forceRefresh && (
        <p className="text-xs" style={{ color: theme.textLight }}>
          Overwrite Firestore with current data from Stripe (e.g. after a refund or status change).
        </p>
      )}
      <button
        onClick={handleSync}
        disabled={isSyncing}
        className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ 
          backgroundColor: theme.warning,
          color: '#FFFFFF',
          boxShadow: `0 4px 15px ${theme.warning}30`
        }}
      >
        {isSyncing ? (
          <>
            <Loader size={16} className="animate-spin" />
            Syncing from Stripe...
          </>
        ) : (
          <>
            <RefreshCw size={16} />
            {forceRefresh ? 'Force Refresh from Stripe' : 'Sync Subscription from Stripe'}
          </>
        )}
      </button>

      {result && (
        <div className="p-3 rounded text-xs"
          style={{ 
            backgroundColor: result.type === 'success' ? theme.success + '20' : theme.error + '20',
            color: result.type === 'success' ? theme.success : theme.error,
            border: `1px solid ${result.type === 'success' ? theme.success + '40' : theme.error + '40'}`
          }}>
          {result.message}
          {result.type === 'success' && (
            <div className="mt-1 text-[10px]" style={{ color: theme.textLight }}>
              Page will refresh in 2 seconds...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Subscription Debug Component
function SubscriptionDebugSection({ user, theme }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const subscription = user.subscription || {};
  const trialEndDate = user.trialEndDate;

  const getStatusColor = () => {
    if (subscription.status === 'active' && subscription.interval !== 'trial') {
      return theme.success;
    } else if (subscription.status === 'trialing' || subscription.interval === 'trial') {
      return theme.info;
    } else if (subscription.status === 'canceled' || subscription.status === 'expired' || subscription.status === 'refunded' || subscription.status === 'disputed' || subscription.status === 'revoked') {
      return theme.error;
    }
    return theme.textLight;
  };

  return (
    <div className="rounded-xl border p-5 relative overflow-hidden"
      style={{ 
        borderColor: theme.border,
        backgroundColor: theme.cardBackground,
        background: `linear-gradient(135deg, ${theme.cardBackground} 0%, ${theme.warning}05 100%)`
      }}>
      <div className="relative z-10">
              <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between mb-4 hover:opacity-80 transition-all"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ 
                background: `linear-gradient(135deg, ${theme.warning} 0%, ${theme.warning}DD 100%)`,
                boxShadow: `0 2px 8px ${theme.warning}30`
              }}>
              <Shield size={16} style={{ color: '#FFFFFF' }} />
            </div>
            <h4 className="font-bold" style={{ color: theme.primaryDark }}>Subscription Debug Data</h4>
          </div>
          <div className="text-xs px-2 py-1 rounded" style={{ backgroundColor: theme.warning + '20', color: theme.warning }}>
            {isExpanded ? 'Hide' : 'Show'} Raw Data
          </div>
        </button>
        
        <div 
          className="overflow-hidden transition-all duration-300 ease-in-out"
          style={{
            maxHeight: isExpanded ? '2000px' : '0',
            opacity: isExpanded ? 1 : 0,
            transform: isExpanded ? 'translateY(0)' : 'translateY(-10px)'
          }}
        >
          {isExpanded && (
            <div className="space-y-3">
            {/* Status Overview */}
            <div className="p-3 rounded-lg" style={{ backgroundColor: theme.background + '60', border: `2px solid ${getStatusColor()}30` }}>
              <div className="text-xs font-semibold mb-2" style={{ color: theme.textLight }}>STATUS ANALYSIS:</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span style={{ color: theme.textLight }}>subscription.status:</span>
                  <code className="px-2 py-0.5 rounded font-mono" style={{ backgroundColor: theme.background, color: getStatusColor() }}>
                    {subscription.status || 'undefined'}
                  </code>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: theme.textLight }}>subscription.interval:</span>
                  <code className="px-2 py-0.5 rounded font-mono" style={{ backgroundColor: theme.background, color: theme.text }}>
                    {subscription.interval || 'undefined'}
                  </code>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: theme.textLight }}>subscription.plan:</span>
                  <code className="px-2 py-0.5 rounded font-mono" style={{ backgroundColor: theme.background, color: theme.text }}>
                    {subscription.plan || 'undefined'}
                  </code>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: theme.textLight }}>subscription.currentPeriodEnd:</span>
                  <code className="px-2 py-0.5 rounded font-mono text-[10px]" style={{ backgroundColor: theme.background, color: theme.text }}>
                    {subscription.currentPeriodEnd || 'undefined'}
                  </code>
                </div>
              </div>
            </div>

            {/* What Admin Panel Sees */}
            <div className="p-3 rounded-lg" style={{ backgroundColor: theme.info + '10', border: `1px solid ${theme.info}30` }}>
              <div className="text-xs font-semibold mb-2" style={{ color: theme.info }}>WHAT ADMIN PANEL CHECKS:</div>
              <div className="space-y-1 text-[11px]" style={{ color: theme.text }}>
                <div>✓ Lifetime: hasLifetimeAccess={String(!!subscription.hasLifetimeAccess)} OR interval='lifetime'</div>
                <div>✓ Subscribed: status='active' AND plan exists = {String(subscription.status === 'active' && !!subscription.plan)}</div>
                <div>✓ Trialing: Has valid currentPeriodEnd and not expired</div>
                <div>✓ Refunded/Disputed/Revoked: status in ['refunded','disputed','revoked'] = {String(['refunded', 'disputed', 'revoked'].includes(subscription.status))}</div>
              </div>
            </div>

            {/* What User App Sees */}
            <div className="p-3 rounded-lg" style={{ backgroundColor: theme.success + '10', border: `1px solid ${theme.success}30` }}>
              <div className="text-xs font-semibold mb-2" style={{ color: theme.success }}>WHAT USER APP CHECKS:</div>
              <div className="space-y-1 text-[11px]" style={{ color: theme.text }}>
                <div>✓ Active Subscription: status='active' AND interval≠'trial' = {String(subscription.status === 'active' && subscription.interval !== 'trial')}</div>
                <div>✓ Lifetime: interval='lifetime' = {String(subscription.interval === 'lifetime')}</div>
                <div>✓ Trialing: status='trialing' = {String(subscription.status === 'trialing')}</div>
                <div>✓ No access: status in ['refunded','disputed','revoked'] = {String(['refunded', 'disputed', 'revoked'].includes(subscription.status))}</div>
              </div>
            </div>

            {/* Raw JSON */}
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-semibold mb-2 hover:opacity-80" style={{ color: theme.textLight }}>
                📄 Full Raw Subscription Object
              </summary>
              <pre className="mt-2 p-3 rounded text-[10px] overflow-auto max-h-60" 
                style={{ backgroundColor: theme.background, color: theme.text, border: `1px solid ${theme.border}` }}>
                {JSON.stringify(subscription, null, 2)}
              </pre>
            </details>

            {/* Stripe IDs */}
            {(subscription.stripeCustomerId || subscription.stripeSubscriptionId) && (
              <div className="p-3 rounded-lg" style={{ backgroundColor: theme.background + '60' }}>
                <div className="text-xs font-semibold mb-2" style={{ color: theme.textLight }}>STRIPE IDENTIFIERS:</div>
                <div className="space-y-1 text-[10px] font-mono">
                  {subscription.stripeCustomerId && (
                    <div>Customer: {subscription.stripeCustomerId}</div>
                  )}
                  {subscription.stripeSubscriptionId && (
                    <div>Subscription: {subscription.stripeSubscriptionId}</div>
                  )}
                </div>
              </div>
            )}

            {/* Action needed */}
            {subscription.status === 'active' && subscription.interval === 'trial' && (
              <div className="p-3 rounded-lg flex items-start gap-2"
                style={{ backgroundColor: theme.error + '10', border: `1px solid ${theme.error}30` }}>
                <Siren size={14} style={{ color: theme.error }} className="mt-0.5" />
                <div>
                  <p className="text-xs font-semibold" style={{ color: theme.error }}>ISSUE DETECTED</p>
                  <p className="text-[11px] mt-1" style={{ color: theme.textLight }}>
                    User has status='active' but interval='trial'. This should be status='trialing' for trials or interval='month'/'year' for paid subscriptions.
                  </p>
                </div>
              </div>
            )}

            {/* Empty subscription: show sync CTA */}
            {(!subscription.status || Object.keys(subscription).length === 0) && (
              <SyncFromStripeButton user={user} theme={theme} />
            )}

            {/* Always show Sync from Stripe so admin can force-refresh stale data */}
            {subscription.stripeCustomerId && (
              <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${theme.border}` }}>
                <SyncFromStripeButton user={user} theme={theme} forceRefresh />
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

// Technical Details Component
function TechnicalDetailsSection({ user, theme }) {
  const [copiedUid, setCopiedUid] = useState(false);
  const deviceInfo = user.deviceInfo || {};
  const deviceType = deviceInfo.deviceType || 'Unknown';
  const mobileOS = deviceInfo.mobileOS;
  const browser = deviceInfo.browser || 'Unknown';
  const userId = user.uid || user.id || 'N/A';

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  return (
    <div className="rounded-xl border p-5 relative overflow-hidden"
      style={{ 
        borderColor: theme.border,
        backgroundColor: theme.cardBackground,
        background: `linear-gradient(135deg, ${theme.cardBackground} 0%, ${theme.info}05 100%)`
      }}>
      <div className="absolute top-0 right-0 opacity-5 pointer-events-none">
        <Code size={100} style={{ color: theme.info }} />
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ 
              background: `linear-gradient(135deg, ${theme.info} 0%, ${theme.info}DD 100%)`,
              boxShadow: `0 2px 8px ${theme.info}30`
            }}>
            <Code size={16} style={{ color: '#FFFFFF' }} />
          </div>
          <h4 className="font-bold" style={{ color: theme.primaryDark }}>Technical Details</h4>
        </div>
        
        <div className="space-y-3">
          {/* UID */}
          <div className="flex items-center justify-between p-3 rounded-lg"
            style={{ backgroundColor: theme.background + '60' }}>
            <span className="text-sm font-medium" style={{ color: theme.textLight }}>Firebase UID:</span>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono px-2 py-1 rounded" 
                style={{ 
                  backgroundColor: theme.background, 
                  color: theme.text,
                  border: `1px solid ${theme.border}`
                }}>
                {user.uid}
              </code>
              <button
                onClick={() => copyToClipboard(user.uid)}
                className="p-1.5 rounded hover:bg-opacity-80 transition-all"
                style={{ backgroundColor: theme.info + '20' }}
                title="Copy UID"
              >
                {copiedUid ? <Check size={14} style={{ color: theme.success }} /> : <Copy size={14} style={{ color: theme.info }} />}
              </button>
            </div>
          </div>

          {/* Device Type */}
          <div className="flex items-center justify-between p-3 rounded-lg"
            style={{ backgroundColor: theme.background + '60' }}>
            <span className="text-sm font-medium" style={{ color: theme.textLight }}>Device Type:</span>
            <div className="flex items-center gap-2">
              {deviceType === 'mobile' && <Smartphone size={16} style={{ color: theme.info }} />}
              {deviceType === 'tablet' && <Smartphone size={16} style={{ color: theme.warning }} />}
              {deviceType === 'desktop' && <Monitor size={16} style={{ color: theme.success }} />}
              {deviceType === 'Unknown' && <Monitor size={16} style={{ color: theme.textLight }} />}
              <span className="text-sm font-semibold capitalize" style={{ color: theme.text }}>{deviceType}</span>
            </div>
          </div>

          {/* Mobile OS (if applicable) */}
          {mobileOS && (
            <div className="flex items-center justify-between p-3 rounded-lg"
              style={{ backgroundColor: theme.background + '60' }}>
              <span className="text-sm font-medium" style={{ color: theme.textLight }}>Mobile OS:</span>
              <span className="text-sm font-semibold" style={{ color: theme.text }}>{mobileOS}</span>
            </div>
          )}

          {/* Browser */}
          <div className="flex items-center justify-between p-3 rounded-lg"
            style={{ backgroundColor: theme.background + '60' }}>
            <span className="text-sm font-medium" style={{ color: theme.textLight }}>Browser:</span>
            <span className="text-sm font-semibold" style={{ color: theme.text }}>{browser}</span>
          </div>

          {/* No device info warning */}
          {deviceType === 'Unknown' && (
            <div className="p-3 rounded-lg flex items-start gap-2"
              style={{ 
                backgroundColor: theme.warning + '10',
                border: `1px solid ${theme.warning}30`
              }}>
              <Coffee size={14} style={{ color: theme.warning }} className="mt-0.5" />
              <div>
                <p className="text-xs font-semibold" style={{ color: theme.warning }}>Device info not available</p>
                <p className="text-[11px] mt-1" style={{ color: theme.textLight }}>
                  This user registered before device tracking was implemented. Device info will be captured on their next login.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


