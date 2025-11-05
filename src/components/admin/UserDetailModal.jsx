import React from 'react';
import { X, Users, Mail, Calendar, Clock, CreditCard, Award, Gift, Shield, Lock, Book, Coffee } from 'lucide-react';

export default function UserDetailModal({ user, onClose, theme: enhancedTheme, onResetPassword }) {
  // Check if user has lifetime access
  const hasLifetimeAccess = user.subscription?.hasLifetimeAccess || user.subscription?.interval === 'lifetime';
  const isLifetimeGranted = user.subscription?.lifetimeReason && !user.subscription?.paymentMethodId;
  const subscriptionStatus = user.subscription?.status || 'unknown';
  const subscriptionPlan = user.subscription?.plan?.name || user.subscription?.plan || 'No subscription';
  const subscriptionInterval = user.subscription?.interval || 'N/A';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative overflow-hidden" 
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
                  style={{ backgroundColor: user.isActive ? enhancedTheme.success : enhancedTheme.error }}>
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
                    backgroundColor: user.isActive ? enhancedTheme.success + '20' : enhancedTheme.error + '20',
                    color: user.isActive ? enhancedTheme.success : enhancedTheme.error,
                    border: `1px solid ${user.isActive ? enhancedTheme.success + '40' : enhancedTheme.error + '40'}`
                  }}>
                  <div className="w-1.5 h-1.5 rounded-full" 
                    style={{ backgroundColor: user.isActive ? enhancedTheme.success : enhancedTheme.error }} 
                  />
                  {user.isActive ? 'Active Researcher' : 'Inactive'}
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



