import React from 'react';
import { Crown, X, ArrowRight } from 'lucide-react';
import { isAndroid } from '../../utils/platform';
import { getAndroidSubscriptionMessage } from '../../utils/paymentCompliance';

/**
 * Banner displayed when trial is expired or subscription ended
 * Shows at top of all pages to prompt upgrade
 */
export default function UpgradeBanner({ daysRemaining, isTrialExpired, onDismiss, onUpgradeClick }) {
  const [isDismissed, setIsDismissed] = React.useState(false);

  // Check if user dismissed this session
  React.useEffect(() => {
    const dismissed = sessionStorage.getItem('upgrade_banner_dismissed');
    if (dismissed) {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('upgrade_banner_dismissed', 'true');
    if (onDismiss) onDismiss();
  };

  const handleUpgradeClick = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    }
  };

  if (isDismissed) return null;

  // Trial ending soon (last 2 days)
  if (daysRemaining > 0 && daysRemaining <= 2) {
    return (
      <div className="w-full text-white shadow-md" style={{ background: 'linear-gradient(to right, #D97944, #E57A44)' }}>
        <div className="max-w-7xl mx-auto px-2 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Crown size={18} />
              <div>
                <span className="font-semibold text-xs sm:text-sm">Trial ending soon!</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Android compliance: Hide payment button, show text */}
              {isAndroid() ? (
                <div className="text-xs sm:text-sm px-2">
                  {getAndroidSubscriptionMessage()}
                </div>
              ) : (
                <button 
                  onClick={handleUpgradeClick}
                  className="px-3 py-1.5 text-xs sm:text-sm sm:px-4 rounded-md bg-white font-semibold hover:opacity-90 transition-all flex items-center gap-1 sm:gap-2"
                  style={{ color: '#D97944' }}
                >
                  Choose a Plan
                  <ArrowRight size={14} />
                </button>
              )}
              <button 
                onClick={handleDismiss}
                className="p-1 hover:bg-white/20 rounded transition-all"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Trial expired
  if (isTrialExpired) {
    return (
      <div className="w-full text-white shadow-md" style={{ background: 'linear-gradient(to right, #A2496D, #B9586E)' }}>
        <div className="max-w-7xl mx-auto px-2 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Crown size={18} />
              <div>
                <span className="font-semibold text-xs sm:text-sm">Trial Expired - Read-only mode</span>
              </div>
            </div>
            <div className="flex items-center">
              {/* Android compliance: Hide payment button, show text */}
              {isAndroid() ? (
                <div className="text-xs sm:text-sm px-2">
                  {getAndroidSubscriptionMessage()}
                </div>
              ) : (
                <button 
                  onClick={handleUpgradeClick}
                  className="px-3 py-1.5 text-xs sm:text-sm sm:px-4 rounded-md bg-white font-semibold hover:opacity-90 transition-all flex items-center gap-1 sm:gap-2 animate-pulse"
                  style={{ color: '#A2496D' }}
                >
                  Choose a Plan
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

