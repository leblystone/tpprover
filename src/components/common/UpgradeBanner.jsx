import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, X, ArrowRight } from 'lucide-react';

/**
 * Banner displayed when trial is expired or subscription ended
 * Shows at top of all pages to prompt upgrade
 */
export default function UpgradeBanner({ daysRemaining, isTrialExpired, onDismiss }) {
  const navigate = useNavigate();
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
    navigate('/account');
  };

  if (isDismissed) return null;

  // Trial ending soon (last 2 days)
  if (daysRemaining > 0 && daysRemaining <= 2) {
    return (
      <div className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown size={20} />
              <div>
                <span className="font-semibold">Trial ending soon!</span>
                <span className="ml-2">
                  {daysRemaining === 1 
                    ? 'Last day of your trial' 
                    : `${daysRemaining} days remaining`}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleUpgradeClick}
                className="px-4 py-1.5 rounded-md bg-white text-blue-600 font-semibold hover:bg-blue-50 transition-all flex items-center gap-2"
              >
                Choose a Plan
                <ArrowRight size={16} />
              </button>
              <button 
                onClick={handleDismiss}
                className="p-1 hover:bg-blue-700 rounded transition-all"
                aria-label="Dismiss"
              >
                <X size={18} />
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
      <div className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown size={20} />
              <div>
                <span className="font-semibold">Trial Expired</span>
                <span className="ml-2">
                  You're in read-only mode. Choose a plan to continue researching.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleUpgradeClick}
                className="px-4 py-1.5 rounded-md bg-white text-red-600 font-semibold hover:bg-red-50 transition-all flex items-center gap-2 animate-pulse"
              >
                Choose a Plan Now
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

