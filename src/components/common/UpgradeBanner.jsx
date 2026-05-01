import React from 'react';
import { Crown, X, ArrowRight } from 'lucide-react';

/**
 * Banner displayed when trial is expired or subscription ended
 * Shows at top of all pages to prompt upgrade
 */
export default function UpgradeBanner({ daysRemaining, isTrialExpired, isSubscriptionEnded, isDowngraded, onDismiss, onUpgradeClick }) {
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
              <button 
                onClick={handleUpgradeClick}
                className="px-3 py-1.5 text-xs sm:text-sm sm:px-4 rounded-md bg-white font-semibold hover:opacity-90 transition-all flex items-center gap-1 sm:gap-2"
                style={{ color: '#D97944' }}
              >
                Choose a Plan
                <ArrowRight size={14} />
              </button>
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

  // Soft downgrade — user kept their data, now on the Free plan.
  // Prefer this over the hard "read-only" language when the flag is on.
  if (isDowngraded) {
    return (
      <div className="w-full text-white shadow-md" style={{ background: 'linear-gradient(to right, #6B7F74, #7F9E95)' }}>
        <div className="max-w-7xl mx-auto px-2 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Crown size={18} />
              <div>
                <span className="font-semibold text-xs sm:text-sm">You&apos;re on the Free plan — data is safe, upgrade to unlock more.</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleUpgradeClick}
                className="px-3 py-1.5 text-xs sm:text-sm sm:px-4 rounded-md bg-white font-semibold hover:opacity-90 transition-all flex items-center gap-1 sm:gap-2"
                style={{ color: '#6B7F74' }}
              >
                Upgrade
                <ArrowRight size={14} />
              </button>
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

  // Subscription ended (was a paying subscriber, now lapsed)
  if (isSubscriptionEnded) {
    return (
      <div className="w-full text-white shadow-md" style={{ background: 'linear-gradient(to right, #A2496D, #B9586E)' }}>
        <div className="max-w-7xl mx-auto px-2 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Crown size={18} />
              <div>
                <span className="font-semibold text-xs sm:text-sm">Your subscription ended — your data is safe</span>
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleUpgradeClick}
                className="px-3 py-1.5 text-xs sm:text-sm sm:px-4 rounded-md bg-white font-semibold hover:opacity-90 transition-all flex items-center gap-1 sm:gap-2"
                style={{ color: '#A2496D' }}
              >
                Resubscribe
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Trial expired (never paid — hard-lockout path when soft downgrade is off)
  if (isTrialExpired) {
    return (
      <div className="w-full text-white shadow-md" style={{ background: 'linear-gradient(to right, #A2496D, #B9586E)' }}>
        <div className="max-w-7xl mx-auto px-2 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Crown size={18} />
              <div>
                <span className="font-semibold text-xs sm:text-sm">Trial ended — your data is safe</span>
              </div>
            </div>
            <div className="flex items-center">
              <button 
                onClick={handleUpgradeClick}
                className="px-3 py-1.5 text-xs sm:text-sm sm:px-4 rounded-md bg-white font-semibold hover:opacity-90 transition-all flex items-center gap-1 sm:gap-2"
                style={{ color: '#A2496D' }}
              >
                Subscribe
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

