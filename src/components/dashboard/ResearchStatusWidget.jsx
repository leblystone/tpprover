import React, { useState, useEffect } from 'react';
import { Crown, Clock, CheckCircle, ArrowRight, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ResearchStatusWidget({ theme, subscription }) {
  const navigate = useNavigate();
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);

  const handleUpgrade = () => {
    navigate('/app/account');
  };

  // Calculate trial days left with real-time updates
  const calculateTrialDaysLeft = () => {
    if (!subscription?.currentPeriodEnd) return 0;
    const now = new Date();
    const end = new Date(subscription.currentPeriodEnd);
    const diffTime = end - now;
    // Use Math.floor() so 7-day trial shows as 7 days initially, not 8
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  // Update trial days every minute
  useEffect(() => {
    const updateTrialDays = () => {
      setTrialDaysLeft(calculateTrialDaysLeft());
    };

    // Initial calculation
    updateTrialDays();

    // Update every minute
    const interval = setInterval(updateTrialDays, 60000);

    return () => clearInterval(interval);
  }, [subscription?.currentPeriodEnd]);

  const isTrial = subscription?.status === 'trialing';
  const isActive = subscription?.status === 'active';
  const isCanceled = subscription?.status === 'canceled';
  // Consider trial expired only when actual time has passed (not just daysLeft==0)
  const isExpired = (() => {
    if (!isTrial || !subscription?.currentPeriodEnd) return false;
    const now = new Date();
    const end = new Date(subscription.currentPeriodEnd);
    return end.getTime() - now.getTime() <= 0;
  })();

  // Hide widget only if user has active paid subscription
  // Show for trial, canceled, expired, or no subscription
  if (isActive && !isCanceled) {
    return null;
  }

  return (
    <div className="rounded border p-4 content-card" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5" style={{ color: theme.primary }} />
          <span className="font-semibold">Research Status</span>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
          isTrial ? 'text-white' : 
          isExpired ? 'bg-red-100 text-red-800' :
          isCanceled ? 'bg-orange-100 text-orange-800' :
          'bg-gray-100 text-gray-800'
        }`} style={isTrial ? { backgroundColor: '#C7AD95' } : {}}>
          {isTrial ? 'Trial' : 
           isExpired ? 'Expired' :
           isCanceled ? 'Canceled' :
           'Inactive'}
        </div>
      </div>
      <hr className="mb-3" style={{ borderColor: theme.border }} />

      {isTrial ? (
        <>
          <div className="space-y-3">
            <div>
              <div className="text-lg font-bold" style={{ color: theme.primaryDark }}>
                7-Day Lab Access
              </div>
              <div className="text-sm" style={{ color: theme.textLight }}>
                {(() => {
                  if (trialDaysLeft <= 0) return 'Trial expired';
                  
                  const now = new Date();
                  const end = new Date(subscription.currentPeriodEnd);
                  const diffTime = end - now;
                  
                  if (diffTime <= 0) return 'Trial expired';
                  
                  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                  const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                  const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
                  
                  if (diffDays > 1) {
                    return `${diffDays} days, ${diffHours} hours remaining`;
                  } else if (diffDays === 1) {
                    return `1 day, ${diffHours} hours remaining`;
                  } else if (diffHours > 0) {
                    return `${diffHours} hours, ${diffMinutes} minutes remaining`;
                  } else {
                    return `${diffMinutes} minutes remaining`;
                  }
                })()}
              </div>
            </div>

            {/* Progress Bar */}
            {subscription?.currentPeriodEnd && trialDaysLeft > 0 && (
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${(() => {
                        const start = new Date(subscription.startedAt);
                        const end = new Date(subscription.currentPeriodEnd);
                        const now = new Date();
                        const totalDuration = end.getTime() - start.getTime();
                        const elapsedTime = now.getTime() - start.getTime();
                        return Math.max(0, 100 - (elapsedTime / totalDuration * 100));
                      })()}%`,
                      background: 'linear-gradient(90deg, #C7AD95 0%, #A17B60 100%)'
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs" style={{ color: theme.textLight }}>
                  <span>Started: {new Date(subscription.startedAt).toLocaleDateString()}</span>
                  <span>Ends: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</span>
                </div>
              </div>
            )}

            {/* Features */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs" style={{ color: theme.text }}>
                <CheckCircle size={12} style={{ color: theme.primary }} />
                <span>Full protocol research access</span>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: theme.text }}>
                <CheckCircle size={12} style={{ color: theme.primary }} />
                <span>Advanced tracking & analytics</span>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: theme.text }}>
                <CheckCircle size={12} style={{ color: theme.primary }} />
                <span>Priority support</span>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleUpgrade}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
              <span>Continue Research</span>
              <ArrowRight size={14} />
            </button>

            {/* Urgency message for last 2 days */}
            {trialDaysLeft <= 2 && trialDaysLeft > 0 && (
              <div className="p-2 rounded text-center text-xs font-medium" style={{ backgroundColor: 'rgba(199, 173, 149, 0.2)', color: '#A17B60' }}>
                {(() => {
                  const now = new Date();
                  const end = new Date(subscription.currentPeriodEnd);
                  const diffTime = end - now;
                  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                  const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                  
                  if (diffDays === 1) {
                    return `⏰ 1 day and ${diffHours} hours left`;
                  } else if (diffDays === 0) {
                    return `⏰ ${diffHours} hours left`;
                  } else {
                    return `⏰ ${diffDays} days left`;
                  }
                })()}
              </div>
            )}
          </div>
        </>
      ) : isExpired ? (
        <>
          <div className="space-y-3">
            <div className="text-center">
              <Lock className="h-8 w-8 mx-auto mb-2" style={{ color: theme.error }} />
              <div className="text-lg font-bold" style={{ color: theme.primaryDark }}>
                Trial Expired
              </div>
              <div className="text-sm" style={{ color: theme.textLight }}>
                Your lab access has ended
              </div>
            </div>

            {/* Features */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs" style={{ color: theme.text }}>
                <CheckCircle size={12} style={{ color: theme.primary }} />
                <span>Choose a plan to continue research</span>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: theme.text }}>
                <CheckCircle size={12} style={{ color: theme.primary }} />
                <span>Full protocol research access</span>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: theme.text }}>
                <CheckCircle size={12} style={{ color: theme.primary }} />
                <span>Advanced tracking & analytics</span>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleUpgrade}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
              <span>Choose Plan</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </>
      ) : isCanceled ? (
        <>
          <div className="space-y-3">
            <div className="text-center">
              <Clock className="h-8 w-8 mx-auto mb-2" style={{ color: theme.warning }} />
              <div className="text-lg font-bold" style={{ color: theme.primaryDark }}>
                Plan Canceled
              </div>
              <div className="text-sm" style={{ color: theme.textLight }}>
                Access until {subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'end of period'}
              </div>
            </div>

            {/* Features */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs" style={{ color: theme.text }}>
                <CheckCircle size={12} style={{ color: theme.primary }} />
                <span>Reactivate to continue research</span>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: theme.text }}>
                <CheckCircle size={12} style={{ color: theme.primary }} />
                <span>Full protocol research access</span>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: theme.text }}>
                <CheckCircle size={12} style={{ color: theme.primary }} />
                <span>Advanced tracking & analytics</span>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleUpgrade}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
              <span>Reactivate Plan</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-3">
            <div>
              <div className="text-lg font-bold" style={{ color: theme.primaryDark }}>
                Start Research
              </div>
              <div className="text-sm" style={{ color: theme.textLight }}>
                Choose your research plan
              </div>
            </div>

            {/* Features */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs" style={{ color: theme.text }}>
                <CheckCircle size={12} style={{ color: theme.primary }} />
                <span>7-day lab access trial</span>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: theme.text }}>
                <CheckCircle size={12} style={{ color: theme.primary }} />
                <span>Full protocol research access</span>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: theme.text }}>
                <CheckCircle size={12} style={{ color: theme.primary }} />
                <span>Advanced tracking & analytics</span>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleUpgrade}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
              <span>Start Research</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
