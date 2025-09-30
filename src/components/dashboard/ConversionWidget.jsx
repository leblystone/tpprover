import React, { useState } from 'react';
import { Crown, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ConversionWidget({ theme, subscription, onDismiss }) {
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return localStorage.getItem('tpprover_conversion_widget_dismissed') === 'true';
    } catch {
      return false;
    }
  });
  
  const navigate = useNavigate();

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem('tpprover_conversion_widget_dismissed', 'true');
    } catch {}
    if (onDismiss) onDismiss();
  };

  const handleUpgrade = () => {
    navigate('/account');
  };

  // Don't show if user has active PAID subscription
  // Show for: trial users, expired trials, canceled subscriptions, or no subscription
  const isActivePaidSubscription = subscription?.status === 'active' && subscription?.plan !== '7-Day Free Trial';
  
  console.log('🎯 ConversionWidget Debug:', {
    subscription,
    subscriptionStatus: subscription?.status,
    subscriptionPlan: subscription?.plan,
    isActivePaidSubscription,
    isDismissed,
    willShow: !isActivePaidSubscription && !isDismissed
  });
  
  if (isActivePaidSubscription || isDismissed) {
    console.log('❌ ConversionWidget: HIDING because', { isActivePaidSubscription, isDismissed });
    return null;
  }
  
  console.log('✅ ConversionWidget: SHOWING!');

  // Calculate trial days left
  const getTrialDaysLeft = () => {
    if (!subscription?.currentPeriodEnd) return 0;
    const now = new Date();
    const end = new Date(subscription.currentPeriodEnd);
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const daysLeft = getTrialDaysLeft();
  const isTrial = subscription?.status === 'trialing';

  return (
    <div className="rounded border p-4 content-card" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Crown size={20} style={{ color: theme.primary }} />
            <span className="font-semibold text-lg" style={{ color: theme.primaryDark }}>
              {isTrial ? 'Lab Access Trial' : 'Researcher Access'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              Trialing
            </div>
            <button 
              onClick={handleDismiss}
              className="p-1 hover:opacity-70 transition-opacity"
              style={{ color: '#5C7659' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
        
        {isTrial ? (
          <>
            <div className="text-3xl font-bold mb-2" style={{ color: '#344E41' }}>
              7-Day Lab Access
            </div>
            
            <div className="text-sm mb-4" style={{ color: '#5C7659' }}>
              Full protocol research access
            </div>
            
            {/* Trial Countdown Progress Bar */}
            {subscription?.currentPeriodEnd && (
              <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: '#f0f9ff', border: '2px solid #bae6fd' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="font-semibold text-sm" style={{ color: '#344E41' }}>
                      Lab Access Status
                    </span>
                  </div>
                  <span className="text-sm font-bold text-blue-600">
                    {daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} of research` : 'Lab access expired'}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${(() => {
                          const start = new Date(subscription.startedAt);
                          const end = new Date(subscription.currentPeriodEnd);
                          const now = new Date();
                          const totalDuration = end.getTime() - start.getTime();
                          const elapsedTime = now.getTime() - start.getTime();
                          return Math.max(0, 100 - (elapsedTime / totalDuration * 100));
                        })()}%`,
                        background: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)',
                        boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs" style={{ color: '#6B7280' }}>
                    <span>Started: {new Date(subscription.startedAt).toLocaleDateString()}</span>
                    <span>Ends: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleUpgrade}
              className="w-full py-3 rounded-lg text-white font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: '#5C7659' }}
            >
              Continue Your Research
            </button>
          </>
        ) : (
          <>
            <div className="text-3xl font-bold mb-2" style={{ color: '#344E41' }}>
              Start Research
            </div>
            
            <div className="text-sm mb-4" style={{ color: '#5C7659' }}>
              Choose your research plan
            </div>

            <button
              onClick={handleUpgrade}
              className="w-full py-3 rounded-lg text-white font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: '#5C7659' }}
            >
              Start Research
            </button>
          </>
        )}
    </div>
  );
}
