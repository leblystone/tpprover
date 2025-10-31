import React from 'react';
import { Crown, Clock } from 'lucide-react';
import ModernTooltip from '../ui/ModernTooltip';

/**
 * Compact trial button for top header
 * Modern, clean design that sits next to search button
 */
export default function TrialButton({ daysRemaining, isTrialExpired, onUpgradeClick, theme }) {
  const [isDismissed, setIsDismissed] = React.useState(false);

  // Check if user dismissed this session
  React.useEffect(() => {
    const dismissed = sessionStorage.getItem('trial_button_dismissed');
    if (dismissed) {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('trial_button_dismissed', 'true');
  };

  if (isDismissed) return null;

  // Trial ending soon (last 2 days)
  if (daysRemaining > 0 && daysRemaining <= 2) {
    return (
      <ModernTooltip text={`Trial ends in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`} position="bottom">
        <button
          onClick={onUpgradeClick}
          className="relative px-3 py-1.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90 hover:shadow-md flex items-center gap-2 group"
          style={{ 
            backgroundColor: '#FFF5EC',
            color: '#D97944',
            border: '1.5px solid #D97944'
          }}
        >
          <Crown size={16} className="flex-shrink-0" />
          <span className="hidden md:inline whitespace-nowrap">
            {daysRemaining} {daysRemaining === 1 ? 'Day' : 'Days'} Left
          </span>
          <span className="md:hidden">Trial</span>
          {/* Pulse indicator */}
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: '#D97944' }}></span>
            <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: '#D97944' }}></span>
          </span>
        </button>
      </ModernTooltip>
    );
  }

  // Trial expired
  if (isTrialExpired) {
    return (
      <ModernTooltip text="Trial expired - Upgrade to continue" position="bottom">
        <button
          onClick={onUpgradeClick}
          className="relative px-3 py-1.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90 hover:shadow-md flex items-center gap-2 animate-pulse"
          style={{ 
            backgroundColor: '#FFF0F3',
            color: '#A2496D',
            border: '1.5px solid #A2496D'
          }}
        >
          <Clock size={16} className="flex-shrink-0" />
          <span className="hidden md:inline whitespace-nowrap">Trial Expired</span>
          <span className="md:hidden">Expired</span>
          {/* Warning indicator */}
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: '#A2496D' }}></span>
            <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: '#A2496D' }}></span>
          </span>
        </button>
      </ModernTooltip>
    );
  }

  return null;
}




