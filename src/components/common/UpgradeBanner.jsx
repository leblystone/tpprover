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
      <div className="w-full text-white shadow-md" style={{ background: 'linear-gradient(to right, #D97944, #E57A44)' }}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown size={20} />
              <div>
                <span className="font-semibold">Trial ending soon!</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleUpgradeClick}
                className="px-4 py-1.5 rounded-md bg-white font-semibold hover:opacity-90 transition-all flex items-center gap-2"
                style={{ color: '#D97944' }}
              >
                Choose a Plan
                <ArrowRight size={16} />
              </button>
              <button 
                onClick={handleDismiss}
                className="p-1 hover:bg-white/20 rounded transition-all"
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
      <div className="w-full text-white shadow-md" style={{ background: 'linear-gradient(to right, #A2496D, #B9586E)' }}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown size={20} />
              <div>
                <span className="font-semibold">Trial Expired - Read-only mode</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleUpgradeClick}
                className="px-4 py-1.5 rounded-md bg-white font-semibold hover:opacity-90 transition-all flex items-center gap-2 animate-pulse"
                style={{ color: '#A2496D' }}
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

