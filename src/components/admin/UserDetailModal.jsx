import React, { useMemo, useState } from 'react';
import { X, Users, Mail, Calendar, Clock, CreditCard, Award, Gift, Shield, Lock, Book, Coffee, Loader, Copy, Check, Smartphone, Monitor, Code } from 'lucide-react';

export default function UserDetailModal({
  user,
  onClose,
  theme: enhancedTheme,
  onResetPassword,
  onExtendTrial,
  isExtendingTrial = false,
  isLoadingDetails = false
}) {
  // Safety check
  if (!user) {
    console.error('❌ UserDetailModal: No user provided!');
    return null;
  }

  console.log('✅ UserDetailModal rendering with user:', user);

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

  const hasLifetimeAccess = user.subscription?.hasLifetimeAccess || user.subscription?.interval === 'lifetime';

  // Get subscription status
  const getSubscriptionStatus = () => {
    // Check for lifetime access first
    if (hasLifetimeAccess) {
      return { label: 'Lifetime Access', color: enhancedTheme.warning, bgColor: enhancedTheme.warning + '20', borderColor: enhancedTheme.warning + '40' };
    }

    // Check for active paid subscription
    if (user.subscription?.status === 'active' && user.subscription?.plan) {
      return { label: 'Subscribed', color: enhancedTheme.success, bgColor: enhancedTheme.success + '20', borderColor: enhancedTheme.success + '40' };
    }

    // Check trial status
    let trialEndDate = null;
    if (user.subscription?.currentPeriodEnd) {
      trialEndDate = new Date(user.subscription.currentPeriodEnd);
    } else if (user.trialEndDate?.toDate) {
      trialEndDate = user.trialEndDate.toDate();
    } else if (typeof user.trialEndDate === 'string') {
      trialEndDate = new Date(user.trialEndDate);
    }

    if (trialEndDate && !isNaN(trialEndDate.getTime())) {
      const now = new Date();
      if (trialEndDate > now) {
        return { label: 'Trialing', color: enhancedTheme.info, bgColor: enhancedTheme.info + '20', borderColor: enhancedTheme.info + '40' };
      } else {
        return { label: 'Trial Expired', color: enhancedTheme.error, bgColor: enhancedTheme.error + '20', borderColor: enhancedTheme.error + '40' };
      }
    }

    // Check for expired subscription
    if (user.subscription?.status === 'canceled' || user.subscription?.status === 'expired' || user.subscription?.status === 'past_due') {
      return { label: 'Subscription Expired', color: enhancedTheme.error, bgColor: enhancedTheme.error + '20', borderColor: enhancedTheme.error + '40' };
    }

    // Default: Trial Expired
    return { label: 'Trial Expired', color: enhancedTheme.textLight, bgColor: enhancedTheme.textLight + '20', borderColor: enhancedTheme.textLight + '40' };
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
      setLocalMessage('Additional research time added successfully. Ask the researcher to refresh their session.');
      setLocalMessageType('success');
      setExtensionNote('');
    } catch (error) {
      setLocalMessage(error.message || 'Unable to extend the research trial right now.');
      setLocalMessageType('error');
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
        <div className="p-6 border-b flex justify-between items-center relative z-10" 
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
              <h2 className="text-xl font-bold" style={{ color: enhancedTheme.primaryDark }}>Researcher Details</h2>
              <p className="text-xs flex items-center gap-1.5" style={{ color: enhancedTheme.textLight }}>
                <Book size={10} className="opacity-60" />
                View researcher information
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
        
        <div className="p-6 space-y-6 relative z-10">
          {/* User Info Header */}
          <div className="relative rounded-xl p-5 overflow-hidden" 
            style={{ 
              background: `linear-gradient(135deg, ${enhancedTheme.primaryLight}10 0%, ${enhancedTheme.accent}08 100%)`,
              border: `1px solid ${enhancedTheme.border}40`
            }}>
            <div className="flex items-center gap-4">
              <div className="relative">
                <img 
                  className="h-20 w-20 rounded-xl shadow-lg border-2" 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=${enhancedTheme.primary.replace('#', '')}&color=ffffff`} 
                  alt=""
                  style={{ borderColor: enhancedTheme.primary }}
                />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-md"
                  style={{ backgroundColor: subscriptionStatusDisplay.color }}>
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-1" style={{ color: enhancedTheme.text }}>
                  {user.displayName || 'No Name'}
                </h3>
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

          {/* Key Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl hover:scale-[1.02] transition-all duration-200 shadow-md"
              style={{ 
                backgroundColor: enhancedTheme.background,
                border: `1px solid ${enhancedTheme.border}40`
              }}>
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={16} style={{ color: enhancedTheme.info }} />
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
            <div className="p-4 rounded-xl hover:scale-[1.02] transition-all duration-200 shadow-md"
              style={{ 
                backgroundColor: enhancedTheme.background,
                border: `1px solid ${enhancedTheme.border}40`
              }}>
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} style={{ color: enhancedTheme.warning }} />
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

          {/* Technical Details */}
          <TechnicalDetailsSection user={user} theme={enhancedTheme} />

          {/* Subscription Details */}
          <div className="rounded-xl border p-5 relative overflow-hidden"
            style={{ 
              borderColor: enhancedTheme.border,
              backgroundColor: enhancedTheme.cardBackground,
              background: `linear-gradient(135deg, ${enhancedTheme.cardBackground} 0%, ${enhancedTheme.success}05 100%)`
            }}>
            <div className="absolute top-0 right-0 opacity-5 pointer-events-none">
              <Award size={100} style={{ color: enhancedTheme.success }} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ 
                    background: `linear-gradient(135deg, ${enhancedTheme.success} 0%, ${enhancedTheme.success}DD 100%)`,
                    boxShadow: `0 2px 8px ${enhancedTheme.success}30`
                  }}>
                  <CreditCard size={16} style={{ color: '#FFFFFF' }} />
                </div>
                <h4 className="font-bold" style={{ color: enhancedTheme.primaryDark }}>Access & Subscription</h4>
              </div>
              {hasLifetimeAccess ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-lg"
                    style={{ 
                      backgroundColor: isLifetimeGranted ? '#A3B18A20' : enhancedTheme.success + '15',
                      border: `1px solid ${isLifetimeGranted ? '#A3B18A40' : enhancedTheme.success + '30'}`
                    }}>
                    <div className="flex items-center gap-2 mb-2">
                      {isLifetimeGranted ? (
                        <Gift size={18} style={{ color: '#A3B18A' }} />
                      ) : (
                        <Award size={18} style={{ color: enhancedTheme.success }} />
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
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg"
                    style={{ backgroundColor: enhancedTheme.background + '60' }}>
                    <span className="text-sm font-medium" style={{ color: enhancedTheme.textLight }}>Plan:</span>
                    <span className="text-sm font-semibold" style={{ color: enhancedTheme.text }}>{subscriptionPlan}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg"
                    style={{ backgroundColor: enhancedTheme.background + '60' }}>
                    <span className="text-sm font-medium" style={{ color: enhancedTheme.textLight }}>Billing:</span>
                    <span className="text-sm font-semibold" style={{ color: enhancedTheme.text }}>{subscriptionInterval}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg"
                    style={{ backgroundColor: enhancedTheme.background + '60' }}>
                    <span className="text-sm font-medium" style={{ color: enhancedTheme.textLight }}>Status:</span>
                    <span className="px-2 py-1 rounded text-xs font-semibold"
                      style={{
                        backgroundColor: subscriptionStatus === 'active' ? enhancedTheme.success + '20' : enhancedTheme.warning + '20',
                        color: subscriptionStatus === 'active' ? enhancedTheme.success : enhancedTheme.warning
                      }}>
                      {subscriptionStatus}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg text-center"
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
            <div className="rounded-xl border p-5" 
              style={{ 
                borderColor: enhancedTheme.border,
                backgroundColor: enhancedTheme.cardBackground
              }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ 
                    background: `linear-gradient(135deg, ${enhancedTheme.warning} 0%, ${enhancedTheme.warning}DD 100%)`,
                    boxShadow: `0 2px 8px ${enhancedTheme.warning}30`
                  }}>
                  <Clock size={16} style={{ color: '#FFFFFF' }} />
                </div>
                <h4 className="font-bold" style={{ color: enhancedTheme.primaryDark }}>Research Trial Controls</h4>
              </div>

              {isLoadingDetails ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm" style={{ color: enhancedTheme.textLight }}>
                  <Loader size={18} className="animate-spin" />
                  <span>Loading current research window…</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg" 
                      style={{ 
                        backgroundColor: enhancedTheme.background,
                        border: `1px solid ${enhancedTheme.border}30`
                      }}>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: enhancedTheme.textLight }}>Trial ends</p>
                      <p className="text-sm font-semibold" style={{ color: enhancedTheme.text }}>{trialEndDisplay}</p>
                      <p className="text-xs mt-1" style={{ color: enhancedTheme.textLight }}>{trialDaysText}</p>
                    </div>
                    <div className="p-3 rounded-lg" 
                      style={{ 
                        backgroundColor: enhancedTheme.background,
                        border: `1px solid ${enhancedTheme.border}30`
                      }}>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: enhancedTheme.textLight }}>Status</p>
                      <p className="text-sm font-semibold capitalize" style={{ color: enhancedTheme.text }}>{trialStatusLabel}</p>
                      <p className="text-xs mt-1" style={{ color: enhancedTheme.textLight }}>{trialPlanName}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: enhancedTheme.textLight }}>Days to add</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={extensionDays}
                        onChange={(e) => setExtensionDays(e.target.value)}
                        className="w-full sm:w-24 px-3 py-2 rounded border text-sm"
                        style={{ borderColor: enhancedTheme.border, backgroundColor: enhancedTheme.background, color: enhancedTheme.text }}
                        disabled={disableExtendAction}
                      />
                      <button
                        onClick={handleExtendTrialClick}
                        disabled={disableExtendAction}
                        className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 hover:scale-105 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
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
                      placeholder="Optional note for audit trail (visible to admins only)"
                      value={extensionNote}
                      onChange={(e) => setExtensionNote(e.target.value)}
                      className="w-full px-3 py-2 rounded border text-sm"
                      style={{ borderColor: enhancedTheme.border, backgroundColor: enhancedTheme.background, color: enhancedTheme.text }}
                      disabled={disableExtendAction}
                    />
                    {localMessage && (
                      <div className="px-3 py-2 rounded text-xs" 
                        style={{ 
                          backgroundColor: localMessageType === 'error' ? '#fef2f2' : enhancedTheme.success + '20',
                          color: localMessageType === 'error' ? '#b91c1c' : enhancedTheme.success,
                          border: `1px solid ${localMessageType === 'error' ? '#fecaca' : enhancedTheme.success + '40'}`
                        }}
                      >
                        {localMessage}
                      </div>
                    )}
                    <p className="text-[11px]" style={{ color: enhancedTheme.textLight }}>
                      Researchers may need to sign out and back in to sync the refreshed countdown from The Pep Planner cloud.
                    </p>
                  </div>

                  {extensionHistory.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: enhancedTheme.textLight }}>Extension history</p>
                      <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                        {extensionHistory.map((entry, index) => {
                          const newEnd = entry.newEnd ? new Date(entry.newEnd) : null;
                          const entryLabel = newEnd && !Number.isNaN(newEnd.getTime())
                            ? newEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : 'Unknown end date';
                          return (
                            <div key={`${entry.newEnd || index}-${index}`} className="p-3 rounded-lg" 
                              style={{ backgroundColor: enhancedTheme.background, border: `1px solid ${enhancedTheme.border}30` }}>
                              <div className="text-sm font-semibold" style={{ color: enhancedTheme.text }}>
                                +{entry.addedDays} day{entry.addedDays === 1 ? '' : 's'} • {entryLabel}
                              </div>
                              <p className="text-[11px]" style={{ color: enhancedTheme.textLight }}>
                                Extended by {entry.extendedBy || 'admin'} at {entry.extendedAt ? new Date(entry.extendedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'unknown time'}
                              </p>
                              {entry.note && (
                                <p className="text-[11px] mt-1" style={{ color: enhancedTheme.textLight }}>
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
          <div className="rounded-xl border p-5"
            style={{ 
              borderColor: enhancedTheme.border,
              backgroundColor: enhancedTheme.cardBackground
            }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ 
                  background: `linear-gradient(135deg, ${enhancedTheme.warning} 0%, ${enhancedTheme.warning}DD 100%)`,
                  boxShadow: `0 2px 8px ${enhancedTheme.warning}30`
                }}>
                <Shield size={16} style={{ color: '#FFFFFF' }} />
              </div>
              <h4 className="font-bold" style={{ color: enhancedTheme.primaryDark }}>Emergency Actions</h4>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  if (window.confirm(`Send password reset email to ${user.email}?`)) {
                    onResetPassword?.(user.email);
                  }
                }}
                className="flex-1 px-4 py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95"
                style={{ 
                  backgroundColor: enhancedTheme.warning,
                  color: '#FFFFFF',
                  boxShadow: `0 4px 15px ${enhancedTheme.warning}30`
                }}
              >
                <Lock size={16} />
                Reset Password
              </button>
            </div>
            <p className="text-xs mt-3 flex items-center gap-1.5" style={{ color: enhancedTheme.textLight }}>
              <Coffee size={10} className="opacity-60" />
              Password reset requires backend function. For immediate access, check Stripe or contact support.
            </p>
          </div>
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


